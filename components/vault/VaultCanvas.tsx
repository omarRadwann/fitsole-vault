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
  isIntegratedGpu,
  readForcedTier,
} from '@/lib/deviceTier'
import { DebugStats, DebugOverlay, makeDebugSink } from './VaultDebug'

interface VaultCanvasProps {
  scrollProgress: React.MutableRefObject<number>
  // When false, the render loop is parked (frameloop="never") — the vault has
  // scrolled out of view or the tab is hidden, so there's nothing to draw.
  active: boolean
  // prefers-reduced-motion. Forwarded to VaultScene to freeze the scene's
  // incidental auto-motion (hero turntable, drifting dust, hero scan-light,
  // audio-reactive emissive pulse) while the scroll-driven camera and the
  // screen videos keep running.
  reduced: boolean
}

function LoadingFallback() {
  return (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#BFA06A" opacity={0.3} transparent />
    </mesh>
  )
}

export default function VaultCanvas({ scrollProgress, active, reduced }: VaultCanvasProps) {
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
  // On INTEGRATED GPUs the cap is pinned to 1.0 (fill rate is the binding cost — a
  // 1.5× render is 2.25× the pixel work; this was THE cause of the Iris Xe 1–2 fps
  // freeze). `gpu` is '' until onCreated reads it, so the first frame uses the tier
  // cap and then settles to 1.0 once the iGPU is identified — a one-time reflow.
  const integrated = useMemo(() => isIntegratedGpu(gpu), [gpu])
  const dpr = useMemo(() => clampDpr(tier, integrated), [tier, integrated])

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

  // Resilient auto-tier. The tier walks ONE step at a time within [safe..ceiling],
  // where `ceiling` is the GPU-appropriate tier (set in onCreated). A transient
  // frame dip — very common during dev/HMR compiles — drops one step and then
  // climbs back when FPS recovers. The OLD behaviour slammed straight to 'safe' on
  // a single bad sample and LATCHED there: poster-only cashier video (reads as
  // "frozen") + no shadows/bloom/AO on the shelves. Pinned tiers (?tier= / H·S·L)
  // are never auto-moved.
  const ORDER = useMemo<QualityTier[]>(() => ['safe', 'standard', 'high'], [])
  const ceiling = useRef<QualityTier>(urlForced ?? initialTier())
  const stepDown = useCallback(() => {
    if (manualTier) return
    setAutoTier((t) => ORDER[Math.max(0, ORDER.indexOf(t) - 1)])
  }, [manualTier, ORDER])
  const stepUp = useCallback(() => {
    if (manualTier) return
    setAutoTier((t) => ORDER[Math.min(ORDER.indexOf(ceiling.current), ORDER.indexOf(t) + 1)])
  }, [manualTier, ORDER])

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
          if (hint) {
            setAutoTier(hint)
            ceiling.current = hint // the GPU-appropriate tier the monitor may recover back up to
          }
          // Boot diagnostic — the same data the §8 overlay shows, for QA logs.
          console.log(
            `[vault] tier:${manualTier ?? hint ?? autoTier} dpr:${dpr.toFixed(2)} webgl2:${gl.capabilities.isWebGL2} gpu:${renderer || 'unknown'}`
          )
        }}
      >
        <PerformanceMonitor
          flipflops={6}
          onIncline={stepUp}
          onDecline={stepDown}
          onFallback={stepDown}
        />
        {showStats && <Stats />}
        {debug && <DebugStats sink={sink} />}
        <Suspense fallback={<LoadingFallback />}>
          <VaultScene scrollProgress={scrollProgress} active={active} tier={tier} reduced={reduced} />
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
