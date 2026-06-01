'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import ModelOrFallback from '@/components/three/ModelOrFallback'
import { ASSETS } from '@/lib/assets'
import { isIntegratedGpu, readGpuRenderer } from '@/lib/deviceTier'

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (x: number) => x * x * (3 - 2 * x)

// ── Warm-luxury try-on lounge — solid-PBR material library. The vault proves solid
// materials + good lighting read premium without textures (no tiling/seam risk). ──
const fallbackMat = new THREE.MeshStandardMaterial({ color: '#3A352E', roughness: 0.5, metalness: 0.3 })
// Polished warm-wood floor (INTEGRATED path; discrete gets the live reflector below).
const woodFloorMat = new THREE.MeshStandardMaterial({ color: '#241710', roughness: 0.24, metalness: 0.0 })
// Warm limewash plaster — walls + ceiling.
const plasterMat = new THREE.MeshStandardMaterial({ color: '#2A2018', roughness: 0.96, metalness: 0.0 })
// Tan leather try-on bench.
const leatherMat = new THREE.MeshStandardMaterial({ color: '#4A3322', roughness: 0.55, metalness: 0.05 })
// Brushed brass — mirror frame, baseboard, bench legs, accents (matches the vault).
const brassMat = new THREE.MeshStandardMaterial({ color: '#C9A36A', roughness: 0.34, metalness: 0.9 })
// Dark mirror glass for INTEGRATED (no live reflection — just a framed dark pane).
const darkGlassMat = new THREE.MeshStandardMaterial({ color: '#0C0A08', roughness: 0.06, metalness: 0.85 })
// Warm emissive ceiling light strip (the practical that motivates the key light).
const stripMat = new THREE.MeshStandardMaterial({ color: '#FFE7C6', emissive: '#FFE0B0', emissiveIntensity: 1.5, roughness: 1, metalness: 0 })

// The two pairs: an outer group (walk X + present yaw) → a bob group (step bounce +
// lean-into-travel + heel-toe rock) → the model (faces inward). The models CAST REAL
// SHADOWS now — that (not a fake blob) is what grounds them in the room.
function Pair({
  url,
  faceSign,
  outerRef,
  bobRef,
}: {
  url: string
  faceSign: number
  outerRef: React.RefObject<THREE.Group | null>
  bobRef: React.RefObject<THREE.Group | null>
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
            castShadow
            envMapIntensity={1.2}
            fallback={
              <mesh material={fallbackMat} castShadow position={[0, 0.45, 0]}>
                <boxGeometry args={[1, 0.45, 0.36]} />
              </mesh>
            }
          />
        </Suspense>
      </group>
    </group>
  )
}

