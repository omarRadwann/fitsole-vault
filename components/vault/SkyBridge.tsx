'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { audioEngine } from '@/lib/audioEngine'
import { products } from '@/lib/products'

// The finale's artifact: the ON Cloudmonster, presented like the vault's hero.
const HERO = products.find((p) => p.id === 'on-cloudmonster')

// Drifting gold dust. Deterministic (SSR-safe). [left%, top%, size, delay, dur]
const MOTES: [number, number, number, number, number][] = [
  [16, 30, 3, 0, 11], [26, 64, 2, 2.4, 13], [36, 20, 2, 1, 10], [46, 78, 3, 3.6, 14],
  [56, 34, 2, 0.8, 12], [66, 70, 3, 2, 11], [76, 26, 2, 4, 13], [22, 48, 2, 5, 15],
  [50, 54, 2, 2.2, 12.5], [70, 44, 2, 3, 11.5], [34, 84, 3, 0.5, 13.5], [80, 56, 2, 1.5, 12],
]

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
// smoothstep — eases the scrub so the ignition feels cinematic, not linear.
const ease = (x: number) => x * x * (3 - 2 * x)

// The closing beat: a PINNED, scroll-scrubbed cinematic reveal that stays inside
// the vault's language. As you scroll the section, a shaft of gold IGNITES, a
// raking highlight SWEEPS across, and the authenticated ON Cloudmonster RISES off
// its plinth as its shadow spreads beneath it — the pair "lifting into the light."
//
// PERF (integrated-GPU path): the void + vignette are ONE static background layer
// (one paint). Everything that moves is compositor-only (transform / opacity) and
// driven by a SINGLE rAF that is GATED to in-view (an IntersectionObserver) —
// scroll into the shop and the loop stops, nothing composites off-screen. No blur
// filters, no drop-shadow filters. The section's scroll position is read from a
// cached offset (no per-frame getBoundingClientRect / forced reflow).
export default function SkyBridge() {
  const sectionRef = useRef<HTMLElement>(null)
  const spotRef = useRef<HTMLDivElement>(null)
  const sweepRef = useRef<HTMLDivElement>(null)
  const haloRef = useRef<HTMLDivElement>(null)
  const liftRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)

  const [reduced, setReduced] = useState(false)
  const [inView, setInView] = useState(false)
  const neyFired = useRef(false)
  const rafId = useRef(0)
  const offset = useRef(0) // section top in document space
  const span = useRef(1) // scrollable distance within the section

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Cache the section's scroll geometry (no per-frame layout reads).
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

  // Gate everything to in-view + fire the ney cue once.
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

  // The scroll-scrub: one rAF, only while in view. Writes compositor-only props.
  useEffect(() => {
    if (!inView) return
    let running = true
    const frame = () => {
      if (!running) return
      const raw = clamp01((window.scrollY - offset.current) / span.current)
      const p = ease(raw)
      if (spotRef.current) {
        spotRef.current.style.opacity = (0.25 + p * 0.75).toFixed(3)
        spotRef.current.style.transform = `scale(${(0.8 + p * 0.32).toFixed(3)})`
      }
      if (sweepRef.current) {
        sweepRef.current.style.transform = `translate3d(${(-75 + p * 150).toFixed(1)}%,0,0)`
        sweepRef.current.style.opacity = (0.5 * Math.sin(Math.PI * raw)).toFixed(3) // brightest mid-scrub
      }
      if (haloRef.current) haloRef.current.style.opacity = (0.15 + p * 0.85).toFixed(3)
      if (liftRef.current) {
        const lift = (1 - p) * 36 // starts low, rises into the light
        liftRef.current.style.transform = `translate3d(0,${lift.toFixed(1)}px,0) scale(${(0.93 + p * 0.11).toFixed(3)})`
      }
      if (shadowRef.current) {
        // as the pair rises, the contact shadow spreads + softens
        shadowRef.current.style.transform = `translateX(-50%) scaleX(${(0.65 + p * 0.6).toFixed(3)})`
        shadowRef.current.style.opacity = (0.5 - p * 0.28).toFixed(3)
      }
      if (copyRef.current) copyRef.current.style.opacity = clamp01(raw * 3).toFixed(3)
      rafId.current = requestAnimationFrame(frame)
    }
    rafId.current = requestAnimationFrame(frame)
    return () => {
      running = false
      cancelAnimationFrame(rafId.current)
    }
  }, [inView])

  const floatAnim = inView && !reduced

  return (
    <section
      ref={sectionRef}
      aria-label="FitSole — the artifact"
      className="relative h-[220vh] w-full"
    >
      {/* Pinned cinematic stage. The void + vignette are ONE static background
          (single paint) — the cheap base everything else composites over. */}
      <div
        className="sticky top-0 h-screen w-full overflow-hidden bg-vault-black"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 78% 78% at 50% 50%, transparent 50%, rgba(0,0,0,0.7) 100%)',
        }}
      >
        {/* Igniting gold spotlight (scroll-scrubbed opacity + scale). */}
        <div
          ref={spotRef}
          aria-hidden
          className="absolute inset-0 origin-center"
          style={{
            opacity: 0.25,
            backgroundImage:
              'radial-gradient(ellipse 42% 52% at 50% 45%, rgba(191,160,106,0.26), transparent 60%),' +
              'radial-gradient(circle at 50% 40%, rgba(255,214,150,0.2), transparent 38%)',
          }}
        />

        {/* Raking light sweep (scroll-scrubbed translateX). */}
        <div
          ref={sweepRef}
          aria-hidden
          className="absolute -inset-x-1/2 inset-y-0 will-change-transform"
          style={{
            opacity: 0,
            backgroundImage:
              'linear-gradient(105deg, transparent 42%, rgba(255,224,170,0.10) 50%, transparent 58%)',
          }}
        />

        {/* Drifting gold dust — only while on-screen. */}
        {floatAnim && (
          <div aria-hidden className="absolute inset-0 overflow-hidden">
            {MOTES.map((m, i) => (
              <span
                key={i}
                className="vault-mote absolute rounded-full"
                style={{
                  left: `${m[0]}%`,
                  top: `${m[1]}%`,
                  width: m[2],
                  height: m[2],
                  background: 'rgba(232,202,142,0.85)',
                  animationDelay: `${m[3]}s`,
                  animationDuration: `${m[4]}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* The artifact */}
        {HERO && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative mt-[6vh]">
              {/* warm halo (scroll-scrubbed opacity) */}
              <div
                ref={haloRef}
                aria-hidden
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] rounded-full"
                style={{
                  opacity: 0.15,
                  background:
                    'radial-gradient(circle at center, rgba(255,201,128,0.32), rgba(255,160,90,0.08) 45%, transparent 68%)',
                }}
              />
              {/* lift wrapper (scroll-scrubbed translateY + scale) wraps the float */}
              <div ref={liftRef} className="relative will-change-transform" style={{ transform: 'translate3d(0,36px,0) scale(0.93)' }}>
                <div className={floatAnim ? 'sky-float' : ''}>
                  <div className="relative w-[clamp(19rem,46vw,40rem)] aspect-[3/2]">
                    <Image
                      src={HERO.image}
                      alt={`${HERO.brand} ${HERO.name}`}
                      fill
                      sizes="(max-width: 640px) 88vw, 46vw"
                      priority
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
              {/* contact shadow / plinth (scroll-scrubbed scaleX + opacity) */}
              <div
                ref={shadowRef}
                aria-hidden
                className="absolute left-1/2 bottom-[-4%] w-[78%] h-12 will-change-transform"
                style={{
                  opacity: 0.5,
                  transform: 'translateX(-50%) scaleX(0.65)',
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(191,160,106,0.18) 40%, transparent 72%)',
                }}
              />
            </div>
          </div>
        )}

        {/* Copy + CTA (headline fades up early in the scrub) */}
        <div className="absolute inset-0 z-10 h-full flex flex-col items-center justify-between py-16 sm:py-20 px-6 text-center pointer-events-none">
          <div ref={copyRef} className="flex flex-col items-center gap-4 max-w-2xl" style={{ opacity: 0 }}>
            <p className="text-[10px] sm:text-[11px] tracking-[0.45em] uppercase text-vault-gold/85">
              FitSole · Cairo
            </p>
            <h2 className="font-display text-4xl sm:text-6xl font-semibold tracking-display text-vault-cream leading-[0.98]">
              The vault never closes.
            </h2>
            <span aria-hidden className="block w-16 h-px bg-gradient-to-r from-transparent via-vault-gold/60 to-transparent" />
            <p className="text-sm sm:text-base text-vault-muted max-w-md leading-relaxed">
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
      </div>
    </section>
  )
}
