import type { ProviderInfo } from '../providers/catalog'
import { modelChoices } from '../providers/presets'
import { formatUsd } from '../cost/pricing'
import { input, muted } from '../ui'

// Pick a model by name and price rather than by its technical ID.
export default function ModelPicker({
  provider,
  value,
  onChange,
  disabled,
  label = 'AI model',
}: {
  provider: ProviderInfo
  value: string
  onChange: (model: string) => void
  disabled?: boolean
  label?: string
}) {
  const choices = modelChoices(provider)
  const current = choices.find((c) => c.id === value)
  const cheapest = choices[0]
  const dearest = choices.at(-1)
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium">{label}</span>
      <select className={input} value={current ? value : 'custom'} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {choices.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
        {!current && (
          <option value="custom" disabled>
            {value} (custom model; cost can't be estimated)
          </option>
        )}
      </select>
      {current && (
        <span className={`block ${muted}`}>
          {current.about}
          {cheapest && dearest && cheapest !== dearest && (
            <>
              {' '}
              Prices range from {formatUsd(cheapest.perSet)} to {formatUsd(dearest.perSet)} per 10 pages.
            </>
          )}
        </span>
      )}
    </label>
  )
}

