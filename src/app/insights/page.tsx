'use client'

import { useState, useRef, useEffect } from 'react'
import { useApi, apiPost } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Brain,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Lightbulb,
  Send,
  User,
  Bot,
  TrendingUp,
} from 'lucide-react'
import type { SpendingProfile } from '@/lib/types'

export default function InsightsPage() {
  const { data: profileData, refetch: refetchProfile } = useApi<any>('/api/ai/profile')
  const { data: settings } = useApi<Record<string, string>>('/api/settings')
  const [generating, setGenerating] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [optimization, setOptimization] = useState<any>(null)

  // Chat state
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const sym = settings?.currency_symbol || '$'

  const profile: SpendingProfile | null = profileData?.profile_data
    ? (typeof profileData.profile_data === 'string' ? JSON.parse(profileData.profile_data) : profileData.profile_data)
    : null

  const dataDays = profileData?.data_days || profileData?.error ? 0 : null

  async function generateProfile() {
    setGenerating(true)
    try {
      await apiPost('/api/ai/profile', {})
      refetchProfile()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function getOptimization() {
    setOptimizing(true)
    try {
      const result = await apiPost('/api/ai/optimize', {})
      setOptimization(result)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setOptimizing(false)
    }
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const question = chatInput
    setChatInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setChatLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })

      if (!res.ok) throw new Error('Chat request failed')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')

      let assistantMsg = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantMsg += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantMsg }
          return updated
        })
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}. Make sure Ollama is running.` }])
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Insights</h1>
        <p className="text-muted-foreground">Powered by Ollama (llama3)</p>
      </div>

      {/* Spending Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Spending Profile
              </CardTitle>
              <CardDescription>
                {profile
                  ? `Based on ${profileData.data_days} days of data (v${profileData.version})`
                  : 'Generate a profile from your spending data'}
              </CardDescription>
            </div>
            <Button onClick={generateProfile} disabled={generating} variant="outline">
              {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {profile ? 'Refresh' : 'Generate'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!profile ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              {profileData?.data_days !== undefined
                ? `Need at least 14 days of transaction data. Currently: ${profileData.data_days} days.`
                : 'Click Generate to create your spending profile.'}
            </p>
          ) : (
            <div className="space-y-6">
              {profile.personality_type && (
                <div className="text-center py-4">
                  <Badge variant="default" className="text-base px-4 py-1">{profile.personality_type}</Badge>
                  {profile.description && (
                    <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{profile.description}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.good_habits && profile.good_habits.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <ThumbsUp className="h-4 w-4 text-emerald-500" /> Good Habits
                    </h4>
                    <ul className="space-y-1">
                      {profile.good_habits.map((h, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5">+</span> {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {profile.bad_habits && profile.bad_habits.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <ThumbsDown className="h-4 w-4 text-red-500" /> Areas to Improve
                    </h4>
                    <ul className="space-y-1">
                      {profile.bad_habits.map((h, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">-</span> {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {profile.risk_factors && profile.risk_factors.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Risk Factors
                  </h4>
                  <ul className="space-y-1">
                    {profile.risk_factors.map((r, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {profile.tips && profile.tips.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-primary" /> Tips
                  </h4>
                  <ul className="space-y-1">
                    {profile.tips.map((t, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spending Optimization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Spending Optimization
              </CardTitle>
              <CardDescription>AI-powered suggestions to maximize your savings</CardDescription>
            </div>
            <Button onClick={getOptimization} disabled={optimizing} variant="outline">
              {optimizing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
              Analyze
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!optimization ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Click Analyze to get spending optimization suggestions.
            </p>
          ) : optimization.raw ? (
            <div className="text-sm whitespace-pre-wrap">{optimization.raw}</div>
          ) : (
            <div className="space-y-4">
              {optimization.overall_assessment && (
                <p className="text-sm">{optimization.overall_assessment}</p>
              )}

              {optimization.suggestions?.map((s: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-accent/50">
                  <div className="flex justify-between text-sm font-medium">
                    <span>{s.category}</span>
                    <span className="text-emerald-600">Save {sym}{s.savings?.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.advice}</p>
                </div>
              ))}

              {optimization.potential_monthly_savings && (
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Potential Monthly Savings</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {sym}{optimization.potential_monthly_savings.toFixed(2)}
                  </p>
                </div>
              )}

              {optimization.priority_actions && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Priority Actions</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    {optimization.priority_actions.map((a: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground">{a}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" /> Financial Assistant
          </CardTitle>
          <CardDescription>Ask questions about your finances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto border rounded-lg p-4 mb-4 space-y-4">
            {messages.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">
                Ask me anything about your finances. Try "How can I save more?" or "What are my biggest expenses?"
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && <Bot className="h-5 w-5 text-primary mt-1 shrink-0" />}
                <div className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent'
                }`}>
                  {msg.content || (chatLoading && i === messages.length - 1 ? '...' : '')}
                </div>
                {msg.role === 'user' && <User className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={sendChat} className="flex gap-2">
            <Input
              placeholder="Ask about your finances..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              disabled={chatLoading}
            />
            <Button type="submit" size="icon" disabled={chatLoading || !chatInput.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
