export type ProviderId = 'anthropic' | 'openai' | 'gemini'

export interface ProviderInfo {
  id: ProviderId
  name: string
  keyUrl: string
  keyPlaceholder: string
  defaultModel: string
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-...',
    defaultModel: 'claude-haiku-4-5-20251001',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-...',
    defaultModel: '',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyPlaceholder: 'AIza...',
    defaultModel: '',
  },
]
