'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { withBase } from '@/lib/basePath'

// Scroll-revealed cinematic unboxing (AI-generated: Nano Banana 2 still ->
// Kling 3.0 motion). The video autoplays muted + looped ONLY while in view
// (IntersectionObserver) to save GPU/bandwidth, and the block rises + fades in
// on entry. Poster paints instantly; the video lazy-loads (preload="none").
export default function FeaturedUnboxing() {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const inViewRef = useRef(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    const video = videoRef.current
    if (!section) return
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting
        if (entry.isIntersecting) {
          setShown(true)
          video?.play().catch(() => {})
        } else {
          video?.pause()
        }
      },
      { threshold: 0.2 }
    )
    io.observe(section)
    return () => io.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative py-10 sm:py-14 px-6 lg:px-8 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/70 mb-10">
          Featured Drop · Unboxed
        </p>
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-10 lg:gap-16 items-center">
          {/* Cinematic video */}
          <div
            className={cn(
              'relative aspect-video overflow-hidden rounded-sm border border-vault-border bg-vault-surface transition-all duration-700 ease-out',
              shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            )}
          >
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              src={withBase('/video/ae1-unboxing.mp4')}
              poster={withBase('/video/ae1-unboxing.webp')}
              muted
              loop
              playsInline
              preload="none"
              onCanPlay={() => {
                if (inViewRef.current) videoRef.current?.play().catch(() => {})
              }}
            />
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.55)]" />
          </div>

          {/* Editorial copy */}
          <div
            className={cn(
              'transition-all duration-700 ease-out delay-150',
              shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            )}
          >
            <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-vault-muted">
              adidas · Basketball
            </span>
            <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold text-vault-cream leading-[0.95] tracking-tight mt-3">
              A.E. 1 Low
            </h2>
            <p className="text-sm text-vault-cream/70 leading-relaxed max-w-[42ch] mt-5">
              The pair from the pedestal — sealed, verified, and unboxed in the vault,
              authenticated before it ships from Cairo.
            </p>
            <a
              href="#adidas-ae-1-low"
              className="group/cta mt-8 inline-flex items-center gap-2 px-8 py-3 text-xs tracking-[0.2em] uppercase font-medium border border-vault-gold/40 text-vault-gold hover:bg-vault-gold/10 hover:border-vault-gold/70 transition-colors duration-200 rounded-sm"
            >
              Shop this pair
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
