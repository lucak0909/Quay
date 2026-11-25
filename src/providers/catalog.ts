export type ProviderId = 'anthropic' | 'openai' | 'gemini'

export interface QualityPreset {
  id: 'cheapest' | 'quality'
  label: string
  description: string
  model: string
}

export interface ProviderInfo {
  id: ProviderId
  name: string
  company: string
  aiName: string
  supported: boolean
  keyPrefix: string
  keyPlaceholder: string
  signupUrl: string
  billingUrl: string
  limitsUrl: string
  keyUrl: string
  presets: QualityPreset[]
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    company: 'Anthropic',
    aiName: 'Claude',
    supported: true,
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-...',
    signupUrl: 'https://platform.claude.com/',
    billingUrl: 'https://platform.claude.com/settings/billing',
    limitsUrl: 'https://platform.claude.com/settings/limits',
    keyUrl: 'https://platform.claude.com/settings/keys',
    presets: [
      {
        id: 'cheapest',
        label: 'Cheapest (recommended)',
        description: 'Great for flashcards. About 2 cents for 10 pages of notes.',
        model: 'claude-haiku-4-5',
      },
      {
        id: 'quality',
        label: 'Higher quality',
        description: 'Better at tricky or technical material. About 2× the cost.',
        model: 'claude-sonnet-5',
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    company: 'OpenAI',
    aiName: 'ChatGPT',
    supported: false,
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-...',
    signupUrl: 'https://platform.openai.com/',
    billingUrl: 'https://platform.openai.com/settings/organization/billing',
    limitsUrl: 'https://platform.openai.com/settings/organization/limits',
    keyUrl: 'https://platform.openai.com/api-keys',
    presets: [],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    company: 'Google',
    aiName: 'Gemini',
    supported: false,
    keyPrefix: 'AIza',
    keyPlaceholder: 'AIza...',
    signupUrl: 'https://aistudio.google.com/',
    billingUrl: 'https://aistudio.google.com/',
    limitsUrl: 'https://aistudio.google.com/',
    keyUrl: 'https://aistudio.google.com/apikey',
    presets: [],
  },
]

export function providerInfo(id: ProviderId): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id)!
}

// The provider StudyKey generates with. Only one is supported until the others' adapters exist.
export const ACTIVE_PROVIDER = PROVIDERS.find((p) => p.supported)!

export function defaultModel(id: ProviderId): string {
  return providerInfo(id).presets[0]?.model ?? ''
}

// Returns the provider a pasted key appears to belong to, if it's recognisable.
export function guessProvider(key: string): ProviderId | undefined {
  const k = key.trim()
  if (k.startsWith('sk-ant-')) return 'anthropic'
  if (k.startsWith('AIza')) return 'gemini'
  if (k.startsWith('sk-')) return 'openai'
  return undefined
}
