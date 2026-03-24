'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi, apiPut } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { Save, CheckCircle, XCircle, RefreshCw, Brain, Key, Eye, EyeOff, Sun, Moon, Circle } from 'lucide-react'
import { useTranslations, useI18n } from '@/lib/i18n'

type Theme = 'light' | 'dark' | 'oled-dark'

const THEME_KEY = 'theme'
const THEME_CLASSES = ['dark', 'oled-dark'] as const

function applyTheme(theme: Theme) {
  const root = document.documentElement
  THEME_CLASSES.forEach(cls => root.classList.remove(cls))
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'oled-dark') {
    root.classList.add('oled-dark')
  }
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'oled-dark') {
    return stored
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '\u20ac', name: 'Euro' },
  { code: 'GBP', symbol: '\u00a3', name: 'British Pound' },
  { code: 'JPY', symbol: '\u00a5', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '\u00a5', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '\u20b9', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham' },
  { code: 'TND', symbol: 'DT', name: 'Tunisian Dinar' },
  { code: 'EGP', symbol: 'E\u00a3', name: 'Egyptian Pound' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
]

const glassCard = 'backdrop-blur-md bg-background/70 border-border/50 shadow-lg'

export default function SettingsPage() {
  const { t } = useTranslations('settings')
  const { locale, setLocale } = useI18n()
  const { data: settings, refetch } = useApi<Record<string, string>>('/api/settings')
  const [form, setForm] = useState({
    currency: 'USD',
    currency_symbol: '$',
    ai_provider: 'ollama',
    ollama_url: 'http://localhost:11434',
    ollama_model: 'llama3',
    claude_api_key: '',
    claude_model: 'claude-sonnet-4-6',
    openai_api_key: '',
    openai_model: 'gpt-4o',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiStatus, setAiStatus] = useState<{ available: boolean; detail: string } | null>(null)
  const [checkingAI, setCheckingAI] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')
  const [balanceSaving, setBalanceSaving] = useState(false)
  const [showClaudeKey, setShowClaudeKey] = useState(false)
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const initial = getStoredTheme()
    setThemeState(initial)
    setMounted(true)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem(THEME_KEY, t)
    applyTheme(t)
  }, [])

  useEffect(() => {
    if (settings) {
      setForm({
        currency: settings.currency || 'USD',
        currency_symbol: settings.currency_symbol || '$',
        ai_provider: settings.ai_provider || 'ollama',
        ollama_url: settings.ollama_url || 'http://localhost:11434',
        ollama_model: settings.ollama_model || 'llama3',
        claude_api_key: settings.claude_api_key || '',
        claude_model: settings.claude_model || 'claude-sonnet-4-6',
        openai_api_key: settings.openai_api_key || '',
        openai_model: settings.openai_model || 'gpt-4o',
      })
    }
  }, [settings])

  async function saveSettings() {
    setSaving(true)
    try {
      await apiPut('/api/settings', form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function checkAI() {
    setCheckingAI(true)
    setAiStatus(null)
    try {
      // Save settings first so the server uses the current provider
      await apiPut('/api/settings', form)
      const res = await fetch('/api/ai/status')
      const data = await res.json()
      setAiStatus(data)
    } catch {
      setAiStatus({ available: false, detail: 'Failed to check status' })
    } finally {
      setCheckingAI(false)
    }
  }

  async function setBalance() {
    if (!balanceInput) return
    setBalanceSaving(true)
    try {
      await apiPut('/api/accounts', { current_balance: parseFloat(balanceInput) })
      setBalanceInput('')
      toast.success('Balance updated successfully!')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBalanceSaving(false)
    }
  }

  function handleCurrencyChange(code: string) {
    const currency = CURRENCIES.find(c => c.code === code)
    if (currency) {
      setForm(f => ({ ...f, currency: currency.code, currency_symbol: currency.symbol }))
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Set Initial Balance */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle>{t('accountBalance')}</CardTitle>
          <CardDescription>{t('setBalance')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="number"
              step="0.01"
              placeholder={t('enterBalance')}
              value={balanceInput}
              onChange={e => setBalanceInput(e.target.value)}
            />
            <Button onClick={setBalance} disabled={balanceSaving || !balanceInput}>
              {balanceSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : t('setBalanceBtn')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Currency */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle>{t('currency')}</CardTitle>
          <CardDescription>{t('chooseCurrency')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={form.currency} onChange={e => handleCurrencyChange(e.target.value)}>
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.symbol} - {c.name} ({c.code})</option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {/* Language */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle>{t('language')}</CardTitle>
          <CardDescription>{t('chooseLanguage')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'en' as const, flag: '\ud83c\uddfa\ud83c\uddf8', label: 'English' },
              { id: 'fr' as const, flag: '\ud83c\uddeb\ud83c\uddf7', label: 'Fran\u00e7ais' },
            ].map(lang => (
              <button
                key={lang.id}
                onClick={() => setLocale(lang.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-150 cursor-pointer ${
                  locale === lang.id
                    ? 'border-primary bg-primary/10 text-primary shadow-md'
                    : 'border-input hover:bg-accent hover:border-accent-foreground/20'
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      {mounted && (
        <Card className={glassCard}>
          <CardHeader>
            <CardTitle>{t('theme')}</CardTitle>
            <CardDescription>{t('chooseTheme')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  id: 'light' as Theme,
                  label: t('light'),
                  icon: Sun,
                  previewBg: 'bg-white',
                  previewBorder: 'border-gray-200',
                  previewBar: 'bg-gray-200',
                  previewText: 'bg-gray-300',
                },
                {
                  id: 'dark' as Theme,
                  label: t('dark'),
                  icon: Moon,
                  previewBg: 'bg-zinc-800',
                  previewBorder: 'border-zinc-700',
                  previewBar: 'bg-zinc-600',
                  previewText: 'bg-zinc-500',
                },
                {
                  id: 'oled-dark' as Theme,
                  label: t('oledDark'),
                  icon: Circle,
                  previewBg: 'bg-black',
                  previewBorder: 'border-zinc-800',
                  previewBar: 'bg-zinc-800',
                  previewText: 'bg-zinc-700',
                },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-150 cursor-pointer ${
                    theme === opt.id
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-input hover:bg-accent hover:border-accent-foreground/20'
                  }`}
                >
                  {/* Mini preview card */}
                  <div className={`w-full aspect-[4/3] rounded-lg border ${opt.previewBorder} ${opt.previewBg} p-2 flex flex-col gap-1.5`}>
                    <div className={`h-1.5 w-3/4 rounded-full ${opt.previewBar}`} />
                    <div className={`h-1.5 w-1/2 rounded-full ${opt.previewText}`} />
                    <div className="flex-1" />
                    <div className={`h-1.5 w-full rounded-full ${opt.previewBar}`} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <opt.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Provider Selection */}
      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" /> {t('aiProvider')}
          </CardTitle>
          <CardDescription>{t('chooseAI')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'ollama', label: 'Ollama', desc: t('local') },
              { id: 'claude', label: 'Claude', desc: 'Anthropic API' },
              { id: 'openai', label: 'OpenAI', desc: 'GPT API' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setForm(f => ({ ...f, ai_provider: p.id }))}
                className={`p-3 rounded-lg border text-center transition-colors cursor-pointer ${
                  form.ai_provider === p.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input hover:bg-accent'
                }`}
              >
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </button>
            ))}
          </div>

          {/* Ollama settings */}
          {form.ai_provider === 'ollama' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-sm font-medium">Ollama URL</label>
                <Input
                  value={form.ollama_url}
                  onChange={e => setForm(f => ({ ...f, ollama_url: e.target.value }))}
                  placeholder="http://localhost:11434"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('model')}</label>
                <Input
                  value={form.ollama_model}
                  onChange={e => setForm(f => ({ ...f, ollama_model: e.target.value }))}
                  placeholder="llama3"
                />
              </div>
            </div>
          )}

          {/* Claude settings */}
          {form.ai_provider === 'claude' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-sm font-medium flex items-center gap-1">
                  <Key className="h-3 w-3" /> {t('apiKey')}
                </label>
                <div className="flex gap-2">
                  <Input
                    type={showClaudeKey ? 'text' : 'password'}
                    value={form.claude_api_key}
                    onChange={e => setForm(f => ({ ...f, claude_api_key: e.target.value }))}
                    placeholder="sk-ant-..."
                  />
                  <Button variant="ghost" size="icon" onClick={() => setShowClaudeKey(!showClaudeKey)}>
                    {showClaudeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t('model')}</label>
                <Select value={form.claude_model} onChange={e => setForm(f => ({ ...f, claude_model: e.target.value }))}>
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (recommended)</option>
                  <option value="claude-opus-4-6">Claude Opus 4.6</option>
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (fast/cheap)</option>
                </Select>
              </div>
            </div>
          )}

          {/* OpenAI settings */}
          {form.ai_provider === 'openai' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-sm font-medium flex items-center gap-1">
                  <Key className="h-3 w-3" /> {t('apiKey')}
                </label>
                <div className="flex gap-2">
                  <Input
                    type={showOpenAIKey ? 'text' : 'password'}
                    value={form.openai_api_key}
                    onChange={e => setForm(f => ({ ...f, openai_api_key: e.target.value }))}
                    placeholder="sk-..."
                  />
                  <Button variant="ghost" size="icon" onClick={() => setShowOpenAIKey(!showOpenAIKey)}>
                    {showOpenAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t('model')}</label>
                <Select value={form.openai_model} onChange={e => setForm(f => ({ ...f, openai_model: e.target.value }))}>
                  <option value="gpt-4o">GPT-4o (recommended)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (fast/cheap)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </Select>
              </div>
            </div>
          )}

          {/* Test Connection */}
          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" onClick={checkAI} disabled={checkingAI}>
              {checkingAI ? <RefreshCw className="h-4 w-4 animate-spin" /> : t('testConnection')}
            </Button>
            {aiStatus && (
              <div className="flex items-center gap-2">
                {aiStatus.available ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-emerald-600">{t('connected')}</span>
                    <span className="text-xs text-muted-foreground">{aiStatus.detail}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-500">{aiStatus.detail}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
        {saving ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <><CheckCircle className="h-4 w-4" /> {t('saved')}</>
        ) : (
          <><Save className="h-4 w-4" /> {t('saveSettings')}</>
        )}
      </Button>
    </div>
  )
}
