import { ApiError, FinishReason, GoogleGenAI, ThinkingLevel } from '@google/genai'
import { CARDS_JSON_SCHEMA } from '../cards/schema'
import { kindFromStatus, ProviderError, type ProviderAdapter } from './types'

function toProviderError(error: unknown, signal?: AbortSignal): unknown {
  if (signal?.aborted) return new ProviderError('gemini', 'cancelled', 'Cancelled')
  if (error instanceof ApiError) {
    // Google reports a bad key as 400 rather than 401.
    if (error.status === 400 && /API_KEY_INVALID|API key not valid/i.test(error.message)) {
      return new ProviderError('gemini', 'auth', error.message)
    }
    if (error.status === 429 && /spending cap|billing/i.test(error.message)) {
      return new ProviderError('gemini', 'credit', error.message)
    }
    return new ProviderError('gemini', kindFromStatus(error.status), error.message)
  }
  if (error instanceof TypeError) return new ProviderError('gemini', 'network', error.message)
  return error
}

export const geminiAdapter: ProviderAdapter = {
  async checkKey(apiKey, signal) {
    try {
      await new GoogleGenAI({ apiKey }).models.list({ config: { pageSize: 1, abortSignal: signal } })
    } catch (e) {
      throw toProviderError(e, signal)
    }
  },

  async generate(req) {
    const send = (minimalThinking: boolean) =>
      new GoogleGenAI({ apiKey: req.apiKey }).models.generateContent({
        model: req.model,
        contents: req.user,
        config: {
          systemInstruction: req.system,
          maxOutputTokens: req.maxTokens,
          responseMimeType: 'application/json',
          responseJsonSchema: CARDS_JSON_SCHEMA,
          // Thinking is billed as output; flashcards need very little of it.
          ...(minimalThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } : {}),
          abortSignal: req.signal,
        },
      })
    try {
      const response = await send(true).catch((e) => {
        // Some models don't accept this thinking level; that's rejected with an unbilled 400, so retry once without it.
        if (e instanceof ApiError && e.status === 400 && /thinking/i.test(e.message)) return send(false)
        throw e
      })
      const usage = response.usageMetadata
      const finish = response.candidates?.[0]?.finishReason
      return {
        text: response.text ?? '',
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
        stopReason:
          finish === FinishReason.MAX_TOKENS
            ? 'length'
            : finish === FinishReason.STOP
              ? 'done'
              : finish === undefined && response.promptFeedback?.blockReason
                ? 'refusal'
                : finish === FinishReason.SAFETY || finish === FinishReason.PROHIBITED_CONTENT
                  ? 'refusal'
                  : 'other',
      }
    } catch (e) {
      throw toProviderError(e, req.signal)
    }
  },
}
