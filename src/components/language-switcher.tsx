'use client'

import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <div className="flex rounded-lg bg-muted p-0.5 text-xs font-medium">
          <button
            onClick={() => setLocale('en')}
            className={cn(
              'px-2.5 py-1 rounded-md transition-all duration-150',
              locale === 'en' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            EN
          </button>
          <button
            onClick={() => setLocale('fr')}
            className={cn(
              'px-2.5 py-1 rounded-md transition-all duration-150',
              locale === 'fr' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            FR
          </button>
        </div>
      </div>
    </div>
  )
}
