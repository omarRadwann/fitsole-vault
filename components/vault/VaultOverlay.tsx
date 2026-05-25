'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { products, formatPrice } from '@/lib/products'
import { audioEngine } from '@/lib/audioEngine'

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
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/80">FitSole · Cairo</p>
        <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-semibold tracking-tight text-vault-cream leading-[0.95]">
          Egypt&apos;s<br />Sneaker Vault
        </h1>
        <p className="text-sm text-vault-cream/70 max-w-sm leading-relaxed">
          Authentic heat, curated drops, and sneaker culture born in Cairo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <button
            type="button"
            onClick={() => {
              audioEngine.unlock() // a real click → reliably starts the music
              window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
            }}
            className="px-8 py-3 text-xs tracking-[0.2em] uppercase font-medium bg-vault-gold text-vault-black hover:bg-vault-cream transition-colors duration-200 rounded-sm cursor-pointer"
          >
            Enter the Vault
          </button>
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
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/80">The Vault is Open</p>
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
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/80">The Wall</p>
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
    id: 'brands',
    // to=0.93 (was 0.92) so the brand copy fades out exactly as membership
    // (from=0.93) fades in — closes a ~1% dead beat where BOTH sections were at
    // opacity 0 and the overlay went briefly blank. Adjacent, not overlapping, so
    // the two centred headlines never double up.
    from: 0.80,
    to: 0.93,
    content: (
      <div className="flex flex-col items-center text-center gap-5">
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/80">Brand Corridor</p>
        <h2 className="font-display text-4xl sm:text-5xl font-semibold text-vault-cream leading-tight">
          Every brand.<br />One vault.
        </h2>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {['Nike', 'Adidas', 'Puma', 'ON'].map((brand) => (
            <Link
              key={brand}
              href="#drop-wall"
              className="px-4 py-1.5 text-xs tracking-[0.15em] uppercase rounded-sm border border-vault-gold/35 bg-vault-black/40 text-vault-cream/85 backdrop-blur-sm hover:border-vault-gold/70 hover:text-vault-cream hover:bg-vault-gold/10 transition-colors duration-200"
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
    from: 0.93,
    to: 1.0,
    content: (
      <div className="flex flex-col items-center text-center gap-5">
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/80">FitSole Collective</p>
        <h2 className="font-display text-4xl sm:text-5xl font-semibold text-vault-cream leading-tight">
          Join the Collective.
        </h2>
        <p className="text-sm text-vault-cream/70 max-w-xs leading-relaxed">
          Early drops. Authenticated pairs. Cairo&apos;s sneakerhead home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="#new-arrivals"
            className="px-8 py-3 text-xs tracking-[0.2em] uppercase font-medium bg-vault-gold text-vault-black hover:bg-vault-cream transition-colors duration-200 rounded-sm"
          >
            Claim Your Pair
          </Link>
          <Link
            href="#drop-wall"
            className="px-8 py-3 text-xs tracking-[0.2em] uppercase font-medium border border-vault-gold/40 text-vault-gold hover:bg-vault-gold/10 transition-colors duration-200 rounded-sm"
          >
            Step into your rotation
          </Link>
        </div>
      </div>
    ),
  },
]

// Authentication Beat — a staged "verification" sequence at the authenticity
// window (0.65–0.80): a violet UV scanline sweeps the card, three badges burn in
// (Stitch → Weight → UV), a brass plaque inscribes the lot, and an auth chime
// fires on the third badge. Re-arms on scroll-back. Driven by scrollProgress so
// it stays in lockstep with the camera; its opacity is still faded by the tick
// via the shared .vault-scene-section wrapper.
function AuthScene({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const [stage, setStage] = useState(0)
  const armedRef = useRef(true)

  useEffect(() => {
    let raf = 0
    const timers: number[] = []
    const clear = () => {
      timers.forEach((t) => clearTimeout(t))
      timers.length = 0
    }
    const loop = () => {
      const p = scrollProgress.current
      if (p > 0.66 && p < 0.8 && armedRef.current) {
        armedRef.current = false
        clear()
        setStage(1) // scanline sweep begins
        timers.push(
          window.setTimeout(() => setStage(2), 520), // STITCH ✓
          window.setTimeout(() => setStage(3), 880), // WEIGHT ✓
          window.setTimeout(() => {
            setStage(4) // UV ✓
            audioEngine.playCue('chime')
          }, 1240),
          window.setTimeout(() => setStage(5), 1640) // brass plaque inscribes
        )
      } else if ((p < 0.63 || p > 0.83) && !armedRef.current) {
        armedRef.current = true
        clear()
        setStage(0)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      clear()
    }
  }, [scrollProgress])

  const badges = [
    { label: 'Stitch', on: stage >= 2 },
    { label: 'Weight', on: stage >= 3 },
    { label: 'UV', on: stage >= 4 },
  ]

  return (
    <div
      id="vault-scene-authenticity"
      data-scene-from={0.65}
      data-scene-to={0.8}
      className="vault-scene-section absolute inset-0 flex items-center justify-center px-6 opacity-0 pointer-events-none"
      style={{ willChange: 'opacity' }}
    >
      <div className="vault-scrim" />
      <div className="pointer-events-auto vault-copy w-full" style={{ willChange: 'transform' }}>
        <div className="flex flex-col items-center text-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-px bg-vault-scan" />
            <p className="text-[10px] tracking-[0.4em] uppercase text-vault-scan">Verification System</p>
            <div className="w-4 h-px bg-vault-scan" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold text-vault-cream leading-tight">
            100% Authentic.<br />Every pair.
          </h2>
          <div className="flex gap-3 mt-1">
            {badges.map((b) => (
              <div
                key={b.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-vault-scan/40 bg-vault-black/40 backdrop-blur-sm transition-all duration-500 ease-out"
                style={{
                  opacity: b.on ? 1 : 0,
                  transform: b.on ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.92)',
                }}
              >
                <span className="text-vault-scan text-sm leading-none">✓</span>
                <span className="text-[10px] tracking-[0.2em] uppercase text-vault-cream/85">{b.label}</span>
              </div>
            ))}
          </div>
          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: stage >= 5 ? 1 : 0,
              transform: stage >= 5 ? 'translateY(0)' : 'translateY(10px)',
            }}
          >
            <div className="vault-plaque inline-block px-5 py-2 rounded-sm">
              <span className="text-[10px] tracking-[0.28em] uppercase font-medium">
                Lot #04219 · 24 May 2026 · Cairo
              </span>
            </div>
          </div>
          <Link
            href="#drop-wall"
            className="mt-1 px-6 py-2.5 text-xs tracking-[0.15em] uppercase font-medium border border-vault-scan/40 text-vault-scan hover:bg-vault-scan/10 transition-colors duration-200 rounded-sm"
          >
            Shop Verified Drops
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VaultOverlay({
  scrollProgress,
}: {
  scrollProgress: React.MutableRefObject<number>
}) {
  return (
    <div className="absolute inset-0 pointer-events-none">
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

      <AuthScene scrollProgress={scrollProgress} />

      {/* Scroll cue — fades out once the walk begins (opacity driven by the
          scroll loop in VaultExperience); only meaningful at the entrance. */}
      <div
        data-scroll-cue
        style={{ willChange: 'opacity' }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
      >
        <span className="text-[9px] tracking-[0.3em] uppercase text-vault-cream/60">Scroll</span>
        <div className="w-px h-9 bg-gradient-to-b from-vault-gold/70 to-transparent vault-scroll-tick" />
      </div>
    </div>
  )
}
