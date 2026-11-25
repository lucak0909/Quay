import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage'
import { WhatIsAKey } from '../components/Explainer'
import { formatUsd, typicalSetCost } from '../cost/pricing'
import { guessProvider, providerInfo, PROVIDERS, type ProviderInfo } from '../providers/catalog'
import { cheapestModel } from '../providers/presets'
import { friendlyError, type FriendlyError } from '../providers/errors'
import { loadAdapter } from '../providers'
import { saveProviderSettings, setActiveProvider, useProviderSettings } from '../settings'
import { btn, btnSecondary, input, link, muted, okBox, panel, warnBox , title } from '../ui'

export default function Setup() {
  const [params, setParams] = useSearchParams()
  const chosen = PROVIDERS.find((p) => p.id === params.get('provider'))
  return chosen ? (
    <ProviderSteps key={chosen.id} provider={chosen} onChoose={(id) => setParams(id ? { provider: id } : {})} />
  ) : (
    <ChooseProvider onChoose={(id) => setParams({ provider: id })} />
  )
}

function ChooseProvider({ onChoose }: { onChoose: (id: ProviderInfo['id']) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className={title}>Set up Quay</h1>
        <p className={muted}>
          Quay works with several AI companies. Pick one to connect. You can switch at any time in Settings.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {PROVIDERS.map((p) => {
          const cost = typicalSetCost(cheapestModel(p))
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChoose(p.id)}
              className={`${panel} flex flex-col items-start justify-start gap-2 text-left hover:border-indigo-400 dark:hover:border-indigo-500`}
            >
              <span className="block font-semibold">{p.name}</span>
              {cost !== undefined && (
                <span className="block text-sm">About {formatUsd(cost)} for 10 pages of notes</span>
              )}
              {p.note && <span className={`block ${muted}`}>{p.note}</span>}
            </button>
          )
        })}
      </div>
      <p className={muted}>Prices are for each company's cheapest setting.</p>
      <WhatIsAKey />
    </div>
  )
}

type CheckState = { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok' } | { kind: 'error'; error: FriendlyError }

function ProviderSteps({
  provider,
  onChoose,
}: {
  provider: ProviderInfo
  onChoose: (id: ProviderInfo['id'] | null) => void
}) {
  const providers = useProviderSettings()
  const [key, setKey] = useState('')
  const [check, setCheck] = useState<CheckState>({ kind: 'idle' })

  const trimmed = key.trim()
  const guessed = trimmed ? guessProvider(trimmed) : undefined
  const otherProvider = guessed && guessed !== provider.id ? providerInfo(guessed) : undefined

  async function checkAndSave() {
    if (check.kind === 'checking') return
    setCheck({ kind: 'checking' })
    try {
      const adapter = await loadAdapter(provider.id)
      await adapter.checkKey(trimmed)
      await saveProviderSettings({
        provider: provider.id,
        apiKey: trimmed,
        model: providers?.[provider.id].model || provider.recommended,
      })
      await setActiveProvider(provider.id)
      setCheck({ kind: 'ok' })
    } catch (e) {
      setCheck({ kind: 'error', error: friendlyError(e, provider) })
    }
  }

  const stepNumber = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white'

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <button type="button" className={`${link} text-sm`} onClick={() => onChoose(null)}>
          ← Choose a different AI company
        </button>
        <h1 className={title}>Connect {provider.name}</h1>
        <p className={muted}>It takes about 5 minutes and you only do it once.</p>
      </div>

      <ol className="space-y-3">
        {provider.setupSteps.map((s, i) => (
          <li key={s.title} className={`${panel} flex gap-4`}>
            <span className={stepNumber}>{i + 1}</span>
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
          <span className={stepNumber}>{provider.setupSteps.length + 1}</span>
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
            {otherProvider ? (
              <div className={`${warnBox} space-y-2`}>
                <p>This looks like a {otherProvider.company} key, not a {provider.company} key.</p>
                <button type="button" className={btnSecondary} onClick={() => onChoose(otherProvider.id)}>
                  Switch to {otherProvider.name}
                </button>
              </div>
            ) : (
              trimmed &&
              !guessed && (
                <p className={warnBox}>
                  {provider.company} keys start with {provider.keyPrefix}. Check that you copied the whole key.
                </p>
              )
            )}
            <div className="flex items-center gap-3">
              <button type="button" className={btn} disabled={!trimmed || check.kind === 'checking'} onClick={checkAndSave}>
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
      <WhatIsAKey />
    </div>
  )
}
