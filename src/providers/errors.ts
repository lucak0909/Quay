import type { ProviderInfo } from './catalog'
import { ProviderError } from './types'

export interface FriendlyError {
  message: string
  link?: { href: string; label: string }
  cancelled?: boolean
}

export function friendlyError(error: unknown, provider: ProviderInfo): FriendlyError {
  if (!(error instanceof ProviderError)) {
    return { message: 'Something went wrong. Nothing was saved, and you can try again.' }
  }
  switch (error.kind) {
    case 'cancelled':
      return { message: 'Cancelled.', cancelled: true }
    case 'auth':
      return {
        message: "Your key isn't working. It may have been mistyped, deleted, or belong to a different AI company.",
        link: { href: '/settings', label: 'Check your key' },
      }
    case 'credit':
      return {
        message: `Your ${provider.company} account is out of credit or has reached its spending limit.`,
        link: { href: provider.billingUrl, label: 'Open your AI account' },
      }
    case 'rate':
      return {
        message:
          provider.id === 'gemini'
            ? "Google is limiting how many requests you can make. On Google's free option this can mean you've hit today's free limit. Wait a while and try again."
            : `${provider.company} is limiting how fast you can make requests. Wait a minute and try again.`,
      }
    case 'notFound':
      return {
        message: "That AI model isn't available on your account.",
        link: { href: '/settings', label: 'Change quality setting' },
      }
    case 'network':
      return { message: `Couldn't reach ${provider.company}. Check your internet connection and try again.` }
    case 'busy':
      return { message: `${provider.company} is busy right now. Wait a minute and try again.` }
    case 'other':
      return { message: `${provider.company} rejected the request: ${error.message}` }
  }
}

// Cancelled or dropped requests may still have been processed and billed.
export function mayHaveBeenBilled(error: unknown): boolean {
  return error instanceof ProviderError && (error.kind === 'cancelled' || error.kind === 'network')
}
