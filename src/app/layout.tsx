import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { ToastProvider } from '@/components/ui/toast'
import { ServiceWorkerRegistration } from '@/components/sw-register'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FinTrack - Personal Finance Tracker',
  description: 'Track your finances with AI-powered insights',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FinTrack',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          .dark {
            --color-background: oklch(0.13 0.008 270);
            --color-foreground: oklch(0.96 0 0);
            --color-card: oklch(0.17 0.012 270);
            --color-card-foreground: oklch(0.96 0 0);
            --color-primary: oklch(0.65 0.2 265);
            --color-primary-foreground: oklch(0.13 0.008 270);
            --color-secondary: oklch(0.22 0.018 270);
            --color-secondary-foreground: oklch(0.96 0 0);
            --color-muted: oklch(0.22 0.018 270);
            --color-muted-foreground: oklch(0.6 0.01 270);
            --color-accent: oklch(0.22 0.018 270);
            --color-accent-foreground: oklch(0.96 0 0);
            --color-destructive: oklch(0.577 0.245 27.325);
            --color-destructive-foreground: oklch(0.985 0 0);
            --color-border: oklch(0.28 0.018 270);
            --color-input: oklch(0.28 0.018 270);
            --color-ring: oklch(0.65 0.2 265);
          }
        ` }} />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
