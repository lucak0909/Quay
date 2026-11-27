import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { backupFileName, createBackup, readBackup, restoreBackup, saveBackupFile, type Backup, type BackupSummary } from '../backup'
import Dialog from '../components/Dialog'
import ErrorMessage from '../components/ErrorMessage'
import { useMonthSpend } from '../cost/ledger'
import { formatUsd } from '../cost/pricing'
import { loadAdapter } from '../providers'
import { friendlyError, type FriendlyError } from '../providers/errors'
import ModelPicker from '../components/ModelPicker'
import { saveLimits, saveProviderSettings, useActiveProvider, useLimits, type ActiveProvider, type Limits } from '../settings'
import { isDesktop } from '../desktop'
import { APP_VERSION, checkForUpdate, type AvailableUpdate } from '../updates'
import { btn, btnDanger, btnSecondary, errorBox, input, link, muted, okBox, panel, title } from '../ui'

export default function Settings() {
  const active = useActiveProvider()
  const limits = useLimits()
  const spent = useMonthSpend()
  if (active === undefined || !limits || spent === undefined) return null

  return (
    <div className="space-y-6">
      <h1 className={title}>Settings</h1>
      {active ? (
        <>
          <AccountSection key={active.info.id} active={active} />
          <QualitySection active={active} />
        </>
      ) : (
        <section className={`${panel} space-y-2`}>
          <h2 className="font-semibold">Your AI account</h2>
          <p className="text-sm">Not connected yet.</p>
          <Link to="/setup" className={btn}>
            Connect your AI account
          </Link>
        </section>
      )}
      <SpendingSection limits={limits} spent={spent} active={active} />
      <BackupSection />
      <AboutSection />
      {active && (
        <details className={panel}>
          <summary className="cursor-pointer font-semibold">Advanced</summary>
          <div className="mt-4 space-y-6">
            <AdvancedModel key={`${active.info.id}:${active.settings.model}`} active={active} />
          </div>
        </details>
      )}
    </div>
  )
}

