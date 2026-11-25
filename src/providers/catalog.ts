export type ProviderId = 'anthropic' | 'openai' | 'gemini'

export interface ModelOption {
  id: string
  name: string
  // One plain sentence about when a student would pick it.
  about: string
}

export interface SetupStep {
  title: string
  body: string
  href: string
  cta: string
}

export interface ProviderInfo {
  id: ProviderId
  name: string
  company: string
  aiName: string
  keyPrefix: string
  keyPlaceholder: string
  billingUrl: string
  limitsUrl: string
  // Shown when choosing a provider; plain-language facts a student should know first.
  note?: string
  setupSteps: SetupStep[]
  // Current models with known prices. The picker sorts them by price.
  models: ModelOption[]
  // The default for new accounts: cheap and good at flashcards.
  recommended: string
}

// Alphabetical by company so no provider is presented as the default choice.
export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Claude by Anthropic',
    company: 'Anthropic',
    aiName: 'Claude',
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-...',
    billingUrl: 'https://platform.claude.com/settings/billing',
    limitsUrl: 'https://platform.claude.com/settings/limits',
    setupSteps: [
      {
        title: 'Create a free Anthropic account',
        body: 'Sign up with your email or Google account.',
        href: 'https://platform.claude.com/',
        cta: 'Open Anthropic',
      },
      {
        title: 'Add a little credit',
        body: 'Open Billing and buy a small amount of credit, for example $5. You only pay for what you use.',
        href: 'https://platform.claude.com/settings/billing',
        cta: 'Open Billing',
      },
      {
        title: 'Set a monthly spending limit (recommended)',
        body: 'Open Limits and set a monthly limit, for example $5. Anthropic will refuse anything past that, so you can never be charged more, even by mistake.',
        href: 'https://platform.claude.com/settings/limits',
        cta: 'Open Limits',
      },
      {
        title: 'Create your key',
        body: 'Open the keys page, click "Create Key", name it Quay, then copy it. It starts with sk-ant-. You can only see it once, so paste it below straight away.',
        href: 'https://platform.claude.com/settings/keys',
        cta: 'Open keys page',
      },
    ],
    models: [
      { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', about: 'Fastest and cheapest. Handles most class notes well.' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', about: 'The previous Haiku. Haiku 5.5 is newer and much cheaper.' },
      { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', about: 'A good balance of quality and speed. Worth it for dense or technical notes.' },
      { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', about: 'Stronger reasoning for hard subjects like advanced maths, law or medicine. Slower.' },
      { id: 'claude-fable-5-2', name: 'Claude Fable 5.2', about: 'Anthropic’s most capable model. Rarely needed for flashcards.' },
    ],
    recommended: 'claude-haiku-5-5',
  },
  {
    id: 'gemini',
    name: 'Gemini by Google',
    company: 'Google',
    aiName: 'Gemini',
    keyPrefix: 'AIza',
    keyPlaceholder: 'AIza...',
    billingUrl: 'https://aistudio.google.com/',
    limitsUrl: 'https://aistudio.google.com/',
    note: 'Has a free option with daily limits. On the free option, Google may use what you send to improve its products.',
    setupSteps: [
      {
        title: 'Sign in to Google AI Studio',
        body: 'Use your normal Google account.',
        href: 'https://aistudio.google.com/',
        cta: 'Open AI Studio',
      },
      {
        title: 'Create your key',
        body: 'Open the keys page, click "Create API key", then copy it. It starts with AIza.',
        href: 'https://aistudio.google.com/apikey',
        cta: 'Open keys page',
      },
      {
        title: 'Optional: turn on billing and set a spend cap',
        body: 'You can start free. If you hit the free daily limit, or don\'t want Google using your notes to improve its products, set up billing in AI Studio, then set a "Monthly spend cap" in its Spend tab. Google can take about 10 minutes to apply the cap.',
        href: 'https://aistudio.google.com/',
        cta: 'Open AI Studio',
      },
    ],
    models: [
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', about: 'An older, lighter model. Fine for short, simple notes.' },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', about: 'Cheap and capable. Handles most class notes well.' },
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', about: 'Better quality for tricky or technical material.' },
      { id: 'gemini-4-hydrogen', name: 'Gemini 4 Hydrogen', about: 'Google’s newer generation. Stronger on hard subjects.' },
      { id: 'gemini-4-neon', name: 'Gemini 4 Neon', about: 'The most capable Gemini here. Rarely needed for flashcards.' },
    ],
    recommended: 'gemini-3.5-flash-lite',
  },
  {
    id: 'openai',
    name: 'ChatGPT by OpenAI',
    company: 'OpenAI',
    aiName: 'ChatGPT',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-...',
    billingUrl: 'https://platform.openai.com/settings/organization/billing',
    limitsUrl: 'https://platform.openai.com/settings/organization/limits',
    note: 'A ChatGPT Plus subscription doesn\'t include this. It\'s a separate pay-as-you-go account.',
    setupSteps: [
      {
        title: 'Create an OpenAI developer account',
        body: 'Sign up or log in. Your ChatGPT login works, but billing is separate from any ChatGPT subscription.',
        href: 'https://platform.openai.com/',
        cta: 'Open OpenAI',
      },
      {
        title: 'Add a little credit',
        body: 'Open Billing and add a small amount of credit, for example $5. You only pay for what you use.',
        href: 'https://platform.openai.com/settings/organization/billing',
        cta: 'Open Billing',
      },
      {
        title: 'Set a monthly spending limit (recommended)',
        body: 'Open Limits, edit the spend limit, enter a monthly amount such as $5 and turn on "Enforce a hard limit". OpenAI will then refuse anything past that.',
        href: 'https://platform.openai.com/settings/organization/limits',
        cta: 'Open Limits',
      },
      {
        title: 'Create your key',
        body: 'Open the keys page, click "Create new secret key", name it Quay, then copy it. It starts with sk-. You can only see it once, so paste it below straight away.',
        href: 'https://platform.openai.com/api-keys',
        cta: 'Open keys page',
      },
    ],
    models: [
      { id: 'gpt-6-luna', name: 'GPT-6 Luna', about: 'Fastest and cheapest. Handles most class notes well.' },
      { id: 'gpt-6.1-terra', name: 'GPT-6.1 Terra', about: 'A step up in quality for tricky material.' },
      { id: 'gpt-6.2-sol', name: 'GPT-6.2 Sol', about: 'Higher quality again. Worth it for dense or technical notes.' },
      { id: 'gpt-6.2-astra', name: 'GPT-6.2 Astra', about: 'OpenAI’s most capable model. Rarely needed for flashcards.' },
    ],
    recommended: 'gpt-6-luna',
  },
]

export function providerInfo(id: ProviderId): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id)!
}

export function defaultModel(id: ProviderId): string {
  return providerInfo(id).recommended
}

// Returns the provider a pasted key appears to belong to, if it's recognisable.
export function guessProvider(key: string): ProviderId | undefined {
  const k = key.trim()
  if (k.startsWith('sk-ant-')) return 'anthropic'
  if (k.startsWith('AIza')) return 'gemini'
  if (k.startsWith('sk-')) return 'openai'
  return undefined
}
