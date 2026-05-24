'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer, useTexture } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import ModelOrFallback from '@/components/three/ModelOrFallback'
import { ASSETS, SHELF_SNEAKERS } from '@/lib/assets'
import { withBase } from '@/lib/basePath'

// A smooth, confident walk straight down the CENTRE of the store. The corridor
// stays symmetric (vanishing point centred) so it reads as real — not a sway.
// Position drifts only ±0.25 for a touch of life; the gaze stays forward except
// one soft glance left at the drop feature. (An earlier aggressive left/right
// swing crammed the scene to one side and left half the frame an empty black
// void — that's what "didn't feel real".) The side shelves still sweep past in
// the periphery as the camera dollies forward, so depth is preserved.
const CAMERA_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 1.8, 12),      // entrance, centred outside the door
  new THREE.Vector3(0, 1.55, 8.5),    // forward, centred — stable approach
  new THREE.Vector3(0, 1.32, 4.5),    // forward, centred
  new THREE.Vector3(0, 1.12, 1.0),    // centre on the hero pedestal (z=0)
  new THREE.Vector3(-0.25, 1.05, -3), // gentle drift left toward the drop feature
  new THREE.Vector3(0, 1.0, -6.5),    // re-centre, approach the counter (z=-8)
  new THREE.Vector3(0.2, 1.05, -9.5), // gentle drift right into the brand corridor
  new THREE.Vector3(0, 1.1, -12),     // exit deeper down the hall
])

const LOOK_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 1.0, 6),       // look straight down the corridor
  new THREE.Vector3(0, 1.0, 3),
  new THREE.Vector3(0, 1.0, 0),
  new THREE.Vector3(0, 1.05, -1),     // hero centred
  new THREE.Vector3(-0.8, 1.0, -5),   // soft glance left at the drop feature / Phase-2 ticker
  new THREE.Vector3(0, 0.82, -8),     // dip to the verification counter
  new THREE.Vector3(0, 1.0, -10.5),   // brand corridor
  new THREE.Vector3(0, 1.0, -12),
])

// Materials
const wallMat = new THREE.MeshStandardMaterial({
  color: '#0A0908',
  roughness: 0.95,
  metalness: 0.0,
})
const metalMat = new THREE.MeshStandardMaterial({
  color: '#2A2420',
  roughness: 0.15,
  metalness: 0.9,
})
// NB: no `transmission` — real transmission forces three.js to re-render the
// whole scene into a refraction buffer every frame (a second full pass, like
// MeshReflectorMaterial). Tinted transparency + metalness fakes glass for ~free.
const glassMat = new THREE.MeshStandardMaterial({
  color: '#7C94B0',
  transparent: true,
  opacity: 0.18,
  roughness: 0.08,
  metalness: 0.5,
})
const goldMat = new THREE.MeshStandardMaterial({
  color: '#BFA06A',
  roughness: 0.25,
  metalness: 0.8,
})
const stripMat = new THREE.MeshStandardMaterial({
  color: '#FFF4E0',
  emissive: '#FFF4E0',
  emissiveIntensity: 1.2,
  roughness: 1.0,
})
const heroMat = new THREE.MeshStandardMaterial({
  color: '#181412',
  roughness: 0.08,
  metalness: 0.95,
})
const plinithMat = new THREE.MeshStandardMaterial({
  color: '#1A1714',
  roughness: 0.4,
  metalness: 0.3,
})
// Premium procedural-prop materials
const graphiteMat = new THREE.MeshStandardMaterial({
  color: '#26231F',
  roughness: 0.45,
  metalness: 0.85,
})
// Smoked glass shelves — no transmission (see glassMat note). Used on ~18
// surfaces, so a transmission pass here was a major per-frame cost on the Iris Xe.
const smokedGlassMat = new THREE.MeshStandardMaterial({
  color: '#161A1F',
  transparent: true,
  opacity: 0.6,
  roughness: 0.15,
  metalness: 0.4,
})
const amberMat = new THREE.MeshStandardMaterial({
  color: '#FFB366',
  emissive: '#FFB366',
  emissiveIntensity: 2.0,
  roughness: 1.0,
})
const cardBaseMat = new THREE.MeshStandardMaterial({
  color: '#0E0D0C',
  roughness: 0.6,
  metalness: 0.3,
})
const creamPanelMat = new THREE.MeshStandardMaterial({
  color: '#EDE7DA',
  roughness: 0.5,
  metalness: 0.0,
})
const mintMat = new THREE.MeshStandardMaterial({
  color: '#35E0A1',
  emissive: '#35E0A1',
  emissiveIntensity: 1.2,
  roughness: 0.4,
})
const boxBlackMat = new THREE.MeshStandardMaterial({
  color: '#141210',
  roughness: 0.7,
  metalness: 0.1,
})
const boxBoneMat = new THREE.MeshStandardMaterial({
  color: '#574E42',
  roughness: 0.6,
  metalness: 0.0,
})
// Dark glossy retail floor. High metalness + low roughness picks up the baked
// Environment map as a warm sheen — a premium reflection at ~zero per-frame
// cost (vs MeshReflectorMaterial, which re-rendered the whole scene each frame).
const floorMat = new THREE.MeshStandardMaterial({
  color: '#0E0B08',
  roughness: 0.22,
  metalness: 0.9,
})
// Matte-clay treatment for the generic Tripo shelf shoes — one dark sculptural
// material so they read as intentional set dressing under the amber LEDs, not
// fake-colourful AI-3D shoes that fight the "100% authentic" pitch.
const clayShelfMat = new THREE.MeshStandardMaterial({
  color: '#211d18',
  roughness: 0.72,
  metalness: 0.05,
})

