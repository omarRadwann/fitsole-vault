'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import ModelOrFallback from '@/components/three/ModelOrFallback'
import { ASSETS } from '@/lib/assets'
import Basketball, { RIM, blobTexture, type BallControl } from './Basketball'

// Flip to true (or wire to ?debugRim) to show a wireframe torus at the swish RIM circle while
// calibrating the moved hoop, then set back to false.
const DEBUG_RIM = false
import { isIntegratedGpu, readGpuRenderer } from '@/lib/deviceTier'

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (x: number) => x * x * (3 - 2 * x)

// ── PRO TRAINING STUDIO — solid-PBR material library. Dark concrete + brushed steel +
// bold emissive LED accents. (The vault proved solid materials + good lighting read
// premium without textures — no tiling/seam risk.) ──
const fallbackMat = new THREE.MeshStandardMaterial({ color: '#2A2C30', roughness: 0.6, metalness: 0.3 })
// Darker matte concrete — walls + ceiling (recede into shadow so the lit product pops).
// Lambert (per-vertex, no PBR/env) — the walls + ceiling fill most of the screen but are flat
// matte dark, so this shades MUCH cheaper per fragment than Standard with no visible change.
const wallConcreteMat = new THREE.MeshLambertMaterial({ color: '#191A1E' })
// Brushed dark steel — structural I-beam columns, spotlight housings, accents.
const steelMat = new THREE.MeshStandardMaterial({ color: '#3B3F46', roughness: 0.34, metalness: 0.9 })
// Gold LED accent — the centre performance ring + a back-wall brand line. Its
// emissiveIntensity is driven in useFrame to IGNITE at the meet (the wow payoff).
const ringMat = new THREE.MeshStandardMaterial({ color: '#FFE4AE', emissive: '#FFC766', emissiveIntensity: 1.8, roughness: 1, metalness: 0 })
// Cool-white LED — sporty accent strips (the athletic contrast to the warm gold).
const ledCoolMat = new THREE.MeshStandardMaterial({ color: '#EAF1FF', emissive: '#BFD4FF', emissiveIntensity: 1.8, roughness: 1, metalness: 0 })
// Warm lit floor-pool inside the performance ring (a soft glow under the pairs).
const poolMat = new THREE.MeshStandardMaterial({ color: '#17160F', emissive: '#6A4E22', emissiveIntensity: 0.45, roughness: 0.5, metalness: 0.2 })

