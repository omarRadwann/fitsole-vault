'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import ModelOrFallback from '@/components/three/ModelOrFallback'
import { ASSETS } from '@/lib/assets'
import { isIntegratedGpu, readGpuRenderer } from '@/lib/deviceTier'

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (x: number) => x * x * (3 - 2 * x)

const fallbackMat = new THREE.MeshStandardMaterial({ color: '#3A352E', roughness: 0.5, metalness: 0.3 })
// Cheap static glossy floor for INTEGRATED GPUs — reflects the warm baked IBL (no
// real-time reflection FBO pass). The contact shadows do the grounding. Discrete
// GPUs get the live MeshReflectorMaterial reflection instead (see Scene).
const staticFloorMat = new THREE.MeshStandardMaterial({ color: '#0B0908', roughness: 0.34, metalness: 0.6 })

// Tight, dark contact shadow under each sole — RELIABLE grounding (the reflection
// adds richness but is faint/GPU-dependent). Sits at the floor line (y≈0) so its
// own reflection is coincident with it → reads as contact darkening, never a
// floating smudge. Tighter + darker than a generic blob = a firm "planted" look.
function useShadowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64)
    g.addColorStop(0, 'rgba(0,0,0,0.8)')
    g.addColorStop(0.45, 'rgba(0,0,0,0.42)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])
}

// One pair: an outer group (walk X + turntable Y) → a bob group (step bounce) →
// the model (rotated to face inward). faceSign +1 faces +X (right), -1 faces -X.
// Grounding now comes from the real floor REFLECTION (MeshReflectorMaterial below)
// — no fake shadow plane (it would float above its own reflection and read worse).
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
      {/* tight contact shadow at the floor line — planted grounding */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0.02]}>
        <planeGeometry args={[1.5, 0.62]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}

