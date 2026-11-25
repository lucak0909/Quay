export type ProviderId = 'anthropic' | 'openai' | 'gemini'

export interface QualityPreset {
  id: 'cheapest' | 'quality'
  label: string
  model: string
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
  presets: [QualityPreset, QualityPreset]
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
        body: 'Open the keys page, click "Create Key", name it StudyKey, then copy it. It starts with sk-ant-. You can only see it once, so paste it below straight away.',
        href: 'https://platform.claude.com/settings/keys',
        cta: 'Open keys page',
      },
    ],
    presets: [
      { id: 'cheapest', label: 'Cheapest (recommended)', model: 'claude-haiku-4-5' },
      { id: 'quality', label: 'Higher quality', model: 'claude-sonnet-5' },
    ],
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
    presets: [
      { id: 'cheapest', label: 'Cheapest (recommended)', model: 'gemini-3.5-flash-lite' },
      { id: 'quality', label: 'Higher quality', model: 'gemini-3.8-flash' },
    ],
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
        body: 'Open the keys page, click "Create new secret key", name it StudyKey, then copy it. It starts with sk-. You can only see it once, so paste it below straight away.',
        href: 'https://platform.openai.com/api-keys',
        cta: 'Open keys page',
      },
    ],
    presets: [
      { id: 'cheapest', label: 'Cheapest (recommended)', model: 'gpt-6-luna' },
      { id: 'quality', label: 'Higher quality', model: 'gpt-6.1-terra' },
    ],
  },
]

export function providerInfo(id: ProviderId): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id)!
}

export function defaultModel(id: ProviderId): string {
  return providerInfo(id).presets[0].model
}

// Returns the provider a pasted key appears to belong to, if it's recognisable.
export function guessProvider(key: string): ProviderId | undefined {
  const k = key.trim()
  if (k.startsWith('sk-ant-')) return 'anthropic'
  if (k.startsWith('AIza')) return 'gemini'
  if (k.startsWith('sk-')) return 'openai'
  return undefined
}
