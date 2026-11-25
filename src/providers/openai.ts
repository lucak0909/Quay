import OpenAI from 'openai'
import { CARDS_JSON_SCHEMA } from '../cards/schema'
import { kindFromStatus, ProviderError, type ProviderAdapter } from './types'

function client(apiKey: string) {
  // maxRetries: 0 — retries cost money, so the user decides whether to retry.
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 })
}

function toProviderError(error: unknown): unknown {
  if (error instanceof OpenAI.APIUserAbortError) return new ProviderError('openai', 'cancelled', error.message)
  if (error instanceof OpenAI.APIConnectionError) return new ProviderError('openai', 'network', error.message)
  if (error instanceof OpenAI.APIError) {
    // OpenAI uses 429 both for rate limits and for an empty balance or a hit spend limit.
    if (error.status === 429 && /insufficient_quota|spend_limit_exceeded/.test(String(error.code))) {
      return new ProviderError('openai', 'credit', error.message)
    }
    return new ProviderError('openai', kindFromStatus(error.status), error.message)
  }
  return error
}

export const openaiAdapter: ProviderAdapter = {
  async checkKey(apiKey, signal) {
    try {
      await client(apiKey).models.list({ signal })
    } catch (e) {
      throw toProviderError(e)
    }
  },

  async generate(req) {
    try {
      const response = await client(req.apiKey).chat.completions.create(
        {
          model: req.model,
          max_completion_tokens: req.maxTokens,
          // No hidden reasoning: flashcards don't need it, and it would be billed as extra output.
          reasoning_effort: 'none',
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.user },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'flashcards', strict: true, schema: CARDS_JSON_SCHEMA },
          },
        },
        { signal: req.signal },
      )
      const choice = response.choices[0]
      return {
        text: choice?.message.content ?? '',
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        stopReason: choice?.message.refusal
          ? 'refusal'
          : choice?.finish_reason === 'length'
            ? 'length'
            : choice?.finish_reason === 'stop'
              ? 'done'
              : 'other',
      }
    } catch (e) {
      throw toProviderError(e)
    }
  },
}
