'use client'

import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import ModelOrFallback from '@/components/three/ModelOrFallback'
import { ASSETS } from '@/lib/assets'

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (x: number) => x * x * (3 - 2 * x)

// Dark glossy marble floor — low roughness + metalness picks up the baked
// Environment (gold/brass) as a reflection, matching the render's marble look.
const floorMat = new THREE.MeshStandardMaterial({ color: '#08070A', roughness: 0.36, metalness: 0.55 })
const fallbackMat = new THREE.MeshStandardMaterial({ color: '#3A352E', roughness: 0.5, metalness: 0.3 })

function useShadowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 3, 64, 64, 64)
    g.addColorStop(0, 'rgba(0,0,0,0.62)')
    g.addColorStop(0.5, 'rgba(0,0,0,0.3)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])
}

// One pair: an outer group (walk X + turntable Y) → a bob group (step bounce) →
// the model (rotated to face inward), plus a soft fake shadow on the floor that
// follows the walk but doesn't bob. faceSign +1 = faces +X (right), -1 = -X.
// NOTE: Tripo side-profile faces +Z natively; rotating ∓90° points it along X.
// If a shoe faces the wrong way on the live look, flip the sign of `face`.
function Pair({
  url,
  faceSign,
  outerRef,
  bobRef,
  shadowTex,
}: {
  url: string
  faceSign: number
  outerRef: React.RefObject<THREE.Group | null>
  bobRef: React.RefObject<THREE.Group | null>
  shadowTex: THREE.Texture
}) {
  const face = faceSign > 0 ? -Math.PI / 2 : Math.PI / 2
  return (
    <group ref={outerRef}>
      <group ref={bobRef}>
        <Suspense fallback={null}>
          <ModelOrFallback
            url={url}
            normalizeTo={1.55}
            seat="bottom"
            rotation={[0, face, 0]}
            envMapIntensity={1.2}
            fallback={
              <mesh material={fallbackMat} position={[0, 0.45, 0]}>
                <boxGeometry args={[1, 0.45, 0.36]} />
              </mesh>
            }
          />
        </Suspense>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.08]}>
        <planeGeometry args={[1.95, 1.2]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}

function Scene({ scrollProgress, reduced }: { scrollProgress: React.MutableRefObject<number>; reduced: boolean }) {
  const lOuter = useRef<THREE.Group>(null)
  const lBob = useRef<THREE.Group>(null)
  const rOuter = useRef<THREE.Group>(null)
  const rBob = useRef<THREE.Group>(null)
  const shadowTex = useShadowTexture()
  const spin = useRef(0)
  const { camera } = useThree()

  useFrame((_, dt) => {
    camera.lookAt(0, 0.62, 0)
    const p = scrollProgress.current
    const enter = clamp01(p / 0.5)
    const e = smooth(enter)
    const bob = reduced ? 0 : Math.abs(Math.sin(enter * Math.PI * 3)) * 0.07
    // After the meeting, a slow turntable presents both pairs (frozen if reduced).
    if (!reduced && p > 0.55) spin.current += Math.min(dt, 0.05) * 0.3
    const lx = lerp(-5.0, -0.78, e)
    const rx = lerp(5.0, 0.78, e)
    if (lOuter.current) { lOuter.current.position.x = lx; lOuter.current.rotation.y = spin.current }
    if (rOuter.current) { rOuter.current.position.x = rx; rOuter.current.rotation.y = -spin.current }
    if (lBob.current) lBob.current.position.y = bob
    if (rBob.current) rBob.current.position.y = bob
  })

  return (
    <>
      <color attach="background" args={['#0A0807']} />
      <fog attach="fog" args={['#0A0705', 4, 11]} />

      {/* Baked IBL — WARM-dominant (gold key overhead + brass ring + warm fill); the
          cool source is tiny (just a hint of rim) so the marble floor reads dark-warm,
          not a blue mirror. frames=1 → zero per-frame cost. */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={4.2} color="#FFBE74" position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[7, 7, 1]} />
        <Lightformer intensity={2.0} color="#FFE6C2" position={[0, 2, 5]} scale={[7, 4, 1]} />
        <Lightformer intensity={1.9} color="#C9A36A" form="ring" position={[0, 3, 1]} scale={3.6} />
        <Lightformer intensity={0.8} color="#E8DAC2" position={[0, 2.6, -5]} scale={[9, 4, 1]} />
      </Environment>

      <ambientLight intensity={0.18} color="#FFE2C2" />
      {/* Warm gold overhead key — the render's spotlight pool on shoes + floor. */}
      <spotLight position={[0, 5.6, 1.0]} angle={0.62} penumbra={1} intensity={42} distance={16} decay={2} color="#FFE3C2" />
      {/* Dedicated warm KEY from front-above (camera side) — lights the shoes' faces
          warmly so they sit IN the gold pool, not flat in a dark mid-zone. */}
      <spotLight position={[0, 3.4, 3.6]} angle={0.7} penumbra={0.9} intensity={26} distance={12} decay={2} color="#FFD49A" />
      {/* Warm low front fill — lifts the camera-facing side + warms the floor pool. */}
      <pointLight position={[0, 0.5, 2.4]} intensity={4.0} color="#FFCF9A" distance={5.5} decay={2} />
      {/* Warm-neutral back rim (NO blue) — edges the dark A.E.1 from the void. */}
      <pointLight position={[0, 3.0, -3.0]} intensity={1.4} color="#FFE6CC" distance={5} decay={2} />

      {/* Dark glossy marble floor (reflects the Environment) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={floorMat}>
        <circleGeometry args={[9, 64]} />
      </mesh>

      <Pair url={ASSETS.cloudmonster} faceSign={1} outerRef={lOuter} bobRef={lBob} shadowTex={shadowTex} />
      <Pair url={ASSETS.ae1} faceSign={-1} outerRef={rOuter} bobRef={rBob} shadowTex={shadowTex} />
    </>
  )
}

// Canvas wrapper (dynamic-imported by SkyBridge, ssr:false). frameloop gated to
// in-view so it only renders on-screen (never alongside the vault canvas / the
// shop). Lean: low DPR, no postprocessing, no real shadows. The cinematic gold
// glow + vignette + the meeting burst are CSS overlays in SkyBridge.
export default function SkyScene({
  scrollProgress,
  active,
  reduced,
}: {
  scrollProgress: React.MutableRefObject<number>
  active: boolean
  reduced: boolean
}) {
  return (
    <Canvas
      flat
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.2]}
      camera={{ position: [0, 0.9, 4.3], fov: 42, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      shadows={false}
      style={{ background: '#0A0908' }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <Scene scrollProgress={scrollProgress} reduced={reduced} />
      </Suspense>
    </Canvas>
  )
}
