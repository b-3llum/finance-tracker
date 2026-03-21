'use client'

import { useState, useEffect } from 'react'
import { useApi, apiPut } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Save, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham' },
  { code: 'TND', symbol: 'DT', name: 'Tunisian Dinar' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
]

export default function SettingsPage() {
  const { data: settings, refetch } = useApi<Record<string, string>>('/api/settings')
  const [form, setForm] = useState({
    currency: 'USD',
    currency_symbol: '$',
    ollama_url: 'http://localhost:11434',
    ollama_model: 'llama3',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; models: string[] } | null>(null)
  const [checkingOllama, setCheckingOllama] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')
  const [balanceSaving, setBalanceSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        currency: settings.currency || 'USD',
        currency_symbol: settings.currency_symbol || '$',
        ollama_url: settings.ollama_url || 'http://localhost:11434',
        ollama_model: settings.ollama_model || 'llama3',
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

  async function checkOllama() {
    setCheckingOllama(true)
    try {
      const res = await fetch(`${form.ollama_url}/api/tags`)
      if (res.ok) {
        const data = await res.json()
        setOllamaStatus({
          available: true,
          models: data.models?.map((m: any) => m.name) || [],
        })
      } else {
        setOllamaStatus({ available: false, models: [] })
      }
    } catch {
      setOllamaStatus({ available: false, models: [] })
    } finally {
      setCheckingOllama(false)
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

      {/* Ollama Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Ollama AI</CardTitle>
          <CardDescription>Configure your local AI connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={checkOllama} disabled={checkingOllama}>
              {checkingOllama ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Test Connection'}
            </Button>

            {ollamaStatus && (
              <div className="flex items-center gap-2">
                {ollamaStatus.available ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-emerald-600">Connected</span>
                    {ollamaStatus.models.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Models: {ollamaStatus.models.join(', ')}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-500">Not connected</span>
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
