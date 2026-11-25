import Anthropic from '@anthropic-ai/sdk'
import { CARDS_JSON_SCHEMA } from '../cards/schema'
import { priceFor } from '../cost/pricing'
import { kindFromStatus, ProviderError, type ProviderAdapter } from './types'

function client(apiKey: string) {
  // maxRetries: 0 — retries cost money, so the user decides whether to retry.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 })
}

function toProviderError(error: unknown): unknown {
  if (error instanceof Anthropic.APIUserAbortError) return new ProviderError('anthropic', 'cancelled', error.message)
  if (error instanceof Anthropic.APIConnectionError) return new ProviderError('anthropic', 'network', error.message)
  if (error instanceof Anthropic.APIError) {
    // Anthropic reports a low balance as a 400 with no dedicated error type.
    if (error.status === 400 && /credit balance/i.test(error.message)) {
      return new ProviderError('anthropic', 'credit', error.message)
    }
    const kind = error.status === 529 ? 'busy' : kindFromStatus(error.status)
    return new ProviderError('anthropic', kind, error.message)
  }
  return error
}

export const anthropicAdapter: ProviderAdapter = {
  async checkKey(apiKey, signal) {
    try {
      await client(apiKey).models.list({ limit: 1 }, { signal })
    } catch (e) {
      throw toProviderError(e)
    }
  },

  async generate(req) {
    const send = (lowEffort: boolean) =>
      client(req.apiKey).messages.create(
        {
          model: req.model,
          max_tokens: req.maxTokens,
          system: req.system,
          messages: [{ role: 'user', content: req.user }],
          output_config: {
            format: { type: 'json_schema', schema: CARDS_JSON_SCHEMA },
            // Newer models think before answering, billed as output. Flashcards need very little.
            ...(lowEffort ? { effort: 'low' as const } : {}),
          },
        },
        { signal: req.signal },
      )
    try {
      const thinks = Boolean(priceFor(req.model)?.thinks)
      const response = await send(thinks).catch((e) => {
        // A model that doesn't accept the effort setting rejects the request with a 400, which isn't billed,
        // so trying once more without it costs nothing.
        if (thinks && e instanceof Anthropic.APIError && e.status === 400 && /effort/i.test(e.message)) return send(false)
        throw e
      })
      return {
        text: response.content.map((block) => (block.type === 'text' ? block.text : '')).join(''),
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        stopReason:
          response.stop_reason === 'max_tokens'
            ? 'length'
            : response.stop_reason === 'refusal'
              ? 'refusal'
              : response.stop_reason === 'end_turn'
                ? 'done'
                : 'other',
      }
    } catch (e) {
      throw toProviderError(e)
    }
  },
}
