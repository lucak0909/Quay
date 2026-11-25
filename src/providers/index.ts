import type { ProviderId } from './catalog'
import type { ProviderAdapter } from './types'

// Each SDK is loaded only when its provider is used, keeping the first page load small.
export function loadAdapter(id: ProviderId): Promise<ProviderAdapter> {
  switch (id) {
    case 'anthropic':
      return import('./anthropic').then((m) => m.anthropicAdapter)
    case 'openai':
      return import('./openai').then((m) => m.openaiAdapter)
    case 'gemini':
      return import('./gemini').then((m) => m.geminiAdapter)
  }
}