// The lounge shell — a real room: a polished wood floor (receives the pairs' real
// shadows + reflects the warm room), warm plaster back/side walls + ceiling, a brass
// baseboard, an emissive ceiling light strip, a leather try-on bench, and a brass-
// framed mirror that reflects the pairs (live on discrete, a dark framed pane on
// integrated). All solid PBR — premium via lighting, not textures.
function Lounge({ reflective }: { reflective: boolean }) {
  return (
    <group>
      {/* Wood floor — receives the real shadows; reflects the lit warm room (NOT a
          grey void). Live blurred reflection on discrete; glossy static on integrated. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1.5]} material={reflective ? undefined : woodFloorMat} receiveShadow>
        <planeGeometry args={[22, 24]} />
        {reflective && (
          <MeshReflectorMaterial
            resolution={128}
            blur={[220, 90]}
            mixBlur={1}
            mixStrength={1.1}
            depthScale={0.7}
            minDepthThreshold={0.3}
            color="#241710"
            metalness={0.25}
            roughness={0.5}
          />
        )}
      </mesh>

      {/* Warm plaster enclosure — back wall + two side walls + ceiling */}
      <mesh position={[0, 2.3, -6]} material={plasterMat} receiveShadow>
        <planeGeometry args={[16, 6]} />
      </mesh>
      <mesh position={[-7, 2.3, -1]} rotation={[0, Math.PI / 2, 0]} material={plasterMat}>
        <planeGeometry args={[14, 6]} />
      </mesh>
      <mesh position={[7, 2.3, -1]} rotation={[0, -Math.PI / 2, 0]} material={plasterMat}>
        <planeGeometry args={[14, 6]} />
      </mesh>
      <mesh position={[0, 4.4, -1]} rotation={[Math.PI / 2, 0, 0]} material={plasterMat}>
        <planeGeometry args={[16, 14]} />
      </mesh>

      {/* Brass baseboard along the back wall */}
      <mesh position={[0, 0.07, -5.93]} material={brassMat}>
        <boxGeometry args={[16, 0.14, 0.04]} />
      </mesh>

      {/* Recessed warm ceiling light strip over the bench — the key's practical source */}
      <mesh position={[0, 4.36, -1.6]} material={stripMat}>
        <boxGeometry args={[3.6, 0.05, 0.16]} />
      </mesh>

      {/* Leather try-on bench (centre-back) on slim brass legs */}
      <RoundedBox args={[2.6, 0.34, 0.82]} radius={0.05} smoothness={3} position={[0, 0.5, -3.3]} material={leatherMat} castShadow receiveShadow />
      <RoundedBox args={[2.64, 0.06, 0.86]} radius={0.02} smoothness={2} position={[0, 0.67, -3.3]} material={leatherMat} castShadow />
      {[-1.18, 1.18].flatMap((lx) =>
        [-0.32, 0.32].map((lz) => (
          <mesh key={`${lx}_${lz}`} position={[lx, 0.16, -3.3 + lz]} material={brassMat} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.32, 12]} />
          </mesh>
        ))
      )}

      {/* Full-length brass-framed mirror on the back wall, behind the bench — reflects
          the pairs (live on discrete; a dark framed pane on integrated). */}
      <group position={[0, 1.55, -5.9]}>
        <RoundedBox args={[1.96, 3.04, 0.08]} radius={0.04} smoothness={3} material={brassMat} />
        <mesh position={[0, 0, 0.05]} material={reflective ? undefined : darkGlassMat}>
          <planeGeometry args={[1.7, 2.78]} />
          {reflective && (
            <MeshReflectorMaterial resolution={256} blur={[0, 0]} mixBlur={0} mixStrength={1.2} depthScale={0} color="#0C0A08" metalness={0.6} roughness={0.16} mirror={0.85} />
          )}
        </mesh>
      </group>
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
  const keyRef = useRef<THREE.SpotLight>(null)
  const spotTarget = useMemo(() => new THREE.Object3D(), [])
  const shadowSeeded = useRef(false)
  const shadowTick = useRef(0)
  const { invalidate } = useThree()

  // Render once on mount; invalidateRef kept for SkyBridge (harmless under "always").
  useEffect(() => {
    invalidateRef.current = invalidate
    invalidate()
    return () => {
      invalidateRef.current = null
    }
  }, [invalidate, invalidateRef])

  // Pure function of the (upstream-damped) scroll value → smooth continuous motion
  // under frameloop="always". No clock terms.
  useFrame((state) => {
    // Shadow throttle: the ROOM is static; only the pairs move. Take manual control of
    // the shadow map and refresh it every 2nd frame — halves the depth pass with no
    // visible change (a soft shadow lagging one frame behind the slow walk is invisible).
    if (!shadowSeeded.current) {
      shadowSeeded.current = true
      state.gl.shadowMap.autoUpdate = false
      state.gl.shadowMap.needsUpdate = true
    } else {
      shadowTick.current++
      state.gl.shadowMap.needsUpdate = shadowTick.current % 2 === 0
    }

    const p = scrollProgress.current
    const camera = state.camera

    // ── CAMERA — low, heroic; slow dolly-in through the approach + a push-in at the end.
    const e = smooth(clamp01(p / 0.5))
    const dive = smooth(clamp01((p - 0.86) / 0.14))
    camera.position.z = lerp(lerp(4.1, 3.4, e), 2.7, dive)
    camera.position.y = lerp(0.58, 0.74, dive)
    camera.position.x = Math.sin(p * Math.PI) * 0.1
    camera.lookAt(0, lerp(0.72, 0.82, dive), -0.6)

    // ── THE WALK — stride in from the wings, ease to a PLANT + present at centre.
    const gait = reduced ? 0 : 1 - smooth(clamp01((p - 0.32) / 0.18))
    const steps = clamp01(p / 0.5) * 4 * Math.PI * 2
    const bobUp = Math.abs(Math.sin(steps)) * 0.03 * gait
    const settle = reduced ? 0 : Math.exp(-(((p - 0.5) / 0.05) ** 2)) * 0.02
    const rock = Math.sin(steps) * 0.05 * gait
    const lean = (1 - smooth(clamp01((p - 0.34) / 0.16))) * 0.1 * (reduced ? 0 : 1)
    const present = smooth(clamp01((Math.min(p, 0.86) - 0.5) / 0.36))
    const presentYaw = reduced ? 0 : present * 0.24

    const lx = lerp(-5.0, -0.72, e)
    const rx = lerp(5.0, 0.72, e)
    const y = bobUp - settle
    if (lOuter.current) { lOuter.current.position.x = lx; lOuter.current.rotation.y = presentYaw }
    if (rOuter.current) { rOuter.current.position.x = rx; rOuter.current.rotation.y = -presentYaw }
    if (lBob.current) { lBob.current.position.y = y; lBob.current.rotation.z = -lean; lBob.current.rotation.x = rock }
    if (rBob.current) { rBob.current.position.y = y; rBob.current.rotation.z = lean; rBob.current.rotation.x = -rock }

    // Warm key swells gently at the meeting, then settles for the presentation.
    if (keyRef.current) {
      const glow = Math.exp(-(((p - 0.5) / 0.17) ** 2))
      keyRef.current.intensity = 46 + glow * 20
    }
  })

  return (
    <>
      <color attach="background" args={['#140E09']} />
      <fog attach="fog" args={['#140E09', 11, 30]} />

      {/* Warm IBL — soft fill for the pairs' PBR + the floor/mirror reflections. A warm
          ceiling key panel + warm wall fills + ONE cool side panel (a 'window') so the
          dark A.E.1 separates from the warm room. Baked once (frames=1), free per-frame. */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={3.0} color="#FFD8A0" position={[0, 5, -1]} rotation={[-Math.PI / 2, 0, 0]} scale={[9, 9, 1]} />
        <Lightformer intensity={1.8} color="#FFE7C6" position={[0, 2, 4]} scale={[8, 5, 1]} />
        <Lightformer intensity={1.0} color="#C9A36A" position={[5, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 5, 1]} />
        <Lightformer intensity={1.2} color="#AFC4F0" position={[-5, 2.5, 1]} rotation={[0, Math.PI / 2, 0]} scale={[5, 5, 1]} />
        <Lightformer intensity={0.8} color="#E8D2B0" position={[0, 2.2, -5]} scale={[10, 4, 1]} />
      </Environment>

      {/* Lighting that FITS the room — DRAMATIC, not flat: a low warm ambient so the
          corners fall into shadow (depth), a bright warm KEY pooling on the pairs +
          floor (shadow caster — the real grounding), a cool side 'window' for
          separation, a warm practical under the strip, and a warm back-wall graze so
          the mirror/bench read against a gradient instead of a flat brown box. */}
      <ambientLight intensity={0.15} color="#FFE0C0" />
      <primitive object={spotTarget} position={[0, 0.55, -0.3]} />
      <spotLight
        ref={keyRef}
        position={[0, 3.8, 1.0]}
        target={spotTarget}
        angle={0.58}
        penumbra={0.9}
        intensity={46}
        distance={16}
        decay={2}
        color="#FFE3C2"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-near={1}
        shadow-camera-far={12}
      />
      {/* Cool side fill — a 'window' raking from the left, separating the dark A.E.1. */}
      <spotLight position={[-5, 3, 2]} target={spotTarget} angle={0.8} penumbra={1} intensity={7} distance={16} decay={2} color="#BFD0EE" />
      {/* Warm practical glow under the ceiling strip */}
      <pointLight position={[0, 3.5, -1.6]} intensity={6} color="#FFD9A6" distance={9} decay={2} />
      {/* Warm back-wall graze — gives the back wall + mirror + bench a gradient (lit
          centre, darker edges) so the room has depth, not a flat brown panel. */}
      <pointLight position={[0, 1.7, -4.4]} intensity={5} color="#FFCF95" distance={7} decay={2} />

      <Lounge reflective={reflective} />

      <Pair url={ASSETS.cloudmonster} faceSign={1} outerRef={lOuter} bobRef={lBob} />
      <Pair url={ASSETS.ae1} faceSign={-1} outerRef={rOuter} bobRef={rBob} />

      {/* No post-composer: the Canvas is NOT `flat`, so R3F applies ACES tonemap + MSAA
          natively (correct color + clean edges) without a per-frame full-screen pass. */}
    </>
  )
}

