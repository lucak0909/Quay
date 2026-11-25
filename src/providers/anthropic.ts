import Anthropic from '@anthropic-ai/sdk'
import { CARDS_JSON_SCHEMA } from '../cards/schema'

function client(apiKey: string) {
  // maxRetries: 0 — retries cost money, so the user decides whether to retry.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 })
}

// Listing models is free, so it validates a key without spending anything.
export async function checkAnthropicKey(apiKey: string, signal?: AbortSignal): Promise<void> {
  await client(apiKey).models.list({ limit: 1 }, { signal })
}

export interface GenerateRequest {
  apiKey: string
  model: string
  system: string
  user: string
  maxTokens: number
  signal: AbortSignal
}

export interface GenerateResult {
  text: string
  inputTokens: number
  outputTokens: number
  stopReason: string | null
}

export async function generateWithAnthropic(req: GenerateRequest): Promise<GenerateResult> {
  const response = await client(req.apiKey).messages.create(
    {
      model: req.model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
      output_config: { format: { type: 'json_schema', schema: CARDS_JSON_SCHEMA } },
    },
    { signal: req.signal },
  )
  const text = response.content.map((block) => (block.type === 'text' ? block.text : '')).join('')
  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    stopReason: response.stop_reason,
  }
}
