'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import en from '@/messages/en.json'
import fr from '@/messages/fr.json'

type Messages = typeof en
type Locale = 'en' | 'fr'

const messages: Record<Locale, Messages> = { en, fr }

type TParams = Record<string, string | number> | string

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: TParams) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(settings => {
        if (settings?.language && (settings.language === 'en' || settings.language === 'fr')) {
          setLocaleState(settings.language)
        }
      })
      .catch(() => {})
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: newLocale }),
    }).catch(() => {})
  }, [])

  const t = useCallback((key: string, params?: TParams): string => {
    const fallback = typeof params === 'string' ? params : undefined
    const interpolation = typeof params === 'object' ? params : undefined

    const parts = key.split('.')
    let value: any = messages[locale]
    for (const part of parts) {
      value = value?.[part]
      if (value === undefined) return fallback || key
    }
    if (typeof value !== 'string') return fallback || key
    if (interpolation) {
      return value.replace(/\{(\w+)\}/g, (_, k) => String(interpolation[k] ?? `{${k}}`))
    }
    return value
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

export function useTranslations(namespace?: string) {
  const { t, locale } = useContext(I18nContext)
  const translate = useCallback(
    (key: string, params?: TParams) => {
      const fullKey = namespace ? `${namespace}.${key}` : key
      return t(fullKey, params)
    },
    [t, namespace]
  )
  return { t: translate, locale }
}