function CeilingStrips() {
  const positions: [number, number, number][] = [
    [0, 3.48, -5],
    [-1.5, 3.48, -5],
    [1.5, 3.48, -5],
  ]
  return (
    <>
      {positions.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} material={stripMat}>
          <boxGeometry args={[0.06, 0.04, 26]} />
        </mesh>
      ))}
    </>
  )
}

function WallStrips() {
  const zs = [-2, -5, -8, -11]
  return (
    <>
      {zs.map((z, i) => (
        <group key={i}>
          <mesh position={[-5.32, 1.6, z]} material={stripMat}>
            <boxGeometry args={[0.03, 2.4, 0.05]} />
          </mesh>
          <mesh position={[5.32, 1.6, z]} material={stripMat}>
            <boxGeometry args={[0.03, 2.4, 0.05]} />
          </mesh>
        </group>
      ))}
    </>
  )
}

// Premium procedural retail wall display: graphite frame, smoked-glass
// shelves, warm amber LED under each front edge, thin vertical rails.
const SHELF_YS = [0.62, 1.36, 2.1]

function ShelfModule({ x, z, idx }: { x: number; z: number; idx: number }) {
  const sx = x > 0 ? 1 : -1 // +1 right wall, -1 left wall (faces inward)
  return (
    <group position={[x, 0, z]}>
      {/* Graphite back panel against the wall */}
      <mesh position={[sx * 0.05, 1.5, 0]} material={graphiteMat}>
        <boxGeometry args={[0.06, 3, 2.2]} />
      </mesh>
      {/* Thin vertical rails at the front corners */}
      {[-1.0, 1.0].map((rz, i) => (
        <mesh key={i} position={[sx * -0.34, 1.5, rz]} material={graphiteMat}>
          <boxGeometry args={[0.05, 3, 0.05]} />
        </mesh>
      ))}
      {/* Smoked-glass shelves + amber LED under the inner (front) edge */}
      {SHELF_YS.map((y, i) => (
        <group key={i}>
          <mesh position={[sx * -0.18, y, 0]} material={smokedGlassMat}>
            <boxGeometry args={[0.66, 0.03, 2.0]} />
          </mesh>
          <mesh position={[sx * -0.5, y - 0.03, 0]} material={amberMat}>
            <boxGeometry args={[0.02, 0.015, 1.9]} />
          </mesh>
        </group>
      ))}
      {/* Real sneakers on all three shelves (cycled across the models), angled
          toward the corridor. Each is now ~9–16k tris (down from ~90k), so the
          full 18 instances are affordable again — fuller, richer shelves. */}
      {SHELF_YS.map((y, i) => (
        <group
          key={i}
          position={[sx * -0.2, y + 0.015, (i - 1) * 0.62]}
          rotation={[0, sx > 0 ? -1.15 : 1.15, 0]}
        >
          <ModelOrFallback
            url={SHELF_SNEAKERS[(idx + i) % SHELF_SNEAKERS.length]}
            normalizeTo={0.42}
            seat="bottom"
            material={clayShelfMat}
            fallback={
              <mesh position={[0, 0.13, 0]} material={heroMat} scale={[1, 0.5, 0.4]}>
                <boxGeometry args={[0.42, 0.26, 0.2]} />
              </mesh>
            }
          />
        </group>
      ))}
    </group>
  )
}

