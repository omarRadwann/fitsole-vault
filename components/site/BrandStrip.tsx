'use client'

import { useMemo } from 'react'
import { products, type ProductBrand } from '@/lib/products'
import type { ShopFilterDetail } from '@/components/commerce/ShopWall'
import { withBase } from '@/lib/basePath'

// Logo assets per brand. ON has no Simple Icons mark, so it renders as a wordmark.
const BRAND_LOGOS: Partial<Record<ProductBrand, string>> = {
  Nike: '/brand-logos/nike.svg',
  Adidas: '/brand-logos/adidas.svg',
  Puma: '/brand-logos/puma.svg',
}

function shopBrand(brand: ProductBrand) {
  window.dispatchEvent(
    new CustomEvent<ShopFilterDetail>('fitsole:shop', { detail: { brand } })
  )
  document.getElementById('drop-wall')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function BrandStrip() {
  // Only show brands we actually carry, so every logo leads to real product results.
  const brands = useMemo(() => {
    const seen: ProductBrand[] = []
    for (const p of products) if (!seen.includes(p.brand)) seen.push(p.brand)
    return seen
  }, [])

  return (
    <section id="brands" className="py-20 sm:py-24 px-6 lg:px-8 border-t border-vault-border scroll-mt-20">
      <div className="reveal-up max-w-7xl mx-auto">
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/70 mb-10 text-center">
          Shop by Brand
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 sm:gap-x-20 gap-y-10">
          {brands.map((brand) => {
            const logo = BRAND_LOGOS[brand]
            return (
              <button
                key={brand}
                onClick={() => shopBrand(brand)}
                aria-label={`Shop ${brand}`}
                className="group flex items-center gap-4 opacity-60 hover:opacity-100 transition-opacity duration-300"
              >
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={withBase(logo)}
                    alt={brand}
                    className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="font-display text-3xl tracking-[0.2em] text-vault-cream transition-transform duration-300 group-hover:scale-105">
                    {brand}
                  </span>
                )}
                <span className="hidden sm:flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-vault-gold opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-80 group-hover:translate-x-0">
                  Shop
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
