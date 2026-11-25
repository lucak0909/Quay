import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Settings from './pages/Settings'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/settings', label: 'Settings' },
]

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <nav className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">StudyKey</span>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                isActive
                  ? 'text-sm font-medium text-slate-900 dark:text-white'
                  : 'text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
