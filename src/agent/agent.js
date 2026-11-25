import { buildSystemPrompt, chatRemote, planLocal } from './brain.js'
import { describeToolCall, executeToolCall } from './tools.js'

export function summarizeCalls(calls = []) {
  if (!calls.length) return 'Инструменты не нужны.'
  return calls.map((call, index) => `${index + 1}. ${describeToolCall(call)}`).join('\n')
}

export function summarizeResults(results = []) {
  const ok = results.filter((r) => r.ok)
  const failed = results.filter((r) => !r.ok)
  const parts = []
  if (ok.length) parts.push(`Готово: ${ok.map((r) => r.message).join('; ')}.`)
  if (failed.length) parts.push(`Не получилось: ${failed.map((r) => r.message).join('; ')}.`)
  return parts.join(' ') || 'Нечего применять.'
}

/**
 * Агент-режиссёр: планирует сцену (локально или через LLM) и применяет её к студии.
 * studio — адаптер с методами setText/setBackground/addCharacter/... (см. app.js).
 * getConfig() — { brain, baseUrl, model, apiKey }.
 */
export function createAgent({ studio, getConfig }) {
  if (!studio) throw new Error('Агенту нужна студия (studio adapter)')

  async function plan(prompt, { signal } = {}) {
    const config = getConfig()
    const context = studio.getContext()
    if (config.brain === 'openai') {
      const messages = [
        { role: 'system', content: buildSystemPrompt(context) },
        { role: 'user', content: String(prompt ?? '') },
      ]
      const response = await chatRemote({ messages, config, signal })
      return {
        source: 'openai',
        calls: response.toolCalls,
        reply: response.content.trim() || summarizeCalls(response.toolCalls),
        messages,
        assistantMessage: response.assistantMessage,
        context,
      }
    }
    const local = planLocal(prompt, context)
    return { source: 'local', calls: local.calls, reply: local.reply, messages: [], context }
  }

  async function apply(plan, { signal } = {}) {
    const results = []
    for (const call of plan?.calls || []) {
      results.push(await executeToolCall(call, studio))
    }

    let reply = summarizeResults(results)
    if (plan?.source === 'openai' && results.length) {
      try {
        const messages = [
          ...plan.messages,
          plan.assistantMessage,
          ...results.map((result) => ({
            role: 'tool',
            tool_call_id: result.id || result.tool,
            content: result.message,
          })),
        ]
        const followUp = await chatRemote({ messages, config: getConfig(), signal })
        reply = followUp.content.trim() || reply
      } catch {
        // Итог от модели — приятный бонус, локальная сводка уже готова
      }
    }
    return { results, reply }
  }

  async function run(prompt, { autoApply = true, signal } = {}) {
    const planResult = await plan(prompt, { signal })
    if (!autoApply) {
      return { status: 'awaiting_approval', plan: planResult }
    }
    const { results, reply } = await apply(planResult, { signal })
    return { status: 'done', plan: planResult, results, reply }
  }

  return { plan, apply, run }
}
