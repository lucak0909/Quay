import { useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage'
import { useMonthSpend } from '../cost/ledger'
import { formatUsd, PRICES } from '../cost/pricing'
import type { ProviderSettings } from '../db'
import { checkAnthropicKey } from '../providers/anthropic'
import { ANTHROPIC } from '../providers/catalog'
import { friendlyError, type FriendlyError } from '../providers/errors'
import { saveLimits, saveProviderSettings, useLimits, useProviderSettings, type Limits } from '../settings'
import { btn, btnDanger, btnSecondary, input, link, muted, okBox, panel } from '../ui'

export default function Settings() {
  const providers = useProviderSettings()
  const limits = useLimits()
  const spent = useMonthSpend()
  if (!providers || !limits || spent === undefined) return null
  const anthropic = providers.anthropic

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <AccountSection anthropic={anthropic} />
      <QualitySection anthropic={anthropic} />
      <SpendingSection limits={limits} spent={spent} />
      <details className={panel}>
        <summary className="cursor-pointer font-semibold">Advanced</summary>
        <div className="mt-4 space-y-6">
          <AdvancedModel key={anthropic.model} anthropic={anthropic} />
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Other AI companies</h3>
            <p className={muted}>Support for OpenAI and Google Gemini keys is coming soon.</p>
          </div>
        </div>
      </details>
    </div>
  )
}

type CheckState = { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok' } | { kind: 'error'; error: FriendlyError }

function AccountSection({ anthropic }: { anthropic: ProviderSettings }) {
  const [check, setCheck] = useState<CheckState>({ kind: 'idle' })
  const [confirmRemove, setConfirmRemove] = useState(false)

  if (!anthropic.apiKey) {
    return (
      <section className={`${panel} space-y-2`}>
        <h2 className="font-semibold">Your AI account</h2>
        <p className="text-sm">Not connected yet.</p>
        <Link to="/setup" className={btn}>
          Connect your AI account
        </Link>
      </section>
    )
  }

  async function runCheck() {
    if (check.kind === 'checking') return
    setCheck({ kind: 'checking' })
    try {
      await checkAnthropicKey(anthropic.apiKey)
      setCheck({ kind: 'ok' })
    } catch (e) {
      setCheck({ kind: 'error', error: friendlyError(e) })
    }
  }

  return (
    <section className={`${panel} space-y-3`}>
      <h2 className="font-semibold">Your AI account</h2>
      <p className="text-sm">
        Connected to Anthropic with the key ending in <code>…{anthropic.apiKey.slice(-4)}</code>. It's stored only on
        this device.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnSecondary} onClick={runCheck} disabled={check.kind === 'checking'}>
          {check.kind === 'checking' ? 'Checking…' : 'Check key (free)'}
        </button>
        <Link to="/setup" className={btnSecondary}>
          Replace key
        </Link>
        {confirmRemove ? (
          <>
            <button
              type="button"
              className={btnDanger}
              onClick={() => saveProviderSettings({ ...anthropic, apiKey: '' })}
            >
              Yes, remove it from this device
            </button>
            <button type="button" className={btnSecondary} onClick={() => setConfirmRemove(false)}>
              Keep it
            </button>
          </>
        ) : (
          <button type="button" className={btnDanger} onClick={() => setConfirmRemove(true)}>
            Remove key
          </button>
        )}
      </div>
      {check.kind === 'ok' && <p className={okBox}>Key works ✓</p>}
      {check.kind === 'error' && <ErrorMessage error={check.error} showInternalLinks={false} />}
    </section>
  )
}

function QualitySection({ anthropic }: { anthropic: ProviderSettings }) {
  const custom = !ANTHROPIC.presets.some((p) => p.model === anthropic.model)
  return (
    <section className={`${panel} space-y-3`}>
      <h2 className="font-semibold">Quality</h2>
      {ANTHROPIC.presets.map((p) => (
        <label key={p.id} className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="quality"
            className="mt-1"
            checked={anthropic.model === p.model}
            onChange={() => saveProviderSettings({ ...anthropic, model: p.model })}
          />
          <span>
            <span className="font-medium">{p.label}</span>
            <span className={`block ${muted}`}>{p.description}</span>
          </span>
        </label>
      ))}
      {custom && <p className={muted}>You're using a custom setting from Advanced.</p>}
    </section>
  )
}

function SpendingSection({ limits, spent }: { limits: Limits; spent: number }) {
  const [budget, setBudget] = useState(String(limits.monthlyBudget))
  const [threshold, setThreshold] = useState(String(limits.confirmThreshold))
  const [saved, setSaved] = useState(false)

  const budgetNum = Number(budget)
  const thresholdNum = Number(threshold)
  const valid = budget !== '' && threshold !== '' && budgetNum >= 0 && thresholdNum >= 0
  const dirty = budgetNum !== limits.monthlyBudget || thresholdNum !== limits.confirmThreshold

  return (
    <section className={`${panel} space-y-4`}>
      <div>
        <h2 className="font-semibold">Spending</h2>
        <p className="text-sm">
          You've spent <strong>{formatUsd(spent)}</strong> through StudyKey this month.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="block text-sm font-medium">Monthly budget ($)</span>
          <input
            type="number"
            min="0"
            step="0.5"
            className={input}
            value={budget}
            onChange={(e) => {
              setBudget(e.target.value)
              setSaved(false)
            }}
          />
          <span className={`block ${muted}`}>StudyKey stops before you go over this. Set 0 for no budget.</span>
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium">Double-check anything over ($)</span>
          <input
            type="number"
            min="0"
            step="0.05"
            className={input}
            value={threshold}
            onChange={(e) => {
              setThreshold(e.target.value)
              setSaved(false)
            }}
          />
          <span className={`block ${muted}`}>You'll be asked to confirm before a single request costs more than this.</span>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={btn}
          disabled={!valid || !dirty}
          onClick={async () => {
            await saveLimits({ monthlyBudget: budgetNum, confirmThreshold: thresholdNum })
            setSaved(true)
          }}
        >
          Save
        </button>
        {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
      </div>
      <p className={muted}>
        StudyKey's budget only covers what you do in StudyKey on this device. For a limit that can't be exceeded, also
        set one in your Anthropic account.{' '}
        <a href={ANTHROPIC.limitsUrl} target="_blank" rel="noreferrer" className={link}>
          Set a limit with Anthropic ↗
        </a>
      </p>
    </section>
  )
}

function AdvancedModel({ anthropic }: { anthropic: ProviderSettings }) {
  const [model, setModel] = useState(anthropic.model)
  const trimmed = model.trim()
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Model ID</h3>
      <p className={muted}>
        The exact Anthropic model name to use. Costs can only be estimated for {Object.keys(PRICES).join(' and ')}; for
        anything else you'll be asked to confirm each request.
      </p>
      <div className="flex gap-2">
        <input className={input} spellCheck={false} value={model} onChange={(e) => setModel(e.target.value)} />
        <button
          type="button"
          className={btnSecondary}
          disabled={!trimmed || trimmed === anthropic.model}
          onClick={() => saveProviderSettings({ ...anthropic, model: trimmed })}
        >
          Save
        </button>
      </div>
    </div>
  )
}
