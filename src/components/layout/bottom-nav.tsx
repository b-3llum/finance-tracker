'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Sparkles,
  Menu,
  Receipt,
  CreditCard,
  Target,
  DollarSign,
  TrendingUp,
  Upload,
  FileText,
  Brain,
  Settings,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/lib/i18n'

const primaryTabs = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/transactions', labelKey: 'transactions', icon: ArrowLeftRight },
  { href: '/budget', labelKey: 'budget', icon: PieChart },
  { href: '/intelligence', labelKey: 'intelligence', icon: Sparkles },
]

const moreItems = [
  { href: '/bills', labelKey: 'bills', icon: Receipt },
  { href: '/debts', labelKey: 'debts', icon: CreditCard },
  { href: '/savings', labelKey: 'savings', icon: Target },
  { href: '/net-worth', labelKey: 'netWorth', icon: DollarSign },
  { href: '/forecast', labelKey: 'forecast', icon: TrendingUp },
  { href: '/import', labelKey: 'import', icon: Upload },
  { href: '/reports', labelKey: 'reports', icon: FileText },
  { href: '/insights', labelKey: 'insights', icon: Brain },
  { href: '/settings', labelKey: 'settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useTranslations('nav')
  const [moreOpen, setMoreOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + '/')

  const isMoreActive = moreItems.some((item) => isActive(item.href))

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    if (moreOpen) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [moreOpen])

  // Close popover on route change
  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50" ref={popoverRef}>
      {/* More popup */}
      <div
        className={cn(
          'absolute bottom-full left-0 right-0 transition-all duration-300 ease-out',
          moreOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        {/* Backdrop overlay */}
        {moreOpen && (
          <div
            className="fixed inset-0 -z-10 bg-black/30 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
        )}

        <div className="mx-3 mb-2 rounded-2xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-border/50 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('more') ?? 'More'}
            </span>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="grid grid-cols-3 gap-1 px-2 pb-3">
            {moreItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-medium transition-all duration-150',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground active:scale-95'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="truncate max-w-full">{t(item.labelKey)}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border-t border-border/50 safe-area-pb">
        <div className="flex items-center justify-around px-2 h-16">
          {primaryTabs.map((tab) => {
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1.5 transition-all duration-200',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {active && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
                <tab.icon
                  className={cn(
                    'h-5 w-5 transition-transform duration-200',
                    active && 'scale-110'
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] font-medium transition-all duration-200 truncate max-w-full',
                    active ? 'opacity-100 max-h-4' : 'opacity-0 max-h-0 overflow-hidden'
                  )}
                >
                  {t(tab.labelKey)}
                </span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen((prev) => !prev)}
            className={cn(
              'relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1.5 transition-all duration-200',
              moreOpen || isMoreActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {isMoreActive && !moreOpen && (
              <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
            <Menu
              className={cn(
                'h-5 w-5 transition-transform duration-200',
                moreOpen && 'rotate-90 scale-110'
              )}
            />
            <span
              className={cn(
                'text-[10px] font-medium transition-all duration-200 truncate max-w-full',
                moreOpen || isMoreActive
                  ? 'opacity-100 max-h-4'
                  : 'opacity-0 max-h-0 overflow-hidden'
              )}
            >
              {t('more') ?? 'More'}
            </span>
          </button>
        </div>
      </nav>
    </div>
  )
}
