'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Onboarding } from '@/components/onboarding'
import { useApi } from '@/hooks/use-api'

interface UserInfo {
  id: number
  email: string
  name: string | null
  onboarding_complete: number
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user, loading } = useApi<UserInfo>('/api/auth/me')
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (user && !user.onboarding_complete) {
      setShowOnboarding(true)
    }
  }, [user])

  return (
    <>
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8 pb-20 md:pb-0">
          {children}
        </div>
      </main>
      <BottomNav />
      {showOnboarding && !loading && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}
    </>
  )
}
