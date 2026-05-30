'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { audioEngine } from '@/lib/audioEngine'

// Premium Higgsfield hero renders of the two REAL pairs (image-to-image from the
// catalog photos — accurate, just dramatically lit on a near-black studio bg).
// Both face right; the right pair is flipped to face inward so they meet toe-to-toe.
const LEFT = { src: '/images/meet-cloud.webp', alt: 'ON Cloudmonster' }
const RIGHT = { src: '/images/meet-ae1.webp', alt: 'Adidas A.E. 1 Low' }
const SPARKS = [0, 26, 52, 78, 104, 130, 156, 182, 208, 234, 260, 286, 312, 338]

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (x: number) => x * x * (3 - 2 * x)

// "The Meeting" — two premium-rendered pairs STRIDE in from the edges (bob +
// heel-toe rock + a gold speed-trail), LUNGE into the middle and MEET with a gold
// impact burst (ring + flash + sparks), then "Two drops. One vault." lands and the
// frame resolves to black into the shop. Renders are edge-masked so their dark
// studio bg melts into the stage. All CSS/2D, compositor-only, single rAF gated to
// in-view — NO WebGL, no blur (so the finale + the unboxing video stay smooth).
export default function SkyBridge() {
  const sectionRef = useRef<HTMLElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const leftTrailRef = useRef<HTMLDivElement>(null)
  const rightTrailRef = useRef<HTMLDivElement>(null)
  const burstRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const resolveRef = useRef<HTMLDivElement>(null)

  const [inView, setInView] = useState(false)
  const [reduced, setReduced] = useState(false)
  const neyFired = useRef(false)
  const armed = useRef(false)
  const rafId = useRef(0)
  const offset = useRef(0)
  const span = useRef(1)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const u = () => setReduced(mq.matches)
    u()
    mq.addEventListener('change', u)
    return () => mq.removeEventListener('change', u)
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

  useEffect(() => {
    if (!inView) return
    let running = true
    const STEPS = 3
    const frame = () => {
      if (!running) return
      const p = clamp01((window.scrollY - offset.current) / span.current)
      const enter = clamp01(p / 0.5)
      const eased = smooth(enter)
      const bob = reduced ? 0 : -Math.abs(Math.sin(enter * Math.PI * STEPS)) * 13
      const rock = reduced ? 0 : Math.sin(enter * Math.PI * STEPS * 2) * 3
      // Lunge: a quick forward push in the last 20% of the stride, then settle.
      const lunge = !reduced && enter > 0.8 ? Math.sin(((enter - 0.8) / 0.2) * Math.PI) * 3 : 0
      const pulse = !reduced && p > 0.46 && p < 0.62 ? Math.sin(((p - 0.46) / 0.16) * Math.PI) * 0.06 : 0
      const lx = lerp(-70, -9, eased) + lunge
      const rx = lerp(70, 9, eased) - lunge
      const t = `scale(${(1 + pulse).toFixed(3)})`
      if (leftRef.current)
        leftRef.current.style.transform = `translate(calc(-50% + ${lx.toFixed(2)}vw), calc(-50% + ${bob.toFixed(1)}px)) rotate(${rock.toFixed(2)}deg) ${t}`
      if (rightRef.current)
        rightRef.current.style.transform = `translate(calc(-50% + ${rx.toFixed(2)}vw), calc(-50% + ${bob.toFixed(1)}px)) rotate(${(-rock).toFixed(2)}deg) ${t}`
      // Speed-trail: brightest mid-stride, gone by the meeting.
      const trail = reduced ? 0 : Math.sin(enter * Math.PI) * 0.55
      if (leftTrailRef.current) leftTrailRef.current.style.opacity = trail.toFixed(3)
      if (rightTrailRef.current) rightTrailRef.current.style.opacity = trail.toFixed(3)
      // Impact burst (one-shot, re-armed on scroll-back)
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
        const fin = clamp01((p - 0.52) / 0.12)
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

  // Edge-mask so each render's dark studio bg melts into the stage.
  const maskStyle: React.CSSProperties = {
    WebkitMaskImage: 'radial-gradient(ellipse 86% 90% at 50% 50%, #000 60%, transparent 94%)',
    maskImage: 'radial-gradient(ellipse 86% 90% at 50% 50%, #000 60%, transparent 94%)',
  }
  const box = 'relative w-[clamp(20rem,44vw,36rem)] aspect-[4/3]'

  return (
    <section ref={sectionRef} aria-label="FitSole — two drops, one vault" className="relative h-[200vh] w-full">
      <div
        className="sticky top-0 h-screen w-full overflow-hidden bg-vault-black"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 56% at 50% 48%, rgba(191,160,106,0.12), transparent 70%),' +
            'radial-gradient(ellipse 82% 82% at 50% 50%, transparent 54%, rgba(0,0,0,0.6) 100%)',
        }}
      >
        {/* Left pair (strides in from the left, faces right) */}
        <div ref={leftRef} className="absolute left-1/2 top-1/2 will-change-transform" style={{ transform: 'translate(calc(-50% - 70vw), -50%)' }}>
          <div className={box}>
            <div ref={leftTrailRef} aria-hidden className="absolute top-1/2 right-[40%] -translate-y-1/2 w-[60%] h-[26%]" style={{ opacity: 0, background: 'linear-gradient(to left, rgba(255,201,120,0.5), transparent 78%)' }} />
            <Image src={LEFT.src} alt={LEFT.alt} fill sizes="(max-width:640px) 80vw, 44vw" priority className="object-contain" style={maskStyle} />
          </div>
        </div>

        {/* Right pair (strides in from the right, flipped to face left) */}
        <div ref={rightRef} className="absolute left-1/2 top-1/2 will-change-transform" style={{ transform: 'translate(calc(-50% + 70vw), -50%)' }}>
          <div className={box} style={{ transform: 'scaleX(-1)' }}>
            <div ref={rightTrailRef} aria-hidden className="absolute top-1/2 right-[40%] -translate-y-1/2 w-[60%] h-[26%]" style={{ opacity: 0, background: 'linear-gradient(to left, rgba(120,200,255,0.45), transparent 78%)' }} />
            <Image src={RIGHT.src} alt={RIGHT.alt} fill sizes="(max-width:640px) 80vw, 44vw" priority className="object-contain" style={maskStyle} />
          </div>
        </div>

        {/* Gold impact burst at the meeting point */}
        <div ref={burstRef} aria-hidden className="meet-burst absolute left-1/2 top-1/2 pointer-events-none" style={{ width: 0, height: 0 }}>
          <div className="ring absolute rounded-full border-2 border-vault-gold/70" style={{ width: '180px', height: '180px', left: '-90px', top: '-90px' }} />
          <div className="ring2 absolute rounded-full border border-vault-gold/40" style={{ width: '110px', height: '110px', left: '-55px', top: '-55px' }} />
          <div className="flash absolute rounded-full" style={{ width: '440px', height: '440px', left: '-220px', top: '-220px', background: 'radial-gradient(circle, rgba(255,236,184,0.82), rgba(255,192,112,0.24) 36%, transparent 62%)' }} />
          {SPARKS.map((a, i) => (
            <span key={i} className="spark absolute rounded-full" style={{ width: '6px', height: '6px', left: '-3px', top: '-3px', background: 'rgba(255,226,154,0.95)', boxShadow: '0 0 9px 1px rgba(255,210,130,0.6)', ['--a']: `${a}deg` } as React.CSSProperties} />
          ))}
        </div>

        {/* Copy + CTA (lands after the meeting) */}
        <div className="absolute inset-0 z-10 h-full flex flex-col items-center justify-end pb-[14vh] px-6 text-center pointer-events-none">
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
