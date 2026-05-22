'use client'

import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'

// Full-screen curtain shown while the 3D vault loads. Driven by drei's global
// loading manager (useProgress works outside <Canvas> — it's a zustand store).
export default function VaultPreloader() {
  const { active, progress, total } = useProgress()
  const [hidden, setHidden] = useState(false)
  const [fading, setFading] = useState(false)
  const startedRef = useRef(false)
  const exitingRef = useRef(false)
  const mountTime = useRef(Date.now())

  // Loaders have registered — loading is genuinely underway.
  if (total > 0) startedRef.current = true

  useEffect(() => {
    if (exitingRef.current) return

    function beginExit() {
      if (exitingRef.current) return
      exitingRef.current = true
      // Keep the curtain up briefly so cached loads don't flash.
      const wait = Math.max(0, 700 - (Date.now() - mountTime.current))
      window.setTimeout(() => {
        setFading(true)
        window.setTimeout(() => setHidden(true), 750)
      }, wait)
    }

    // Never hang the curtain — drain after 6s no matter what.
    const safety = window.setTimeout(beginExit, 6000)
    if (startedRef.current && !active) beginExit()

    return () => window.clearTimeout(safety)
  }, [active])

  if (hidden) return null

  const pct = Math.min(100, Math.round(progress))

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-700 ease-out ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at 50% 42%, #15120F 0%, #0C0B0A 72%)',
        pointerEvents: fading ? 'none' : 'auto',
      }}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-7 px-6">
        <p className="text-[10px] tracking-[0.5em] uppercase text-vault-gold/60">FitSole · Cairo</p>
        <h2 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-vault-cream text-center leading-[0.95]">
          Entering the Vault
        </h2>
        <div className="w-56 sm:w-72 flex flex-col gap-2.5">
          <div className="h-px w-full bg-vault-cream/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-vault-gold/50 to-vault-gold transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] tracking-[0.3em] uppercase text-vault-muted/70">
            <span>Authenticating</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
