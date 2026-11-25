import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useSearchParams } from 'react-router-dom'
import { parseCards } from '../cards/parse'
import { buildGuidance, buildUserPrompt, FOCUS_OPTIONS, MAX_CONTEXT_LENGTH, SYSTEM_PROMPT } from '../cards/prompt'
import ErrorMessage from '../components/ErrorMessage'
import { checkBudget, needsExtraConfirm } from '../cost/budget'
import { estimateRequest } from '../cost/estimate'
import { recordSpend, useMonthSpend } from '../cost/ledger'
import { costUsd, formatUsd, priceFor } from '../cost/pricing'
import { db } from '../db'
import { flattenTree } from '../folders/tree'
import { loadAdapter } from '../providers'
import { friendlyError, mayHaveBeenBilled, type FriendlyError } from '../providers/errors'
import { saveProviderSettings, useActiveProvider, useLimits } from '../settings'
import { btn, btnDanger, btnSecondary, input, link, muted, panel, warnBox , title } from '../ui'

const CARD_COUNTS = [5, 10, 20, 30]
const MAX_INPUT_TOKENS = 150_000
const DRAFT_KEY = 'generateDraft'

interface Draft {
  id: string
  front: string
  back: string
  problem?: string
}

interface SavedDraft {
  notes: string
  drafts: Draft[]
  context?: string
  focus?: string[]
}

type Status = { kind: 'idle' } | { kind: 'confirming' } | { kind: 'pending' } | { kind: 'error'; error: FriendlyError }

