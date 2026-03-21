'use client'

import { useState, useEffect } from 'react'
import { useApi, apiPut } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Save, CheckCircle, XCircle, RefreshCw, Brain, Key, Eye, EyeOff } from 'lucide-react'

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

export default function SettingsPage() {
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
      alert(e.message)
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
      alert('Balance updated successfully!')
    } catch (e: any) {
      alert(e.message)
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your financial tracker</p>
      </div>

      {/* Set Initial Balance */}
      <Card>
        <CardHeader>
          <CardTitle>Account Balance</CardTitle>
          <CardDescription>Set or correct your current account balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="number"
              step="0.01"
              placeholder="Enter current balance"
              value={balanceInput}
              onChange={e => setBalanceInput(e.target.value)}
            />
            <Button onClick={setBalance} disabled={balanceSaving || !balanceInput}>
              {balanceSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Set Balance'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Currency */}
      <Card>
        <CardHeader>
          <CardTitle>Currency</CardTitle>
          <CardDescription>Choose your currency for display</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={form.currency} onChange={e => handleCurrencyChange(e.target.value)}>
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.symbol} - {c.name} ({c.code})</option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {/* AI Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" /> AI Provider
          </CardTitle>
          <CardDescription>Choose which AI powers your insights</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'ollama', label: 'Ollama', desc: 'Local (free)' },
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
                <label className="text-sm font-medium">Model</label>
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
                  <Key className="h-3 w-3" /> API Key
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
                <label className="text-sm font-medium">Model</label>
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
                  <Key className="h-3 w-3" /> API Key
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
                <label className="text-sm font-medium">Model</label>
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
              {checkingAI ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Test Connection'}
            </Button>
            {aiStatus && (
              <div className="flex items-center gap-2">
                {aiStatus.available ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-emerald-600">Connected</span>
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
          <><CheckCircle className="h-4 w-4" /> Saved!</>
        ) : (
          <><Save className="h-4 w-4" /> Save Settings</>
        )}
      </Button>
    </div>
  )
}
