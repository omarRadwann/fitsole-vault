'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/cn'
import { useCart } from '@/lib/cart'
import { formatPrice } from '@/lib/products'

const STORE_URL = 'https://fitsole.shop'

export default function CartDrawer() {
  const { lines, count, subtotal, open, setOpen, remove, setQty, clear } = useCart()
  const panelRef = useRef<HTMLElement>(null)

  // Close on Escape, trap focus within the drawer, and lock body scroll while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return }
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
    // Move focus into the drawer for keyboard / screen-reader users.
    const focusT = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('button')?.focus(), 60)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(focusT)
      document.body.style.overflow = prevOverflow
    }
  }, [open, setOpen])

  // Restore focus to the trigger (e.g. the header Cart button or a card's Add to
  // cart) when the drawer closes, so keyboard users land back where they were
  // instead of at the top of <body> (WCAG 2.4.3).
  const openerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (open) openerRef.current = document.activeElement as HTMLElement | null
    else if (openerRef.current) {
      openerRef.current.focus?.()
      openerRef.current = null
    }
  }, [open])

  return (
    <div
      className={cn(
        'fixed inset-0 z-[120]',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={cn(
          'absolute right-0 top-0 h-full w-full max-w-md flex flex-col',
          'bg-vault-surface border-l border-vault-border shadow-[-12px_0_40px_rgba(0,0,0,0.5)]',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-vault-border shrink-0">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-lg tracking-[0.15em] uppercase text-vault-cream">Cart</h2>
            <span className="text-xs text-vault-muted">
              {count} {count === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close cart"
            className="text-vault-muted hover:text-vault-cream transition-colors duration-200 p-1"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Lines */}
        {lines.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="text-vault-gold/40">
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <p className="text-sm text-vault-muted">Your cart is empty.</p>
            <button
              onClick={() => setOpen(false)}
              className="text-xs tracking-[0.15em] uppercase text-vault-gold hover:text-vault-cream transition-colors duration-200"
            >
              Continue shopping
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
            {lines.map((line) => (
              <div key={line.id} className="flex gap-4">
                <a
                  href={`${STORE_URL}/products/${line.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative w-20 h-20 shrink-0 rounded bg-vault-card border border-vault-border overflow-hidden"
                >
                  <Image
                    src={line.image}
                    alt={`${line.brand} ${line.name}`}
                    fill
                    sizes="80px"
                    className="object-contain p-1.5"
                  />
                </a>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] tracking-[0.15em] uppercase text-vault-muted">{line.brand}</p>
                      <p className="text-sm text-vault-cream truncate">{line.name}</p>
                      <p className="text-[11px] text-vault-muted mt-0.5">Size EU {line.size}</p>
                    </div>
                    <button
                      onClick={() => remove(line.id)}
                      aria-label={`Remove ${line.name}`}
                      className="text-vault-muted hover:text-red-400 transition-colors duration-200 h-5 shrink-0"
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {/* Qty stepper */}
                    <div className="flex items-center border border-vault-border rounded">
                      <button
                        onClick={() => setQty(line.id, line.qty - 1)}
                        aria-label="Decrease quantity"
                        className="w-7 h-7 flex items-center justify-center text-vault-muted hover:text-vault-cream transition-colors duration-150"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-xs text-vault-cream tabular-nums">{line.qty}</span>
                      <button
                        onClick={() => setQty(line.id, line.qty + 1)}
                        aria-label="Increase quantity"
                        className="w-7 h-7 flex items-center justify-center text-vault-muted hover:text-vault-cream transition-colors duration-150"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-medium text-vault-cream tabular-nums">
                      {formatPrice(line.price * line.qty)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={clear}
              className="self-start mt-1 text-[10px] tracking-[0.15em] uppercase text-vault-muted hover:text-vault-cream transition-colors duration-200"
            >
              Clear cart
            </button>
          </div>
        )}

        {/* Footer */}
        {lines.length > 0 && (
          <div className="border-t border-vault-border px-6 py-5 shrink-0 flex flex-col gap-4">
            <div className="flex justify-between items-baseline">
              <span className="text-xs tracking-[0.15em] uppercase text-vault-muted">Subtotal</span>
              <span className="font-display text-xl font-semibold text-vault-cream tabular-nums">
                {formatPrice(subtotal)}
              </span>
            </div>
            <a
              href={STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 w-full flex items-center justify-center text-xs tracking-[0.2em] uppercase font-medium bg-vault-gold text-vault-black hover:bg-vault-cream transition-colors duration-200 rounded-sm"
            >
              Continue on fitsole.shop
            </a>
            <p className="text-[10px] text-center text-vault-muted">
              You&apos;ll complete your order securely on fitsole.shop
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