function Scene({
  scrollProgress,
  reduced,
  invalidateRef,
  reflective,
}: {
  scrollProgress: React.MutableRefObject<number>
  reduced: boolean
  invalidateRef: React.MutableRefObject<(() => void) | null>
  reflective: boolean
}) {
  const lOuter = useRef<THREE.Group>(null)
  const lBob = useRef<THREE.Group>(null)
  const rOuter = useRef<THREE.Group>(null)
  const rBob = useRef<THREE.Group>(null)
  const shadowTex = useShadowTexture()
  const { camera, invalidate } = useThree()

  // Expose invalidate() to SkyBridge so its scroll rAF renders ONLY on scroll
  // (frameloop="demand"). Render once on mount.
  useEffect(() => {
    invalidateRef.current = invalidate
    invalidate()
    return () => {
      invalidateRef.current = null
    }
  }, [invalidate, invalidateRef])

  // Whole scene is a PURE FUNCTION of scroll (walk, bob, turntable, AND the end
  // camera dive) → demand-mode holds the last frame at zero GPU cost when idle.
  useFrame(() => {
    const p = scrollProgress.current

    // END "DIVE": as the scene resolves (p>0.86) the camera pushes IN + slightly up
    // — under the gold flood (CSS) it reads as diving into the vault, into the shop.
    const dive = smooth(clamp01((p - 0.86) / 0.14))
    camera.position.z = lerp(4.3, 3.05, dive)
    camera.position.y = lerp(0.9, 1.08, dive)
    camera.lookAt(0, lerp(0.62, 0.72, dive), 0)

    const enter = clamp01(p / 0.5)
    const e = smooth(enter)
    const bob = reduced ? 0 : Math.abs(Math.sin(enter * Math.PI * 3)) * 0.07
    // Scroll-driven turntable — FROZEN once the dive begins (p>0.86) so the spin and
    // the camera push don't fight. ~1.8 scrubbable turns before it locks.
    const present = clamp01((Math.min(p, 0.86) - 0.5) / 0.5)
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

      {/* Baked IBL — the scene's RICHNESS, FREE per-frame (frames=1 bakes once).
          Warm/brass-dominant: gold key overhead + strong warm FRONT panel (lights
          the shoes' faces so we need ~no real-time lights) + brass ring + side
          brass + a warm back glow. Zero blue. */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={4.4} color="#FFC178" position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[8, 8, 1]} />
        <Lightformer intensity={2.8} color="#FFE7C6" position={[0, 1.8, 5]} scale={[8, 5, 1]} />
        <Lightformer intensity={2.4} color="#D7AE72" form="ring" position={[0, 3, 1.5]} scale={4} />
        <Lightformer intensity={1.5} color="#C98B45" position={[-4, 2, 1]} rotation={[0, Math.PI / 2, 0]} scale={[5, 5, 1]} />
        <Lightformer intensity={1.5} color="#C98B45" position={[4, 2, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[5, 5, 1]} />
        <Lightformer intensity={1.0} color="#E8DAC2" position={[0, 2.6, -5]} scale={[9, 4, 1]} />
      </Environment>

      {/* ONE real-time light (iGPU fill-rate is the binding cost). IBL does the fill;
          this warm overhead spot adds the directional "spotlight pool" + floor
          falloff. ambient lifts shadows just enough to keep faces readable. */}
      <ambientLight intensity={0.42} color="#FFE2C2" />
      <spotLight position={[0, 5.6, 1.2]} angle={0.64} penumbra={1} intensity={42} distance={16} decay={2} color="#FFE3C2" />

      {/* Glossy marble floor with a REAL (cheap) reflection — grounds the pairs in
          their own warm reflection + fills the lower frame with richness. Kept
          subtle + warm (mirror 0.5, rough 0.55, dark warm base) — NOT the sharp
          blue mirror from before. resolution 128 + no blur = one cheap FBO pass,
          and demand-mode means it only renders while scrolling. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={reflective ? undefined : staticFloorMat}>
        <circleGeometry args={[7, 48]} />
        {reflective && (
          <MeshReflectorMaterial
            resolution={128}
            blur={[0, 0]}
            mixBlur={0}
            depthScale={0}
            mixStrength={2.2}
            mirror={0.78}
            color="#100B08"
            metalness={0.7}
            roughness={0.32}
          />
        )}
      </mesh>

      <Pair url={ASSETS.cloudmonster} faceSign={1} outerRef={lOuter} bobRef={lBob} shadowTex={shadowTex} />
      <Pair url={ASSETS.ae1} faceSign={-1} outerRef={rOuter} bobRef={rBob} shadowTex={shadowTex} />
    </>
  )
}

// Canvas wrapper (dynamic-imported by SkyBridge, ssr:false).
// PERF (iGPU-first — 2nd WebGL canvas over the vault's):
//   • frameloop="demand" + invalidate-on-scroll → renders ONLY while scrolling;
//     a held frame costs ZERO GPU (the scene is a pure function of scroll).
//   • dpr pinned to 1.0 → no 1.44× fill-rate blow-up on integrated GPUs.
//   • ONE real-time light + baked IBL (free). The reflection adds one cheap 128px
//     FBO pass, demand-gated. No postprocessing, no real shadows.
//   • gold glow / vignette / shaft / dust / grain + the meeting burst + the end
//     gold-flood transition are all cheap CSS overlays in SkyBridge.
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
  // Assume integrated (no live reflection) until a discrete GPU is confirmed in
  // onCreated — same conservative default as the vault. Integrated GPUs (Iris Xe)
  // get a cheap static glossy floor; discrete GPUs get the live reflection.
  const [reflective, setReflective] = useState(false)
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
      onCreated={({ gl }) => {
        try {
          setReflective(!isIntegratedGpu(readGpuRenderer(gl.getContext())))
        } catch {
          /* keep the cheap static floor on any failure */
        }
      }}
    >
      <Suspense fallback={null}>
        <Scene scrollProgress={scrollProgress} reduced={reduced} invalidateRef={invalidateRef} reflective={reflective} />
      </Suspense>
    </Canvas>
  )
}
