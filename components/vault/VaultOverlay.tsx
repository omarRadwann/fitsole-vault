'use client'

import Link from 'next/link'
import { products, formatPrice } from '@/lib/products'

// The pair sitting on the 3D pedestal — ties the hero render to a real, shoppable SKU.
const heroProduct = products.find((p) => p.id === 'adidas-ae1') ?? products[0]

interface Scene {
  id: string
  from: number
  to: number
  content: React.ReactNode
}

const scenes: Scene[] = [
  {
    id: 'entrance',
    from: 0,
    to: 0.18,
    content: (
      <div className="flex flex-col items-center text-center gap-6">
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/60">FitSole · Cairo</p>
        <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-semibold tracking-tight text-vault-cream leading-[0.95]">
          Egypt&apos;s<br />Sneaker Vault
        </h1>
        <p className="text-sm text-vault-cream/70 max-w-sm leading-relaxed">
          Authentic heat, curated drops, and sneaker culture born in Cairo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href="#vault-walk"
            className="px-8 py-3 text-xs tracking-[0.2em] uppercase font-medium bg-vault-gold text-vault-black hover:bg-vault-cream transition-colors duration-200 rounded-sm"
          >
            Enter the Vault
          </Link>
          <Link
            href="#new-arrivals"
            className="px-8 py-3 text-xs tracking-[0.2em] uppercase font-medium border border-vault-gold/40 text-vault-gold hover:bg-vault-gold/10 transition-colors duration-200 rounded-sm"
          >
            Shop New Arrivals
          </Link>
        </div>
      </div>
    ),
  },
  {
    id: 'entering',
    from: 0.18,
    to: 0.32,
    content: (
      <div className="flex flex-col items-center text-center gap-4">
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/60">The Vault is Open</p>
        <h2 className="font-display text-4xl sm:text-5xl font-semibold text-vault-cream leading-tight">
          Step Inside.
        </h2>
        <p className="text-sm text-vault-cream/70 max-w-sm leading-relaxed">
          Every pair is authenticated. Every drop is real.
        </p>
      </div>
    ),
  },
  {
    id: 'hero-display',
    from: 0.32,
    to: 0.50,
    content: (
      <div className="w-full max-w-6xl mx-auto flex px-6 sm:px-12 lg:px-20">
      <div className="flex flex-col items-start gap-4 max-w-[20rem]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-[0.3em] uppercase text-vault-gold/70">{heroProduct.brand}</span>
          <span className="w-1 h-1 rounded-full bg-vault-gold/40" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-vault-muted">{heroProduct.category}</span>
        </div>
        <h2 className="font-display text-4xl sm:text-5xl font-semibold text-vault-cream leading-[0.95]">
          {heroProduct.name}
        </h2>
        <p className="text-sm text-vault-cream/70 leading-relaxed">
          The pair on the pedestal — authenticated, in stock, ready for Cairo.
        </p>
        <div className="flex items-baseline gap-3">
          <span className="font-display text-2xl font-semibold text-vault-gold">
            {formatPrice(heroProduct.price)}
          </span>
          {heroProduct.badge && (
            <span className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded border border-vault-gold/30 text-vault-gold/80">
              {heroProduct.badge}
            </span>
          )}
        </div>
        <div className="flex gap-3 mt-1">
          <Link
            href={`#${heroProduct.slug}`}
            className="px-6 py-2.5 text-xs tracking-[0.15em] uppercase font-medium bg-vault-gold text-vault-black hover:bg-vault-cream transition-colors duration-200 rounded-sm"
          >
            Shop This Pair
          </Link>
          <Link
            href="#new-arrivals"
            className="px-6 py-2.5 text-xs tracking-[0.15em] uppercase font-medium border border-vault-gold/40 text-vault-gold hover:bg-vault-gold/10 transition-colors duration-200 rounded-sm"
          >
            All New Arrivals
          </Link>
        </div>
      </div>
      </div>
    ),
  },
  {
    id: 'drop-wall',
    from: 0.50,
    to: 0.65,
    content: (
      <div className="flex flex-col items-center text-center gap-4">
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/60">The Wall</p>
        <h2 className="font-display text-4xl sm:text-5xl font-semibold text-vault-cream leading-tight">
          New Drops.
        </h2>
        <p className="text-sm text-vault-cream/70">From the wall to your rotation.</p>
        <Link
          href="#drop-wall"
          className="mt-2 px-6 py-2.5 text-xs tracking-[0.15em] uppercase font-medium bg-vault-gold text-vault-black hover:bg-vault-cream transition-colors duration-200 rounded-sm"
        >
          Browse the Wall
        </Link>
      </div>
    ),
  },
  {
    id: 'authenticity',
    from: 0.65,
    to: 0.80,
    content: (
      <div className="flex flex-col items-center text-center gap-5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-px bg-vault-scan" />
          <p className="text-[10px] tracking-[0.4em] uppercase text-vault-scan">Verification System</p>
          <div className="w-4 h-px bg-vault-scan" />
        </div>
        <h2 className="font-display text-4xl sm:text-5xl font-semibold text-vault-cream leading-tight">
          100% Authentic.<br />Every pair.
        </h2>
        <ul className="space-y-2 text-sm text-vault-cream/75">
          <li className="flex items-center gap-2 justify-center">
            <span className="text-vault-scan">✓</span> Verified pairs
          </li>
          <li className="flex items-center gap-2 justify-center">
            <span className="text-vault-scan">✓</span> Clean exchange
          </li>
          <li className="flex items-center gap-2 justify-center">
            <span className="text-vault-scan">✓</span> Fast checkout
          </li>
        </ul>
        <Link
          href="#shop"
          className="mt-1 px-6 py-2.5 text-xs tracking-[0.15em] uppercase font-medium border border-vault-scan/40 text-vault-scan hover:bg-vault-scan/10 transition-colors duration-200 rounded-sm"
        >
          Shop Verified Drops
        </Link>
      </div>
    ),
  },
  {
    id: 'brands',
    from: 0.80,
    to: 0.92,
    content: (
      <div className="flex flex-col items-center text-center gap-5">
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/60">Brand Corridor</p>
        <h2 className="font-display text-4xl sm:text-5xl font-semibold text-vault-cream leading-tight">
          Every brand.<br />One vault.
        </h2>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {['Nike', 'Adidas', 'Puma', 'ON'].map((brand) => (
            <Link
              key={brand}
              href={`#brand-${brand.toLowerCase()}`}
              className="px-4 py-1.5 text-xs tracking-[0.15em] uppercase border border-vault-border text-vault-muted hover:border-vault-gold/50 hover:text-vault-cream transition-colors duration-200 rounded-sm"
            >
              {brand}
            </Link>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'membership',
    from: 0.92,
    to: 1.0,
    content: (
      <div className="flex flex-col items-center text-center gap-5">
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/60">FitSole Collective</p>
        <h2 className="font-display text-4xl sm:text-5xl font-semibold text-vault-cream leading-tight">
          Join the Collective.
        </h2>
        <p className="text-sm text-vault-cream/70 max-w-xs leading-relaxed">
          Early drops. Member offers. Cairo&apos;s sneakerhead community.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="#join"
            className="px-8 py-3 text-xs tracking-[0.2em] uppercase font-medium bg-vault-gold text-vault-black hover:bg-vault-cream transition-colors duration-200 rounded-sm"
          >
            Create Account
          </Link>
          <Link
            href="#shop"
            className="px-8 py-3 text-xs tracking-[0.2em] uppercase font-medium border border-vault-gold/40 text-vault-gold hover:bg-vault-gold/10 transition-colors duration-200 rounded-sm"
          >
            Step into your rotation
          </Link>
        </div>
      </div>
    ),
  },
]

export default function VaultOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-live="polite">
      {scenes.map((scene) => (
        <div
          key={scene.id}
          id={`vault-scene-${scene.id}`}
          data-scene-from={scene.from}
          data-scene-to={scene.to}
          className="vault-scene-section absolute inset-0 flex items-center justify-center px-6 opacity-0 pointer-events-none"
          style={{ willChange: 'opacity' }}
        >
          <div className="vault-scrim" />
          <div className="pointer-events-auto vault-copy w-full" style={{ willChange: 'transform' }}>
            {scene.content}
          </div>
        </div>
      ))}

      {/* Scroll cue — fades out once the walk begins (opacity driven by the
          scroll loop in VaultExperience); only meaningful at the entrance. */}
      <div
        data-scroll-cue
        style={{ willChange: 'opacity' }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
      >
        <span className="text-[9px] tracking-[0.3em] uppercase text-vault-muted/60">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-vault-gold/40 to-transparent animate-pulse" />
      </div>
    </div>
  )
}
