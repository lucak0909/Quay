import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useMonthSpend } from './cost/ledger'
import { formatUsd } from './cost/pricing'

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
)

const navItems = [
  { to: '/', label: 'Home', short: 'Home', icon: icon(<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />) },
  {
    to: '/generate',
    label: 'Make cards',
    short: 'Make',
    icon: icon(<path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9zM18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z" />),
  },
  { to: '/decks', label: 'Library', short: 'Library', icon: icon(<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />) },
  {
    to: '/help',
    label: 'Help',
    short: 'Help',
    icon: icon(
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M9.7 9.5a2.4 2.4 0 1 1 3.4 2.2c-.7.3-1.1.9-1.1 1.6v.4M12 16.6v.1" />
      </>,
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    short: 'Settings',
    icon: icon(
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2.1-1.2L14.2 3h-4.4l-.4 2.6a7 7 0 0 0-2.1 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2.1 1.2l.4 2.6h4.4l.4-2.6a7 7 0 0 0 2.1-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />
      </>,
    ),
  },
]

export default function App() {
  const spent = useMonthSpend()

  return (
    <div className="min-h-screen">
      <header className="scroll-edge-top sticky top-0 z-30 px-3 pt-3">
        <nav className="glass glass-blur mx-auto flex max-w-4xl items-center gap-1 rounded-full py-1.5 pl-2 pr-1.5">
          <Link to="/" className="mr-2 flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-[15px] font-bold tracking-tight">
            <img src="/favicon.svg" alt="" className="h-7 w-7 drop-shadow-sm" />
            Quay
          </Link>
          <div className="hidden items-center gap-0.5 sm:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-1.5 text-sm transition ${
                    isActive
                      ? 'bg-white/90 font-semibold text-slate-900 shadow-[0_1px_3px_rgb(15_23_42/0.12),inset_0_1px_0_white] dark:bg-white/15 dark:text-white dark:shadow-none'
                      : 'text-slate-600 hover:bg-white/50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          {spent !== undefined && (
            <Link
              to="/settings"
              title="What you've spent with your AI account this month, through Quay"
              className="ml-auto rounded-full bg-white/50 px-3 py-1.5 text-xs font-medium tabular-nums text-slate-600 hover:bg-white/80 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
            >
              {formatUsd(spent)} this month
            </Link>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-32 pt-8 sm:pb-16">
        <Outlet />
      </main>

      {/* Phones: a floating tab bar at the bottom, like iOS. */}
      <div className="scroll-edge-bottom fixed inset-x-0 bottom-0 z-30 px-3 pb-3 sm:hidden">
      <nav className="glass glass-blur no-scrollbar flex justify-between gap-1 overflow-x-auto rounded-full p-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex min-w-14 flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[11px] font-medium transition ${
                isActive
                  ? 'bg-white/90 text-indigo-600 shadow-[0_1px_3px_rgb(15_23_42/0.12)] dark:bg-white/15 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-300'
              }`
            }
          >
            {item.icon}
            {item.short}
          </NavLink>
        ))}
      </nav>
      </div>
    </div>
  )
}
