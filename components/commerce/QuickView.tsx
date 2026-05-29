'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/cn'
import { type Product, formatPrice, BRAND_COLORS } from '@/lib/products'
import { useCart } from '@/lib/cart'

const STORE_URL = 'https://fitsole.shop'

// Global event contract — ProductCard (or anywhere) opens the vitrine by
// dispatching this with a Product payload. Matches the project's existing
// loose-coupling pattern (cf. 'fitsole:shop' between BrandStrip and ShopWall),
// so no new context/provider has to wrap the tree.
export const QUICKVIEW_EVENT = 'fitsole:quickview'
export function openQuickView(product: Product) {
  window.dispatchEvent(new CustomEvent<Product>(QUICKVIEW_EVENT, { detail: product }))
}

const BADGE_STYLES: Record<string, string> = {
  New: 'bg-vault-gold/20 text-vault-gold border-vault-gold/30',
  'Best Seller': 'bg-white/10 text-vault-cream border-white/20',
  Sale: 'bg-[#5A2D1A]/55 text-[#E8A36A] border-[#8A4A28]/50',
  Limited: 'bg-vault-gold/15 text-vault-gold border-vault-gold/45',
  Verified: 'bg-vault-scan/20 text-vault-scan border-vault-scan/30',
}

// Mounted ONCE (in Header.tsx, beside CartDrawer). A single vitrine the whole
// catalog shares — the pair is presented like a lit display case, and its
// authentication reads like the certificate that ships with it.
export default function QuickView() {
  const [product, setProduct] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const [shown, setShown] = useState(false) // drives the staggered open reveal
  const panelRef = useRef<HTMLDivElement>(null)
  const { add, setOpen: setCartOpen } = useCart()
  const open = product !== null

  // Listen for open requests from anywhere on the page.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const p = (e as CustomEvent<Product>).detail
      if (!p) return
      setSelectedSize(null)
      setAdded(false)
      setProduct(p)
    }
    window.addEventListener(QUICKVIEW_EVENT, onOpen as EventListener)
    return () => window.removeEventListener(QUICKVIEW_EVENT, onOpen as EventListener)
  }, [])

  function close() {
    setProduct(null)
  }

  // Trigger the staggered reveal on the frame after the panel mounts.
  useEffect(() => {
    if (!open) { setShown(false); return }
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [open])

  // Escape closes, focus is trapped, body scroll locked — same contract as CartDrawer.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return }
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
    const focusT = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('button')?.focus(), 60)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(focusT)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  // Restore focus to the trigger (the card's Quick-view button) on close — WCAG 2.4.3.
  const openerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (open) openerRef.current = document.activeElement as HTMLElement | null
    else if (openerRef.current) {
      openerRef.current.focus?.()
      openerRef.current = null
    }
  }, [open])

  function handleAdd() {
    if (!product || !selectedSize) return
    const displayPrice = product.salePrice ?? product.price
    add({
      id: `${product.id}-${selectedSize}`,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      price: displayPrice,
      image: product.image,
      size: selectedSize,
    })
    setAdded(true)
    // Hand off to the cart drawer — close the vitrine so the drawer reads cleanly.
    window.setTimeout(() => { close(); setCartOpen(true) }, 280)
  }

  const brandColor = product ? (BRAND_COLORS[product.brand] ?? '#F2EDE4') : '#F2EDE4'
  const displayPrice = product ? (product.salePrice ?? product.price) : 0

  return (
    <div
      className={cn('fixed inset-0 z-[122]', open ? 'pointer-events-auto' : 'pointer-events-none')}
      aria-hidden={!open}
    >
      {/* Backdrop — black + blur with a faint warm vignette so the case feels lit. */}
      <div
        onClick={close}
        className={cn(
          'absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0'
        )}
        style={{ backgroundImage: 'radial-gradient(ellipse at 50% 42%, rgba(191,160,106,0.10), transparent 60%)' }}
      />

      {/* The vitrine */}
      {product && (
        <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${product.brand} ${product.name} — quick view`}
            className={cn(
              'relative w-full max-w-3xl max-h-[88vh] overflow-y-auto',
              'bg-vault-surface border border-vault-border rounded-lg',
              'shadow-[0_40px_120px_rgba(0,0,0,0.7)]',
              'transition-all duration-300 ease-out',
              shown ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-[0.98]'
            )}
          >
            {/* Brass top hairline — the lit edge of the display case. */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-vault-gold/70 to-transparent" />

            {/* Close */}
            <button
              onClick={close}
              aria-label="Close quick view"
              className="absolute top-3 right-3 z-10 text-vault-muted hover:text-vault-cream transition-colors duration-200 p-1.5 rounded-full bg-vault-black/40 backdrop-blur-sm"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>

            <div className="grid sm:grid-cols-2">
              {/* Left — the spotlit pair, presented on a plinth (echoes the 3D hero). */}
              <div
                className="relative aspect-square sm:aspect-auto sm:min-h-[26rem] overflow-hidden"
                style={{ background: `radial-gradient(ellipse at 50% 64%, ${brandColor}12 0%, #161412 78%)` }}
              >
                {/* Loading silhouette behind the photo (matches ProductCard). */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 120" className="w-2/3 opacity-[0.12]" fill="currentColor" style={{ color: brandColor }} aria-hidden="true">
                    <path d="M20 80 C20 80 30 45 60 40 C80 37 90 50 110 48 C135 46 155 38 170 42 C185 46 180 60 170 68 C160 76 140 78 120 80 C100 82 60 85 40 84 C30 83 20 82 20 80Z" />
                    <path d="M20 80 L180 80 L185 88 L15 90 Z" opacity="0.6" />
                  </svg>
                </div>
                {/* Plinth glow sweep on open */}
                <div
                  className={cn('absolute inset-x-0 bottom-0 h-1/2 transition-opacity duration-700', shown ? 'opacity-100' : 'opacity-0')}
                  style={{ background: `radial-gradient(ellipse at 50% 100%, ${brandColor}22, transparent 70%)` }}
                />
                <Image
                  src={product.image}
                  alt={`${product.brand} ${product.name}`}
                  fill
                  sizes="(max-width: 640px) 90vw, 384px"
                  className={cn(
                    'object-contain p-8 transition-all duration-700 ease-out',
                    shown ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  )}
                />
                {product.badge && (
                  <div className="absolute top-4 left-4">
                    <span className={cn('text-[9px] tracking-[0.15em] uppercase font-medium px-2 py-0.5 rounded border', BADGE_STYLES[product.badge] ?? BADGE_STYLES.Verified)}>
                      {product.badge}
                    </span>
                  </div>
                )}
              </div>

              {/* Right — the credentials, rising in sequence. */}
              <div className="flex flex-col gap-5 p-6 sm:p-8">
                <div
                  className={cn('transition-all duration-500 ease-out', shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')}
                  style={{ transitionDelay: shown ? '90ms' : '0ms' }}
                >
                  <p className="text-[11px] tracking-[0.28em] uppercase text-vault-gold/80 mb-2">
                    {product.brand} · {product.category}
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-display text-vault-cream leading-[1.02]">
                    {product.name}
                  </h2>
                </div>

                <div
                  className={cn('flex items-baseline gap-3 transition-all duration-500 ease-out', shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')}
                  style={{ transitionDelay: shown ? '150ms' : '0ms' }}
                >
                  <span className="font-display text-2xl font-semibold text-vault-cream tabular-nums">{formatPrice(displayPrice)}</span>
                  {product.salePrice && (
                    <span className="text-base text-vault-muted line-through tabular-nums">{formatPrice(product.price)}</span>
                  )}
                </div>

                <p
                  className={cn('text-sm leading-relaxed text-vault-muted transition-all duration-500 ease-out', shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')}
                  style={{ transitionDelay: shown ? '210ms' : '0ms' }}
                >
                  A {product.brand} {product.category.toLowerCase()} pair — inspected, authenticated, and sealed in the vault before it ships from Cairo.
                </p>

                {/* Size selector — same control vocabulary as the card. */}
                <div
                  className={cn('transition-all duration-500 ease-out', shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')}
                  style={{ transitionDelay: shown ? '270ms' : '0ms' }}
                >
                  <p className="text-[10px] tracking-[0.18em] uppercase text-vault-muted mb-2">Size (EU)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        aria-label={`Size ${size}`}
                        aria-pressed={selectedSize === size}
                        className={cn(
                          'h-9 min-w-[2.5rem] px-2.5 text-[12px] font-medium rounded border transition-all duration-150',
                          selectedSize === size
                            ? 'bg-vault-gold text-vault-black border-vault-gold font-semibold ring-1 ring-vault-gold/50'
                            : 'bg-transparent text-vault-muted border-vault-border hover:border-vault-gold/50 hover:text-vault-cream'
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add to cart */}
                <button
                  onClick={handleAdd}
                  disabled={!selectedSize}
                  className={cn(
                    'h-12 w-full flex items-center justify-center gap-1.5 text-xs tracking-[0.18em] uppercase font-medium rounded border transition-all duration-200',
                    shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
                    selectedSize
                      ? added
                        ? 'bg-vault-gold text-vault-black border-vault-gold'
                        : 'bg-vault-gold/10 text-vault-gold border-vault-gold/40 hover:bg-vault-gold hover:text-vault-black'
                      : 'bg-transparent text-vault-muted border-vault-border cursor-not-allowed opacity-50'
                  )}
                  style={{ transitionDelay: shown ? '330ms' : '0ms' }}
                >
                  {added && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {added ? 'Added to cart' : selectedSize ? 'Add to cart' : 'Select a size'}
                </button>

                {/* Authentication line — the certificate that ships with the pair. */}
                <div
                  className={cn('flex items-center gap-2.5 pt-1 transition-all duration-500 ease-out', shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')}
                  style={{ transitionDelay: shown ? '390ms' : '0ms' }}
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full border border-vault-scan/40 text-vault-scan shrink-0">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <p className="text-[11px] tracking-[0.08em] text-vault-muted">
                    Authenticated in Cairo — verified before it ships.
                  </p>
                </div>

                <a
                  href={`${STORE_URL}/products/${product.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'text-[11px] tracking-[0.15em] uppercase text-vault-muted hover:text-vault-gold transition-colors duration-200',
                    shown ? 'opacity-100' : 'opacity-0'
                  )}
                  style={{ transitionDelay: shown ? '450ms' : '0ms' }}
                >
                  View full details on fitsole.shop ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
