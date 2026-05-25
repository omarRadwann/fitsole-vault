'use client'

import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor, Stats } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import VaultScene from './VaultScene'
import {
  type QualityTier,
  initialTier,
  clampDpr,
  readGpuRenderer,
  tierFromGpu,
  readForcedTier,
} from '@/lib/deviceTier'
import { DebugStats, DebugOverlay, makeDebugSink } from './VaultDebug'

interface VaultCanvasProps {
  scrollProgress: React.MutableRefObject<number>
  // When false, the render loop is parked (frameloop="never") — the vault has
  // scrolled out of view or the tab is hidden, so there's nothing to draw.
  active: boolean
}

function LoadingFallback() {
  return (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#BFA06A" opacity={0.3} transparent />
    </mesh>
  )
}

export default function VaultCanvas({ scrollProgress, active }: VaultCanvasProps) {
  // Tier resolution: a MANUAL pin (URL ?tier= or the debug overlay's H/S/L buttons)
  // always wins; otherwise the AUTO tier adapts (conservative boot guess → GPU
  // string in onCreated → PerformanceMonitor, one-way DOWN only).
  const urlForced = useMemo(() => readForcedTier(), [])
  const [manualTier, setManualTier] = useState<QualityTier | null>(urlForced)
  const [autoTier, setAutoTier] = useState<QualityTier>(() => urlForced ?? initialTier())
  const tier = manualTier ?? autoTier
  const forced = manualTier !== null

  const [gpu, setGpu] = useState('')
  const [webgl2, setWebgl2] = useState(true)

  // DPR is DERIVED from the tier — clamped to [1.0, cap]. It never drops below 1.0:
  // the old PerformanceMonitor 0.6 floor is exactly what made weak laptops blurry.
  // The cap only bites on hi-dpi screens; a 1.0-dpr laptop stays crisp on every
  // tier and the EFFECT cuts (N8AO/bloom/particles/shadows) do the perf work.
  const dpr = useMemo(() => clampDpr(tier), [tier])

  // Dev overlays. ?fps → drei Stats graph. ?debug=1 / Shift+D → the §8 readout.
  // VaultCanvas is dynamic(ssr:false) → client-only, so reading the URL during
  // render is hydration-safe (no server markup to mismatch) — no mount guard needed.
  const [debug, setDebug] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')
  )
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) setDebug((d) => !d)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const showStats =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('fps')
  const sink = useRef(makeDebugSink())

  // One-way degrade. The action is "drop a tier" (cut the expensive effects FIRST,
  // per briefing §6.2) — not "crush DPR." Resolution stays native; the look
  // simplifies. A capable device that dips once never oscillates back up.
  const degrade = useCallback(() => {
    if (manualTier) return
    setAutoTier((t) => (t === 'high' ? 'standard' : 'safe'))
  }, [manualTier])

  const forceTier = useCallback((t: QualityTier) => setManualTier(t), [])

  return (
    <>
      <Canvas
        flat
        // Render only while the vault is on-screen. Parked ("never") when the user
        // scrolls into the flat shop below or hides the tab, so the heavy scene
        // stops costing GPU. Flips back to "always" on scroll-back. "always" (not
        // "demand") is REQUIRED: the turntable, particles and audio-reactive
        // emissives animate continuously — there is no static frame to hold.
        frameloop={active ? 'always' : 'never'}
        camera={{ position: [0, 1.8, 12], fov: 55, near: 0.1, far: 60 }}
        dpr={dpr}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        // Shadows off on SAFE (set at boot for weak GPUs → no shadow pass at all).
        shadows={tier === 'safe' ? false : 'percentage'}
        style={{ background: '#0C0B0A' }}
        aria-hidden="true"
        onCreated={({ gl }) => {
          const renderer = readGpuRenderer(gl.getContext())
          setGpu(renderer)
          setWebgl2(gl.capabilities.isWebGL2)
          // GPU string is the most reliable capability signal — it catches the
          // classic "gaming laptop running on the Intel iGPU" case → SAFE.
          const hint = manualTier ? null : tierFromGpu(renderer)
          if (hint) setAutoTier(hint)
          // Boot diagnostic — the same data the §8 overlay shows, for QA logs.
          console.log(
            `[vault] tier:${manualTier ?? hint ?? autoTier} dpr:${dpr.toFixed(2)} webgl2:${gl.capabilities.isWebGL2} gpu:${renderer || 'unknown'}`
          )
        }}
      >
        <PerformanceMonitor
          flipflops={3}
          onDecline={degrade}
          onFallback={() => { if (!manualTier) setAutoTier('safe') }}
        />
        {showStats && <Stats />}
        {debug && <DebugStats sink={sink} />}
        <Suspense fallback={<LoadingFallback />}>
          <VaultScene scrollProgress={scrollProgress} active={active} tier={tier} />
        </Suspense>
      </Canvas>
      {debug && (
        <DebugOverlay
          sink={sink}
          tier={tier}
          forced={forced}
          dpr={dpr}
          gpu={gpu}
          webgl2={webgl2}
          scrollProgress={scrollProgress}
          onForceTier={forceTier}
        />
      )}
    </>
  )
}
