'use client'

import { useRef, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import VaultOverlay from './VaultOverlay'
import VaultPreloader from './VaultPreloader'
import Link from 'next/link'
import Lenis from 'lenis'
import { audioEngine } from '@/lib/audioEngine'

const VaultCanvas = dynamic(() => import('./VaultCanvas'), { ssr: false })

function VaultStatic() {
  return (
    <div className="relative h-screen flex items-center justify-center bg-vault-black px-6">
      <div className="flex flex-col items-center text-center gap-8 max-w-2xl">
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/80">
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

// ── Camera pacing ────────────────────────────────────────────────────────────
// Reparametrize linear scroll so the walk DWELLS on its two money shots — the
// hero plinth (~0.46) and the membership reveal (~0.95) — and moves a touch
// quicker through the transit between them, instead of gliding at one constant
// "museum-tour" velocity. Built as the normalized integral of a speed profile
// that dips at those beats, which makes it GUARANTEED strictly monotonic (scroll
// can never stick or reverse) with ease(0)=0, ease(1)=1. Both the camera curve
// AND the overlay captions read the same eased progress, so they stay in sync —
// the whole beat lingers together. Deliberately modest (~35% slow-down); deepen
// the `amt` values for a more pronounced hold. NOTE: this only changes traversal
// VELOCITY, not any keyframe framing, so it isn't visible in a static screenshot
// — only felt while scrolling.
const DWELL_LUT = (() => {
  const N = 240
  const lut = new Float32Array(N + 1)
  const gauss = (p: number, c: number, w: number, amt: number) =>
    amt * Math.exp(-((p - c) * (p - c)) / (2 * w * w))
  const speed = (p: number) =>
    Math.max(0.5, 1 - gauss(p, 0.46, 0.06, 0.35) - gauss(p, 0.95, 0.05, 0.35))
  let acc = 0
  for (let i = 0; i < N; i++) {
    acc += speed(i / N)
    lut[i + 1] = acc
  }
  for (let i = 0; i <= N; i++) lut[i] /= acc // normalize → lut[0]=0, lut[N]=1
  return lut
})()
function dwellEase(p: number): number {
  if (p <= 0) return 0
  if (p >= 1) return 1
  const x = p * 240
  const i = Math.floor(x)
  const f = x - i
  return DWELL_LUT[i] * (1 - f) + DWELL_LUT[i + 1] * f
}

export default function VaultExperience() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollProgress = useRef(0)
  const rafRef = useRef<number>(0)
  const progressFillRef = useRef<HTMLDivElement>(null)
  const [fallback, setFallback] = useState(false)
  // Render-gate for the WebGL canvas: true while the vault is on-screen, false
  // once it scrolls out of view below the fold (or the tab is hidden). Drives
  // <VaultCanvas active> → frameloop, so the heavy scene stops rendering while
  // the user shops. The ref mirrors state so the rAF tick avoids redundant
  // re-renders (only flips React state on a boundary crossing).
  const [vaultVisible, setVaultVisible] = useState(true)
  const vaultVisibleRef = useRef(true)
  const entranceCuedRef = useRef(false)

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

  // Ambient bed follows the vault: audible only while the WebGL vault is
  // on-screen, and never on the static fallback / reduced-motion path.
  useEffect(() => {
    audioEngine.setBedActive(!fallback && vaultVisible)
  }, [fallback, vaultVisible])

  useEffect(() => {
    if (fallback) return

    const container = containerRef.current
    if (!container) return

    // Smooth scroll (Lenis) tames the jagged Windows-trackpad feel on this heavy
    // scene. It scrolls the REAL window (not a CSS transform), so position:sticky
    // and the getBoundingClientRect read below stay correct, and it snaps to
    // programmatic/anchor jumps (kept instant by scroll-behavior:auto) rather
    // than easing them through the 700vh walk. Reduced-motion / mobile users
    // never reach here (they get VaultStatic), so Lenis is correctly skipped.
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true })

    // One damped scroll value drives BOTH the camera (via scrollProgress) and
    // the DOM overlay, so copy and 3D glide together instead of the overlay
    // snapping to raw scroll while the camera eases behind it.
    let damped = -1
    let lastT = performance.now()
    // Lenis already smooths the scroll input, so this secondary damping is kept
    // light (near-transparent) — stacking two heavy easings felt laggy. The
    // camera's own useFrame lerp still provides the visible glide along the path.
    const SCROLL_DECAY = 30

    // Cache the overlay scene elements once — they're stable after mount,
    // so there's no need to re-query the DOM every frame.
    const sceneEls = Array.from(
      container.querySelectorAll<HTMLElement>('.vault-scene-section')
    )

    // The scroll cue is only meaningful at the entrance, and the trust bar
    // should bow out just before the vault hands off to the flat shop so
    // neither bleeds over the sections below. Cache both once.
    const cueEl = container.querySelector<HTMLElement>('[data-scroll-cue]')
    const trustEl = container.querySelector<HTMLElement>('[data-trust-bar]')
    const scrimEl = container.querySelector<HTMLElement>('[data-vault-scrim]')

    // Update scroll progress and overlay on each frame
    function tick() {
      if (!container) return
      // Frame-rate-independent damping: consistent feel regardless of FPS.
      const now = performance.now()
      lenis.raf(now) // advance Lenis on the same frame, before reading the rect
      const dt = Math.min((now - lastT) / 1000, 0.1)
      lastT = now
      const rect = container.getBoundingClientRect()
      // Park the render loop once the vault has scrolled WELL out of view, but
      // keep a one-viewport buffer on each side so the canvas pre-warms (renders
      // a frame or two) BEFORE it scrolls back into view — otherwise scrolling
      // back up from the shop showed a black, laggy gap while the frozen loop
      // resumed. The rect we already have makes this free; only flip React state
      // on a boundary cross. (Hidden tabs are handled by the browser throttling
      // rAF, so no visibilityState coupling is needed — and it would stall
      // canvas screenshots.)
      const vh = window.innerHeight
      const onScreen = rect.bottom > -vh && rect.top < vh * 2
      if (onScreen !== vaultVisibleRef.current) {
        vaultVisibleRef.current = onScreen
        setVaultVisible(onScreen)
      }
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
      // Ease ONLY the real scroll (dwell on the hero + membership beats). The dev
      // __vaultForce hook stays a DIRECT curve-param control for screenshot checks.
      const progress = typeof forced === 'number' ? forced : dwellEase(damped)
      scrollProgress.current = progress

      // Entrance whoosh — a one-shot as the walk begins; re-arms at the very top
      // so it replays on scroll-back. (No-op while muted / before unlock.)
      if (progress > 0.04 && !entranceCuedRef.current) {
        entranceCuedRef.current = true
        audioEngine.playCue('whoosh')
      } else if (progress < 0.01) {
        entranceCuedRef.current = false
      }

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

      // Scroll cue fades out as soon as the walk begins; the trust bar fades in
      // the final stretch so neither lingers over the flat shop below the vault.
      if (cueEl) cueEl.style.opacity = String(Math.max(0, 1 - progress / 0.08))
      if (trustEl) {
        trustEl.style.opacity = String(
          Math.max(0, Math.min(1, (0.97 - progress) / 0.04))
        )
      }
      // Fade-to-black bridge: the walk resolves INTO black over the last 5% so the
      // storefront below (same vault-black bg) "lights up" from the dark instead of
      // hard-cutting. Peaks after the membership copy so the finale reads first.
      if (scrimEl) {
        // Darken-not-blackout: cap at ~0.5 so the finale frame stays VISIBLE as the
        // sticky viewport scrolls away. The vault→shop seam then reads as a dim
        // vignette bridge instead of a full-viewport black void (the "big gap" —
        // the sticky takes a whole 100vh to release, and a fully-opaque scrim made
        // that entire stretch dead black). The storefront still rises out of dusk.
        scrimEl.style.opacity = String(
          Math.max(0, Math.min(0.5, (progress - 0.95) / 0.05))
        )
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
      lenis.destroy()
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
            <VaultCanvas scrollProgress={scrollProgress} active={vaultVisible} />
          </div>

          {/* DOM overlays */}
          <div className="absolute inset-0">
            <VaultOverlay scrollProgress={scrollProgress} />
          </div>

          {/* Story progress indicator */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 h-32 w-px bg-vault-cream/10">
            <div
              ref={progressFillRef}
              className="w-full origin-top bg-gradient-to-b from-vault-gold to-vault-gold/40"
              style={{ height: '100%', transform: 'scaleY(0)' }}
            />
          </div>

          {/* Trust bar — fades out just before the vault hands off to the flat shop. */}
          <div
            data-trust-bar
            style={{ willChange: 'opacity' }}
            className="absolute bottom-0 left-0 right-0 z-10 py-4 px-6"
          >
            <div className="flex justify-center gap-8 text-[9px] tracking-[0.2em] uppercase text-vault-muted/50">
              <span>100% Authentic</span>
              <span className="hidden sm:inline">Verified Pairs</span>
              <span>Free Exchange</span>
              <span className="hidden sm:inline">Fast Delivery</span>
            </div>
          </div>

          {/* Fade-to-black bridge: vault resolves into black so the storefront lights up from it */}
          <div
            data-vault-scrim
            aria-hidden
            style={{ opacity: 0, willChange: 'opacity' }}
            className="pointer-events-none absolute inset-0 z-20 bg-vault-black"
          />
        </div>
      </div>
      </>
      )}
    </section>
  )
}
