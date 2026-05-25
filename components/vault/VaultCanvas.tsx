'use client'

import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor, Stats } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useState } from 'react'
import VaultScene from './VaultScene'
import {
  type QualityTier,
  initialTier,
  clampDpr,
  readGpuRenderer,
  tierFromGpu,
  readForcedTier,
} from '@/lib/deviceTier'

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
  // ?tier=high|standard|safe PINS the tier (no auto-change) so the owner can
  // measure a specific tier on a real device.
  const forcedTier = useMemo(readForcedTier, [])

  // Conservative boot guess (mostly STANDARD). The real GPU string — read in
  // onCreated before the preloader opens — lifts it to HIGH (discrete / Apple
  // GPU) or drops it to SAFE (Intel iGPU / software rasterizer), so there's no
  // visible pop. After that it only ever degrades (PerformanceMonitor, one-way).
  const [tier, setTier] = useState<QualityTier>(() => forcedTier ?? initialTier())
  const [gpu, setGpu] = useState('')

  // DPR is DERIVED from the tier — clamped to [1.0, cap]. It never drops below 1.0:
  // the old PerformanceMonitor 0.6 floor is exactly what made weak laptops blurry.
  // The cap only bites on hi-dpi screens; a 1.0-dpr laptop stays crisp on every
  // tier and the EFFECT cuts (N8AO/bloom/particles/shadows) do the perf work.
  const dpr = useMemo(() => clampDpr(tier), [tier])

  // Gate dev overlays behind mount so URL-derived (client-only) DOM doesn't cause
  // a hydration mismatch with the server markup.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const showStats = mounted && new URLSearchParams(window.location.search).has('fps')

  // One-way degrade. The action is "drop a tier" (cut the expensive effects FIRST,
  // per briefing §6.2) — not "crush DPR." Resolution stays native; the look
  // simplifies. A capable device that dips once never oscillates back up.
  const degrade = () => setTier((t) => (t === 'high' ? 'standard' : 'safe'))

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
          // GPU string is the most reliable capability signal — it catches the
          // classic "gaming laptop running on the Intel iGPU" case → SAFE.
          if (!forcedTier) {
            const hint = tierFromGpu(renderer)
            if (hint) setTier(hint)
          }
        }}
      >
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => { if (!forcedTier) degrade() }}
          onFallback={() => { if (!forcedTier) setTier('safe') }}
        />
        {showStats && <Stats />}
        <Suspense fallback={<LoadingFallback />}>
          <VaultScene scrollProgress={scrollProgress} active={active} tier={tier} />
        </Suspense>
      </Canvas>
      {showStats && (
        <div
          style={{
            position: 'fixed',
            top: 50,
            left: 0,
            zIndex: 10000,
            padding: '2px 6px',
            background: 'rgba(0,0,0,0.7)',
            color: '#BFA06A',
            font: '11px/1.4 monospace',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            maxWidth: '60vw',
          }}
        >
          tier:{tier}{forcedTier ? ' (forced)' : ''} dpr:{dpr.toFixed(2)}
          <br />
          gpu:{gpu || '—'}
        </div>
      )}
    </>
  )
}
