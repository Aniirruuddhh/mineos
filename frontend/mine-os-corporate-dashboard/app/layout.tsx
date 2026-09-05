import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MineOS | Corporate Compliance Dashboard',
  description: 'Monitor safety, SLA performance, and risk across all MineOS operations.',
  generator: 'MineOS',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#eef4f9',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
