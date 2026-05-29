'use client'

import { Suspense, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import * as THREE from 'three'
import ModelOrFallback from '@/components/three/ModelOrFallback'
import { ASSETS } from '@/lib/assets'

// Materials lifted verbatim from the vault so the finale reads as the same world.
const brassMat = new THREE.MeshStandardMaterial({ color: '#C9A36A', roughness: 0.33, metalness: 0.9 })
const marbleMat = new THREE.MeshStandardMaterial({ color: '#14110E', roughness: 0.16, metalness: 0.1 })
const floorMat = new THREE.MeshStandardMaterial({ color: '#0E0B08', roughness: 0.24, metalness: 0.9 })
const heroMat = new THREE.MeshStandardMaterial({ color: '#181412', roughness: 0.08, metalness: 0.95 })

// Sculpted brass plinth profiles (revolved via LatheGeometry) — same as the vault.
const PLINTH_BASE = (
  [
    [0.0, 0.0], [0.6, 0.0], [0.6, 0.05], [0.54, 0.072], [0.5, 0.086],
    [0.46, 0.108], [0.39, 0.126], [0.24, 0.146], [0.17, 0.16],
  ] as [number, number][]
).map(([x, y]) => new THREE.Vector2(x, y))
const PLINTH_CAPITAL = (
  [
    [0.165, 0.84], [0.2, 0.862], [0.27, 0.905], [0.39, 0.952],
    [0.47, 0.987], [0.5, 1.0], [0.5, 1.022], [0.47, 1.03],
  ] as [number, number][]
).map(([x, y]) => new THREE.Vector2(x, y))

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

// The 3D content: the hero pair on a sculpted brass plinth in a dark void, lit by
// a baked Environment (IBL) + a warm key spotlight (real shadow onto a glossy
// floor) + a cool rim. Scroll scrubs a subtle camera move + an "ignition" (the
// spotlight + ground halo bloom up, then dim for the resolve). Reduced-motion
// freezes the turntable/float but keeps the scroll-driven camera (user-controlled).
function Scene({ scrollProgress, reduced }: { scrollProgress: React.MutableRefObject<number>; reduced: boolean }) {
  const shoeRef = useRef<THREE.Group>(null)
  const spotRef = useRef<THREE.SpotLight>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()
  const spotTarget = useRef(new THREE.Object3D()).current
  const t = useRef(0)

  useFrame((_, dt) => {
    t.current += Math.min(dt, 0.05)
    const p = scrollProgress.current
    const grow = clamp01(p / 0.7) // bloom over the first 70% of the scrub
    const dim = p > 0.82 ? clamp01(1 - (p - 0.82) / 0.18) : 1 // dim for the resolve

    if (shoeRef.current) {
      if (!reduced) shoeRef.current.rotation.y += dt * 0.22
      shoeRef.current.position.y = 1.32 + (reduced ? 0 : Math.sin(t.current * 0.8) * 0.025)
    }
    if (spotRef.current) spotRef.current.intensity = (7 + grow * 24) * dim
    if (haloRef.current) {
      const m = haloRef.current.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = (0.5 + grow * 1.8) * dim
      m.opacity = (0.28 + grow * 0.55) * dim
    }
    // Subtle cinematic camera: a small dolly-in + a gentle orbit (peaks mid-scrub),
    // kept small so the framing stays good throughout. Always scroll-driven.
    const orbit = Math.sin(p * Math.PI) * 0.32
    camera.position.set(orbit, 1.46 + grow * 0.12, 5.0 - grow * 0.85)
    camera.lookAt(0, 1.3, 0)
  })

  return (
    <>
      <color attach="background" args={['#0A0908']} />
      <fog attach="fog" args={['#0A0806', 5, 17]} />

      {/* Baked IBL — the same warm-key / cool-fill Lightformer rig as the vault, so
          the brass + the sneaker's PBR + the glossy floor all read richly. frames=1
          (baked once → zero per-frame cost). */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2.2} color="#FFB366" position={[0, 4, -3]} scale={[10, 2, 1]} />
        <Lightformer intensity={1.3} color="#FFF4E0" position={[0, 4.5, 3]} scale={[8, 1.5, 1]} />
        <Lightformer intensity={1.1} color="#6E8AB8" position={[-4.5, 2.5, 2]} scale={[4, 5, 1]} />
        <Lightformer intensity={0.9} color="#C9A36A" form="ring" position={[0, 2, 1.5]} scale={2.6} />
      </Environment>

      <ambientLight intensity={0.34} color="#FFE7CE" />
      {/* Warm key spotlight (real shadow) — intensity ignites on scroll. */}
      <primitive object={spotTarget} position={[0, 1.3, 0]} />
      <spotLight
        ref={spotRef}
        position={[0, 4.3, 0.7]}
        target={spotTarget}
        angle={0.5}
        penumbra={0.95}
        intensity={7}
        distance={15}
        decay={2}
        color="#FFF6EC"
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.03}
        shadow-camera-near={0.5}
        shadow-camera-far={13}
      />
      {/* Cool rear rim — separates the dark shoe from the void. */}
      <pointLight position={[0, 1.5, -0.7]} intensity={6} color="#C4D6FF" distance={2.6} decay={2} />
      {/* Warm front fill — lifts the camera-facing side. */}
      <pointLight position={[0.6, 1.4, 1.9]} intensity={7} color="#FFE6C2" distance={5} decay={2} />

      {/* Glossy floor — receives the shadow + mirrors the Environment; fog fades it
          into black so it reads as a lit reflective pool in a void. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={floorMat} receiveShadow>
        <circleGeometry args={[7, 64]} />
      </mesh>

      {/* Glowing ground halo under the pair (blooms on scroll). */}
      <mesh ref={haloRef} position={[0, 1.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.52, 48]} />
        <meshStandardMaterial color="#FFB366" emissive="#FFB366" emissiveIntensity={0.6} transparent opacity={0.28} side={THREE.DoubleSide} />
      </mesh>

      {/* Sculpted brass plinth: turned brass base + marble column + brass capital. */}
      <mesh material={brassMat} castShadow>
        <latheGeometry args={[PLINTH_BASE, 48]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={marbleMat}>
        <cylinderGeometry args={[0.165, 0.17, 0.68, 48]} />
      </mesh>
      <mesh material={brassMat} receiveShadow>
        <latheGeometry args={[PLINTH_CAPITAL, 48]} />
      </mesh>

      {/* Hero sneaker — real optimized GLB, slow turntable + float. */}
      <group ref={shoeRef} position={[0, 1.32, 0]}>
        <ModelOrFallback
          url={ASSETS.heroSneaker}
          normalizeTo={1.1}
          seat="center"
          castShadow
          envMapIntensity={1.4}
          fallback={
            <mesh material={heroMat}>
              <torusKnotGeometry args={[0.28, 0.09, 128, 16, 2, 3]} />
            </mesh>
          }
        />
      </group>

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.72} luminanceSmoothing={0.3} />
        <Vignette offset={0.32} darkness={0.72} />
        <ToneMapping />
      </EffectComposer>
    </>
  )
}

// The Canvas wrapper (dynamic-imported by SkyBridge, ssr:false). frameloop is
// gated to in-view (`active`) so the scene only renders while the finale is on
// screen — never competes with the vault canvas (they're at different scroll
// depths) or taxes the shop. DPR clamped low for the integrated-GPU path.
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
      dpr={[1, 1.3]}
      camera={{ position: [0, 1.46, 5], fov: 42, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      shadows="soft"
      style={{ background: '#0A0908' }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <Scene scrollProgress={scrollProgress} reduced={reduced} />
      </Suspense>
    </Canvas>
  )
}