// Canvas wrapper (dynamic-imported by SkyBridge, ssr:false).
// PERF (iGPU-first — 2nd WebGL canvas over the vault's):
//   • shadows="soft" with ONE shadow-casting key, 1024 map, refreshed every 2nd frame
//     (room static, only the pairs move) → real grounding at low cost. THE fix for the
//     "floating cut-out" look that a flat backplate could never solve.
//   • frameloop="always" while in view → smooth continuous motion; parks "never" off-screen.
//   • dpr 1.0. Reflection (floor + mirror) is the cheap MeshReflectorMaterial on DISCRETE
//     only; integrated gets glossy static wood + a dark framed mirror. Native ACES + MSAA.
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
  // Assume integrated (static floor/mirror) until a discrete GPU is confirmed in onCreated.
  const [reflective, setReflective] = useState(false)
  return (
    <Canvas
      shadows="percentage"
      frameloop={active ? 'always' : 'never'}
      dpr={1}
      camera={{ position: [0, 0.58, 4.1], fov: 38, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ background: '#140E09' }}
      aria-hidden="true"
      onCreated={({ gl }) => {
        try {
          setReflective(!isIntegratedGpu(readGpuRenderer(gl.getContext())))
        } catch {
          /* keep the cheap static floor/mirror on any failure */
        }
      }}
    >
      <Suspense fallback={null}>
        <Scene scrollProgress={scrollProgress} reduced={reduced} invalidateRef={invalidateRef} reflective={reflective} />
      </Suspense>
    </Canvas>
  )
}
