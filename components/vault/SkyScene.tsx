'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import ModelOrFallback from '@/components/three/ModelOrFallback'
import { ASSETS } from '@/lib/assets'
import { isIntegratedGpu, readGpuRenderer } from '@/lib/deviceTier'

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (x: number) => x * x * (3 - 2 * x)

// ── PRO TRAINING STUDIO — solid-PBR material library. Dark concrete + brushed steel +
// bold emissive LED accents. (The vault proved solid materials + good lighting read
// premium without textures — no tiling/seam risk.) ──
const fallbackMat = new THREE.MeshStandardMaterial({ color: '#2A2C30', roughness: 0.6, metalness: 0.3 })
// Darker matte concrete — walls + ceiling (recede into shadow so the lit product pops).
const wallConcreteMat = new THREE.MeshStandardMaterial({ color: '#191A1E', roughness: 0.96, metalness: 0.0 })
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
            normalizeTo={0.54}
            seat="bottom"
            rotation={[0, face, 0]}
            castShadow
            envMapIntensity={0.75}
            fallback={
              <mesh material={fallbackMat} castShadow position={[0, 0.27, 0]}>
                <boxGeometry args={[0.6, 0.27, 0.22]} />
              </mesh>
            }
          />
        </Suspense>
      </group>
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
        <MeshReflectorMaterial resolution={128} blur={[110, 55]} mixBlur={1} mixStrength={0.92} depthScale={0.6} color="#1E1E24" metalness={0.72} roughness={0.28} />
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

      {/* Steel mount arm behind the backboard → the hoop reads WALL-MOUNTED, not a floating
          decal. Spans from the board back (~z-6.2) to the wall (z-6.6). y tuned by capture. */}
      <mesh position={[0, 3.5, -6.42]} material={steelMat}>
        <boxGeometry args={[0.18, 0.18, 0.46]} />
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
        {/* BACKDROP — hoop centred high on the back wall (the facility's centrepiece). */}
        <ModelOrFallback url={ASSETS.hoop} scale={2.6} position={[0, 3.05, -6.2]} rotation={[0, 0, 0]} castShadow fallback={null} />
        {/* BACK WALL — a SYMMETRIC locker room flanking the hoop (lockers L + R). Replaces the
            old "foam-block" shoeboxes on the right with a matching, better-reading prop. */}
        <ModelOrFallback url={ASSETS.lockers} scale={2.1} position={[-3.5, 1.05, -6.1]} rotation={[0, 0.4, 0]} castShadow fallback={null} />
        <ModelOrFallback url={ASSETS.lockers} scale={2.1} position={[3.5, 1.05, -6.1]} rotation={[0, -0.4, 0]} castShadow fallback={null} />
        {/* MID-LEFT — the ball rack (holds its own balls; the loose red basketball was cut as a
            colour-clashing duplicate). */}
        <ModelOrFallback url={ASSETS.ballrack} scale={1.9} position={[-3.1, 1.0, -4.5]} rotation={[0, 0.5, 0]} castShadow fallback={null} />
        {/* SYMMETRIC DEPTH around the ring — each side mirrors the other so the silhouettes frame
            the floating hero pairs: bench (fore-LEFT) ↔ kettlebell (fore-RIGHT), ball rack
            (mid-LEFT) ↔ gym bag (mid-RIGHT), lockers (back L+R), hoop (centre). */}
        <ModelOrFallback url={ASSETS.bench} scale={2.2} position={[-2.55, 0.46, -3.0]} rotation={[0, 0.85, 0]} castShadow fallback={null} />
        <ModelOrFallback url={ASSETS.kettlebell} scale={0.52} position={[2.3, 0.26, -2.9]} rotation={[0, -0.5, 0]} castShadow fallback={null} />
        <ModelOrFallback url={ASSETS.gymbag} scale={0.7} position={[3.0, 0.28, -4.3]} rotation={[0, -0.7, 0]} castShadow fallback={null} />
      </Suspense>
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
  const keyRef = useRef<THREE.SpotLight>(null)
  const key2Ref = useRef<THREE.SpotLight>(null)
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
  // under frameloop="always". No clock terms (except the idle breathe).
  useFrame((state) => {
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

    // ── CINEMATIC CAMERA — a slow ORBIT + push-in around the performance ring, so the
    // finale plays like a moving broadcast shot. Pure function of scroll.
    const dive = smooth(clamp01((p - 0.86) / 0.14))
    const cx = 0, cy = 0.34, cz = -0.05 // orbit centre ≈ the ring / meeting point
    const theta = lerp(-0.34, 0.4, smooth(p)) // a left→right arc
    const radius = lerp(3.5, 2.7, smooth(clamp01(p / 0.7))) - dive * 0.3 // close enough to hero the pairs, pulled back so they don't overflow the frame
    const camH = lerp(0.4, 0.58, smooth(p)) // low heroic angle, rising a touch
    camera.position.set(cx + Math.sin(theta) * radius, camH, cz + Math.cos(theta) * radius)
    camera.lookAt(cx, cy + dive * 0.05, cz)

    // ── THE WALK + SCROLL-DRIVEN SPIN ──────────────────────────────────────────
    // The pairs roll in from the wings + arrive on the ring by ~p0.3, then a FULL
    // scroll-driven rotation (scroll faster → spin faster; ~2.5 turns across the finale).
    const we = smooth(clamp01(p / 0.3))
    const gait = reduced ? 0 : 1 - smooth(clamp01((p - 0.18) / 0.12))
    const steps = clamp01(p / 0.3) * 5 * Math.PI * 2
    const bobUp = Math.abs(Math.sin(steps)) * 0.03 * gait
    const settle = reduced ? 0 : Math.exp(-(((p - 0.3) / 0.045) ** 2)) * 0.03
    const rock = Math.sin(steps) * 0.07 * gait
    const lean = (1 - smooth(clamp01((p - 0.2) / 0.12))) * 0.11 * (reduced ? 0 : 1)
    const spin = reduced ? 0 : p * Math.PI * 2 * 2.5
    const tilt = reduced ? 0 : Math.sin(spin) * 0.04
    // Idle FLOAT — once arrived, the pairs gently breathe (clock-based; always-render).
    const present = smooth(clamp01((Math.min(p, 0.86) - 0.32) / 0.4))
    const t = state.clock.elapsedTime
    const floatL = reduced ? 0 : Math.sin(t * 1.1) * 0.016 * present
    const floatR = reduced ? 0 : Math.sin(t * 1.1 + 1.7) * 0.016 * present

    const lx = lerp(-4.5, -0.5, we)
    const rx = lerp(4.5, 0.5, we)
    // The pairs HOVER above the ring (a premium floating-product display): fully visible —
    // nothing hidden by the floor/ring — with a soft contact shadow cast below to ground the
    // levitation. The idle float adds a gentle breathe; the clamp keeps the hover positive.
    const FLOAT_H = 0.11
    const baseY = FLOAT_H + bobUp - settle
    if (lOuter.current) { lOuter.current.position.x = lx; lOuter.current.rotation.y = spin }
    if (rOuter.current) { rOuter.current.position.x = rx; rOuter.current.rotation.y = -spin }
    if (lBob.current) { lBob.current.position.y = Math.max(0.085, baseY + floatL); lBob.current.rotation.z = -lean; lBob.current.rotation.x = rock + tilt }
    if (rBob.current) { rBob.current.position.y = Math.max(0.085, baseY + floatR); rBob.current.rotation.z = lean; rBob.current.rotation.x = -rock - tilt }

    // ── THE MEET "REVEAL" ─────────────────────────────────────────────────────
    // At the meet (p≈0.5) the two performance spots SWELL and the gold ring + back-wall
    // brand line IGNITE — the finale payoff. Then they settle for the present.
    const glow = Math.exp(-(((p - 0.5) / 0.15) ** 2))
    // Balanced keys — rich enough to hero the pairs (esp. the darker olive runner), softer than
    // the old 42+glow*46 swell that blew them to plastic. The rim + fills carry the form.
    if (keyRef.current) keyRef.current.intensity = 40 + glow * 30
    if (key2Ref.current) key2Ref.current.intensity = 27 + glow * 22
    ringMat.emissiveIntensity = 1.9 + glow * 4.8
  })

  return (
    <>
      <color attach="background" args={['#08080B']} />
      <fog attach="fog" args={['#070709', 7, 20]} />

      {/* Athletic IBL — a cool-white ceiling + front fill (performance-arena light) with a
          warm gold back accent (the brand). Baked once (frames=1), free per-frame. */}
      <Environment resolution={256} frames={1}>
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
        angle={0.5}
        penumbra={0.85}
        intensity={30}
        distance={15}
        decay={2}
        color="#FFF3E6"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-near={1}
        shadow-camera-far={12}
      />
      {/* Cross-key — cool-white from the opposite side (the converging broadcast look). */}
      <spotLight ref={key2Ref} position={[-2.1, 3.8, 1.0]} target={spotTarget} angle={0.52} penumbra={0.9} intensity={22} distance={15} decay={2} color="#E6EEFF" />
      {/* Cool rim from behind-above — separates the dark pairs from the dark studio. Boosted
          so the shoe silhouettes get a crisp premium edge-glow (esp. the darker olive runner). */}
      <spotLight position={[0, 3.1, -2.6]} target={spotTarget} angle={0.62} penumbra={1} intensity={44} distance={9} decay={2} color="#C8D4F0" />
      {/* Low cool back-rim at shoe height — rakes the heels so each pair reads as a lit hero
          object against the dark floor (product-photography edge separation). */}
      <pointLight position={[0, 0.5, -2.2]} intensity={9} color="#D6E2FF" distance={4} decay={2} />
      {/* Warm gold up-glow rising from the performance ring — dramatic + ties to the ring
          (toned WAY down: a strong up-glow made the shoes look brassy/plastic). */}
      <pointLight position={[0, 0.18, 0]} intensity={2} color="#FFC878" distance={4} decay={2} />
      {/* Warm FRONT fill from the camera side — lifts the shoes' faces so their form +
          detail read (not dark blobs); short range so it mostly touches the hero pairs. */}
      <pointLight position={[0, 0.85, 2.4]} intensity={13} color="#FFE8CC" distance={5} decay={2} />
      {/* Cool back fill so the steel structure JUST reads against the dark wall (kept low — the
          studio is meant to fall into shadow now). */}
      <pointLight position={[0, 2.6, -5.4]} intensity={2.2} color="#AFC0E4" distance={11} decay={2} />
      {/* Faint cool ZONE fills — the props read only as dim silhouettes framing the lit hero
          (dropped hard: the dark room is the point; the spotlit ring + pairs are the subject). */}
      <pointLight position={[-2.7, 2.2, -4.0]} intensity={3} color="#B8C6E8" distance={9} decay={2} />
      <pointLight position={[2.7, 2.2, -4.0]} intensity={3} color="#B8C6E8" distance={9} decay={2} />

      <TrainingStudio />

      {/* CONTACT SHADOW cast below the FLOATING pairs — grounds the levitation + gives the dark
          stage its drama. The plane sits just above the ring; the pairs hover ~0.11 above it, so
          this reads as a real floating-object shadow pooled beneath each shoe (not a blanket over
          the glow). Tight scale so it darkens only under the pairs; the outer ring keeps glowing. */}
      <ContactShadows position={[0, 0.009, 0]} scale={4.5} resolution={512} blur={2.2} opacity={0.75} far={1.4} color="#000000" frames={Infinity} />

      <Pair url={ASSETS.blackRunner} faceSign={1} outerRef={lOuter} bobRef={lBob} />
      <Pair url={ASSETS.ae1} faceSign={-1} outerRef={rOuter} bobRef={rBob} />

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
}: {
  scrollProgress: React.MutableRefObject<number>
  active: boolean
  reduced: boolean
  invalidateRef: React.MutableRefObject<(() => void) | null>
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
        <Scene scrollProgress={scrollProgress} reduced={reduced} invalidateRef={invalidateRef} />
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
