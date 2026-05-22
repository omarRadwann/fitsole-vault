'use client'

import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor, Stats } from '@react-three/drei'
import { Suspense, useState } from 'react'
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

export default function VaultCanvas({ scrollProgress }: VaultCanvasProps) {
  // Adaptive resolution: start near-crisp, let PerformanceMonitor scale it.
  const [dpr, setDpr] = useState(1.1)
  // Quality tier drives the expensive-but-pretty extras (reflective floor,
  // accent lights). Starts 'high'; degrades ONE WAY on a weak GPU so capable
  // devices keep the brilliant look while weak ones stay smooth — no oscillation.
  const [tier, setTier] = useState<QualityTier>('high')

  // Dev-only on-screen FPS readout — append ?fps to the URL to show it.
  const showStats =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('fps')

  return (
    <Canvas
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
          setTier('low')
        }}
        onFallback={() => {
          setDpr(0.7)
          setTier('low')
        }}
      />
      {showStats && <Stats />}
      <Suspense fallback={<LoadingFallback />}>
        <VaultScene scrollProgress={scrollProgress} tier={tier} />
      </Suspense>
    </Canvas>
  )
}
