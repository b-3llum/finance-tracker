'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  FileText,
  Brain,
  Settings,
  Wallet,
  Menu,
  X,
  LogOut,
  Receipt,
  CreditCard,
  TrendingUp,
  Upload,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ThemeToggle } from '@/components/theme-toggle'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/bills', label: 'Bills', icon: Receipt },
  { href: '/budget', label: 'Budget', icon: PieChart },
  { href: '/debts', label: 'Debts', icon: CreditCard },
  { href: '/savings', label: 'Savings', icon: Target },
  { href: '/net-worth', label: 'Net Worth', icon: DollarSign },
  { href: '/forecast', label: 'Forecast', icon: TrendingUp },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/insights', label: 'AI Insights', icon: Brain },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-background border rounded-xl p-2 shadow-md transition-all duration-150 active:scale-95"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border/50 transition-transform duration-300 ease-out lg:translate-x-0 flex flex-col',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-3 px-6 py-6 border-b border-border/50">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">FinTrack</h1>
            <p className="text-xs text-muted-foreground">Personal Finance</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item, i) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-0.5'
                )}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-full" />
                )}
                <item.icon className="h-4 w-4 transition-transform duration-150 group-hover:scale-105" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <ThemeToggle />

        {/* User section */}
        {user && (
          <div className="border-t border-border/50 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                  {(user.name || user.email)?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  {user.name && <p className="text-sm font-medium truncate">{user.name}</p>}
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150 active:scale-95 shrink-0"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
