'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial, ContactShadows, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import ModelOrFallback from '@/components/three/ModelOrFallback'
import { ASSETS } from '@/lib/assets'
import { withBase } from '@/lib/basePath'
import { isIntegratedGpu, readGpuRenderer } from '@/lib/deviceTier'

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (x: number) => x * x * (3 - 2 * x)

const fallbackMat = new THREE.MeshStandardMaterial({ color: '#3A352E', roughness: 0.5, metalness: 0.3 })
// Dark WET-ASPHALT floor for INTEGRATED GPUs (no live FBO reflection) — low albedo +
// low metalness + glossy so it reads as the street's wet pavement (dark, with warm
// specular highlights from the IBL/lights), continuous with the Cairo-street backplate
// behind it (NOT a bright grey "shelf"). Discrete GPUs get the live reflection.
const staticFloorMat = new THREE.MeshStandardMaterial({ color: '#060504', roughness: 0.8, metalness: 0.0 })

// Warm champagne "pool of light" laid on the floor under the meeting point, so the
// pairs read as standing IN a lit pool on a real floor — the single cheapest fix
// for the "floating in a void" look. One canvas texture, additive, demand-cheap.
function usePoolTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 128)
    g.addColorStop(0, 'rgba(255,216,160,0.6)')
    g.addColorStop(0.3, 'rgba(255,190,120,0.22)')
    g.addColorStop(0.62, 'rgba(255,176,100,0.05)')
    g.addColorStop(1, 'rgba(255,176,100,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
}

// The PLACE — a cinematic Cairo street at golden-hour dusk (wet pavement, warm
// shopfront/streetlamp bokeh, deep dusk sky) behind the pairs. A large UNLIT
// billboard; the 3D reflective floor in front is the wet pavement the pairs stand on
// + reflect in, and the warm fog blends the seam. Generated via Higgsfield Nano
// Banana, optimized to ~100KB webp. Rendered in its OWN Suspense (in Scene) so a slow
// texture load can never blank the whole scene.
function StreetBackplate() {
  const tex = useTexture(withBase('/images/finale-street.webp'))
  tex.colorSpace = THREE.SRGBColorSpace
  return (
    <mesh position={[0, 3.2, -8]}>
      <planeGeometry args={[22, 12.4]} />
      <meshBasicMaterial map={tex} depthWrite={false} />
    </mesh>
  )
}

// Soft elliptical AO blob — the grounding on INTEGRATED GPUs (where real-time
// ContactShadows are gated off to protect the demand-render budget). Wider than
// tall to match a shoe's footprint; feathered so it reads as a soft contact
// darkening, never a hard disc.
function useShadowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64)
    g.addColorStop(0, 'rgba(0,0,0,0.95)')
    g.addColorStop(0.4, 'rgba(0,0,0,0.5)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])
}

