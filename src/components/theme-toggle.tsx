'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(t: Theme) {
  const resolved = t === 'system' ? getSystemTheme() : t
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    const initial = stored || 'system'
    setThemeState(initial)
    applyTheme(initial)
    setMounted(true)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if ((localStorage.getItem('theme') || 'system') === 'system') {
        applyTheme('system')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem('theme', t)
    applyTheme(t)
  }, [])

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ]

  if (!mounted) return null

  return (
    <div className="px-3 pb-3">
      <div className="flex items-center bg-secondary rounded-xl p-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
              theme === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title={opt.label}
          >
            <opt.icon className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
