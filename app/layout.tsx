import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Playfair_Display } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/lib/cart'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FitSole — Egypt\'s Sneaker Vault',
  description:
    'Born in Cairo. Built for Sneakerheads. 100% authentic Nike, Adidas, Puma, ON, and more. New arrivals, best sellers, verified pairs.',
  keywords: ['sneakers', 'Cairo', 'Egypt', 'Nike', 'Adidas', 'authentic', 'فيتسول'],
  openGraph: {
    title: 'FitSole — Egypt\'s Sneaker Vault',
    description: 'Born in Cairo. Built for Sneakerheads.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${playfair.variable}`}
    >
      <body className="min-h-screen bg-vault-black text-vault-cream">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  )
}
