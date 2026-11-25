import { Link, NavLink, Outlet } from 'react-router-dom'
import { useMonthSpend } from './cost/ledger'
import { formatUsd } from './cost/pricing'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/generate', label: 'Make cards' },
  { to: '/decks', label: 'Library' },
  { to: '/help', label: 'Help' },
  { to: '/settings', label: 'Settings' },
]

export default function App() {
  const spent = useMonthSpend()

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400">
            <img src="/favicon.svg" alt="" className="h-6 w-6" />
            Quay
          </Link>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'text-sm font-medium text-slate-900 dark:text-white'
                  : 'text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }
            >
              {item.label}
            </NavLink>
          ))}
          {spent !== undefined && (
            <Link
              to="/settings"
              title="What you've spent with your AI account this month, through Quay"
              className="ml-auto text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              This month: {formatUsd(spent)}
            </Link>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
