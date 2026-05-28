'use client'

import { useEffect, useMemo, useState } from 'react'
import ProductCard from './ProductCard'
import { cn } from '@/lib/cn'
import {
  products,
  newArrivals,
  bestSellers,
  onSale,
  type Product,
  type ProductBrand,
} from '@/lib/products'

export type ShopCollection = 'all' | 'new' | 'best' | 'sale'

export interface ShopFilterDetail {
  brand?: ProductBrand
  collection?: ShopCollection
}

type ActiveFilter =
  | { kind: 'collection'; value: ShopCollection }
  | { kind: 'brand'; value: ProductBrand }

const COLLECTION_CHIPS: { label: string; value: ShopCollection }[] = [
  { label: 'All Drops', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Best Sellers', value: 'best' },
  { label: 'On Sale', value: 'sale' },
]

function collectionSource(value: ShopCollection): Product[] {
  if (value === 'new') return newArrivals
  if (value === 'best') return bestSellers
  if (value === 'sale') return onSale
  return products
}

interface ShopWallProps {
  id?: string
  title?: string
  subtitle?: string
}

export default function ShopWall({
  id = 'drop-wall',
  title = 'The Wall.',
  subtitle = 'All Drops',
}: ShopWallProps) {
  const [active, setActive] = useState<ActiveFilter>({ kind: 'collection', value: 'all' })

  // Distinct brands present in the catalog, in catalog order.
  const brands = useMemo(() => {
    const seen: ProductBrand[] = []
    for (const p of products) if (!seen.includes(p.brand)) seen.push(p.brand)
    return seen
  }, [])

  // Brand strip / View-All buttons drive the wall through this event.
  useEffect(() => {
    const onShop = (e: Event) => {
      const detail = (e as CustomEvent<ShopFilterDetail>).detail
      if (!detail) return
      if (detail.brand) setActive({ kind: 'brand', value: detail.brand })
      else if (detail.collection) setActive({ kind: 'collection', value: detail.collection })
    }
    window.addEventListener('fitsole:shop', onShop)
    return () => window.removeEventListener('fitsole:shop', onShop)
  }, [])

  const displayed = useMemo(() => {
    if (active.kind === 'brand') return products.filter((p) => p.brand === active.value)
    return collectionSource(active.value)
  }, [active])

  return (
    <section id={id} className="py-20 px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
      <header className="reveal-up mb-8">
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/80 mb-3">{subtitle}</p>
        <h2 className="font-display text-4xl sm:text-5xl font-semibold text-vault-cream leading-tight">
          {title}
        </h2>
        <div className="vault-gold-line mt-6 max-w-xs" />
      </header>

      {/* Filter chips */}
      <div className="mb-10 flex flex-wrap gap-2" role="group" aria-label="Filter products">
        {COLLECTION_CHIPS.map((chip) => {
          const isActive = active.kind === 'collection' && active.value === chip.value
          return (
            <button
              key={chip.value}
              onClick={() => setActive({ kind: 'collection', value: chip.value })}
              aria-pressed={isActive}
              className={cn(
                'px-4 py-1.5 text-[11px] tracking-[0.15em] uppercase font-medium rounded-full border transition-all duration-200',
                isActive
                  ? 'bg-vault-gold text-vault-black border-vault-gold'
                  : 'bg-transparent text-vault-muted border-vault-border hover:border-vault-gold/50 hover:text-vault-cream'
              )}
            >
              {chip.label}
            </button>
          )
        })}
        <span className="mx-1 self-center h-4 w-px bg-vault-border" aria-hidden="true" />
        {brands.map((brand) => {
          const isActive = active.kind === 'brand' && active.value === brand
          return (
            <button
              key={brand}
              onClick={() => setActive({ kind: 'brand', value: brand })}
              aria-pressed={isActive}
              className={cn(
                'px-4 py-1.5 text-[11px] tracking-[0.15em] uppercase font-medium rounded-full border transition-all duration-200',
                isActive
                  ? 'bg-vault-gold text-vault-black border-vault-gold'
                  : 'bg-transparent text-vault-muted border-vault-border hover:border-vault-gold/50 hover:text-vault-cream'
              )}
            >
              {brand}
            </button>
          )
        })}
      </div>

      {displayed.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayed.map((product) => (
            <ProductCard key={product.id} product={product} anchor />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-vault-muted">No pairs in this filter yet.</p>
      )}
    </section>
  )
}
