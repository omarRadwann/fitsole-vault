'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { useBedSection } from '@/lib/audio'
import type { BallControl } from './Basketball'

// Real 3D finale (WebGL/R3F) — client-only, like VaultCanvas.
const SkyScene = dynamic(() => import('./SkyScene'), { ssr: false })
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
  // Denser dust + two slow warm EMBERS (s:5) for a richer beam.
  { x: 46, y: 36, s: 2, d: 23, delay: 4 },
  { x: 54, y: 50, s: 3, d: 17, delay: 11 },
  { x: 40, y: 64, s: 2, d: 20, delay: 7 },
  { x: 62, y: 52, s: 3, d: 15, delay: 1 },
  { x: 48, y: 70, s: 2, d: 19, delay: 9 },
  { x: 36, y: 50, s: 2, d: 22, delay: 12 },
  { x: 66, y: 80, s: 3, d: 16, delay: 5 },
  { x: 51, y: 42, s: 2, d: 21, delay: 8 },
  { x: 44, y: 56, s: 5, d: 26, delay: 2 },
  { x: 57, y: 61, s: 5, d: 28, delay: 13 },
]
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smooth = (x: number) => x * x * (3 - 2 * x)

// "The Meeting" — the finale, in real 3D. Two actual Tripo models of the ON
// Cloudmonster + Adidas A.E. 1 STRIDE in across a glossy marble floor (driven by
// scroll), MEET center-stage in a warm pool of light, then settle and present while
// the line lands and the frame resolves into the shop. The 3D scene (SkyScene)
// carries the realistic models + IBL + reflection + real contact shadows + the
// stride; CSS overlays add the warm spotlight glow, vignette, dust, a single soft
// gold meet-ring, and the gentle warm flood transition (cheap — no GPU post burst).
//
// PERF: the canvas frameloop is gated to in-view, so it only renders on-screen —
// never alongside the vault canvas (different scroll depths) or the shop. Lean
// scene (demand-render, low DPR, ~270KB meshopt models). Scroll read from a cached
// offset. Mobile (no WebGL) → the premium themed render as a static shot.
export default function SkyBridge() {
  const sectionRef = useRef<HTMLElement>(null)
  const scrollProgress = useRef(0) // 0..1, consumed by SkyScene's useFrame
  const copyRef = useRef<HTMLDivElement>(null)
  const resolveRef = useRef<HTMLDivElement>(null)
  const enterRef = useRef<HTMLDivElement>(null)
  const chargeRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const scoreFlashRef = useRef<HTMLDivElement>(null)
  const ballControlRef = useRef<BallControl | null>(null)
  const leftAt = useRef(-99999) // when the finale last left view (for a fresh ball drop on re-entry)
  // SkyScene runs frameloop="demand" — we call this to request a render ONLY when
  // scroll actually moves (the scene is a pure function of scroll). The big lag fix.
  const invalidateRef = useRef<(() => void) | null>(null)
  const lastRenderedP = useRef(-1)
  // Damped scroll (mirrors VaultExperience) — smooths coarse mouse-wheel steps so
  // the stride / settle glide instead of snapping between discrete poses.
  const damped = useRef(-1)
  const lastT = useRef(0)

  const [inView, setInView] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [mobile, setMobile] = useState(false)
  // Keep the ambient MUSIC BED playing through the finale (not just the vault). The
  // shared registry ORs this with the vault + video sections, so the same track that
  // plays in the vault carries straight into "The Meeting" — no separate cue. (The
  // old synth `ney`/`chime` cues were removed: they sounded cheap AND ducked the bed
  // −6 dB, so you heard the awful placeholder instead of the music.)
  useBedSection(!mobile && inView)
  const rafId = useRef(0)
  const offset = useRef(0)
  const span = useRef(1)

  // Swish! → a quick gold flash (pure DOM: set opacity, let the CSS transition fade it). No setState.
  const onScore = useCallback(() => {
    const el = scoreFlashRef.current
    if (!el) return
    el.style.opacity = '0.6'
    window.setTimeout(() => {
      if (el) el.style.opacity = '0'
    }, 70)
  }, [])

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
    // WARM-UP observer — activate the canvas ~one viewport EARLY (rootMargin), so the scene
    // mounts, bakes its env, uploads the (preloaded) models + renders its first frames while
    // still hidden behind the black entrance overlay. Scrolling in then reveals an already-warm,
    // smooth scene instead of a decode/first-frame hitch (the "laggy entrance").
    const warm = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting)
        if (e.isIntersecting) {
          // Fresh drop + hard bounce on (re)entry after a real gap, so the ball "lands" again.
          if (performance.now() - leftAt.current > 2000) ballControlRef.current?.requestReset()
        } else {
          leftAt.current = performance.now()
          ballControlRef.current?.releaseDrag() // never leave a drag captured while parked
        }
      },
      { threshold: 0, rootMargin: '100% 0px 100% 0px' }
    )
    // HEADER observer — fade the store header to full-bleed the cinematic frame ONLY when the
    // finale is actually on screen (kept on real intersection so the header doesn't vanish early).
    const head = new IntersectionObserver(
      ([e]) => window.dispatchEvent(new CustomEvent('fitsole:finale', { detail: e.isIntersecting })),
      { threshold: 0 }
    )
    warm.observe(el)
    head.observe(el)
    return () => {
      warm.disconnect()
      head.disconnect()
      window.dispatchEvent(new CustomEvent('fitsole:finale', { detail: false }))
    }
  }, [])

  // Scroll driver — writes scrollProgress (the 3D scene reads it) + the DOM overlay
  // (soft ring at the meeting, copy fade, warm flood, resolve-to-black). In view only.
  useEffect(() => {
    if (!inView) return
    lastRenderedP.current = -1 // force a render on (re)entry
    damped.current = -1 // re-seed the damped scroll (no intro sweep on re-entry)
    lastT.current = performance.now()
    let running = true
    const frame = () => {
      if (!running) return
      const raw = clamp01((window.scrollY - offset.current) / span.current)
      const now = performance.now()
      const dt = Math.min((now - lastT.current) / 1000, 0.1)
      lastT.current = now
      if (damped.current < 0) damped.current = raw // seed without a sweep
      // LIGHT damping (snappy ~3 frames) — smooths a coarse mouse-wheel tick without
      // the laggy trail of heavy damping. Once within ε, SNAP to the target so the
      // scene stops demand-rendering (no asymptotic tail of renders — that tail was
      // the integrated-GPU "lag"), forcing one final invalidate so the snap draws.
      damped.current += (raw - damped.current) * (1 - Math.exp(-70 * dt))
      if (Math.abs(raw - damped.current) < 0.002 && damped.current !== raw) {
        damped.current = raw
        lastRenderedP.current = -1 // force the final exact-pose render
      }
      const p = damped.current
      scrollProgress.current = p
      // Demand-render the 3D scene only when scroll moved (else it holds the last
      // frame at zero GPU cost). This + dpr=1 + few lights is the lag fix.
      if (Math.abs(p - lastRenderedP.current) > 0.0004) {
        lastRenderedP.current = p
        invalidateRef.current?.()
      }
      // Charge — the centre gathers warm energy as the pairs close in (p .3→.48),
      // then eases off the instant the ring fires.
      if (chargeRef.current) {
        chargeRef.current.style.opacity = (clamp01((p - 0.3) / 0.18) * (p < 0.49 ? 1 : 0)).toFixed(3)
      }
      // HERO REVEAL — a warm bloom flares at the exact meeting (p≈0.5) then settles, so
      // the moment the pairs meet lands as a held cinematic beat (pairs with the 3D key
      // swell). Gaussian, screen-blended → adds light like a real bloom. Compositor-cheap.
      if (glowRef.current) {
        glowRef.current.style.opacity = (Math.exp(-(((p - 0.5) / 0.09) ** 2)) * 0.6).toFixed(3)
      }
      if (copyRef.current) {
        const fin = clamp01((p - 0.54) / 0.12)
        const fout = p > 0.9 ? clamp01(1 - (p - 0.9) / 0.1) : 1
        copyRef.current.style.opacity = (fin * fout).toFixed(3)
      }
      // ENTRANCE: the room fades UP from black over the first ~12%, EASED (smoothstep) so the
      // reveal glides instead of ramping linearly — a soft cinematic open from the vault. The
      // canvas is already warm (rootMargin warm-up) so the reveal shows a smooth scene, not a hitch.
      if (enterRef.current) enterRef.current.style.opacity = (1 - smooth(clamp01(p / 0.12))).toFixed(3)
      // EXIT: a clean fade to BLACK as the camera dives in (p .84→1), seamless into the
      // dark shop below. (The old warm-orange flood read as a flash + clashed with the
      // dark theme — removed.)
      if (resolveRef.current) resolveRef.current.style.opacity = clamp01((p - 0.84) / 0.16).toFixed(3)
      rafId.current = requestAnimationFrame(frame)
    }
    rafId.current = requestAnimationFrame(frame)
    return () => {
      running = false
      cancelAnimationFrame(rafId.current)
    }
  }, [inView, reduced])

  return (
    <section ref={sectionRef} aria-label="FitSole — two drops, one vault" className="relative h-[240vh] w-full">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-vault-black">
        {/* The real 3D scene (or a premium static render on the no-WebGL mobile path) */}
        {mobile ? (
          <Image src="/images/scene-cloud.webp" alt="ON Cloudmonster" fill priority sizes="100vw" className="object-cover opacity-90" />
        ) : (
          <div className="absolute inset-0">
            <SkyScene scrollProgress={scrollProgress} active={inView} reduced={reduced} invalidateRef={invalidateRef} ballControlRef={ballControlRef} onScore={onScore} />
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
              // A DEFINED cinematic spotlight shaft over the ring — a tight bright core beam
              // + a wide soft halo — plus a DEEPER vignette that sinks the studio into shadow
              // so the lit hero pairs pop (the premium 'arena spotlight' look). Compositor-cheap.
              'radial-gradient(ellipse 12% 82% at 50% -8%, rgba(255,240,212,0.46), rgba(255,214,160,0.1) 34%, transparent 60%),' +
              'radial-gradient(ellipse 42% 94% at 50% -2%, rgba(255,222,172,0.15), transparent 56%),' +
              'radial-gradient(ellipse 100% 100% at 50% 42%, transparent 44%, rgba(0,0,0,0.8) 100%)',
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

        {/* Charge — warm energy gathers at the meeting point before the pairs meet. */}
        <div
          ref={chargeRef}
          aria-hidden
          className="absolute inset-0 pointer-events-none z-[5]"
          style={{ opacity: 0, backgroundImage: 'radial-gradient(ellipse 28% 26% at 50% 60%, rgba(255,216,150,0.5), rgba(255,184,104,0.12) 46%, transparent 72%)' }}
        />

        {/* HERO bloom — a warm flare at the meeting (screen blend = adds light, not a
            grey overlay) so the meet lands as a luminous reveal, then settles. */}
        <div
          ref={glowRef}
          aria-hidden
          className="absolute inset-0 pointer-events-none z-[6] mix-blend-screen"
          style={{ opacity: 0, backgroundImage: 'radial-gradient(ellipse 55% 48% at 50% 52%, rgba(255,228,170,0.6), rgba(255,198,122,0.2) 42%, transparent 70%)' }}
        />

        {/* SWISH flash — a quick warm-gold burst when you sink a basket (driven by onScore;
            opacity is set to 0.6 then transitions back to 0 over 0.5s → a clean "score!" pulse). */}
        <div
          ref={scoreFlashRef}
          aria-hidden
          className="absolute inset-0 pointer-events-none z-[7] mix-blend-screen"
          style={{
            opacity: 0,
            transition: 'opacity 0.5s ease-out',
            backgroundImage:
              'radial-gradient(ellipse 70% 60% at 50% 46%, rgba(255,224,150,0.85), rgba(255,196,110,0.3) 40%, transparent 72%)',
          }}
        />

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

        {/* ENTRANCE fade — the room reveals UP from black as you scroll in from the vault. */}
        <div ref={enterRef} aria-hidden className="absolute inset-0 z-[19] bg-vault-black pointer-events-none" style={{ opacity: 1 }} />
        {/* EXIT — a clean fade to black as the camera dives in, seamless into the shop. */}
        <div ref={resolveRef} aria-hidden className="absolute inset-0 z-20 bg-vault-black pointer-events-none" style={{ opacity: 0 }} />
      </div>
    </section>
  )
}