export default function Generate() {
  const active = useActiveProvider()
  const limits = useLimits()
  const spent = useMonthSpend()
  const decks = useLiveQuery(() => db.decks.orderBy('updatedAt').reverse().toArray())
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [loaded, setLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [context, setContext] = useState('')
  const [focus, setFocus] = useState<string[]>([])
  const [contextOpen, setContextOpen] = useState(false)
  const showContext = contextOpen || context.trim() !== '' || focus.length > 0
  const [cardCount, setCardCount] = useState(10)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [overBudgetOnce, setOverBudgetOnce] = useState(false)
  const [notices, setNotices] = useState<string[]>([])
  const [lastCost, setLastCost] = useState<string | null>(null)
  const [deckChoice, setDeckChoice] = useState(params.get('deck') ?? 'new')
  const [newDeckName, setNewDeckName] = useState('')
  const folders = useLiveQuery(() => db.folders.toArray())
  const [folderChoice, setFolderChoice] = useState(params.get('folder') ?? '')
  const inFlight = useRef(false)
  const controller = useRef<AbortController | null>(null)

  // Unsaved cards were paid for, so they survive navigation and reloads.
  // Opened from a note ("Make cards"): start from that note, unless there are unsaved cards to deal with first.
  const noteId = params.get('note')
  useEffect(() => {
    Promise.all([db.appSettings.get(DRAFT_KEY), noteId ? db.notes.get(noteId) : undefined]).then(([row, note]) => {
      const saved = row ? (JSON.parse(row.value) as SavedDraft) : undefined
      if (note && !saved?.drafts.length) {
        setNotes(note.text)
        setNewDeckName(note.name)
        setFolderChoice(note.folderId ?? '')
        setContext(saved?.context ?? '')
        setFocus(saved?.focus ?? [])
      } else if (saved) {
        setNotes(saved.notes)
        setDrafts(saved.drafts)
        setContext(saved.context ?? '')
        setFocus(saved.focus ?? [])
      }
      setLoaded(true)
    })
  }, [noteId])

  useEffect(() => {
    if (!loaded) return
    const value: SavedDraft = { notes, drafts, context, focus }
    db.appSettings.put({ key: DRAFT_KEY, value: JSON.stringify(value) })
  }, [loaded, notes, drafts, context, focus])

  useEffect(() => () => controller.current?.abort(), [])

  const pending = status.kind === 'pending'
  const blocker = useBlocker(pending)
  useEffect(() => {
    if (!pending) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [pending])

  if (active === undefined || !limits || spent === undefined || !loaded) return null

  if (active === null) {
    return (
      <div className="space-y-3">
        <h1 className={title}>Make cards</h1>
        <p className={warnBox}>
          Connect your AI account first. <Link to="/setup" className="font-medium underline">Set up Quay</Link>
        </p>
      </div>
    )
  }

  const { info: provider, settings: account } = active
  const model = account.model
  const userPrompt = buildUserPrompt(notes, cardCount, buildGuidance(context, focus))
  const estimate = estimateRequest(model, SYSTEM_PROMPT + userPrompt, cardCount)
  const budgetStatus = checkBudget(spent, estimate.maxCost, limits.monthlyBudget)
  const tooLong = estimate.inputTokens > MAX_INPUT_TOKENS
  const blocked = budgetStatus === 'over' && !overBudgetOnce
  const extraConfirm = needsExtraConfirm(estimate.maxCost, limits.confirmThreshold)
  const canSend = notes.trim().length > 0 && !tooLong && !blocked && !pending
  const preset = provider.presets.find((p) => p.model === model)

  function resetConfirm() {
    if (status.kind === 'confirming') setStatus({ kind: 'idle' })
  }

  async function generate() {
    if (inFlight.current || !canSend) return
    if (extraConfirm && status.kind !== 'confirming') {
      setStatus({ kind: 'confirming' })
      return
    }
    inFlight.current = true
    const ac = new AbortController()
    controller.current = ac
    setStatus({ kind: 'pending' })
    setNotices([])
    try {
      const adapter = await loadAdapter(provider.id)
      const result = await adapter.generate({
        apiKey: account.apiKey,
        model,
        system: SYSTEM_PROMPT,
        user: userPrompt,
        maxTokens: estimate.maxOutputTokens,
        signal: ac.signal,
      })
      const price = priceFor(model)
      const cost = price ? costUsd(price, result.inputTokens, result.outputTokens) : 0
      await recordSpend({
        provider: provider.id,
        model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cost,
        estimated: false,
      })
      setLastCost(price ? formatUsd(cost) : null)

      const parsed = parseCards(result.text)
      const next: string[] = []
      if (result.stopReason === 'refusal') next.push('The AI declined to make cards from these notes.')
      else if (result.stopReason === 'length') next.push('The AI hit its length limit, so the last card may be missing.')
      if (parsed.cards.length + parsed.rejected.length === 0 && result.stopReason !== 'refusal') {
        next.push('No cards came back. Try adding more detail to your notes.')
      }
      if (parsed.rejected.length > 0) next.push('Some cards came back incomplete. They are marked below so you can fix or delete them.')
      setNotices(next)
      setDrafts((d) => [
        ...d,
        ...parsed.cards.map((c) => ({ id: crypto.randomUUID(), ...c })),
        ...parsed.rejected.map((r) => ({ id: crypto.randomUUID(), front: r.front, back: r.back, problem: r.reason })),
      ])
      setStatus({ kind: 'idle' })
    } catch (e) {
      if (mayHaveBeenBilled(e) && estimate.maxCost !== null) {
        await recordSpend({
          provider: provider.id,
          model,
          inputTokens: estimate.inputTokens,
          outputTokens: estimate.maxOutputTokens,
          cost: estimate.maxCost,
          estimated: true,
        })
      }
      const error = friendlyError(e, provider)
      if (error.cancelled) {
        setStatus({ kind: 'idle' })
        setNotices([
          'Cancelled. If the AI had already started, you may still be charged, so the most it could have cost has been added to this month’s total.',
        ])
      } else {
        setStatus({ kind: 'error', error })
      }
    } finally {
      inFlight.current = false
      controller.current = null
      setOverBudgetOnce(false)
    }
  }

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  const incomplete = drafts.filter((d) => !d.front.trim() || !d.back.trim()).length
  const deckValid = deckChoice !== 'new' || newDeckName.trim().length > 0

  async function save() {
    if (drafts.length === 0 || incomplete > 0 || !deckValid) return
    const now = Date.now()
    const deckId = deckChoice === 'new' ? crypto.randomUUID() : deckChoice
    await db.transaction('rw', db.decks, db.cards, async () => {
      if (deckChoice === 'new') {
        const folderId = folders?.some((f) => f.id === folderChoice) ? folderChoice : undefined
        await db.decks.add({ id: deckId, name: newDeckName.trim(), folderId, createdAt: now, updatedAt: now })
      } else {
        await db.decks.update(deckId, { updatedAt: now })
      }
      await db.cards.bulkAdd(
        drafts.map((d) => ({ id: d.id, deckId, front: d.front.trim(), back: d.back.trim(), createdAt: now, updatedAt: now })),
      )
    })
    setDrafts([])
    setNotes('')
    navigate(`/decks/${deckId}`)
  }

  const budgetText =
    limits.monthlyBudget > 0
      ? `Spent this month: ${formatUsd(spent)} of your ${formatUsd(limits.monthlyBudget)} budget.`
      : `Spent this month: ${formatUsd(spent)} (no monthly budget set).`

  return (
    <div className="space-y-6">
      <h1 className={title}>Make cards</h1>

      {blocker.state === 'blocked' && (
        <div className={`${warnBox} space-y-2`}>
          <p>Your cards are still being written. If you leave now the request is cancelled, and you may still be charged for it.</p>
          <div className="flex gap-2">
            <button type="button" className={btn} onClick={() => blocker.reset()}>
              Stay on this page
            </button>
            <button type="button" className={btnSecondary} onClick={() => blocker.proceed()}>
              Leave and cancel
            </button>
          </div>
        </div>
      )}

      <section className={`${panel} space-y-4`}>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Your notes</span>
          <textarea
            className={`${input} min-h-56`}
            placeholder="Paste your class notes, a textbook section or a study guide here…"
            value={notes}
            disabled={pending}
            onChange={(e) => {
              setNotes(e.target.value)
              resetConfirm()
            }}
          />
        </label>

        {!showContext ? (
          <button type="button" className={`${link} text-sm`} onClick={() => setContextOpen(true)} disabled={pending}>
            + Add context for the AI (optional)
          </button>
        ) : (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">
              Tell the AI about this <span className="font-normal text-slate-500">(optional)</span>
            </span>
            <input
              className={input}
              maxLength={MAX_CONTEXT_LENGTH}
              placeholder="e.g. A-level biology, exam on Friday, my teacher loves asking about the Calvin cycle"
              value={context}
              disabled={pending}
              onChange={(e) => {
                setContext(e.target.value)
                resetConfirm()
              }}
            />
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="What to focus on">
            {FOCUS_OPTIONS.map((f) => {
              const on = focus.includes(f.id)
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  disabled={pending}
                  onClick={() => {
                    setFocus((fs) => (on ? fs.filter((x) => x !== f.id) : [...fs, f.id]))
                    resetConfirm()
                  }}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    on
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  {on ? '✓ ' : ''}
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>
        )}

        <div className="flex flex-wrap gap-6">
          <label className="space-y-1">
            <span className="block text-sm font-medium">How many cards?</span>
            <select
              className={input}
              value={cardCount}
              disabled={pending}
              onChange={(e) => {
                setCardCount(Number(e.target.value))
                resetConfirm()
              }}
            >
              {CARD_COUNTS.map((n) => (
                <option key={n} value={n}>
                  Up to {n}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Quality</legend>
            {provider.presets.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="quality"
                  checked={model === p.model}
                  disabled={pending}
                  onChange={() => {
                    saveProviderSettings({ ...account, model: p.model })
                    resetConfirm()
                  }}
                />
                {p.label}
              </label>
            ))}
            {!preset && <p className={muted}>Custom setting (see Advanced in Settings)</p>}
          </fieldset>
        </div>

        <div className="space-y-2 glass-inset rounded-2xl p-3.5 text-sm">
          {estimate.typicalCost !== null && estimate.maxCost !== null ? (
            <p>
              Estimated cost: <strong>about {formatUsd(estimate.typicalCost)}</strong>{' '}
              <span className={muted}>(no more than {formatUsd(estimate.maxCost)})</span>
            </p>
          ) : (
            <p>We can't estimate the cost for this AI setting, so you'll be asked to confirm before sending.</p>
          )}
          <p className={muted}>
            {budgetText}{' '}
            <Link to="/settings" className={link}>
              Change
            </Link>
          </p>
          {tooLong && <p className={warnBox}>These notes are too long to send in one go. Split them into smaller parts.</p>}
          {budgetStatus === 'warn' && <p className={warnBox}>This would bring you close to your monthly budget.</p>}
          {budgetStatus === 'over' && (
            <div className={warnBox}>
              <p>This would go over your monthly budget, so it's been stopped.</p>
              <label className="mt-2 flex items-center gap-2">
                <input type="checkbox" checked={overBudgetOnce} onChange={(e) => setOverBudgetOnce(e.target.checked)} />
                Go over my budget just this once
              </label>
            </div>
          )}
        </div>

        {status.kind === 'confirming' ? (
          <div className="space-y-2">
            <p className="text-sm">
              {estimate.maxCost !== null
                ? `This request could cost up to ${formatUsd(estimate.maxCost)}. Send it?`
                : "We can't estimate the cost of this request. Send it anyway?"}
            </p>
            <div className="flex gap-2">
              <button type="button" className={btn} onClick={generate} disabled={!canSend}>
                {estimate.maxCost !== null ? `Yes, spend up to ${formatUsd(estimate.maxCost)}` : 'Yes, send anyway'}
              </button>
              <button type="button" className={btnSecondary} onClick={() => setStatus({ kind: 'idle' })}>
                Go back
              </button>
            </div>
          </div>
        ) : pending ? (
          <div className="flex items-center gap-3">
            <span className="text-sm">Writing your cards… this usually takes 10–30 seconds.</span>
            <button type="button" className={btnSecondary} onClick={() => controller.current?.abort()}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className={btn} onClick={generate} disabled={!canSend}>
            {drafts.length > 0 ? 'Make more cards' : 'Make cards'}
          </button>
        )}

        {status.kind === 'error' && (
          <div className="space-y-2">
            <ErrorMessage error={status.error} />
            <p className={muted}>Nothing is retried automatically. Press the button again when you're ready.</p>
          </div>
        )}
        {notices.map((n) => (
          <p key={n} className={warnBox}>
            {n}
          </p>
        ))}
      </section>

      {drafts.length > 0 && (
        <section className={`${panel} space-y-4`}>
          <div>
            <h2 className="text-lg font-semibold">Review your cards ({drafts.length})</h2>
            <p className={muted}>
              {lastCost && <>That cost {lastCost}. </>}Edit anything that's wrong, delete what you don't need, then save.
            </p>
          </div>

          <ul className="space-y-3">
            {drafts.map((d, i) => (
              <li
                key={d.id}
                className={`space-y-2 rounded-xl border p-3 ${
                  d.problem ? 'border-amber-400 dark:border-amber-600' : 'border-black/[.06] dark:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={muted}>
                    Card {i + 1}
                    {d.problem && <span className="ml-2 font-medium text-amber-700 dark:text-amber-300">{d.problem}</span>}
                  </span>
                  <button
                    type="button"
                    className={btnDanger}
                    onClick={() => setDrafts((ds) => ds.filter((x) => x.id !== d.id))}
                  >
                    Delete
                  </button>
                </div>
                <textarea
                  aria-label={`Card ${i + 1} question`}
                  className={input}
                  rows={2}
                  placeholder="Question"
                  value={d.front}
                  onChange={(e) => updateDraft(d.id, { front: e.target.value })}
                />
                <textarea
                  aria-label={`Card ${i + 1} answer`}
                  className={input}
                  rows={2}
                  placeholder="Answer"
                  value={d.back}
                  onChange={(e) => updateDraft(d.id, { back: e.target.value })}
                />
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={btnSecondary}
            onClick={() => setDrafts((ds) => [...ds, { id: crypto.randomUUID(), front: '', back: '' }])}
          >
            Add a card
          </button>

          <div className="flex flex-wrap items-end gap-3 border-t border-black/[.06] pt-4 dark:border-white/10">
            <label className="space-y-1">
              <span className="block text-sm font-medium">Save to</span>
              <select className={input} value={deckChoice} onChange={(e) => setDeckChoice(e.target.value)}>
                <option value="new">A new deck</option>
                {decks?.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
            </label>
            {deckChoice === 'new' && (
              <label className="space-y-1">
                <span className="block text-sm font-medium">Deck name</span>
                <input
                  className={input}
                  placeholder="e.g. Biology – Photosynthesis"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                />
              </label>
            )}
            {deckChoice === 'new' && folders && folders.length > 0 && (
              <label className="space-y-1">
                <span className="block text-sm font-medium">In folder</span>
                <select className={input} value={folderChoice} onChange={(e) => setFolderChoice(e.target.value)}>
                  <option value="">No folder</option>
                  {flattenTree(folders).map(({ folder, depth }) => (
                    <option key={folder.id} value={folder.id}>
                      {'  '.repeat(depth)}
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button type="button" className={btn} onClick={save} disabled={incomplete > 0 || !deckValid}>
              Save {drafts.length} cards
            </button>
          </div>
          {incomplete > 0 && (
            <p className={warnBox}>
              {incomplete === 1 ? '1 card is' : `${incomplete} cards are`} missing a question or answer. Fill them in or
              delete them to save.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
