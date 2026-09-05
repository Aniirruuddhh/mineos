import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MineOS · Manager Dashboard',
  description: 'Mine safety, compliance, and corrective action operations in one manager workspace.',
  generator: 'MineOS',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#eef3f8',
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="bg-[#eef3f8]"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
