'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { useCart } from '@/lib/cart'
import { useAudio } from '@/lib/audio'
import CartDrawer from '@/components/commerce/CartDrawer'
import SearchOverlay from '@/components/commerce/SearchOverlay'

const navLinks = [
  { label: 'New', href: '#new-arrivals' },
  { label: 'Best Sellers', href: '#best-sellers' },
  { label: 'Brands', href: '#brands' },
  { label: 'Sale', href: '#sale' },
  { label: 'The Wall', href: '#drop-wall' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { count, setOpen } = useCart()
  const { muted, toggle: toggleAudio } = useAudio()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Escape closes the mobile menu.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <>
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-vault-black/90 backdrop-blur-md border-b border-vault-gold/10'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-display text-xl font-semibold tracking-[0.2em] text-vault-cream group-hover:text-vault-gold transition-colors duration-300">
              FITSOLE
            </span>
            <span className="hidden sm:block text-[10px] tracking-[0.15em] text-vault-gold/80 mt-0.5 uppercase">
              Cairo
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs tracking-[0.15em] uppercase text-vault-muted hover:text-vault-cream transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleAudio}
              aria-label={muted ? 'Unmute ambient sound' : 'Mute ambient sound'}
              aria-pressed={!muted}
              className="text-vault-muted hover:text-vault-cream transition-colors duration-200 p-1"
            >
              {muted ? (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11 5 6 9H3v6h3l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" strokeLinecap="round" />
                  <line x1="17" y1="9" x2="23" y2="15" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11 5 6 9H3v6h3l5 4V5z" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" strokeLinecap="round" />
                  <path d="M18.5 6a8 8 0 0 1 0 12" strokeLinecap="round" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="text-vault-muted hover:text-vault-cream transition-colors duration-200 p-1"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m16.5 16.5 4 4" strokeLinecap="round" />
              </svg>
            </button>

            <button
              onClick={() => setOpen(true)}
              aria-label={count > 0 ? `Cart, ${count} items` : 'Cart'}
              className="text-vault-muted hover:text-vault-cream transition-colors duration-200 p-1 relative"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-vault-gold text-vault-black text-[9px] font-bold tabular-nums">
                  {count}
                </span>
              )}
            </button>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-vault-muted hover:text-vault-cream transition-colors duration-200 p-1"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav
          className="md:hidden bg-vault-black/95 backdrop-blur-md border-t border-vault-gold/10 px-6 py-6 space-y-4"
          aria-label="Mobile navigation"
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="block text-sm tracking-[0.15em] uppercase text-vault-muted hover:text-vault-cream transition-colors duration-200"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => {
              setMenuOpen(false)
              setSearchOpen(true)
            }}
            className="block mt-4 text-sm tracking-[0.15em] uppercase text-vault-gold hover:text-vault-cream transition-colors duration-200"
          >
            Search
          </button>
        </nav>
      )}
    </header>
    <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    <CartDrawer />
    </>
  )
}
