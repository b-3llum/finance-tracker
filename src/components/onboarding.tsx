'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/lib/i18n'
import { apiPut, apiPost } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Wallet, Upload, DollarSign, CheckCircle, ArrowRight, ArrowLeft, X } from 'lucide-react'

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

const TOTAL_STEPS = 4

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslations('onboarding')
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [isAnimating, setIsAnimating] = useState(false)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [balance, setBalance] = useState('')
  const [saving, setSaving] = useState(false)

  const goToStep = useCallback((newStep: number) => {
    if (isAnimating) return
    setDirection(newStep > step ? 'forward' : 'backward')
    setIsAnimating(true)
    setTimeout(() => {
      setStep(newStep)
      setIsAnimating(false)
    }, 200)
  }, [step, isAnimating])

  async function handleSkip() {
    await finishOnboarding()
  }

  async function finishOnboarding() {
    setSaving(true)
    try {
      await apiPost('/api/auth/onboarding', {})
      onComplete()
    } catch {
      // Still dismiss on error so user is not stuck
      onComplete()
    } finally {
      setSaving(false)
    }
  }

  async function handleStep1Next() {
    if (name.trim()) {
      try {
        await apiPut('/api/settings', { user_name: name.trim() })
      } catch {
        // non-blocking
      }
    }
    goToStep(2)
  }

  function handleStep2Upload() {
    // Mark onboarding complete then navigate to import
    finishOnboarding().then(() => router.push('/import'))
  }

  async function handleStep3Next() {
    setSaving(true)
    try {
      const curr = CURRENCIES.find(c => c.code === currency)
      await apiPut('/api/settings', {
        currency: curr?.code ?? 'USD',
        currency_symbol: curr?.symbol ?? '$',
      })
      if (balance) {
        await apiPut('/api/accounts', { current_balance: parseFloat(balance) })
      }
    } catch {
      // non-blocking
    } finally {
      setSaving(false)
    }
    goToStep(4)
  }

  async function handleFinish() {
    await finishOnboarding()
    router.push('/dashboard')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <style>{`
        .onboarding-enter-forward {
          animation: slideInRight 0.3s ease-out forwards;
        }
        .onboarding-enter-backward {
          animation: slideInLeft 0.3s ease-out forwards;
        }
        .onboarding-exit {
          opacity: 0;
          transform: scale(0.95);
          transition: all 0.2s ease-in;
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px) scale(0.97); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px) scale(0.97); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .check-animate {
          animation: checkPop 0.5s ease-out 0.2s forwards;
          opacity: 0;
        }
      `}</style>

      <div className="w-full max-w-lg mx-4">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i + 1 === step
                  ? 'w-8 bg-primary'
                  : i + 1 < step
                    ? 'w-2 bg-primary/60'
                    : 'w-2 bg-white/30'
              }`}
            />
          ))}
          <span className="ml-3 text-xs text-white/70">
            {t('step', { current: step, total: TOTAL_STEPS })}
          </span>
        </div>

        <Card
          className={`border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl ${
            isAnimating
              ? 'onboarding-exit'
              : direction === 'forward'
                ? 'onboarding-enter-forward'
                : 'onboarding-enter-backward'
          }`}
        >
          <CardContent className="p-8">
            {/* Skip button */}
            {step < TOTAL_STEPS && (
              <div className="flex justify-end -mt-2 -mr-2 mb-2">
                <button
                  onClick={handleSkip}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                  title={t('skip')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Step 1: Welcome + Name */}
            {step === 1 && (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <Wallet className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{t('welcome')}</h2>
                  <p className="text-muted-foreground mt-2">{t('welcomeDesc')}</p>
                </div>
                <div className="text-left space-y-2">
                  <label className="text-sm font-medium">{t('whatsYourName')}</label>
                  <Input
                    placeholder={t('namePlaceholder')}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleStep1Next()}
                    autoFocus
                  />
                </div>
                <Button onClick={handleStep1Next} className="w-full">
                  {t('next')} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Import data */}
            {step === 2 && (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{t('importData')}</h2>
                  <p className="text-muted-foreground mt-2">{t('importDesc')}</p>
                </div>
                <div className="border-2 border-dashed border-border/50 rounded-2xl p-8 bg-white/5">
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">CSV, TSV, PDF</p>
                </div>
                <div className="space-y-3">
                  <Button onClick={handleStep2Upload} className="w-full">
                    <Upload className="h-4 w-4" /> {t('uploadFile')}
                  </Button>
                  <button
                    onClick={() => goToStep(3)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {t('skipForNow')}
                  </button>
                </div>
                <div className="flex justify-start">
                  <Button variant="ghost" size="sm" onClick={() => goToStep(1)}>
                    <ArrowLeft className="h-4 w-4" /> {t('back')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Currency + Balance */}
            {step === 3 && (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{t('setCurrency')}</h2>
                  <p className="text-muted-foreground mt-2">{t('currencyDesc')}</p>
                </div>
                <div className="text-left space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('setCurrency')}</label>
                    <Select value={currency} onChange={e => setCurrency(e.target.value)}>
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.symbol} - {c.name} ({c.code})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('startingBalance')}</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={balance}
                      onChange={e => setBalance(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleStep3Next()}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
                    <ArrowLeft className="h-4 w-4" /> {t('back')}
                  </Button>
                  <Button onClick={handleStep3Next} disabled={saving}>
                    {t('next')} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: All done */}
            {step === 4 && (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center check-animate">
                    <CheckCircle className="h-10 w-10 text-emerald-500" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{t('allDone')}</h2>
                  <p className="text-muted-foreground mt-2">{t('allDoneDesc')}</p>
                </div>
                <Button onClick={handleFinish} className="w-full" disabled={saving}>
                  {t('goToDashboard')} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
