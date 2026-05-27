'use client'

import ProductCard from './ProductCard'
import { products, newArrivals, bestSellers, onSale } from '@/lib/products'
import type { ShopCollection, ShopFilterDetail } from './ShopWall'

interface ProductWallProps {
  filter?: 'new' | 'best' | 'sale' | 'all'
  limit?: number
  title?: string
  subtitle?: string
  id?: string
  /** Lead wall — gets the larger headline so the shop keeps the vault's scale. */
  lead?: boolean
}

// Send the matching filter to the full "The Wall" grid, then scroll there.
function viewAll(collection: ShopCollection) {
  window.dispatchEvent(
    new CustomEvent<ShopFilterDetail>('fitsole:shop', { detail: { collection } })
  )
  // rAF so the ShopWall filter applies before we scroll there (avoids a race).
  requestAnimationFrame(() =>
    document.getElementById('drop-wall')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  )
}

export default function ProductWall({
  filter = 'all',
  limit = 8,
  title,
  subtitle,
  id,
  lead = false,
}: ProductWallProps) {
  const source =
    filter === 'new'
      ? newArrivals
      : filter === 'best'
        ? bestSellers
        : filter === 'sale'
          ? onSale
          : products

  const displayed = source.slice(0, limit)

  return (
    <section id={id} className="py-20 px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
      {(title || subtitle) && (
        <header className="reveal-up mb-12">
          {subtitle && (
            <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/80 mb-3">
              {subtitle}
            </p>
          )}
          {title && (
            <h2
              className={`font-display font-semibold text-vault-cream leading-tight ${
                lead ? 'text-5xl sm:text-6xl lg:text-7xl' : 'text-4xl sm:text-5xl'
              }`}
            >
              {title}
            </h2>
          )}
          <div className="vault-gold-line mt-6 max-w-xs" />
        </header>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayed.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {source.length > limit && (
        <div className="mt-10 text-center">
          <button
            onClick={() => viewAll(filter)}
            className="px-10 py-3 text-xs tracking-[0.2em] uppercase font-medium border border-vault-gold/40 text-vault-gold hover:bg-vault-gold/10 transition-colors duration-200 rounded-sm"
          >
            View All {title ?? 'Products'}
          </button>
        </div>
      )}
    </section>
  )
}