// The two pairs: an outer group (walk X + present yaw) → a bob group (step bounce +
// lean-into-travel + heel-toe rock) → the model (faces inward). Believable sneaker scale
// now (normalizeTo 0.6) so they read as real shoes on the platform, not giant props.
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
            normalizeTo={0.22}
            seat="bottom"
            rotation={[0, face, 0]}
            castShadow
            envMapIntensity={0.88}
            fallback={
              <mesh material={fallbackMat} castShadow position={[0, 0.27, 0]}>
                <boxGeometry args={[0.6, 0.27, 0.22]} />
              </mesh>
            }
          />
        </Suspense>
      </group>
      {/* Soft drop shadow under the pair — a cheap textured blob. As a child of the OUTER group it
          follows the walk-in x + the spin automatically, and stays on the floor while the bob floats. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} scale={[0.26, 0.13, 1]} renderOrder={2}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial map={blobTexture()} transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  )
}

// The PRO TRAINING STUDIO shell — a dark concrete + steel performance space: a polished
// concrete floor that reflects the pairs + the spotlights, a central GLOWING PERFORMANCE
// RING inlaid flush in the floor (the focal stage — it ignites at the meet), steel I-beam
// structure, cool-LED + gold-LED accents, and dark walls that recede into shadow so the lit
// product is the hero. Solid PBR — premium via lighting + structure, not textures.
function TrainingStudio() {
  return (
    <group>
      {/* Polished dark-concrete performance floor — reflects the pairs + the spotlights
          (the showroom sheen) on every GPU; the live reflection grounds the pairs. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1.5]} receiveShadow>
        <planeGeometry args={[26, 30]} />
        {/* Dark POLISHED floor via a cheap standard material + the baked env (a faint glossy sheen),
            NOT a live MeshReflectorMaterial mirror — that re-rendered the whole scene every frame
            and was the lag. The contact shadow grounds the pairs; the env sheen keeps it premium. */}
        <meshStandardMaterial color="#191920" metalness={0.62} roughness={0.32} envMapIntensity={0.55} />
      </mesh>

      {/* CENTRE PERFORMANCE RING — a glowing gold ring inlaid flush where the pairs meet:
          the focal "stage" + the WOW (ringMat's emissive is driven to ignite at the meet).
          Kept very low (y0.006) so it sits flush in the floor and never crops the soles. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} material={ringMat}>
        <ringGeometry args={[0.98, 1.16, 90]} />
      </mesh>
      {/* a soft warm pool inside the ring (a lit floor spot under the pairs) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} material={poolMat}>
        <circleGeometry args={[0.98, 64]} />
      </mesh>
      {/* (Removed the two flanking "lane line" strips — they read as stray bright streaks
          on the floor rather than court markings. The ring + pool carry the stage now.) */}

      {/* Dark concrete enclosure — back + side walls + ceiling (recede into shadow). */}
      <mesh position={[0, 2.8, -6.6]} receiveShadow material={wallConcreteMat}>
        <planeGeometry args={[26, 9]} />
      </mesh>
      <mesh position={[-7.6, 2.8, -1]} rotation={[0, Math.PI / 2, 0]} material={wallConcreteMat}>
        <planeGeometry args={[17, 9]} />
      </mesh>
      <mesh position={[7.6, 2.8, -1]} rotation={[0, -Math.PI / 2, 0]} material={wallConcreteMat}>
        <planeGeometry args={[17, 9]} />
      </mesh>
      <mesh position={[0, 5.4, -1]} rotation={[Math.PI / 2, 0, 0]} material={wallConcreteMat}>
        <planeGeometry args={[26, 17]} />
      </mesh>

      {/* Steel I-beam columns along the back wall — industrial athletic depth. */}
      {[-4.6, -1.6, 1.6, 4.6].map((x, i) => (
        <group key={i} position={[x, 0, -6.3]}>
          <mesh position={[0, 2.7, 0]} material={steelMat}>
            <boxGeometry args={[0.16, 5.4, 0.46]} />
          </mesh>
          <mesh position={[0, 2.7, 0.24]} material={steelMat}>
            <boxGeometry args={[0.46, 5.4, 0.06]} />
          </mesh>
        </group>
      ))}
      {/* Cool-LED strips up the outer columns (athletic energy). */}
      {[-4.6, 4.6].map((x, i) => (
        <mesh key={i} position={[x, 2.7, -6.04]} material={ledCoolMat}>
          <boxGeometry args={[0.05, 5.0, 0.04]} />
        </mesh>
      ))}
      {/* A horizontal gold brand line low across the back wall (depth + warm anchor). */}
      <mesh position={[0, 0.55, -6.5]} material={ringMat}>
        <boxGeometry args={[15, 0.05, 0.04]} />
      </mesh>

      {/* Steel mount arm behind the (moved-forward) backboard → reads WALL-MOUNTED. Now spans
          from the board back (~z-5.4) to the wall (z-6.6). y tuned by capture. */}
      <mesh position={[0, 2.95, -6.0]} material={steelMat}>
        <boxGeometry args={[0.16, 0.16, 1.2]} />
      </mesh>

      {/* Steel spotlight housings on the ceiling over the platform (motivate the keys). */}
      {[-1.4, 1.4].map((x, i) => (
        <mesh key={i} position={[x, 5.1, 0.2]} material={steelMat}>
          <cylinderGeometry args={[0.16, 0.2, 0.32, 16]} />
        </mesh>
      ))}

      {/* ── THE FULL FACILITY — 9 real Tripo props dressing the studio in ZONES around the
          central ring (kept clear for the two hero pairs). Wrapped in Suspense so the studio
          shell paints immediately + props pop in as they load. Scales/positions are first
          estimates, tuned by capture; the furniture GLBs use `scale` (their bbox doesn't
          resolve for normalizeTo). castShadow → only renders on discrete (shadows gated). ── */}
      <Suspense fallback={null}>
        {/* A DELIBERATE, SYMMETRIC set framing the hero pairs (cut the scattered kettlebell + gym
            bag — fewer, aligned props read clean, not "messy"): the hoop centred high, two lockers
            flanking it square on the back wall, and a bench (left) mirrored by the ball rack (right).
            Everything sits OUTSIDE the ball's playable area so the game stays clear. */}
        <ModelOrFallback url={ASSETS.hoop} scale={2.2} position={[0, 2.7, -5.4]} rotation={[0, 0, 0]} castShadow fallback={null} />
        <ModelOrFallback url={ASSETS.lockers} scale={2.0} position={[-2.7, 1.0, -6.2]} rotation={[0, 0, 0]} castShadow fallback={null} />
        <ModelOrFallback url={ASSETS.lockers} scale={2.0} position={[2.7, 1.0, -6.2]} rotation={[0, 0, 0]} castShadow fallback={null} />
        <ModelOrFallback url={ASSETS.bench} scale={2.1} position={[-3.05, 0.46, -2.7]} rotation={[0, 0.5, 0]} castShadow fallback={null} />
        <ModelOrFallback url={ASSETS.ballrack} scale={1.8} position={[3.05, 0.95, -2.9]} rotation={[0, -0.5, 0]} castShadow fallback={null} />
      </Suspense>
    </group>
  )
}