// Procedural premium authentication station + floating verification card.
function AuthenticityCounter() {
  const cardRef = useRef<THREE.Group>(null)
  const sweepRef = useRef<THREE.Mesh>(null)
  const clock = useRef(0)

  useFrame((_, delta) => {
    clock.current += delta
    const t = clock.current
    if (cardRef.current) {
      cardRef.current.rotation.y = t * 0.4 // slow rotation
      cardRef.current.position.y = 1.35 + Math.sin(t * 1.2) * 0.05 // floats above the counter
    }
    if (sweepRef.current) {
      // Specular light sweep across the card face.
      const m = sweepRef.current.material as THREE.MeshStandardMaterial
      m.opacity = 0.15 + (Math.sin(t * 1.6) * 0.5 + 0.5) * 0.35
    }
  })

  return (
    <group position={[0, 0, -8]}>
      {/* Graphite counter body */}
      <mesh position={[0, 0.45, 0]} material={graphiteMat}>
        <boxGeometry args={[2.4, 0.9, 0.8]} />
      </mesh>
      {/* Smoked-glass top */}
      <mesh position={[0, 0.92, 0]} material={smokedGlassMat}>
        <boxGeometry args={[2.5, 0.04, 0.9]} />
      </mesh>
      {/* Warm amber LED edge along the front */}
      <mesh position={[0, 0.9, 0.46]} material={amberMat}>
        <boxGeometry args={[2.5, 0.02, 0.02]} />
      </mesh>
      {/* Verification scan bar — mint tech glow across the counter top, the
          self-lit signature that makes the station read as the focal point. */}
      <mesh position={[0, 0.945, 0]} material={mintMat}>
        <boxGeometry args={[2.0, 0.014, 0.025]} />
      </mesh>
      {/* Recessed verification tray */}
      <mesh position={[0.55, 0.94, 0.05]} material={metalMat}>
        <boxGeometry args={[0.62, 0.015, 0.42]} />
      </mesh>

      {/* Floating verification card — premium physical object */}
      <group ref={cardRef} position={[0, 1.35, 0.2]} scale={1.5}>
        {/* Soft backlight halo so the card reads as a glowing focal object. At
            2.6 under ACES tonemapping it glows warmly WITHOUT the white-blob
            blowout (ACES rolls the highlight off), and it now does more of the
            lifting since the IBL re-architecture cut the extra fill lights. */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[0.56, 0.42]} />
          <meshStandardMaterial color="#1A1714" emissive="#FFE0B0" emissiveIntensity={2.6} toneMapped={false} />
        </mesh>
        {/* Matte black base */}
        <mesh material={cardBaseMat}>
          <boxGeometry args={[0.42, 0.28, 0.02]} />
        </mesh>
        {/* Bone-white inset panel */}
        <mesh position={[0, 0, 0.012]} material={creamPanelMat}>
          <boxGeometry args={[0.34, 0.2, 0.004]} />
        </mesh>
        {/* Abstract checkmark from geometry (no text/QR/logo) */}
        <mesh position={[-0.04, -0.015, 0.018]} rotation={[0, 0, -0.7]} material={mintMat}>
          <boxGeometry args={[0.028, 0.085, 0.006]} />
        </mesh>
        <mesh position={[0.025, 0.02, 0.018]} rotation={[0, 0, 0.7]} material={mintMat}>
          <boxGeometry args={[0.028, 0.16, 0.006]} />
        </mesh>
        {/* Specular sweep highlight */}
        <mesh ref={sweepRef} position={[0.05, 0, 0.02]} rotation={[0, 0, 0.25]}>
          <boxGeometry args={[0.05, 0.34, 0.002]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={1} transparent opacity={0.25} />
        </mesh>
      </group>
    </group>
  )
}

function HeroDisplay() {
  const shoeGroupRef = useRef<THREE.Group>(null)
  const clock = useRef(0)
  const rotTarget = useRef(0)
  // Target the spotlight cone at the sneaker height.
  const spotTarget = useMemo(() => new THREE.Object3D(), [])

  useFrame((state, delta) => {
    clock.current += delta
    // Slow turntable drift PLUS a cursor nudge, eased — the hero feels alive and
    // responsive instead of running on a fixed timer.
    rotTarget.current = clock.current * 0.25 + state.pointer.x * 0.7
    if (shoeGroupRef.current) {
      const cur = shoeGroupRef.current.rotation.y
      const f = 1 - Math.exp(-6 * Math.min(delta, 0.1))
      shoeGroupRef.current.rotation.y = cur + (rotTarget.current - cur) * f
      shoeGroupRef.current.position.y = 1.3 + Math.sin(clock.current * 0.9) * 0.03
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Pedestal lighting: one tight warm cone — the only real product light
          needed now; IBL + the glowing ground halo fill the near side. */}
      <primitive object={spotTarget} position={[0, 1.28, 0]} />
      <spotLight
        position={[0, 3.7, 0.5]}
        target={spotTarget}
        angle={0.34}
        penumbra={0.8}
        intensity={30}
        distance={9}
        decay={2}
        color="#FFF6EC"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
        shadow-camera-near={0.5}
        shadow-camera-far={10}
      />
      {/* Glowing ground halo on the platform (blooms under the shoe) */}
      <mesh position={[0, 1.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.5, 64]} />
        <meshStandardMaterial
          color="#FFB366"
          emissive="#FFB366"
          emissiveIntensity={2.2}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Procedural plinth (premium, light — no GLB) */}
      <mesh position={[0, 0.04, 0]} material={plinithMat}>
        <cylinderGeometry args={[0.65, 0.65, 0.08, 48]} />
      </mesh>
      <mesh position={[0, 0.55, 0]} material={plinithMat}>
        <cylinderGeometry args={[0.2, 0.2, 0.9, 32]} />
      </mesh>
      <mesh position={[0, 1.0, 0]} material={metalMat} receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.04, 48]} />
      </mesh>
      <mesh position={[0, 1.03, 0]} material={goldMat}>
        <torusGeometry args={[0.5, 0.008, 8, 48]} />
      </mesh>

      {/* Hero sneaker — REAL optimized GLB, slow turntable + float.
          Fallback shape only shows if the GLB fails to load. */}
      <group ref={shoeGroupRef} position={[0, 1.3, 0]}>
        <ModelOrFallback
          url={ASSETS.heroSneaker}
          normalizeTo={0.92}
          seat="center"
          castShadow
          fallback={
            <mesh material={heroMat}>
              <torusKnotGeometry args={[0.28, 0.09, 128, 16, 2, 3]} />
            </mesh>
          }
        />
      </group>
    </group>
  )
}