// One pair: an outer group (walk X + present yaw) → a bob group (step bounce +
// lean-into-travel + heel-toe rock) → the model (rotated to face inward).
// faceSign +1 faces +X (right), -1 faces -X. Grounding is the scene's real
// ContactShadows + the warm floor pool — no fake per-shoe shadow plane.
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
  // When set (integrated GPUs, no real ContactShadows), a soft AO blob grounds the
  // pair on the floor. It sits on the outer group so it follows the walk X but does
  // NOT bob with the shoe — the shadow stays planted on the floor.
  shadowTex: THREE.Texture | null
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
      {shadowTex && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.013, 0]}>
          <planeGeometry args={[1.2, 0.58]} />
          <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.92} />
        </mesh>
      )}
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
  const spotRef = useRef<THREE.SpotLight>(null)
  const spotTarget = useMemo(() => new THREE.Object3D(), [])
  const poolTex = usePoolTexture()
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

  // The whole scene is a PURE FUNCTION of the (upstream-damped) scroll value. We
  // render CONTINUOUSLY while in view (frameloop="always") so the motion is buttery
  // every display frame — demand-mode only redrew on discrete scroll events, which
  // read as steppy/"laggy" on a trackpad. The scene is lean enough (no post-composer,
  // few lights, dpr 1) to hold 60fps; it still parks (frameloop "never") off-screen.
  useFrame(() => {
    const p = scrollProgress.current

    // ── CAMERA ────────────────────────────────────────────────────────────────
    // Low, heroic angle that looks slightly UP at the pairs; a slow dolly-in through
    // the approach, a gentle lateral parallax, and a push-in "dive" at the end that
    // (under the warm CSS flood) reads as moving into the vault, into the shop.
    const e = smooth(clamp01(p / 0.5)) // 0 entrance → 1 at the meet
    const dive = smooth(clamp01((p - 0.86) / 0.14))
    camera.position.z = lerp(lerp(4.0, 3.35, e), 2.7, dive) // closer → the pairs read larger/more present
    camera.position.y = lerp(0.55, 0.72, dive)
    camera.position.x = Math.sin(p * Math.PI) * 0.1 // gentle dolly-arc parallax
    camera.lookAt(0, lerp(0.7, 0.8, dive), 0)

    // ── THE WALK ──────────────────────────────────────────────────────────────
    // Two pairs STRIDE in from the wings and PLANT at centre. The gait (bob + rock +
    // lean) is full early and eases to stillness as they near the meet, so the
    // motion reads as "walking in, then settling" rather than sliding + spinning.
    const gait = reduced ? 0 : 1 - smooth(clamp01((p - 0.32) / 0.18)) // 1 → 0 by the meet
    const steps = clamp01(p / 0.5) * 4 * Math.PI * 2 // ~4 strides over the approach
    const bobUp = Math.abs(Math.sin(steps)) * 0.03 * gait // rises mid-stride, touches at the plant
    const settle = reduced ? 0 : Math.exp(-(((p - 0.5) / 0.05) ** 2)) * 0.02 // soft press at the meet
    const rock = Math.sin(steps) * 0.05 * gait // heel-toe rock
    const lean = (1 - smooth(clamp01((p - 0.34) / 0.16))) * 0.1 * (reduced ? 0 : 1) // lean into travel, upright at the plant
    // Present: turn a touch toward camera once met — a composed presentation, NOT
    // the old 2.5-turn turntable (which read as a config viewer, not a finale).
    const present = smooth(clamp01((Math.min(p, 0.86) - 0.5) / 0.36))
    const presentYaw = reduced ? 0 : present * 0.24

    const lx = lerp(-5.0, -0.72, e)
    const rx = lerp(5.0, 0.72, e)
    const y = bobUp - settle
    if (lOuter.current) { lOuter.current.position.x = lx; lOuter.current.rotation.y = presentYaw }
    if (rOuter.current) { rOuter.current.position.x = rx; rOuter.current.rotation.y = -presentYaw }
    if (lBob.current) { lBob.current.position.y = y; lBob.current.rotation.z = -lean; lBob.current.rotation.x = rock }
    if (rBob.current) { rBob.current.position.y = y; rBob.current.rotation.z = lean; rBob.current.rotation.x = -rock }

    // Warm KEY swell — a light bloom that grows toward the meeting then settles for
    // the presentation. Free, demand-safe (pure function of p).
    if (spotRef.current) {
      const glow = Math.exp(-(((p - 0.5) / 0.17) ** 2))
      spotRef.current.intensity = 26 + glow * 16
    }
  })

  return (
    <>
      <color attach="background" args={['#0A0807']} />
      {/* Fog pushed out + warmed so the Cairo-street backplate reads through it (was
          5→13 for the old black void); a light haze still blends the floor→street seam. */}
      <fog attach="fog" args={['#140D08', 9, 26]} />

      {/* Baked IBL — the scene's RICHNESS, free per-frame (frames=1 bakes once).
          Warm/brass-dominant key + warm front panel (lights the faces) + a stronger
          COOL back-rim former that separates the dark silhouettes from the dark
          backdrop (premium dimension). */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={4.2} color="#FFC178" position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[8, 8, 1]} />
        <Lightformer intensity={2.6} color="#FFE7C6" position={[0, 1.8, 5]} scale={[8, 5, 1]} />
        <Lightformer intensity={2.4} color="#D7AE72" form="ring" position={[0, 3, 1.5]} scale={4} />
        <Lightformer intensity={1.2} color="#A38765" position={[-4, 2, 1]} rotation={[0, Math.PI / 2, 0]} scale={[5, 5, 1]} />
        <Lightformer intensity={1.2} color="#A38765" position={[4, 2, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[5, 5, 1]} />
        <Lightformer intensity={1.0} color="#E8DAC2" position={[0, 2.6, -5]} scale={[9, 4, 1]} />
        {/* Cool back/top edge rim — separates the dark A.E.1 from the void. */}
        <Lightformer intensity={1.0} color="#AFC4F0" position={[0, 3.4, -4.5]} scale={[7, 3, 1]} />
      </Environment>

      {/* Real-time lights: a warm KEY (swells at the meet), a COOL rim from behind/
          above (silhouette separation — the iGPU can't fake this from IBL alone),
          and a soft warm front fill for the camera-facing soles. ambient lifts the
          shadows just enough to keep the dark pair readable. */}
      <ambientLight intensity={0.3} color="#FFE2C2" />
      {/* Key aimed AT THE PAIRS (y~0.75), not the floor — a default-target spotlight
          points at world origin (the floor), which washed the wet asphalt to grey. */}
      <primitive object={spotTarget} position={[0, 0.75, 0]} />
      <spotLight ref={spotRef} position={[0, 5.4, 1.4]} target={spotTarget} angle={0.5} penumbra={1} intensity={26} distance={16} decay={2} color="#FFE3C2" />
      {/* Cool rim also AIMED at the pairs (not world-origin/floor) so it edges the dark
          A.E.1 instead of washing the asphalt. */}
      <spotLight position={[0, 4.2, -4]} target={spotTarget} angle={0.7} penumbra={1} intensity={11} distance={14} decay={2} color="#BFD2F2" />
      {/* (Front-fill pointLight removed — it grazed the near floor into a grey band;
          the warm IBL front panel lights the pairs' camera-facing side instead.) */}

      {/* The PLACE — the Cairo-street backplate behind the pairs, in its own Suspense
          so a slow texture load can't blank the scene. */}
      <Suspense fallback={null}>
        <StreetBackplate />
      </Suspense>

      {/* Wet-asphalt street floor — extends back UNDER the backplate so it reads as
          continuous pavement (kills the grey-ledge seam); live reflection of the pairs
          on discrete GPUs, dark glossy static on integrated. The pairs stand + reflect. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} material={reflective ? undefined : staticFloorMat} receiveShadow>
        <circleGeometry args={[12, 64]} />
        {reflective && (
          <MeshReflectorMaterial
            resolution={128}
            blur={[0, 0]}
            mixBlur={0}
            depthScale={0}
            mixStrength={1.4}
            mirror={0.5}
            color="#0A0908"
            metalness={0.25}
            roughness={0.45}
          />
        )}
      </mesh>

      {/* Subtle warm streetlight pool under the pairs — a soft glow on the wet asphalt
          (NOT the bright grey ledge it was); the street + reflection do the grounding. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.15]}>
        <planeGeometry args={[5.0, 2.8]} />
        <meshBasicMaterial map={poolTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} opacity={0.28} />
      </mesh>

      {/* Grounding, tier-aware: real shoe-shaped ContactShadows on discrete GPUs; on
          integrated GPUs the per-pair AO blob (in <Pair>) + the warm pool carry it,
          so the demand-render budget isn't spent on a shadow-map RT each scroll frame. */}
      {reflective && (
        <ContactShadows position={[0, 0.014, 0]} scale={8} resolution={512} blur={2.6} far={2.0} opacity={0.8} color="#000000" />
      )}

      <Pair url={ASSETS.cloudmonster} faceSign={1} outerRef={lOuter} bobRef={lBob} shadowTex={reflective ? null : shadowTex} />
      <Pair url={ASSETS.ae1} faceSign={-1} outerRef={rOuter} bobRef={rBob} shadowTex={reflective ? null : shadowTex} />

      {/* No post-processing composer: the Canvas is NOT `flat`, so R3F applies ACES
          filmic tonemapping in-shader (correct color + highlight rolloff) and
          antialias:true gives hardware MSAA — both WITHOUT a per-frame full-screen
          pass, keeping the demand-rendered scroll snappy on the Iris Xe. */}
    </>
  )
}