function Scene({
  scrollProgress,
  reduced,
  invalidateRef,
  ballControlRef,
  onScore,
}: {
  scrollProgress: React.MutableRefObject<number>
  reduced: boolean
  invalidateRef: React.MutableRefObject<(() => void) | null>
  ballControlRef?: React.MutableRefObject<BallControl | null>
  onScore?: () => void
}) {
  const lOuter = useRef<THREE.Group>(null)
  const lBob = useRef<THREE.Group>(null)
  const rOuter = useRef<THREE.Group>(null)
  const rBob = useRef<THREE.Group>(null)
  const keyRef = useRef<THREE.SpotLight>(null)
  const key2Ref = useRef<THREE.SpotLight>(null)
  const spotTarget = useMemo(() => new THREE.Object3D(), [])
  const shadowSeeded = useRef(false)
  const shadowTick = useRef(0)
  // Spring-integrated spin state (real angular momentum — see useFrame).
  const spinAngle = useRef(0)
  const spinVel = useRef(0)
  const shockRef = useRef<THREE.Mesh>(null) // gold meet shockwave ring
  const { invalidate } = useThree()

  // Render once on mount; invalidateRef kept for SkyBridge (harmless under "always").
  useEffect(() => {
    invalidateRef.current = invalidate
    invalidate()
    return () => {
      invalidateRef.current = null
    }
  }, [invalidate, invalidateRef])

  // Scroll drives the motion; a spring integrates the spin over real time so it carries
  // angular momentum (physics) under frameloop="always".
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05) // clamp for spring stability on slow frames
    // Shadow throttle: the STUDIO is static; only the pairs move. Manual shadow-map
    // control, refreshed every 2nd frame (only matters on discrete, where shadows run).
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
    // MEET energy — a wide swell (lights/ring) + a tight spike (leap/whip/shockwave/flash).
    const glow = Math.exp(-(((p - 0.5) / 0.15) ** 2))
    const burst = reduced ? 0 : Math.exp(-(((p - 0.5) / 0.05) ** 2))

    // ── CINEMATIC CAMERA — a slow ORBIT + push-in around the performance ring, so the
    // finale plays like a moving broadcast shot. Pure function of scroll.
    const dive = smooth(clamp01((p - 0.86) / 0.14))
    const cx = 0, cy = 0.34, cz = -0.05 // orbit centre ≈ the ring / meeting point
    const theta = lerp(-0.34, 0.4, smooth(p)) // a left→right arc
    const radius = lerp(4.5, 3.4, smooth(clamp01(p / 0.7))) - dive * 0.3 // starts wide (cinematic push-IN on entrance) → settles; small pairs + ball read as compact pieces in a vast dark space
    const camH = lerp(0.46, 0.62, smooth(p)) // low heroic angle, rising a touch
    camera.position.set(cx + Math.sin(theta) * radius, camH, cz + Math.cos(theta) * radius)
    camera.lookAt(cx, cy + dive * 0.05, cz)

    // ── THE WALK + PRESENTATION TURN ───────────────────────────────────────────
    // The pairs roll in from the wings + arrive on the ring by ~p0.3, then ease into a
    // flattering 3/4 hero angle by the meet and DRIFT slowly afterwards (a museum turntable).
    const we = smooth(clamp01(p / 0.3))
    const gait = reduced ? 0 : 1 - smooth(clamp01((p - 0.18) / 0.12))
    const steps = clamp01(p / 0.3) * 5 * Math.PI * 2
    const bobUp = Math.abs(Math.sin(steps)) * 0.03 * gait
    const settle = reduced ? 0 : Math.exp(-(((p - 0.3) / 0.045) ** 2)) * 0.03
    const rock = Math.sin(steps) * 0.07 * gait
    const lean = (1 - smooth(clamp01((p - 0.2) / 0.12))) * 0.11 * (reduced ? 0 : 1)
    // FAST scroll-driven SPIN with real angular MOMENTUM: the target tracks scroll (scroll
    // faster → it whips faster — ~3.6 turns across the finale), and a critically-ish-damped
    // spring chases it so the pairs carry weight + overshoot/settle naturally rather than
    // snapping rigidly to a scroll→angle map. THIS is the "better physics in movement".
    const targetSpin = (reduced ? 0 : p * Math.PI * 2 * 4.2) + burst * Math.PI * 0.8 // +whip at the meet
    // Stiffer spring = responsive to scroll (tracks fast, little lag); slight underdamping →
    // a touch of overshoot/settle so the spin carries weight (momentum) without feeling sluggish.
    spinVel.current += ((targetSpin - spinAngle.current) * 16 - spinVel.current * 5) * dt
    spinAngle.current += spinVel.current * dt
    const turn = reduced ? 0 : spinAngle.current
    const tilt = reduced ? 0 : Math.sin(p * Math.PI * 4) * 0.02 // subtle heel-toe life
    // Idle FLOAT — once arrived, the pairs gently breathe (clock-based; always-render).
    const present = smooth(clamp01((Math.min(p, 0.86) - 0.32) / 0.4))
    const t = state.clock.elapsedTime
    const floatL = reduced ? 0 : Math.sin(t * 1.1) * 0.016 * present
    const floatR = reduced ? 0 : Math.sin(t * 1.1 + 1.7) * 0.016 * present

    const lx = lerp(-4.5, -0.34, we)
    const rx = lerp(4.5, 0.34, we)
    // The pairs HOVER above the ring (a premium floating-product display): fully visible —
    // nothing hidden by the floor/ring — with a soft contact shadow cast below to ground the
    // levitation. LIFE during the spin: a bob synced to the spin phase, a slight X tumble, a
    // gentle scale "breath" — plus a LEAP at the meet (burst). All tiny → premium, not chaotic.
    const FLOAT_H = 0.11
    const baseY = FLOAT_H + bobUp - settle
    const leap = burst * 0.1
    const spinLifeL = reduced ? 0 : Math.sin(spinAngle.current) * 0.012 * present
    const spinLifeR = reduced ? 0 : Math.sin(spinAngle.current + 1.7) * 0.012 * present
    const tumble = reduced ? 0 : Math.sin(spinAngle.current * 0.5) * 0.04 * present
    const breathL = reduced ? 1 : 1 + Math.sin(t * 1.3) * 0.012 * present
    const breathR = reduced ? 1 : 1 + Math.sin(t * 1.3 + 1.7) * 0.012 * present
    if (lOuter.current) { lOuter.current.position.x = lx; lOuter.current.rotation.y = turn }
    if (rOuter.current) { rOuter.current.position.x = rx; rOuter.current.rotation.y = -turn }
    if (lBob.current) { lBob.current.position.y = Math.max(0.07, baseY + floatL + leap + spinLifeL); lBob.current.rotation.z = -lean; lBob.current.rotation.x = rock + tilt + tumble; lBob.current.scale.setScalar(breathL) }
    if (rBob.current) { rBob.current.position.y = Math.max(0.07, baseY + floatR + leap + spinLifeR); rBob.current.rotation.z = lean; rBob.current.rotation.x = -rock - tilt - tumble; rBob.current.scale.setScalar(breathR) }

    // ── THE MEET "REVEAL" ─────────────────────────────────────────────────────
    // At the meet (p≈0.5) the two performance spots SWELL and the gold ring IGNITES hard
    // (burst), a gold SHOCKWAVE rings outward, the pairs leap + whip — the finale payoff.
    // Tighter dramatic keys — they pool on the pairs (the room is dark). key2 (LEFT cross-key)
    // is boosted extra so the darker olive runner reads as premium as the brighter teal pair.
    if (keyRef.current) keyRef.current.intensity = 44 + glow * 32
    if (key2Ref.current) key2Ref.current.intensity = 36 + glow * 26
    ringMat.emissiveIntensity = 1.9 + glow * 4.8 + burst * 6
    // Gold SHOCKWAVE — a flat ring bursts outward across the floor at the meet. Pure function of
    // p (deterministic → replays cleanly on scroll back/forth); near-zero cost (1 draw, ~6% of scroll).
    if (shockRef.current) {
      shockRef.current.visible = burst > 0.012 // skip the draw entirely off-meet
      if (shockRef.current.visible) {
        const ss = lerp(0.2, 5, smooth(clamp01((p - 0.5) / 0.06)))
        shockRef.current.scale.set(ss, ss, ss)
        ;(shockRef.current.material as THREE.MeshBasicMaterial).opacity = burst * 0.85
      }
    }
  })

  return (
    <>
      <color attach="background" args={['#08080B']} />
      <fog attach="fog" args={['#070709', 7, 20]} />

      {/* Athletic IBL — a cool-white ceiling + front fill (performance-arena light) with a
          warm gold back accent (the brand). Baked once (frames=1), free per-frame. */}
      <Environment resolution={128} frames={1}>
        {/* IBL pulled WAY down — the scene must read DARK (lit only by the focused spots + the
            ring), so the ambient image light barely fills. Just enough to keep materials from
            going pure-black and to give the steel a faint cool sheen. */}
        <Lightformer intensity={0.4} color="#EAF0FF" position={[0, 5, 1]} rotation={[-Math.PI / 2, 0, 0]} scale={[11, 11, 1]} />
        <Lightformer intensity={0.22} color="#DCE6FF" position={[0, 2, 5]} scale={[9, 5, 1]} />
        <Lightformer intensity={0.2} color="#FFD79A" position={[0, 1.4, -5]} scale={[10, 3, 1]} />
        <Lightformer intensity={0.16} color="#AFC4F0" position={[-5, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} scale={[6, 5, 1]} />
        <Lightformer intensity={0.16} color="#AFC4F0" position={[5, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 5, 1]} />
      </Environment>

      {/* Bold PERFORMANCE LIGHTING — two converging spotlights stage the pairs on the ring
          (the cross-key look of a broadcast court), a cool rim separates them from the dark
          studio, and a warm gold up-glow rises from the ring. Dark studio + lit product =
          the hero. The two keys swell at the meet (driven above). */}
      <ambientLight intensity={0.012} color="#C2CCDE" />
      <primitive object={spotTarget} position={[0, 0.4, 0]} />
      <spotLight
        ref={keyRef}
        position={[1.9, 4.0, 1.5]}
        target={spotTarget}
        angle={0.44}
        penumbra={0.9}
        intensity={30}
        distance={15}
        decay={2}
        color="#FFE7C6"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-near={1}
        shadow-camera-far={12}
      />
      {/* Cross-key — cool-white from the opposite side (the converging broadcast look). */}
      <spotLight ref={key2Ref} position={[-2.1, 3.8, 1.0]} target={spotTarget} angle={0.46} penumbra={0.92} intensity={22} distance={15} decay={2} color="#E6EEFF" />
      {/* Cool rim from behind-above — separates the dark pairs from the dark studio. Boosted
          so the shoe silhouettes get a crisp premium edge-glow (esp. the darker olive runner). */}
      <spotLight position={[0, 3.1, -2.6]} target={spotTarget} angle={0.62} penumbra={1} intensity={48} distance={9} decay={2} color="#B4C6F4" />
      {/* LEAN cinematic light set — every light shades every fragment, so on the iGPU fewer lights
          = real FPS. ONE warm front fill (offset left to also lift the darker olive pair). The props
          now read from the baked env IBL alone (the dark room is the point — no dedicated fill). */}
      <pointLight position={[-0.5, 0.75, 1.9]} intensity={15} color="#FFE7CC" distance={6} decay={2} />

      <TrainingStudio />

      {/* (Grounding is now per-object soft blob shadows — see the Pair component + Basketball —
          instead of a drei <ContactShadows> pass that re-rendered the whole scene every frame.) */}

      <Pair url={ASSETS.blackRunner} faceSign={1} outerRef={lOuter} bobRef={lBob} />
      <Pair url={ASSETS.ae1} faceSign={-1} outerRef={rOuter} bobRef={rBob} />

      {/* Gold meet SHOCKWAVE — a flat ring that bursts outward across the floor at p≈0.5 (driven above). */}
      <mesh ref={shockRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} renderOrder={3}>
        <ringGeometry args={[0.86, 1.0, 64]} />
        <meshBasicMaterial color="#FFD27A" transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Interactive basketball — grab / drag / throw, bounces hard, sink it through the hoop. */}
      <Basketball reduced={reduced} scrollProgress={scrollProgress} controlRef={ballControlRef} onScore={onScore} />

      {/* Calibration helper for the swish RIM circle (off in production). */}
      {DEBUG_RIM && (
        <mesh position={[RIM.x, RIM.y, RIM.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[RIM.r, 0.012, 8, 48]} />
          <meshBasicMaterial color="#39FF88" />
        </mesh>
      )}

      {/* No post-composer: the Canvas is NOT `flat`, so R3F applies ACES tonemap + MSAA
          natively (correct color + clean edges) without a per-frame full-screen pass. */}
    </>
  )
}