// Procedural premium shoebox stack — matte black / bone-white / graphite,
// offset, with a thin amber accent line on the top box.
function ShoeboxStack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]} material={boxBlackMat}>
        <boxGeometry args={[0.55, 0.22, 0.34]} />
      </mesh>
      <mesh position={[0.04, 0.35, 0.02]} rotation={[0, 0.18, 0]} material={boxBoneMat}>
        <boxGeometry args={[0.55, 0.22, 0.34]} />
      </mesh>
      <mesh position={[-0.02, 0.58, -0.01]} rotation={[0, -0.12, 0]} material={graphiteMat}>
        <boxGeometry args={[0.55, 0.22, 0.34]} />
      </mesh>
      {/* Thin amber accent line on the top box */}
      <mesh position={[-0.02, 0.58, 0.16]} rotation={[0, -0.12, 0]} material={amberMat}>
        <boxGeometry args={[0.5, 0.015, 0.008]} />
      </mesh>
      {/* TODO: drop a brand logo decal here — add /public/brand-logos/<brand>.svg
          as a texture on a thin plane at z ~0.171 facing the corridor. Left blank
          intentionally; do not use AI-generated logos. */}
    </group>
  )
}

function DoorFrame() {
  return (
    <group position={[0, 0, 10]}>
      {/* Left pillar */}
      <mesh position={[-1.1, 1.75, 0]} material={metalMat}>
        <boxGeometry args={[0.12, 3.5, 0.12]} />
      </mesh>
      {/* Right pillar */}
      <mesh position={[1.1, 1.75, 0]} material={metalMat}>
        <boxGeometry args={[0.12, 3.5, 0.12]} />
      </mesh>
      {/* Header */}
      <mesh position={[0, 3.53, 0]} material={metalMat}>
        <boxGeometry args={[2.34, 0.12, 0.12]} />
      </mesh>
      {/* Glass panels */}
      <mesh position={[-0.55, 1.75, 0]} material={glassMat}>
        <planeGeometry args={[0.98, 3.26]} />
      </mesh>
      <mesh position={[0.55, 1.75, 0]} material={glassMat}>
        <planeGeometry args={[0.98, 3.26]} />
      </mesh>
      {/* Door sill gold strip */}
      <mesh position={[0, 0.04, 0]} material={goldMat}>
        <boxGeometry args={[2.22, 0.04, 0.12]} />
      </mesh>
    </group>
  )
}

