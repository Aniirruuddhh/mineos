import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MineOS | New field report',
  description: 'Capture and submit mine safety and compliance reports from the field.',
  generator: 'MineOS',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#edf3f9',
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