// Canvas wrapper (dynamic-imported by SkyBridge, ssr:false).
// PERF (iGPU-first — 2nd WebGL canvas over the vault's): ONE 128-res floor reflection on
// all GPUs; real-time shadows gated to DISCRETE only (the floor reflection grounds the
// pairs on the iGPU). frameloop="always" while in view; parks "never" off-screen. dpr 1.0.
export default function SkyScene({
  scrollProgress,
  active,
  reduced,
  invalidateRef,
  ballControlRef,
  onScore,
}: {
  scrollProgress: React.MutableRefObject<number>
  active: boolean
  reduced: boolean
  invalidateRef: React.MutableRefObject<(() => void) | null>
  ballControlRef?: React.MutableRefObject<BallControl | null>
  onScore?: () => void
}) {
  // Assume integrated (shadows off) until a discrete GPU is confirmed in onCreated.
  const [reflective, setReflective] = useState(false)
  return (
    <Canvas
      // Real-time shadows only on DISCRETE GPUs (reflective === !integrated). On the iGPU
      // the always-render finale + the floor reflection is enough; a shadow map on top is
      // real cost for little gain — the pairs stay grounded by their floor reflection.
      shadows={reflective ? 'percentage' : false}
      frameloop={active ? 'always' : 'never'}
      dpr={1}
      camera={{ position: [0, 0.5, 4.0], fov: 40, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ background: '#08080B' }}
      aria-hidden="true"
      onCreated={({ gl }) => {
        try {
          setReflective(!isIntegratedGpu(readGpuRenderer(gl.getContext())))
        } catch {
          /* keep shadows off on any failure */
        }
      }}
    >
      <Suspense fallback={null}>
        <Scene scrollProgress={scrollProgress} reduced={reduced} invalidateRef={invalidateRef} ballControlRef={ballControlRef} onScore={onScore} />
      </Suspense>
    </Canvas>
  )
}

// Preload the finale GLBs the moment this module loads (page load — SkyBridge dynamic-imports
// it up front), so scrolling into "The Meeting" doesn't hitch on model decode / GPU upload:
// the pairs + props are downloaded + ready long before you arrive. (Same cache key as useGLTF.)
useGLTF.preload(ASSETS.blackRunner)
useGLTF.preload(ASSETS.ae1)
useGLTF.preload(ASSETS.hoop)
useGLTF.preload(ASSETS.lockers)
useGLTF.preload(ASSETS.ballrack)
useGLTF.preload(ASSETS.bench)
useGLTF.preload(ASSETS.gymbag)
useGLTF.preload(ASSETS.kettlebell)
useGLTF.preload(ASSETS.basketball)
