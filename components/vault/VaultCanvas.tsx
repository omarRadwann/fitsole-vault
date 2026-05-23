'use client'

import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor, Stats } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useState } from 'react'
import VaultScene, { type QualityTier } from './VaultScene'

interface VaultCanvasProps {
  scrollProgress: React.MutableRefObject<number>
}

function LoadingFallback() {
  return (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#BFA06A" opacity={0.3} transparent />
    </mesh>
  )
}

// Optional ?tier=high|low override (SSR-safe). When present it PINS the quality
// tier so the owner can A/B the expensive tier-gated extras (reflective floor +
// accent lights) on a real device without PerformanceMonitor flipping the tier
// mid-measurement. Returns null when unset/invalid → normal adaptive behaviour.
function readForcedTier(): QualityTier | null {
  if (typeof window === 'undefined') return null
  const t = new URLSearchParams(window.location.search).get('tier')
  return t === 'high' || t === 'low' ? t : null
}

export default function VaultCanvas({ scrollProgress }: VaultCanvasProps) {
  // A ?tier= override pins the tier for measurement; otherwise it adapts.
  const forcedTier = useMemo(readForcedTier, [])

  // Adaptive resolution: start near-crisp, let PerformanceMonitor scale it.
  const [dpr, setDpr] = useState(1.1)
  // Quality tier drives the expensive-but-pretty extras (reflective floor,
  // accent lights). Starts 'high' (or the forced value); degrades ONE WAY on a
  // weak GPU so capable devices keep the brilliant look while weak ones stay
  // smooth — no oscillation. A forced tier never auto-degrades.
  const [tier, setTier] = useState<QualityTier>(() => forcedTier ?? 'high')

  // Gate the dev overlay behind mount so the ?fps/?tier DOM (read from the URL,
  // client-only) doesn't cause a hydration mismatch with the server markup.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Dev-only on-screen readout — append ?fps to the URL. The tier+dpr label
  // makes "measure each optimisation" possible: the owner sees which tier is
  // live and the current resolution scale on their own device.
  const showStats =
    mounted && new URLSearchParams(window.location.search).has('fps')

  return (
    <>
      <Canvas
        flat
        camera={{ position: [0, 1.8, 12], fov: 55, near: 0.1, far: 60 }}
        dpr={dpr}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        shadows={false}
        style={{ background: '#0C0B0A' }}
        aria-hidden="true"
      >
        <PerformanceMonitor
          flipflops={3}
          onIncline={() => setDpr(1.15)}
          onDecline={() => {
            setDpr(0.85)
            if (!forcedTier) setTier('low')
          }}
          onFallback={() => {
            // Weak-GPU floor: drop to 0.6 DPR (was 0.7) for a bit more headroom.
            setDpr(0.6)
            if (!forcedTier) setTier('low')
          }}
        />
        {showStats && <Stats />}
        <Suspense fallback={<LoadingFallback />}>
          <VaultScene scrollProgress={scrollProgress} />
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
          }}
        >
          tier:{tier} dpr:{dpr.toFixed(2)}
          {forcedTier ? ' (forced)' : ''}
        </div>
      )}
    </>
  )
}
