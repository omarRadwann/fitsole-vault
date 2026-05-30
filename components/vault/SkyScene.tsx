'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
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
            envMapIntensity={1.35}
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

function Scene({
  scrollProgress,
  reduced,
  invalidateRef,
}: {
  scrollProgress: React.MutableRefObject<number>
  reduced: boolean
  invalidateRef: React.MutableRefObject<(() => void) | null>
}) {
  const lOuter = useRef<THREE.Group>(null)
  const lBob = useRef<THREE.Group>(null)
  const rOuter = useRef<THREE.Group>(null)
  const rBob = useRef<THREE.Group>(null)
  const shadowTex = useShadowTexture()
  const { camera, invalidate } = useThree()

  // Expose invalidate() to SkyBridge so its scroll rAF can request a render ONLY
  // when scroll actually moves (frameloop="demand"). Render once on mount.
  useEffect(() => {
    invalidateRef.current = invalidate
    invalidate()
    return () => {
      invalidateRef.current = null
    }
  }, [invalidate, invalidateRef])

  // The whole scene is a PURE FUNCTION of scroll progress (walk, bob, AND the
  // turntable). No time accumulation → nothing animates when you stop scrolling →
  // demand-mode holds the last frame at zero GPU cost. This is the lag fix.
  useFrame(() => {
    camera.lookAt(0, 0.62, 0)
    const p = scrollProgress.current
    const enter = clamp01(p / 0.5)
    const e = smooth(enter)
    const bob = reduced ? 0 : Math.abs(Math.sin(enter * Math.PI * 3)) * 0.07
    // Scroll-DRIVEN turntable: once they meet (p>0.5) they spin proportionally to
    // scroll — fast + fully scrubbable (scroll on = spin on, scroll back = unspin).
    // ~2.5 turns by the end. Counter-rotating so the pair presents to each other.
    const present = clamp01((p - 0.5) / 0.5)
    const spinAngle = reduced ? 0 : present * Math.PI * 5
    const lx = lerp(-5.0, -0.78, e)
    const rx = lerp(5.0, 0.78, e)
    if (lOuter.current) { lOuter.current.position.x = lx; lOuter.current.rotation.y = spinAngle }
    if (rOuter.current) { rOuter.current.position.x = rx; rOuter.current.rotation.y = -spinAngle }
    if (lBob.current) lBob.current.position.y = bob
    if (rBob.current) rBob.current.position.y = bob
  })

  return (
    <>
      <color attach="background" args={['#0A0807']} />
      <fog attach="fog" args={['#0A0705', 4.5, 12]} />

      {/* Baked IBL — the scene's RICHNESS lives here, and it's FREE per-frame
          (frames=1 bakes once into a cubemap; cost is independent of lightformer
          count). Warm/brass-dominant: gold key overhead + a strong warm FRONT panel
          that lights the shoes' faces (so we need almost no real-time lights) + a
          brass ring for sheen + a warm back glow for depth. Zero blue. */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={4.4} color="#FFC178" position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[8, 8, 1]} />
        <Lightformer intensity={2.8} color="#FFE7C6" position={[0, 1.8, 5]} scale={[8, 5, 1]} />
        <Lightformer intensity={2.4} color="#D7AE72" form="ring" position={[0, 3, 1.5]} scale={4} />
        <Lightformer intensity={1.5} color="#C98B45" position={[-4, 2, 1]} rotation={[0, Math.PI / 2, 0]} scale={[5, 5, 1]} />
        <Lightformer intensity={1.5} color="#C98B45" position={[4, 2, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[5, 5, 1]} />
        <Lightformer intensity={1.0} color="#E8DAC2" position={[0, 2.6, -5]} scale={[9, 4, 1]} />
      </Environment>

      {/* ONE real-time light only (iGPU fill-rate is the binding cost — every
          dynamic light is a full per-fragment loop over the big floor + shoes).
          The IBL above does the fill; this warm overhead spot adds the directional
          "spotlight pool" drama + falloff on the floor. ambient lifts the shadows. */}
      <ambientLight intensity={0.5} color="#FFE2C2" />
      <spotLight position={[0, 5.6, 1.2]} angle={0.64} penumbra={1} intensity={40} distance={16} decay={2} color="#FFE3C2" />

      {/* Dark glossy marble floor (reflects the warm Environment) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={floorMat}>
        <circleGeometry args={[7, 48]} />
      </mesh>

      <Pair url={ASSETS.cloudmonster} faceSign={1} outerRef={lOuter} bobRef={lBob} shadowTex={shadowTex} />
      <Pair url={ASSETS.ae1} faceSign={-1} outerRef={rOuter} bobRef={rBob} shadowTex={shadowTex} />
    </>
  )
}

// Canvas wrapper (dynamic-imported by SkyBridge, ssr:false).
// PERF (iGPU-first — this is a 2nd WebGL canvas on top of the vault's):
//   • frameloop="demand" + invalidate-on-scroll → renders ONLY while scrolling.
//     The scene is a pure function of scroll, so a held frame costs ZERO GPU.
//   • dpr pinned to 1.0 → no 1.44× fill-rate blow-up on integrated GPUs.
//   • ONE real-time light (warm overhead spot); the rest is baked IBL (free).
//   • no postprocessing, no real shadows. Gold glow / vignette / shafts / dust /
//     grain + the meeting burst are all cheap CSS overlays in SkyBridge.
export default function SkyScene({
  scrollProgress,
  active,
  reduced,
  invalidateRef,
}: {
  scrollProgress: React.MutableRefObject<number>
  active: boolean
  reduced: boolean
  invalidateRef: React.MutableRefObject<(() => void) | null>
}) {
  return (
    <Canvas
      flat
      frameloop={active ? 'demand' : 'never'}
      dpr={1}
      camera={{ position: [0, 0.9, 4.3], fov: 42, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      shadows={false}
      style={{ background: '#0A0908' }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <Scene scrollProgress={scrollProgress} reduced={reduced} invalidateRef={invalidateRef} />
      </Suspense>
    </Canvas>
  )
}