type CheckState = { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok' } | { kind: 'error'; error: FriendlyError }

function AccountSection({ active }: { active: ActiveProvider }) {
  const { info, settings } = active
  const [check, setCheck] = useState<CheckState>({ kind: 'idle' })
  const [confirmRemove, setConfirmRemove] = useState(false)

  async function runCheck() {
    if (check.kind === 'checking') return
    setCheck({ kind: 'checking' })
    try {
      const adapter = await loadAdapter(info.id)
      await adapter.checkKey(settings.apiKey)
      setCheck({ kind: 'ok' })
    } catch (e) {
      setCheck({ kind: 'error', error: friendlyError(e, info) })
    }
  }

  return (
    <section className={`${panel} space-y-3`}>
      <h2 className="font-semibold">Your AI account</h2>
      <p className="text-sm">
        Connected to <strong>{info.name}</strong> with the key ending in <code>…{settings.apiKey.slice(-4)}</code>.
        It's stored only on this device.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnSecondary} onClick={runCheck} disabled={check.kind === 'checking'}>
          {check.kind === 'checking' ? 'Checking…' : 'Check key (free)'}
        </button>
        <Link to="/setup" className={btnSecondary}>
          Switch AI company or key
        </Link>
        {confirmRemove ? (
          <>
            <button
              type="button"
              className={btnDanger}
              onClick={() => saveProviderSettings({ ...settings, apiKey: '' })}
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

function QualitySection({ active }: { active: ActiveProvider }) {
  const { info, settings } = active
  return (
    <section className={`${panel} space-y-3`}>
      <h2 className="font-semibold">AI model</h2>
      <ModelPicker
        provider={info}
        value={settings.model}
        label={`Which ${info.aiName} model to use`}
        onChange={(model) => saveProviderSettings({ ...settings, model })}
      />
    </section>
  )
}

function SpendingSection({ limits, spent, active }: { limits: Limits; spent: number; active: ActiveProvider | null }) {
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
          You've spent <strong>{formatUsd(spent)}</strong> through Quay this month.
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
          <span className={`block ${muted}`}>Quay stops before you go over this. Set 0 for no budget.</span>
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
        Quay's budget only covers what you do in Quay on this device. For a limit that can't be exceeded, also
        set one in your AI account.{' '}
        {active && (
          <a href={active.info.limitsUrl} target="_blank" rel="noreferrer" className={link}>
            Set a spending limit with {active.info.company} ↗
          </a>
        )}
      </p>
    </section>
  )
}

function AdvancedModel({ active }: { active: ActiveProvider }) {
  const { info, settings } = active
  const [model, setModel] = useState(settings.model)
  const trimmed = model.trim()
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Model ID</h3>
      <p className={muted}>
        For a model that isn't in the list above: its exact name as listed by {info.company}. Quay can't estimate its
        cost, so you'll be asked to confirm each request.
      </p>
      <div className="flex gap-2">
        <input className={input} spellCheck={false} value={model} onChange={(e) => setModel(e.target.value)} />
        <button
          type="button"
          className={btnSecondary}
          disabled={!trimmed || trimmed === settings.model}
          onClick={() => saveProviderSettings({ ...settings, model: trimmed })}
        >
          Save
        </button>
      </div>
    </div>
  )
}

function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [pending, setPending] = useState<{ backup: Backup; summary: BackupSummary } | null>(null)

  async function save() {
    setStatus(null)
    try {
      const result = await saveBackupFile(await createBackup(APP_VERSION))
      if (result === 'saved') setStatus({ kind: 'ok', text: `Saved as ${backupFileName()}. Keep it somewhere safe, like a cloud folder or USB stick.` })
    } catch {
      setStatus({ kind: 'error', text: "The backup couldn't be saved. Try a different folder." })
    }
  }

  async function choose(file: File | undefined) {
    setStatus(null)
    if (!file) return
    try {
      setPending(readBackup(await file.text()))
    } catch (e) {
      setStatus({ kind: 'error', text: (e as Error).message })
    }
  }

  return (
    <section className={`${panel} space-y-3`}>
      <div>
        <h2 className="font-semibold">Backup</h2>
        <p className={muted}>
          Save your whole library (notes, folders, decks, cards and study progress) to one file, and restore it on this or
          another computer. Your AI key isn't included.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={save}>
          Save a backup
        </button>
        <button type="button" className={btnSecondary} onClick={() => fileRef.current?.click()}>
          Restore from a backup…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Choose a backup file"
          onChange={(e) => {
            choose(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      {status && <p className={status.kind === 'ok' ? okBox : errorBox}>{status.text}</p>}
      {pending && (
        <Dialog title="Restore this backup?" onClose={() => setPending(null)}>
          <p className="text-sm">
            It has {pending.summary.notes} {pending.summary.notes === 1 ? 'note' : 'notes'}, {pending.summary.decks}{' '}
            {pending.summary.decks === 1 ? 'deck' : 'decks'} ({pending.summary.cards} cards) and {pending.summary.folders}{' '}
            {pending.summary.folders === 1 ? 'folder' : 'folders'}
            {pending.summary.exportedAt ? `, saved ${new Date(pending.summary.exportedAt).toLocaleString()}` : ''}.
          </p>
          <p className="text-sm">
            Restoring <strong>replaces everything</strong> in Quay on this computer with the backup. Your AI account stays
            connected. If you're not sure, save a backup of what's here first.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnDanger}
              onClick={async () => {
                const { backup } = pending
                setPending(null)
                try {
                  await restoreBackup(backup)
                  setStatus({ kind: 'ok', text: 'Restored. Your library now matches the backup.' })
                } catch {
                  setStatus({ kind: 'error', text: "The backup couldn't be restored. Nothing was changed." })
                }
              }}
            >
              Replace with backup
            </button>
            <button type="button" className={btnSecondary} onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </Dialog>
      )}
    </section>
  )
}

function AboutSection() {
  const [state, setState] = useState<'idle' | 'checking' | 'latest' | 'failed' | 'installing'>('idle')
  const [update, setUpdate] = useState<AvailableUpdate | null>(null)

  async function check() {
    setState('checking')
    try {
      const found = await checkForUpdate()
      setUpdate(found)
      setState(found ? 'idle' : 'latest')
    } catch {
      setState('failed')
    }
  }

  return (
    <section className={`${panel} space-y-3`}>
      <div>
        <h2 className="font-semibold">About Quay</h2>
        <p className={muted}>
          Version {APP_VERSION}. Free and open source.{' '}
          <a href="https://github.com/lucak0909/Quay" target="_blank" rel="noreferrer" className={link}>
            Source code ↗
          </a>{' '}
          ·{' '}
          <a href="mailto:quaygit@gmail.com" className={link}>
            Get in touch
          </a>
        </p>
      </div>
      {isDesktop ? (
        <div className="flex flex-wrap items-center gap-3">
          {update ? (
            <button
              type="button"
              className={btn}
              disabled={state === 'installing'}
              onClick={() => {
                setState('installing')
                update.install(() => {}).catch(() => setState('failed'))
              }}
            >
              {state === 'installing' ? 'Updating…' : `Update to ${update.version} and restart`}
            </button>
          ) : (
            <button type="button" className={btnSecondary} disabled={state === 'checking'} onClick={check}>
              {state === 'checking' ? 'Checking…' : 'Check for updates'}
            </button>
          )}
          {state === 'latest' && <span className={muted}>You have the latest version.</span>}
          {state === 'failed' && <span className={muted}>Couldn't check right now. Try again later.</span>}
        </div>
      ) : (
        <p className={muted}>This is the web version, which is always up to date.</p>
      )}
    </section>
  )
}