// ─── Drop-wall feature display ──────────────────────────────────────────────
// The "New Drops" beat (0.50–0.65) framed an empty corridor centre. This is one
// feature element, offset from the x≈0 camera path so it fills the frame: a
// back-lit lightbox with a featured pair on a small lit plinth in front.
function DropFeature() {
  // Placeholder reserving x≈-1.6, z≈-5.2 for the Phase 2 live authentication
  // ticker (<AuthTicker/>). A slim graphite panel so the "New Drops" camera beat
  // frames an intentional object — not the old back-lit lightbox + GLB pair that
  // cluttered the shot, and not an empty corridor.
  return (
    <group position={[-1.6, 0, -5.2]}>
      <mesh position={[0, 1.4, 0]} material={cardBaseMat}>
        <boxGeometry args={[1.5, 2.4, 0.08]} />
      </mesh>
      {/* Thin amber accent edges define the panel against the dark wall without a
          hot light-box; the Phase 2 ticker is where real brightness belongs. */}
      <mesh position={[0, 2.56, 0.05]} material={amberMat}>
        <boxGeometry args={[1.5, 0.02, 0.01]} />
      </mesh>
      <mesh position={[0, 0.24, 0.05]} material={amberMat}>
        <boxGeometry args={[1.5, 0.02, 0.01]} />
      </mesh>
    </group>
  )
}

