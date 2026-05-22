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
    <section id="brands" className="py-14 px-6 lg:px-8 border-t border-vault-border scroll-mt-20">
      <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/60 text-center mb-8">
        Shop by Brand
      </p>
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-16 gap-y-8">
        {brands.map((brand) => {
          const logo = BRAND_LOGOS[brand]
          return (
            <button
              key={brand}
              onClick={() => shopBrand(brand)}
              aria-label={`Shop ${brand}`}
              className="flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity duration-300"
            >
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={withBase(logo)} alt={brand} className="h-7 w-auto object-contain" />
              ) : (
                <span className="font-display text-2xl tracking-[0.25em] text-vault-cream">
                  {brand}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
