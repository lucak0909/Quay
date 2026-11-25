import { useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage'
import { WhatIsAKey } from '../components/Explainer'
import { checkAnthropicKey } from '../providers/anthropic'
import { ACTIVE_PROVIDER as provider, guessProvider, providerInfo } from '../providers/catalog'
import { friendlyError, type FriendlyError } from '../providers/errors'
import { saveProviderSettings, useProviderSettings } from '../settings'
import { btn, input, link, muted, okBox, panel, warnBox } from '../ui'

type CheckState = { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok' } | { kind: 'error'; error: FriendlyError }

export default function Setup() {
  const providers = useProviderSettings()
  const [key, setKey] = useState('')
  const [check, setCheck] = useState<CheckState>({ kind: 'idle' })

  const trimmed = key.trim()
  const guessed = trimmed ? guessProvider(trimmed) : undefined
  const formatHint =
    !trimmed || guessed === provider.id
      ? null
      : guessed
        ? `This looks like a ${providerInfo(guessed).company} key. StudyKey can't use ${providerInfo(guessed).company} keys yet; ${provider.company} keys start with ${provider.keyPrefix}.`
        : `${provider.company} keys start with ${provider.keyPrefix}. Check that you copied the whole key.`

  async function checkAndSave() {
    if (check.kind === 'checking') return
    setCheck({ kind: 'checking' })
    try {
      await checkAnthropicKey(trimmed)
      await saveProviderSettings({
        provider: 'anthropic',
        apiKey: trimmed,
        model: providers?.anthropic.model || provider.presets[0].model,
      })
      setCheck({ kind: 'ok' })
    } catch (e) {
      setCheck({ kind: 'error', error: friendlyError(e) })
    }
  }

  const steps = [
    {
      title: `Create a free ${provider.company} account`,
      body: `${provider.company} makes ${provider.aiName}, the AI StudyKey will use. Sign up with your email or Google account.`,
      href: provider.signupUrl,
      cta: `Open ${provider.company}`,
    },
    {
      title: 'Add a little credit',
      body: 'Open Billing and buy a small amount of credit, for example $5. On the cheapest setting that covers hundreds of sets of notes. You only pay for what you use.',
      href: provider.billingUrl,
      cta: 'Open Billing',
    },
    {
      title: 'Set a monthly spending limit (recommended)',
      body: `Open Limits and set a monthly limit, for example $5. ${provider.company} will refuse anything past that, so you can never be charged more, even by mistake.`,
      href: provider.limitsUrl,
      cta: 'Open Limits',
    },
    {
      title: 'Create your key',
      body: `Open the keys page, create a new key, name it StudyKey, then copy it. It starts with ${provider.keyPrefix}. You can usually only see it once, so paste it below straight away.`,
      href: provider.keyUrl,
      cta: 'Open keys page',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Set up StudyKey</h1>
        <p className={muted}>
          You'll connect StudyKey to your own AI account. It takes about 5 minutes and you only do it once.
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.title} className={`${panel} flex gap-4`}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
              {i + 1}
            </span>
            <div className="space-y-2">
              <h2 className="font-medium">{s.title}</h2>
              <p className="text-sm">{s.body}</p>
              <a href={s.href} target="_blank" rel="noreferrer" className={`${link} text-sm`}>
                {s.cta} ↗
              </a>
            </div>
          </li>
        ))}
        <li className={`${panel} flex gap-4`}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
            {steps.length + 1}
          </span>
          <div className="w-full space-y-3">
            <h2 className="font-medium">Paste your key here</h2>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              className={input}
              placeholder={provider.keyPlaceholder}
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                setCheck({ kind: 'idle' })
              }}
            />
            {formatHint && <p className={warnBox}>{formatHint}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={btn}
                disabled={!trimmed || check.kind === 'checking'}
                onClick={checkAndSave}
              >
                {check.kind === 'checking' ? 'Checking…' : 'Check and save key'}
              </button>
              <span className={muted}>Checking your key is free.</span>
            </div>
            {check.kind === 'ok' && (
              <div className={okBox}>
                Key works ✓ and is saved on this device.{' '}
                <Link to="/generate" className="font-medium underline">
                  Make your first cards →
                </Link>
              </div>
            )}
            {check.kind === 'error' && <ErrorMessage error={check.error} showInternalLinks={false} />}
          </div>
        </li>
      </ol>

      <p className={muted}>Want to use OpenAI or Google Gemini instead? Support for those is coming soon.</p>
      <WhatIsAKey />
    </div>
  )
}
