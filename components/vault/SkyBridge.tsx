'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { audioEngine } from '@/lib/audioEngine'
import { products } from '@/lib/products'

// Real 3D finale (WebGL/R3F) — mounted client-only, like VaultCanvas.
const SkyScene = dynamic(() => import('./SkyScene'), { ssr: false })

// Static product shot for the no-WebGL mobile path (the ON Cloudmonster the user
// chose). The 3D path uses the vault's hero GLB for continuity.
const FALLBACK = products.find((p) => p.id === 'on-cloudmonster')

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

// The finale — a vault-quality 3D closing beat. A PINNED, scroll-scrubbed scene
// (SkyScene) presents the hero pair on a sculpted brass plinth in a dark void with
// real IBL + a warm key spotlight, real contact shadow on a glossy floor, and
// bloom. Scrolling scrubs a subtle camera move + an ignition (light blooms up,
// then dims), and the frame RESOLVES TO BLACK so it flows seamlessly into the shop.
//
// PERF: the canvas frameloop is gated to in-view (`active`), so it only renders
// while the finale is on-screen — it never runs at the same time as the vault
// canvas (different scroll depths) or taxes the shop. DPR clamped low. Scroll read
// from a cached offset (no per-frame layout). Mobile gets a static product shot.
export default function SkyBridge() {
  const sectionRef = useRef<HTMLElement>(null)
  const scrollProgress = useRef(0) // 0..1, consumed by SkyScene's useFrame
  const copyRef = useRef<HTMLDivElement>(null)
  const resolveRef = useRef<HTMLDivElement>(null)

  const [inView, setInView] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [mobile, setMobile] = useState(false)
  const neyFired = useRef(false)
  const rafId = useRef(0)
  const offset = useRef(0)
  const span = useRef(1)

  // Mirror the vault's gating: only the small-coarse-pointer path skips WebGL;
  // reduced-motion keeps the canvas but freezes the turntable/float.
  useEffect(() => {
    const mqR = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mqM = window.matchMedia('(max-width: 640px) and (pointer: coarse)')
    const u = () => {
      setReduced(mqR.matches)
      setMobile(mqM.matches)
    }
    u()
    mqR.addEventListener('change', u)
    mqM.addEventListener('change', u)
    return () => {
      mqR.removeEventListener('change', u)
      mqM.removeEventListener('change', u)
    }
  }, [])

  useEffect(() => {
    const measure = () => {
      const el = sectionRef.current
      if (!el) return
      offset.current = el.offsetTop
      span.current = Math.max(1, el.offsetHeight - window.innerHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (entry.isIntersecting && !reduced && !neyFired.current) {
          neyFired.current = true
          audioEngine.playCue('ney')
        }
      },
      { threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])

  // Scroll driver — only while in view. Writes scrollProgress (the 3D scene reads
  // it in useFrame) + the DOM overlay (copy fade + resolve-to-black).
  useEffect(() => {
    if (!inView) return
    let running = true
    const frame = () => {
      if (!running) return
      const raw = clamp01((window.scrollY - offset.current) / span.current)
      scrollProgress.current = raw
      if (copyRef.current) {
        const cFade = raw > 0.86 ? clamp01(1 - (raw - 0.86) / 0.14) : 1
        copyRef.current.style.opacity = (clamp01(raw * 3) * cFade).toFixed(3)
      }
      if (resolveRef.current) resolveRef.current.style.opacity = clamp01((raw - 0.9) / 0.1).toFixed(3)
      rafId.current = requestAnimationFrame(frame)
    }
    rafId.current = requestAnimationFrame(frame)
    return () => {
      running = false
      cancelAnimationFrame(rafId.current)
    }
  }, [inView])

  return (
    <section ref={sectionRef} aria-label="FitSole — the artifact" className="relative h-[240vh] w-full">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-vault-black">
        {/* The real 3D finale (or a static product shot on the no-WebGL mobile path). */}
        {mobile ? (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(ellipse 62% 62% at 50% 46%, rgba(191,160,106,0.18), transparent 66%)' }}
          >
            {FALLBACK && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[56%] w-64 h-44">
                <Image
                  src={FALLBACK.image}
                  alt={`${FALLBACK.brand} ${FALLBACK.name}`}
                  fill
                  sizes="256px"
                  className="object-contain drop-shadow-[0_24px_44px_rgba(0,0,0,0.6)]"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0">
            <SkyScene scrollProgress={scrollProgress} active={inView} reduced={reduced} />
          </div>
        )}

        {/* Copy + CTA (text-shadowed for legibility over the lit 3D scene). */}
        <div className="absolute inset-0 z-10 h-full flex flex-col items-center justify-between py-16 sm:py-20 px-6 text-center pointer-events-none">
          <div ref={copyRef} className="flex flex-col items-center gap-4 max-w-2xl" style={{ opacity: 0 }}>
            <p className="text-[10px] sm:text-[11px] tracking-[0.45em] uppercase text-vault-gold/85 [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]">
              FitSole · Cairo
            </p>
            <h2 className="font-display text-4xl sm:text-6xl font-semibold tracking-display text-vault-cream leading-[0.98] [text-shadow:0_2px_26px_rgba(0,0,0,0.6)]">
              The vault never closes.
            </h2>
            <span aria-hidden className="block w-16 h-px bg-gradient-to-r from-transparent via-vault-gold/60 to-transparent" />
            <p className="text-sm sm:text-base text-vault-cream/80 max-w-md leading-relaxed [text-shadow:0_1px_14px_rgba(0,0,0,0.7)]">
              Every pair authenticated in Cairo. The drops are below.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <Link
              href="#new-arrivals"
              className="pointer-events-auto px-8 py-3.5 text-xs tracking-[0.2em] uppercase font-medium bg-vault-gold text-vault-black hover:bg-vault-cream transition-colors duration-200 rounded-sm shadow-[0_10px_34px_rgba(0,0,0,0.5)]"
            >
              Explore the drops ↓
            </Link>
            <span className="vault-scroll-tick text-vault-gold/50" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>

        {/* Resolve to black over the last 10% of the scrub → seamless seam into the
            dark FeaturedUnboxing below (no hard cut at peak brightness). */}
        <div ref={resolveRef} aria-hidden className="absolute inset-0 z-20 bg-vault-black pointer-events-none" style={{ opacity: 0 }} />
      </div>
    </section>
  )
}
