import Anthropic from '@anthropic-ai/sdk'
import { ANTHROPIC } from './catalog'

export interface FriendlyError {
  message: string
  link?: { href: string; label: string }
  cancelled?: boolean
}

export function friendlyError(error: unknown): FriendlyError {
  if (error instanceof Anthropic.APIUserAbortError) {
    return { message: 'Cancelled.', cancelled: true }
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return {
      message: "Your key isn't working. It may have been mistyped, deleted, or belong to a different AI company.",
      link: { href: '/settings', label: 'Check your key' },
    }
  }
  if (error instanceof Anthropic.PaymentRequiredError || isLowCredit(error)) {
    return {
      message: 'Your AI account is out of credit.',
      link: { href: ANTHROPIC.billingUrl, label: 'Add credit' },
    }
  }
  if (error instanceof Anthropic.RateLimitError) {
    return { message: 'The AI company is limiting how fast you can make requests. Wait a minute and try again.' }
  }
  if (error instanceof Anthropic.NotFoundError) {
    return {
      message: "That AI model isn't available on your account.",
      link: { href: '/settings', label: 'Change quality setting' },
    }
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { message: "Couldn't reach the AI company. Check your internet connection and try again." }
  }
  if (error instanceof Anthropic.APIError && (error.status === 529 || (error.status ?? 0) >= 500)) {
    return { message: 'The AI company is busy right now. Wait a minute and try again.' }
  }
  if (error instanceof Anthropic.APIError) {
    return { message: `The AI company rejected the request: ${error.message}` }
  }
  return { message: 'Something went wrong. Nothing was saved, and you can try again.' }
}

// Anthropic reports a low balance as a 400 with no dedicated error type.
function isLowCredit(error: unknown): boolean {
  return error instanceof Anthropic.BadRequestError && /credit balance/i.test(error.message)
}

// Cancelled or dropped requests may still have been processed and billed.
export function mayHaveBeenBilled(error: unknown): boolean {
  return error instanceof Anthropic.APIUserAbortError || error instanceof Anthropic.APIConnectionError
}
