import type { ProviderId } from './catalog'

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
  // Includes any hidden reasoning/thinking tokens, which are billed as output.
  outputTokens: number
  stopReason: 'done' | 'length' | 'refusal' | 'other'
}

export type ProviderErrorKind = 'auth' | 'credit' | 'rate' | 'notFound' | 'busy' | 'network' | 'cancelled' | 'other'

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind
  readonly provider: ProviderId

  constructor(provider: ProviderId, kind: ProviderErrorKind, message: string) {
    super(message)
    this.provider = provider
    this.kind = kind
  }
}

export interface ProviderAdapter {
  // Must not spend money: used to validate a pasted key.
  checkKey(apiKey: string, signal?: AbortSignal): Promise<void>
  generate(req: GenerateRequest): Promise<GenerateResult>
}

export function kindFromStatus(status: number | undefined): ProviderErrorKind {
  if (status === 401 || status === 403) return 'auth'
  if (status === 402) return 'credit'
  if (status === 404) return 'notFound'
  if (status === 429) return 'rate'
  if (status !== undefined && status >= 500) return 'busy'
  return 'other'
}
