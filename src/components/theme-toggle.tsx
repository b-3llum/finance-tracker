'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'oled-dark'

const THEME_KEY = 'theme'
const THEME_CLASSES = ['dark', 'oled-dark'] as const

function applyTheme(theme: Theme) {
  const root = document.documentElement
  // Remove all theme classes first
  THEME_CLASSES.forEach(cls => root.classList.remove(cls))

  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'oled-dark') {
    root.classList.add('oled-dark')
  }
  // 'light' = no class needed
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'oled-dark') {
    return stored
  }
  // Default based on system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const initial = getStoredTheme()
    setThemeState(initial)
    applyTheme(initial)
    setMounted(true)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem(THEME_KEY, t)
    applyTheme(t)
  }, [])

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'oled-dark' as const, icon: Circle, label: 'OLED' },
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
