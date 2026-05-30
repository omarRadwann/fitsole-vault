'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { audioEngine } from '@/lib/audioEngine'

// Real 3D finale (WebGL/R3F) — client-only, like VaultCanvas.
const SkyScene = dynamic(() => import('./SkyScene'), { ssr: false })
const SPARKS = [0, 26, 52, 78, 104, 130, 156, 182, 208, 234, 260, 286, 312, 338]
// Floating dust motes drifting in the light beam — deterministic (no Math.random →
// SSR-safe, no hydration mismatch): x%, y%, size px, drift duration s, delay s.
const MOTES = [
  { x: 30, y: 72, s: 3, d: 15, delay: 0 },
  { x: 44, y: 84, s: 2, d: 19, delay: 3 },
  { x: 52, y: 66, s: 4, d: 13, delay: 6 },
  { x: 61, y: 78, s: 2, d: 17, delay: 1 },
  { x: 38, y: 58, s: 3, d: 21, delay: 8 },
  { x: 68, y: 62, s: 2, d: 14, delay: 4 },
  { x: 47, y: 48, s: 3, d: 18, delay: 2 },
  { x: 56, y: 88, s: 3, d: 16, delay: 7 },
  { x: 34, y: 40, s: 2, d: 22, delay: 5 },
  { x: 64, y: 44, s: 3, d: 20, delay: 9 },
  { x: 50, y: 30, s: 2, d: 24, delay: 3 },
  { x: 42, y: 76, s: 2, d: 15, delay: 10 },
  { x: 58, y: 54, s: 4, d: 12, delay: 6 },
  { x: 71, y: 70, s: 2, d: 18, delay: 2 },
]
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
  // SkyScene runs frameloop="demand" — we call this to request a render ONLY when
  // scroll actually moves (the scene is a pure function of scroll). The big lag fix.
  const invalidateRef = useRef<(() => void) | null>(null)
  const lastRenderedP = useRef(-1)

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
    lastRenderedP.current = -1 // force a render on (re)entry
    let running = true
    const frame = () => {
      if (!running) return
      const p = clamp01((window.scrollY - offset.current) / span.current)
      scrollProgress.current = p
      // Demand-render the 3D scene only when scroll moved (else it holds the last
      // frame at zero GPU cost). This + dpr=1 + one light is the lag fix.
      if (Math.abs(p - lastRenderedP.current) > 0.0004) {
        lastRenderedP.current = p
        invalidateRef.current?.()
      }
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
            <SkyScene scrollProgress={scrollProgress} active={inView} reduced={reduced} invalidateRef={invalidateRef} />
          </div>
        )}

        {/* Cinematic atmosphere over the canvas (cheap CSS — replaces GPU post, all
            static gradients = composited once, zero per-frame cost): a volumetric
            light shaft + warm spotlight cone from above, a pool on the shoes/floor,
            and a deep vignette that sinks the niche into black. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              // narrow volumetric beam down the centre (the spotlight made visible)
              'radial-gradient(ellipse 19% 64% at 50% -6%, rgba(255,217,151,0.16), transparent 66%),' +
              // warm spotlight cone from above, reaching down through the shoes
              'radial-gradient(ellipse 58% 82% at 50% 24%, rgba(255,197,114,0.20), transparent 60%),' +
              // focused warm pool right at the shoes / floor (≈60% down)
              'radial-gradient(ellipse 46% 28% at 50% 60%, rgba(255,180,96,0.17), transparent 64%),' +
              // deep vignette — corners + bottom fall to black for the niche depth
              'radial-gradient(ellipse 84% 86% at 50% 46%, transparent 42%, rgba(0,0,0,0.82) 100%)',
          }}
        />

        {/* Floating gold dust in the light beam — depth + atmosphere. Pure CSS
            transform/opacity drift (compositor-only, no blur, no main-thread cost);
            mounted only while in view and motion is allowed. */}
        {inView && !reduced && (
          <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden z-[4]">
            {MOTES.map((m, i) => (
              <span
                key={i}
                className="sky-mote absolute rounded-full"
                style={{
                  left: `${m.x}%`,
                  top: `${m.y}%`,
                  width: `${m.s}px`,
                  height: `${m.s}px`,
                  background: 'radial-gradient(circle, rgba(255,224,170,0.9), rgba(255,196,120,0.25) 55%, transparent 75%)',
                  animationDuration: `${m.d}s`,
                  animationDelay: `${m.delay}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {/* Fine film grain — a touch of editorial texture over the whole frame
            (static, low opacity, normal blend → cheap). */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none z-[4] opacity-[0.05] mix-blend-soft-light"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: '140px 140px',
          }}
        />

        {/* Gold impact burst at the meeting point */}
        <div ref={burstRef} aria-hidden className="meet-burst absolute left-1/2 top-[60%] pointer-events-none z-[5]" style={{ width: 0, height: 0 }}>
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
