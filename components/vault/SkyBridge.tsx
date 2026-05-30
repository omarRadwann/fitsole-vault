'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { audioEngine } from '@/lib/audioEngine'

// Real 3D finale (WebGL/R3F) — client-only, like VaultCanvas.
const SkyScene = dynamic(() => import('./SkyScene'), { ssr: false })
const SPARKS = [0, 26, 52, 78, 104, 130, 156, 182, 208, 234, 260, 286, 312, 338]
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

// "The Meeting" — the finale, now in real 3D. Two actual Tripo models of the ON
// Cloudmonster + Adidas A.E. 1 stride in across a glossy marble floor (driven by
// scroll), MEET center-stage with a gold burst, then slowly turntable while the
// line lands and the frame resolves to black into the shop. The 3D scene (SkyScene)
// carries the realistic models + IBL + marble reflection; CSS overlays add the gold
// spotlight glow, vignette, and impact burst (cheap — no GPU postprocessing).
//
// PERF: the canvas frameloop is gated to in-view, so it only renders on-screen —
// never alongside the vault canvas (different scroll depths) or the shop. Lean
// scene (no Bloom/real shadows, low DPR, ~270KB meshopt models). Scroll read from a
// cached offset. Mobile (no WebGL) → the premium themed render as a static shot.
export default function SkyBridge() {
  const sectionRef = useRef<HTMLElement>(null)
  const scrollProgress = useRef(0) // 0..1, consumed by SkyScene's useFrame
  const burstRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const resolveRef = useRef<HTMLDivElement>(null)

  const [inView, setInView] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [mobile, setMobile] = useState(false)
  const neyFired = useRef(false)
  const armed = useRef(false)
  const rafId = useRef(0)
  const offset = useRef(0)
  const span = useRef(1)

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
    const m = () => {
      const el = sectionRef.current
      if (!el) return
      offset.current = el.offsetTop
      span.current = Math.max(1, el.offsetHeight - window.innerHeight)
    }
    m()
    window.addEventListener('resize', m)
    return () => window.removeEventListener('resize', m)
  }, [])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting)
        if (e.isIntersecting && !reduced && !neyFired.current) {
          neyFired.current = true
          audioEngine.playCue('ney')
        }
      },
      { threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])

  // Scroll driver — writes scrollProgress (the 3D scene reads it) + the DOM overlay
  // (burst at the meeting, copy fade, resolve-to-black). Only runs while in view.
  useEffect(() => {
    if (!inView) return
    let running = true
    const frame = () => {
      if (!running) return
      const p = clamp01((window.scrollY - offset.current) / span.current)
      scrollProgress.current = p
      if (!reduced && burstRef.current) {
        if (p >= 0.48 && !armed.current) {
          armed.current = true
          burstRef.current.classList.add('burst')
        } else if (p < 0.4 && armed.current) {
          armed.current = false
          burstRef.current.classList.remove('burst')
        }
      }
      if (copyRef.current) {
        const fin = clamp01((p - 0.54) / 0.12)
        const fout = p > 0.9 ? clamp01(1 - (p - 0.9) / 0.1) : 1
        copyRef.current.style.opacity = (fin * fout).toFixed(3)
      }
      if (resolveRef.current) resolveRef.current.style.opacity = clamp01((p - 0.9) / 0.1).toFixed(3)
      rafId.current = requestAnimationFrame(frame)
    }
    rafId.current = requestAnimationFrame(frame)
    return () => {
      running = false
      cancelAnimationFrame(rafId.current)
    }
  }, [inView, reduced])

  return (
    <section ref={sectionRef} aria-label="FitSole — two drops, one vault" className="relative h-[200vh] w-full">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-vault-black">
        {/* The real 3D scene (or a premium static render on the no-WebGL mobile path) */}
        {mobile ? (
          <Image src="/images/scene-cloud.webp" alt="ON Cloudmonster" fill priority sizes="100vw" className="object-cover opacity-90" />
        ) : (
          <div className="absolute inset-0">
            <SkyScene scrollProgress={scrollProgress} active={inView} reduced={reduced} />
          </div>
        )}

        {/* Cinematic atmosphere over the canvas (cheap CSS — replaces GPU post): a
            warm gold spotlight pool from above + a vignette to deepen the niche. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 50% 42% at 50% 8%, rgba(255,200,120,0.16), transparent 60%),' +
              'radial-gradient(ellipse 85% 85% at 50% 52%, transparent 56%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        {/* Gold impact burst at the meeting point */}
        <div ref={burstRef} aria-hidden className="meet-burst absolute left-1/2 top-1/2 pointer-events-none z-[5]" style={{ width: 0, height: 0 }}>
          <div className="ring absolute rounded-full border-2 border-vault-gold/70" style={{ width: '180px', height: '180px', left: '-90px', top: '-90px' }} />
          <div className="ring2 absolute rounded-full border border-vault-gold/40" style={{ width: '110px', height: '110px', left: '-55px', top: '-55px' }} />
          <div className="flash absolute rounded-full" style={{ width: '440px', height: '440px', left: '-220px', top: '-220px', background: 'radial-gradient(circle, rgba(255,236,184,0.8), rgba(255,192,112,0.22) 36%, transparent 62%)' }} />
          {SPARKS.map((a, i) => (
            <span key={i} className="spark absolute rounded-full" style={{ width: '6px', height: '6px', left: '-3px', top: '-3px', background: 'rgba(255,226,154,0.95)', boxShadow: '0 0 9px 1px rgba(255,210,130,0.6)', ['--a']: `${a}deg` } as React.CSSProperties} />
          ))}
        </div>

        {/* Copy + CTA (lands after the meeting, upper area) */}
        <div className="absolute inset-0 z-10 h-full flex flex-col items-center justify-start pt-[11vh] px-6 text-center pointer-events-none">
          <div ref={copyRef} className="flex flex-col items-center gap-4 max-w-2xl" style={{ opacity: 0 }}>
            <p className="text-[10px] sm:text-[11px] tracking-[0.45em] uppercase text-vault-gold/85 [text-shadow:0_1px_10px_rgba(0,0,0,0.7)]">FitSole · Cairo</p>
            <h2 className="font-display text-4xl sm:text-6xl font-semibold tracking-display text-vault-cream leading-[0.98] [text-shadow:0_2px_26px_rgba(0,0,0,0.7)]">
              Two drops. One vault.
            </h2>
            <span aria-hidden className="block w-16 h-px bg-gradient-to-r from-transparent via-vault-gold/60 to-transparent" />
            <p className="text-sm sm:text-base text-vault-cream/80 max-w-md leading-relaxed [text-shadow:0_1px_14px_rgba(0,0,0,0.8)]">
              Every pair authenticated in Cairo. The drops are below.
            </p>
            <Link
              href="#new-arrivals"
              className="pointer-events-auto mt-2 px-8 py-3.5 text-xs tracking-[0.2em] uppercase font-medium bg-vault-gold text-vault-black hover:bg-vault-cream transition-colors duration-200 rounded-sm shadow-[0_10px_34px_rgba(0,0,0,0.5)]"
            >
              Explore the drops ↓
            </Link>
          </div>
        </div>

        {/* Resolve to black → seamless seam into FeaturedUnboxing */}
        <div ref={resolveRef} aria-hidden className="absolute inset-0 z-20 bg-vault-black pointer-events-none" style={{ opacity: 0 }} />
      </div>
    </section>
  )
}
