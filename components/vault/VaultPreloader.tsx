'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'

// Cinematic intro: a branded loading state that PARTS LIKE VAULT DOORS to reveal
// the 3D vault once drei's global loading manager (useProgress) reports done.
// useProgress is a zustand store, so it works outside <Canvas>. Under
// prefers-reduced-motion the doors simply fade (see globals.css).
// Rotating loading micro-copy — keeps the entry feeling alive (and fresh on repeat
// visits) instead of a single static "Authenticating".
const LOADING_PHRASES = ['Authenticating', 'Verifying the pair', 'Scanning the vault', 'Unlocking the heat']

export default function VaultPreloader() {
  const { active, progress, total } = useProgress()
  const [hidden, setHidden] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const [phraseIdx, setPhraseIdx] = useState(0)
  const startedRef = useRef(false)
  const exitingRef = useRef(false)
  const mountTime = useRef(Date.now())
  const timers = useRef<number[]>([])

  // Cycle the micro-copy while the doors are still shut.
  useEffect(() => {
    const id = window.setInterval(() => setPhraseIdx((i) => (i + 1) % LOADING_PHRASES.length), 1500)
    return () => window.clearInterval(id)
  }, [])

  // Loaders have registered — loading is genuinely underway.
  if (total > 0) startedRef.current = true

  // Idempotent (exitingRef-guarded) so the safety timer and the loaded-fast-path
  // can both call it without double-firing. Stable: only touches refs + setters.
  const beginExit = useCallback(() => {
    if (exitingRef.current) return
    exitingRef.current = true
    // Hold briefly so cached loads don't flash the doors open instantly.
    const wait = Math.max(0, 800 - (Date.now() - mountTime.current))
    timers.current.push(
      window.setTimeout(() => {
        setRevealing(true) // copy fades, then doors part + seam flares
        timers.current.push(window.setTimeout(() => setHidden(true), 1950)) // unmount after the 0.35s delay + 1.35s slide
      }, wait)
    )
  }, [])

  // Safety net — drain after 6s no matter what. MOUNT-ONLY: drei's `active`
  // toggles on every GLB/texture/video decode, so a 6s timer keyed on [active]
  // gets cleared + reset on each toggle and, on a slow device that loads many
  // assets sequentially, NEVER fires — stranding the user behind the curtain.
  // Setting it once on mount (and clearing only on unmount) makes the 6s ceiling
  // a hard guarantee. Also clears the nested reveal timers so none fire after unmount.
  useEffect(() => {
    timers.current.push(window.setTimeout(beginExit, 6000))
    const pending = timers.current
    return () => {
      pending.forEach((t) => window.clearTimeout(t))
      pending.length = 0
    }
  }, [beginExit])

  // Fast path: loaders registered then all settled (!active) → reveal now
  // instead of waiting out the full 6s on a quick/cached load.
  useEffect(() => {
    if (startedRef.current && !active) beginExit()
  }, [active, beginExit])

  if (hidden) return null

  const pct = Math.min(100, Math.round(progress))

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{ pointerEvents: revealing ? 'none' : 'auto' }}
      aria-hidden="true"
    >
      {/* The two vault doors */}
      <div className={`vault-door vault-door--l${revealing ? ' vault-door--open' : ''}`} />
      <div className={`vault-door vault-door--r${revealing ? ' vault-door--open' : ''}`} />
      {/* Center seam — a brass light line that flares as the vault cracks open */}
      <div className={`vault-seam${revealing ? ' vault-seam--flare' : ''}`} />

      {/* Branded loading content — fades as the doors part */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 transition-all duration-700 ease-out"
        style={{ opacity: revealing ? 0 : 1, transform: revealing ? 'scale(1.04)' : 'scale(1)' }}
      >
        <div className="flex flex-col items-center gap-7">
          <p className="text-[10px] tracking-[0.5em] uppercase text-vault-gold/80">FitSole · Cairo</p>
          <h2 className="font-display text-3xl sm:text-5xl font-semibold tracking-display text-vault-cream text-center leading-[0.95]">
            Entering the Vault
          </h2>
          <div className="w-56 sm:w-72 flex flex-col gap-2.5">
            <div className="h-px w-full bg-vault-cream/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-vault-gold/50 to-vault-gold transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] tracking-[0.3em] uppercase text-vault-muted">
              <span className="transition-opacity duration-500">{LOADING_PHRASES[phraseIdx]}</span>
              <span className="tabular-nums">{pct}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
