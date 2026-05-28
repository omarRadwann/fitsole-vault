'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/cn'
import { type Product, formatPrice, BRAND_COLORS } from '@/lib/products'
import { useCart } from '@/lib/cart'

const BADGE_STYLES: Record<string, string> = {
  New: 'bg-vault-gold/20 text-vault-gold border-vault-gold/30',
  'Best Seller': 'bg-white/10 text-vault-cream border-white/20',
  Sale: 'bg-[#5A2D1A]/55 text-[#E8A36A] border-[#8A4A28]/50',
  Limited: 'bg-vault-gold/15 text-vault-gold border-vault-gold/45',
  Verified: 'bg-vault-scan/20 text-vault-scan border-vault-scan/30',
}

interface ProductCardProps {
  product: Product
  featured?: boolean
  // Owns the bare `#${slug}` deep-link anchor. Only ONE wall (the always-complete
  // ShopWall) sets this, so a product that also appears in a filtered ProductWall
  // doesn't emit a duplicate id — `#adidas-ae-1-low` resolves to exactly one card.
  anchor?: boolean
}

export default function ProductCard({ product, featured = false, anchor = false }: ProductCardProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const { add } = useCart()

  const brandColor = BRAND_COLORS[product.brand] ?? '#F2EDE4'
  const displayPrice = product.salePrice ?? product.price

  function handleAddToCart() {
    if (!selectedSize) return
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
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <article
      id={anchor ? product.slug : undefined}
      className={cn(
        'group relative flex flex-col bg-vault-card border border-vault-border rounded overflow-hidden scroll-mt-24',
        'card-premium hover:border-vault-gold/45',
        featured && 'lg:flex-row'
      )}
    >
      {/* Image area */}
      <div
        className={cn(
          'relative overflow-hidden bg-vault-surface',
          featured ? 'lg:w-1/2 aspect-square' : 'aspect-[4/3]'
        )}
        style={{
          background: `radial-gradient(ellipse at 50% 70%, ${brandColor}08 0%, #161412 80%)`,
        }}
      >
        {/* Loading silhouette behind the real photo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 200 120"
            className="w-2/3 opacity-15"
            fill="currentColor"
            style={{ color: brandColor }}
            aria-hidden="true"
          >
            <path d="M20 80 C20 80 30 45 60 40 C80 37 90 50 110 48 C135 46 155 38 170 42 C185 46 180 60 170 68 C160 76 140 78 120 80 C100 82 60 85 40 84 C30 83 20 82 20 80Z" />
            <path d="M20 80 L180 80 L185 88 L15 90 Z" opacity="0.6" />
          </svg>
        </div>

        {/* Real product photo */}
        <Image
          src={product.image}
          alt={`${product.brand} ${product.name}`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-[1.07]"
        />

        {/* Brand label */}
        <div className="absolute top-3 left-3">
          <span
            className="text-[10px] tracking-[0.2em] uppercase font-medium"
            style={{ color: brandColor, opacity: 0.7 }}
          >
            {product.brand}
          </span>
        </div>

        {/* Badge */}
        {product.badge && (
          <div className="absolute top-3 right-3">
            <span
              className={cn(
                'text-[9px] tracking-[0.15em] uppercase font-medium px-2 py-0.5 rounded border',
                BADGE_STYLES[product.badge] ?? BADGE_STYLES.Verified
              )}
            >
              {product.badge}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col gap-3 p-4', featured && 'lg:p-6 lg:justify-center')}>
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-vault-muted mb-1">
            {product.brand} · {product.category}
          </p>
          <h3 className="text-sm font-medium text-vault-cream leading-tight">
            {product.name}
          </h3>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold tracking-[-0.01em] text-vault-cream">
            {formatPrice(displayPrice)}
          </span>
          {product.salePrice && (
            <span className="text-sm text-vault-muted line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* Size selector */}
        <div>
          <p className="text-[10px] tracking-[0.1em] uppercase text-vault-muted mb-2">
            Size (EU)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {product.sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                aria-label={`Size ${size}`}
                aria-pressed={selectedSize === size}
                className={cn(
                  'h-7 min-w-[2rem] px-2 text-[11px] font-medium rounded border transition-all duration-150',
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

        {/* CTA — the "added" state flips to a confident solid-gold confirm with a
            check tick (was a faint label-only swap), so the add reads as a
            definitive, tactile moment before the eye reaches the opening drawer. */}
        <button
          onClick={handleAddToCart}
          disabled={!selectedSize}
          className={cn(
            'mt-1 h-10 w-full flex items-center justify-center gap-1.5 text-xs tracking-[0.15em] uppercase font-medium rounded border transition-all duration-200',
            selectedSize
              ? added
                ? 'bg-vault-gold text-vault-black border-vault-gold'
                : 'bg-vault-gold/10 text-vault-gold border-vault-gold/40 hover:bg-vault-gold hover:text-vault-black'
              : 'bg-transparent text-vault-muted border-vault-border cursor-not-allowed opacity-50'
          )}
        >
          {added && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {added ? 'Added' : selectedSize ? 'Add to cart' : 'Select size'}
        </button>
      </div>
    </article>
  )
}
