'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/cn'
import { products, formatPrice } from '@/lib/products'

interface SearchOverlayProps {
  open: boolean
  onClose: () => void
}

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus the input on open; Escape closes; trap focus; lock body scroll while open.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const f = panel.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'
      )
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      const act = document.activeElement
      if (e.shiftKey && (act === first || !panel.contains(act))) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (act === last || !panel.contains(act))) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  // Reset the query whenever the overlay reopens.
  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return products
      .filter((p) => `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query])

  function goTo(slug: string) {
    onClose()
    requestAnimationFrame(() => {
      // 'auto' (instant): a smooth jump to a card below the 700vh vault would
      // crawl the camera through the whole 3D walk first.
      document.getElementById(slug)?.scrollIntoView({ behavior: 'auto', block: 'start' })
    })
  }

  return (
    <div
      className={cn('fixed inset-0 z-[130]', open ? 'pointer-events-auto' : 'pointer-events-none')}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search products"
        className={cn(
          'absolute left-1/2 top-24 w-[92%] max-w-xl -translate-x-1/2',
          'bg-vault-surface border border-vault-border rounded-lg shadow-[0_24px_80px_rgba(0,0,0,0.6)]',
          'transition-all duration-300',
          open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
        )}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-vault-border">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-vault-gold shrink-0" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search sneakers, brands, categories…"
            className="flex-1 bg-transparent text-vault-cream placeholder:text-vault-muted text-sm outline-none"
            aria-label="Search the catalog"
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            className="text-vault-muted hover:text-vault-cream transition-colors duration-200 p-1 shrink-0"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim() === '' ? (
            <p className="px-3 py-8 text-center text-sm text-vault-muted">
              Start typing to search the vault.
            </p>
          ) : results.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-vault-cream/80">
                No pairs match “{query.trim()}” yet.
              </p>
              <p className="mt-1.5 text-xs text-vault-muted leading-relaxed max-w-xs mx-auto">
                New heat lands every week. Browse the full wall — your next pair might already be on it.
              </p>
              <button
                onClick={() => goTo('drop-wall')}
                className="mt-4 px-5 py-2 text-[11px] tracking-[0.2em] uppercase font-medium bg-vault-gold text-vault-black hover:bg-vault-cream transition-colors duration-200 rounded-sm"
              >
                Browse all drops
              </button>
            </div>
          ) : (
            <ul className="flex flex-col">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => goTo(p.slug)}
                    className="w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-left hover:bg-vault-card transition-colors duration-150"
                  >
                    <span className="relative w-12 h-12 shrink-0 rounded bg-vault-card border border-vault-border overflow-hidden">
                      <Image src={p.image} alt={`${p.brand} ${p.name}`} fill sizes="48px" className="object-contain p-1" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[10px] tracking-[0.15em] uppercase text-vault-muted">
                        {p.brand} · {p.category}
                      </span>
                      <span className="block text-sm text-vault-cream truncate">{p.name}</span>
                    </span>
                    <span className="text-sm font-medium text-vault-cream tabular-nums shrink-0">
                      {formatPrice(p.salePrice ?? p.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