// ─── Brand corridor ─────────────────────────────────────────────────────────
// Free-standing illuminated brand totems. The corridor camera runs straight
// down the centre (x≈0) with a narrow forward view, so wall signs (x≈±5) fall
// outside frame — these sit near centre (x≈±1.5), alternating sides, facing the
// camera (+z). Marks are emissive + ACES-tonemapped so they read on their own —
// the IBL + bloom carry the glow, no per-totem real-time light needed.
function BrandTotem({
  position,
  tex,
}: {
  position: [number, number, number]
  tex: THREE.Texture
}) {
  return (
    <group position={position}>
      {/* Floor base + slim pylon */}
      <mesh position={[0, 0.04, 0]} material={plinithMat}>
        <cylinderGeometry args={[0.3, 0.34, 0.08, 24]} />
      </mesh>
      <mesh position={[0, 0.66, 0]} material={graphiteMat}>
        <boxGeometry args={[0.1, 1.24, 0.1]} />
      </mesh>
      {/* Dark backing panel */}
      <mesh position={[0, 1.4, 0]} material={cardBaseMat}>
        <boxGeometry args={[1.6, 1.12, 0.06]} />
      </mesh>
      {/* Amber frame edges (emissive, top + bottom) */}
      <mesh position={[0, 1.95, 0.032]} material={amberMat}>
        <boxGeometry args={[1.6, 0.03, 0.01]} />
      </mesh>
      <mesh position={[0, 0.85, 0.032]} material={amberMat}>
        <boxGeometry args={[1.6, 0.03, 0.01]} />
      </mesh>
      {/* The mark — emissive cream logo, reads without external light */}
      <mesh position={[0, 1.4, 0.045]}>
        <planeGeometry args={[1.05, 1.05]} />
        <meshStandardMaterial
          map={tex}
          transparent
          emissive="#F2EDE4"
          emissiveMap={tex}
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function BrandCorridor() {
  const [nike, adidas, puma, on] = useTexture([
    withBase('/brand-logos/nike.png'),
    withBase('/brand-logos/adidas.png'),
    withBase('/brand-logos/puma.png'),
    withBase('/brand-logos/on.png'),
  ])
  // Colour maps need sRGB so the cream reads true under emissive.
  for (const t of [nike, adidas, puma, on]) t.colorSpace = THREE.SRGBColorSpace
  return (
    <>
      <BrandTotem position={[-1.5, 0, -10.0]} tex={nike} />
      <BrandTotem position={[1.5, 0, -10.9]} tex={adidas} />
      <BrandTotem position={[-1.5, 0, -11.8]} tex={puma} />
      <BrandTotem position={[1.5, 0, -12.7]} tex={on} />
    </>
  )
}

// Slow-drifting dust motes catching the LED light — depth + life in the volume.
// ~320 additive points on a soft round sprite, recycled upward. Cheap (one draw
// call, a tiny per-frame y-bump) so it runs on both quality tiers.
function VaultParticles({ count = 320 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const { positions, texture } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 9
      positions[i * 3 + 1] = Math.random() * 3.4
      positions[i * 3 + 2] = -16 + Math.random() * 26
    }
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,238,206,1)')
    g.addColorStop(1, 'rgba(255,238,206,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    return { positions, texture: new THREE.CanvasTexture(c) }
  }, [count])

  useFrame((_, delta) => {
    const pts = ref.current
    if (!pts) return
    const arr = pts.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += delta * 0.06
      if (arr[i * 3 + 1] > 3.4) arr[i * 3 + 1] = 0
    }
    pts.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        map={texture}
        transparent
        opacity={0.18}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

export type QualityTier = 'high' | 'low'

interface VaultSceneProps {
  scrollProgress: React.MutableRefObject<number>
}

// The scene renders identically on both tiers (IBL + emissive + glossy floor);
// the quality ladder lives in VaultCanvas as DPR scaling.
export default function VaultScene({ scrollProgress }: VaultSceneProps) {
  const cameraTarget = useMemo(() => new THREE.Vector3(), [])
  const cameraPos = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useMemo(() => new THREE.Vector3(), [])
  const prevProgress = useRef(0)

  useFrame((state, delta) => {
    const p = Math.max(0, Math.min(1, scrollProgress.current))

    // Per-frame scroll delta — gate parallax during fast scroll so the camera
    // doesn't yaw toward the walls while the user is flicking through the vault.
    const scrollDelta = Math.abs(p - prevProgress.current)
    prevProgress.current = p

    CAMERA_PATH.getPoint(p, cameraPos)
    LOOK_PATH.getPoint(p, lookTarget)

    // Subtle mouse parallax — tightened (was 0.28/0.16) to stay premium and
    // never clip the walls; skipped entirely while scrolling fast.
    if (scrollDelta < 0.002) {
      cameraPos.x += state.pointer.x * 0.1
      cameraPos.y += state.pointer.y * 0.06
    }

    // Frame-rate-independent easing: same feel at 30fps or 120fps. Scroll
    // progress is already damped upstream, so this mainly smooths parallax.
    const f = 1 - Math.exp(-12 * Math.min(delta, 0.1))
    state.camera.position.lerp(cameraPos, f)
    cameraTarget.lerp(lookTarget, f)
    state.camera.lookAt(cameraTarget)
    // (LED "breathing" removed — the strips stay at a steady emissive so they
    // no longer flicker across the bloom threshold.)
  })

  return (
    <>
      {/* Fog */}
      <fog attach="fog" args={['#1A100A', 6, 26]} />

      {/* Baked image-based lighting — now the PRIMARY light source (the Awwwards
          approach). Rendered ONCE into a cubemap (frames={1}), so it lights every
          PBR surface AND feeds the glossy floor's reflections at ZERO per-frame
          cost. resolution 512 = cleaner reflections; the back-corridor formers
          keep the deep end (brands / membership) lit now that the real corridor
          fill lights are gone. NEVER raise frames — that re-bakes every frame. */}
      <Environment resolution={512} frames={1}>
        <Lightformer intensity={2.2} color="#FFB366" position={[0, 5, -4]} scale={[12, 1.5, 1]} />
        <Lightformer intensity={1.4} color="#FFF4E0" position={[0, 5, -9]} scale={[8, 1, 1]} />
        <Lightformer intensity={1} color="#6E8AB8" position={[0, 3, 13]} scale={[10, 4, 1]} />
        <Lightformer intensity={0.8} color="#BFA06A" form="ring" position={[0, 2, 1]} scale={2} />
        {/* Back-corridor fills (brands ≈ z-10…-12, membership ≈ z-15) — pumped
            up since they now light the deep end on their own (no real fill lights). */}
        <Lightformer intensity={2.4} color="#FFB366" position={[0, 4, -12]} scale={[10, 1.5, 1]} />
        <Lightformer intensity={1.8} color="#FF8C4A" position={[0, 2.5, -15]} scale={[8, 2, 1]} />
        <Lightformer intensity={1.3} color="#C9A36A" form="ring" position={[0, 2, -11]} scale={3} />
      </Environment>

      {/* Lighting — Awwwards-style IBL-first. The baked <Environment> + the
          emissive LED strips / amber / mint / brand marks carry the ambient mood
          and the floor reflections, so only FOUR real-time point/spot lights
          remain (the ones IBL can't fake: the product cone in HeroDisplay, the
          entrance glow, one widened corridor accent, and the counter focal).
          Identical on both tiers — now cheap enough that the quality ladder
          scales only DPR + premium post, not lights. ambient + directional stay
          (constant / no per-fragment attenuation = nearly free) for global fill. */}
      <ambientLight intensity={0.22} />
      <directionalLight position={[3, 6, 14]} intensity={0.5} color="#6E8AB8" />
      {/* Warm amber glow leaking out through the glass door / entrance */}
      <pointLight position={[0, 2.3, 8]} intensity={9} color="#FFB366" distance={10} decay={2} />
      {/* Warm mid/back corridor accent — distance widened (10→16) to reach the
          deep corridor now that the end-of-store fill lights are gone. */}
      <pointLight position={[0, 2.2, -8.2]} intensity={3.4} color="#C9A36A" distance={16} decay={2} />
      {/* Dedicated counter + verification-card focal glow */}
      <pointLight position={[0, 1.85, -7.5]} intensity={9} color="#FFD9A6" distance={6} decay={2} />

      {/* Floor — a SINGLE glossy PBR floor on both tiers (floorMat: metalness
          0.9 / roughness 0.22). It mirrors the baked Environment (warm
          lightformers + emissive signs) for a luxury-showroom reflection WITHOUT
          the per-frame full-scene re-render the old MeshReflectorMaterial forced
          — that second render every frame on scroll was the main FPS killer. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -5]} material={floorMat}>
        <planeGeometry args={[12, 36]} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-5.5, 2, -5]} rotation={[0, Math.PI / 2, 0]} material={wallMat}>
        <planeGeometry args={[36, 5]} />
      </mesh>

      {/* Right wall */}
      <mesh position={[5.5, 2, -5]} rotation={[0, -Math.PI / 2, 0]} material={wallMat}>
        <planeGeometry args={[36, 5]} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 2, -18]} material={wallMat}>
        <planeGeometry args={[12, 5]} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.5, -5]} material={wallMat}>
        <planeGeometry args={[12, 36]} />
      </mesh>

      {/* Ceiling LED strips */}
      <CeilingStrips />

      {/* Vertical wall accent strips for corridor depth */}
      <WallStrips />

      {/* Door frame at entrance */}
      <DoorFrame />

      {/* Hero display table */}
      <HeroDisplay />

      {/* Shelf modules — left side */}
      <ShelfModule x={-4.5} z={-3} idx={0} />
      <ShelfModule x={-4.5} z={-6} idx={3} />
      <ShelfModule x={-4.5} z={-9} idx={0} />

      {/* Shelf modules — right side */}
      <ShelfModule x={4.5} z={-3} idx={2} />
      <ShelfModule x={4.5} z={-6} idx={5} />
      <ShelfModule x={4.5} z={-9} idx={1} />

      {/* Drop-wall feature display (the "New Drops" focal element) */}
      <DropFeature />

      {/* Authenticity counter */}
      <AuthenticityCounter />

      {/* Shoebox stacks flanking the counter (moved with it to z≈-8) */}
      <ShoeboxStack position={[-1.6, 0, -7.9]} />
      <ShoeboxStack position={[1.7, 0, -8.1]} />

      {/* Brand corridor — illuminated brand totems (Nike / Adidas / Puma / ON) */}
      <BrandCorridor />

      {/* Drifting dust motes */}
      <VaultParticles />

      {/* Cinematic post. The Canvas renders linear HDR (flat), bloom blooms only
          the brightest emissives in HDR, then ToneMapping (ACES Filmic) maps the
          frame to display ONCE at the end — giving every emissive + reflection a
          filmic highlight rolloff (premium, and it tames blowouts gracefully
          instead of clipping to white). Vignette focuses the frame. */}
      <EffectComposer multisampling={0}>
        <Bloom
          mipmapBlur
          intensity={0.7}
          luminanceThreshold={0.75}
          luminanceSmoothing={0.32}
        />
        <Vignette offset={0.3} darkness={0.8} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}