// Canvas wrapper (dynamic-imported by SkyBridge, ssr:false).
// PERF (iGPU-first — 2nd WebGL canvas over the vault's):
//   • frameloop="always" while in view → SMOOTH continuous motion every display
//     frame (demand-mode redrew only on discrete scroll events → steppy/"laggy" on
//     a trackpad). Parks "never" off-screen. The scene is lean enough to hold 60fps.
//   • dpr pinned to 1.0 → no fill-rate blow-up on integrated GPUs.
//   • Few real-time lights + baked IBL (free). Reflection is one cheap 128px FBO
//     pass on discrete only. NO post-composer — native ACES tonemap + MSAA (cheaper
//     than a full-screen SMAA/ToneMapping pass per scroll frame on an iGPU).
//   • The gold meet-accent, vignette, beam, dust + flood transition are cheap CSS
//     overlays in SkyBridge.
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
  // Assume integrated (no live reflection / no bloom) until a discrete GPU is
  // confirmed in onCreated — same conservative default as the vault.
  const [reflective, setReflective] = useState(false)
  return (
    <Canvas
      // NOT `flat`: R3F applies ACES tonemapping + sRGB natively (in-shader, no extra
      // pass) and antialias:true gives hardware MSAA — premium color + clean edges
      // without a full-screen composer taxing every scroll frame on the Iris Xe.
      frameloop={active ? 'always' : 'never'}
      dpr={1}
      camera={{ position: [0, 0.55, 3.9], fov: 38, near: 0.1, far: 40 }}
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
