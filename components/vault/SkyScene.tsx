'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial, RoundedBox, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import ModelOrFallback from '@/components/three/ModelOrFallback'
import { ASSETS } from '@/lib/assets'
import { withBase } from '@/lib/basePath'
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
const darkGlassMat = new THREE.MeshStandardMaterial({ color: '#0E0B08', roughness: 0.04, metalness: 0.95 })
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
            normalizeTo={1.0}
            seat="bottom"
            rotation={[0, face, 0]}
            castShadow
            envMapIntensity={0.9}
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
function Lounge({ reflective, woodTex, plasterTex }: { reflective: boolean; woodTex: THREE.Texture; plasterTex: THREE.Texture }) {
  return (
    <group>
      {/* Warm WALNUT floor (real wood texture — what lifts it from a flat brown plane
          to a real floor). Receives the pairs' real shadows + a live reflection on
          discrete; glossy textured static on integrated. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1.5]} receiveShadow>
        <planeGeometry args={[22, 24]} />
        {/* Live reflection on ALL GPUs now (low 128 res) so the pairs reflect in the
            polished wood right under them — the immersive "real room" magic. */}
        <MeshReflectorMaterial map={woodTex} resolution={128} blur={[200, 90]} mixBlur={1} mixStrength={0.6} depthScale={0.6} color="#6E4E30" metalness={0.12} roughness={0.42} />
      </mesh>

      {/* Warm plaster enclosure — back + side walls (real plaster texture) + a plain ceiling */}
      <mesh position={[0, 2.3, -6]} receiveShadow>
        <planeGeometry args={[16, 6]} />
        <meshStandardMaterial map={plasterTex} roughness={0.96} metalness={0} />
      </mesh>
      <mesh position={[-7, 2.3, -1]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial map={plasterTex} roughness={0.96} metalness={0} />
      </mesh>
      <mesh position={[7, 2.3, -1]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial map={plasterTex} roughness={0.96} metalness={0} />
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

      {/* Real leather SOFA (Tripo GLB) centre-back — rotated 90° so the GLB's long axis
          (Z) becomes the width; the pairs meet in front of it. */}
      <ModelOrFallback
        url={ASSETS.sofa}
        scale={2.4}
        position={[0, 0.65, -3.5]}
        rotation={[0, -Math.PI / 2, 0]}
        castShadow
        fallback={
          <RoundedBox args={[2.3, 0.5, 0.9]} radius={0.08} smoothness={3} position={[0, 0.4, -3.5]} material={leatherMat} castShadow />
        }
      />

      {/* Ornate floor mirror (Tripo GLB) — stood to the LEFT, angled toward centre, so
          it reads BESIDE the sofa (it was lost dead-centre behind it) + its frame
          catches the warm light. */}
      <ModelOrFallback url={ASSETS.mirror} scale={2.8} position={[-2.5, 1.4, -4.7]} rotation={[0, 0.5, 0]} castShadow fallback={null} />
      {/* Live reflective GLASS on the mirror's face so the pairs reflect IN the mirror
          (the fitting-room magic). Placed at the mirror's front-face centre in world
          space — bbox depth 0.1787 × scale 2.8 ≈ 0.5 along the y=0.5 normal (0.48,0,0.88),
          recessed to ~0.46 so it sits inside the frame — matching its yaw. Low 96-res:
          the 2nd (cheaper) reflection pass, on ALL GPUs so it always reads. */}
      <mesh position={[-2.23, 1.5, -4.21]} rotation={[0, 0.5, 0]}>
        <planeGeometry args={[0.62, 1.7]} />
        {/* Mirror glass = env-reflective (reflects the warm IBL room) — NO 2nd render
            pass, so it reads as a polished mirror at ZERO finale perf cost. (The live
            96-res reflection was the meet-beat lag source AND the dark pairs barely
            resolved in it — bad ROI.) Sits just proud of the GLB's ~1m-deep body so it
            is not occluded; position confirmed earlier via a debug pass. */}
        <meshStandardMaterial color="#100B07" metalness={1} roughness={0.1} envMapIntensity={1.5} />
      </mesh>
      {/* Olive tree (Tripo GLB) — back-right corner, a tall warm-vibes accent. */}
      <ModelOrFallback url={ASSETS.olive} scale={2.6} position={[3.0, 1.3, -4.8]} rotation={[0, -0.3, 0]} castShadow fallback={null} />
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

  // Room textures (real walnut + plaster — the "not cheap" richness). Tiled across the
  // surfaces; loaded here since Scene is already inside Suspense. wrap/repeat mutation
  // is idempotent per render.
  const [woodTex, plasterTex] = useTexture([withBase('/textures/wood-floor.webp'), withBase('/textures/plaster.webp')])
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping
  woodTex.repeat.set(5, 6)
  woodTex.colorSpace = THREE.SRGBColorSpace
  plasterTex.wrapS = plasterTex.wrapT = THREE.RepeatWrapping
  plasterTex.repeat.set(4, 2)
  plasterTex.colorSpace = THREE.SRGBColorSpace

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

    // ── CINEMATIC CAMERA — a slow ORBIT + push-in around the meeting point, so the
    // finale plays like a moving film shot (riding with the pairs' scroll-spin). Pure
    // function of scroll → smooth under always-render.
    const dive = smooth(clamp01((p - 0.86) / 0.14))
    const cx = 0, cy = 0.55, cz = -0.4 // orbit centre ≈ the meeting point
    const theta = lerp(-0.34, 0.4, smooth(p)) // a gentle left→right arc (~-19°→+23°)
    const radius = lerp(4.6, 3.3, smooth(clamp01(p / 0.7))) - dive * 0.5 // ease in + a push at the end
    const camH = lerp(0.52, 0.72, smooth(p))
    camera.position.set(cx + Math.sin(theta) * radius, camH, cz + Math.cos(theta) * radius)
    camera.lookAt(cx, cy + dive * 0.06, cz)

    // ── THE WALK + SCROLL-DRIVEN SPIN ──────────────────────────────────────────
    // FASTER walk-in (user: "move faster") — the pairs roll in from the wings and
    // arrive at centre by ~p0.3 (was 0.5). Then a FULL scroll-driven rotation (user:
    // "full rotate based of scroll speed"): the spin angle tracks scroll POSITION, so
    // scrolling faster spins them faster; ~2.5 turns across the finale. Pure function
    // of scroll → smooth under always-render, holds its angle at rest.
    const we = smooth(clamp01(p / 0.3))
    const gait = reduced ? 0 : 1 - smooth(clamp01((p - 0.18) / 0.12))
    const steps = clamp01(p / 0.3) * 5 * Math.PI * 2 // a touch more steps = a livelier stride
    const bobUp = Math.abs(Math.sin(steps)) * 0.045 * gait // more bounce
    const settle = reduced ? 0 : Math.exp(-(((p - 0.3) / 0.045) ** 2)) * 0.045 // plant compression on arrival
    const rock = Math.sin(steps) * 0.07 * gait
    const lean = (1 - smooth(clamp01((p - 0.2) / 0.12))) * 0.11 * (reduced ? 0 : 1)
    const spin = reduced ? 0 : p * Math.PI * 2 * 2.5
    const tilt = reduced ? 0 : Math.sin(spin) * 0.04 // a subtle wobble as they spin — more physical
    // Idle FLOAT — once arrived, the pairs gently breathe (clock-based; the canvas
    // renders always, so they stay ALIVE even when scroll is paused). Out of phase.
    const present = smooth(clamp01((Math.min(p, 0.86) - 0.32) / 0.4))
    const t = state.clock.elapsedTime
    const floatL = reduced ? 0 : Math.sin(t * 1.1) * 0.02 * present
    const floatR = reduced ? 0 : Math.sin(t * 1.1 + 1.7) * 0.02 * present

    const lx = lerp(-4.5, -0.55, we)
    const rx = lerp(4.5, 0.55, we)
    const baseY = bobUp - settle
    if (lOuter.current) { lOuter.current.position.x = lx; lOuter.current.rotation.y = spin }
    if (rOuter.current) { rOuter.current.position.x = rx; rOuter.current.rotation.y = -spin }
    if (lBob.current) { lBob.current.position.y = baseY + floatL; lBob.current.rotation.z = -lean; lBob.current.rotation.x = rock + tilt }
    if (rBob.current) { rBob.current.position.y = baseY + floatR; rBob.current.rotation.z = lean; rBob.current.rotation.x = -rock - tilt }

    // Warm key swells into a hero "REVEAL" at the meeting, then settles for the present.
    if (keyRef.current) {
      const glow = Math.exp(-(((p - 0.5) / 0.16) ** 2))
      keyRef.current.intensity = 44 + glow * 28
    }
  })

  return (
    <>
      <color attach="background" args={['#0A0806']} />
      <fog attach="fog" args={['#0A0806', 10, 28]} />

      {/* Warm IBL — soft fill for the pairs' PBR + the floor/mirror reflections. A warm
          ceiling key panel + warm wall fills + ONE cool side panel (a 'window') so the
          dark A.E.1 separates from the warm room. Baked once (frames=1), free per-frame. */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={1.4} color="#FFD8A0" position={[0, 5, -1]} rotation={[-Math.PI / 2, 0, 0]} scale={[9, 9, 1]} />
        <Lightformer intensity={0.8} color="#FFE7C6" position={[0, 2, 4]} scale={[8, 5, 1]} />
        <Lightformer intensity={0.5} color="#C9A36A" position={[5, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 5, 1]} />
        <Lightformer intensity={0.6} color="#AFC4F0" position={[-5, 2.5, 1]} rotation={[0, Math.PI / 2, 0]} scale={[5, 5, 1]} />
        <Lightformer intensity={0.35} color="#E8D2B0" position={[0, 2.2, -5]} scale={[10, 4, 1]} />
      </Environment>

      {/* Lighting that FITS the room — DRAMATIC, not flat: a low warm ambient so the
          corners fall into shadow (depth), a bright warm KEY pooling on the pairs +
          floor (shadow caster — the real grounding), a cool side 'window' for
          separation, a warm practical under the strip, and a warm back-wall graze so
          the mirror/bench read against a gradient instead of a flat brown box. */}
      <ambientLight intensity={0.07} color="#FFE0C0" />
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
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-near={1}
        shadow-camera-far={12}
      />
      {/* Cool side fill — a 'window' raking from the left, separating the dark A.E.1. */}
      <spotLight position={[-5, 3, 2]} target={spotTarget} angle={0.8} penumbra={1} intensity={4} distance={16} decay={2} color="#BFD0EE" />
      {/* Warm practical glow under the ceiling strip */}
      <pointLight position={[0, 3.5, -1.6]} intensity={3.5} color="#FFD9A6" distance={9} decay={2} />
      {/* Warm back-wall graze — a soft gradient on the back wall/mirror (kept low so
          the room stays DARK + moody, matching the vault; the key pool is the focus). */}
      <pointLight position={[0, 1.9, -4.2]} intensity={3.6} color="#FFCF95" distance={10} decay={2} />

      <Lounge reflective={reflective} woodTex={woodTex} plasterTex={plasterTex} />

      <Pair url={ASSETS.blackRunner} faceSign={1} outerRef={lOuter} bobRef={lBob} />
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
      style={{ background: '#0A0806' }}
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
