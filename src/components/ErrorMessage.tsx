import { Link } from 'react-router-dom'
import type { FriendlyError } from '../providers/errors'
import { errorBox } from '../ui'

export default function ErrorMessage({ error, showInternalLinks = true }: { error: FriendlyError; showInternalLinks?: boolean }) {
  const l = error.link
  const external = l?.href.startsWith('http')
  return (
    <div className={errorBox}>
      {error.message}
      {l && external && (
        <>
          {' '}
          <a href={l.href} target="_blank" rel="noreferrer" className="font-medium underline">
            {l.label} ↗
          </a>
        </>
      )}
      {l && !external && showInternalLinks && (
        <>
          {' '}
          <Link to={l.href} className="font-medium underline">
            {l.label}
          </Link>
        </>
      )}
    </div>
  )
}
