'use client'

import { useRef, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import VaultOverlay from './VaultOverlay'
import VaultPreloader from './VaultPreloader'
import Link from 'next/link'

const VaultCanvas = dynamic(() => import('./VaultCanvas'), { ssr: false })

function VaultStatic() {
  return (
    <div className="relative h-screen flex items-center justify-center bg-vault-black px-6">
      <div className="flex flex-col items-center text-center gap-8 max-w-2xl">
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/60">
          FitSole · Cairo
        </p>
        <h1 className="font-display text-5xl sm:text-8xl font-semibold tracking-tight text-vault-cream leading-[0.95]">
          Egypt&apos;s Sneaker Vault
        </h1>
        <p className="text-sm text-vault-muted max-w-md">
          Authentic heat, curated drops, and sneaker culture born in Cairo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="#new-arrivals"
            className="px-8 py-3 text-xs tracking-[0.2em] uppercase font-medium bg-vault-gold text-vault-black hover:bg-vault-cream transition-colors duration-200 rounded-sm"
          >
            Shop New Arrivals
          </Link>
          <Link
            href="#drop-wall"
            className="px-8 py-3 text-xs tracking-[0.2em] uppercase font-medium border border-vault-gold/40 text-vault-gold hover:bg-vault-gold/10 transition-colors duration-200 rounded-sm"
          >
            Browse All
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-6 mt-4 text-[10px] tracking-[0.15em] uppercase text-vault-muted">
          <span>✓ 100% Authentic</span>
          <span>✓ Verified Pairs</span>
          <span>✓ Fast Delivery</span>
        </div>
      </div>
    </div>
  )
}

export default function VaultExperience() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollProgress = useRef(0)
  const rafRef = useRef<number>(0)
  const progressFillRef = useRef<HTMLDivElement>(null)
  const [fallback, setFallback] = useState(false)

  // Serve the lightweight static hero to reduced-motion users and phones.
  // Phones gate on coarse pointer too, so iPads keep the rich 3D walk.
  useEffect(() => {
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mqMobile = window.matchMedia('(max-width: 640px) and (pointer: coarse)')
    const update = () => setFallback(mqReduce.matches || mqMobile.matches)
    update()
    mqReduce.addEventListener('change', update)
    mqMobile.addEventListener('change', update)
    return () => {
      mqReduce.removeEventListener('change', update)
      mqMobile.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    if (fallback) return

    const container = containerRef.current
    if (!container) return

    // One damped scroll value drives BOTH the camera (via scrollProgress) and
    // the DOM overlay, so copy and 3D glide together instead of the overlay
    // snapping to raw scroll while the camera eases behind it.
    let damped = -1
    let lastT = performance.now()
    const SCROLL_DECAY = 9 // higher = tighter; ~110ms time constant

    // Cache the overlay scene elements once — they're stable after mount,
    // so there's no need to re-query the DOM every frame.
    const sceneEls = Array.from(
      container.querySelectorAll<HTMLElement>('.vault-scene-section')
    )

    // Update scroll progress and overlay on each frame
    function tick() {
      if (!container) return
      // Frame-rate-independent damping: consistent feel regardless of FPS.
      const now = performance.now()
      const dt = Math.min((now - lastT) / 1000, 0.1)
      lastT = now
      const rect = container.getBoundingClientRect()
      const scrollableHeight = container.offsetHeight - window.innerHeight
      const scrolled = Math.max(0, -rect.top)
      const rawTarget = Math.max(0, Math.min(1, scrolled / scrollableHeight))
      // Seed without an intro sweep if the page loads already scrolled.
      if (damped < 0) damped = rawTarget
      damped += (rawTarget - damped) * (1 - Math.exp(-SCROLL_DECAY * dt))
      // Dev-only override for live screenshot verification: set
      // window.__vaultForce to a 0–1 number to pin the camera + overlay to any
      // beat regardless of scroll. Inert unless the global is set.
      const forced = (window as unknown as { __vaultForce?: number }).__vaultForce
      const progress = typeof forced === 'number' ? forced : damped
      scrollProgress.current = progress

      // Update overlay section opacities
      sceneEls.forEach((el) => {
        const from = parseFloat(el.dataset.sceneFrom ?? '0')
        const to = parseFloat(el.dataset.sceneTo ?? '1')
        const range = to - from
        const fadeLen = range * 0.3

        let opacity = 0
        if (progress >= from && progress <= to) {
          // First scene starts fully visible; last scene stays visible at the end.
          const inFade = from <= 0 ? 1 : Math.min(1, (progress - from) / fadeLen)
          const outFade = to >= 1 ? 1 : Math.min(1, (to - progress) / fadeLen)
          opacity = Math.min(inFade, outFade)
        }
        opacity = Math.max(0, opacity)
        el.style.opacity = String(opacity)

        // Scroll-driven reveal: copy rises into place as the scene fades in.
        const copy = el.querySelector<HTMLElement>('.vault-copy')
        if (copy) copy.style.transform = `translate3d(0, ${(1 - opacity) * 22}px, 0)`
      })

      // Drive the story progress indicator.
      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleY(${progress})`
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    // Nudge the WebGL canvas/postprocessing to composite on first load —
    // otherwise the entrance can paint black until the first scroll/resize.
    const t1 = setTimeout(() => window.dispatchEvent(new Event('resize')), 120)
    const t2 = setTimeout(() => window.dispatchEvent(new Event('resize')), 600)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [fallback])

  return (
    <section id="vault-walk" aria-label="FitSole Vault Walk experience">
      {fallback ? (
        <VaultStatic />
      ) : (
      <>
      <VaultPreloader />
      <div ref={containerRef} style={{ height: '700vh' }} className="relative">
        {/* Sticky viewport */}
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* 3D canvas */}
          <div className="absolute inset-0">
            <VaultCanvas scrollProgress={scrollProgress} />
          </div>

          {/* DOM overlays */}
          <div className="absolute inset-0">
            <VaultOverlay />
          </div>

          {/* Story progress indicator */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 h-32 w-px bg-vault-cream/10">
            <div
              ref={progressFillRef}
              className="w-full origin-top bg-gradient-to-b from-vault-gold to-vault-gold/40"
              style={{ height: '100%', transform: 'scaleY(0)' }}
            />
          </div>

          {/* Always-visible trust bar at bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-10 py-4 px-6">
            <div className="flex justify-center gap-8 text-[9px] tracking-[0.2em] uppercase text-vault-muted/50">
              <span>100% Authentic</span>
              <span className="hidden sm:inline">Verified Pairs</span>
              <span>Free Exchange</span>
              <span className="hidden sm:inline">Fast Delivery</span>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </section>
  )
}
