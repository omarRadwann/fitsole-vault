'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial, useTexture } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing'
import * as THREE from 'three'
import ModelOrFallback from '@/components/three/ModelOrFallback'
import { ASSETS, SHELF_SNEAKERS } from '@/lib/assets'
import { withBase } from '@/lib/basePath'

const CAMERA_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 1.8, 12),
  new THREE.Vector3(0, 1.5, 8),
  new THREE.Vector3(0, 1.3, 4),
  new THREE.Vector3(0, 1.1, 0.5),
  new THREE.Vector3(0, 1.0, -3),
  new THREE.Vector3(0, 1.0, -6.5),
  new THREE.Vector3(0, 1.0, -9.5),
  new THREE.Vector3(0, 1.1, -12),
])

const LOOK_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0.8, 6),
  new THREE.Vector3(0, 0.8, 4),
  new THREE.Vector3(0, 0.8, 0),
  new THREE.Vector3(0, 0.9, -1),
  // Back half raised toward eye level. The gaze used to drop to y=0.6 and stare
  // at the corridor floor (the "empty brown gradient" the audit saw); levelling
  // it frames the counter, the brand totems and the drop feature instead.
  new THREE.Vector3(0, 0.92, -4),
  // Authenticity beat dips toward the verification counter (z≈-8, low) so it
  // reads as the centrepiece instead of the brand totems further down the hall.
  new THREE.Vector3(0, 0.78, -8),
  new THREE.Vector3(0, 1.0, -10),
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
  color: '#E8E1D3',
  roughness: 0.6,
  metalness: 0.0,
})
// Dark glossy retail floor. High metalness + low roughness picks up the baked
// Environment map as a warm sheen — a premium reflection at ~zero per-frame
// cost (vs MeshReflectorMaterial, which re-rendered the whole scene each frame).
const floorMat = new THREE.MeshStandardMaterial({
  color: '#0E0B08',
  roughness: 0.32,
  metalness: 0.72,
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
        {/* Soft backlight halo so the card always reads as a glowing focal
            object, even on the low tier (no counter spot light there). */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[0.56, 0.42]} />
          <meshStandardMaterial color="#1A1714" emissive="#FFE0B0" emissiveIntensity={2.8} toneMapped={false} />
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
  // Target the spotlight cone at the sneaker height.
  const spotTarget = useMemo(() => new THREE.Object3D(), [])

  useFrame((_, delta) => {
    clock.current += delta
    if (shoeGroupRef.current) {
      // Slow premium turntable rotation + subtle float above the pedestal.
      shoeGroupRef.current.rotation.y = clock.current * 0.25
      shoeGroupRef.current.position.y = 1.3 + Math.sin(clock.current * 0.9) * 0.03
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Pedestal lighting: tight warm cone, cool rim, glowing ground halo. */}
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
      />
      {/* Cool rim light separates the product from the dark interior.
          (Warm front fill removed — the scene key light + raised ambient + the
          Environment keep the sneaker's near side lit, at one fewer light.) */}
      <pointLight position={[0, 1.5, -1.3]} intensity={4.5} distance={3.5} decay={2} color="#7FA0D0" />
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
      <mesh position={[0, 1.0, 0]} material={metalMat}>
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
function DropFeature({ highTier }: { highTier: boolean }) {
  return (
    <group position={[-1.6, 0, -5.2]}>
      {/* Tall dark housing */}
      <mesh position={[0, 1.5, -0.06]} material={cardBaseMat}>
        <boxGeometry args={[1.7, 2.7, 0.1]} />
      </mesh>
      {/* Soft back-lit panel face — kept gentle so it reads as a glow, not a
          flare, and never steals focus from the front-half hero behind it. */}
      <mesh position={[0, 1.5, 0]}>
        <planeGeometry args={[1.46, 2.42]} />
        <meshStandardMaterial color="#241910" emissive="#FFB366" emissiveIntensity={0.25} toneMapped={false} />
      </mesh>
      {/* Gold frame top + bottom */}
      <mesh position={[0, 2.78, 0.02]} material={goldMat}>
        <boxGeometry args={[1.72, 0.05, 0.04]} />
      </mesh>
      <mesh position={[0, 0.22, 0.02]} material={goldMat}>
        <boxGeometry args={[1.72, 0.05, 0.04]} />
      </mesh>
      {/* Featured pair on a small plinth, in front of the panel, facing camera */}
      <mesh position={[0, 0.18, 0.62]} material={plinithMat}>
        <cylinderGeometry args={[0.42, 0.46, 0.36, 32]} />
      </mesh>
      <group position={[0, 0.37, 0.62]} rotation={[0, 0.6, 0]}>
        <ModelOrFallback
          url={SHELF_SNEAKERS[1]}
          normalizeTo={0.62}
          seat="bottom"
          fallback={
            <mesh position={[0, 0.12, 0]} material={heroMat}>
              <boxGeometry args={[0.5, 0.24, 0.2]} />
            </mesh>
          }
        />
      </group>
      {/* Warm halo ring under the featured pair */}
      <mesh position={[0, 0.375, 0.62]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.42, 48]} />
        <meshStandardMaterial color="#FFB366" emissive="#FFB366" emissiveIntensity={1.1} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      {highTier && (
        <pointLight position={[0.3, 1.7, 1.1]} intensity={4} color="#FFE0B8" distance={4} decay={2} />
      )}
    </group>
  )
}

// ─── Brand corridor ─────────────────────────────────────────────────────────
// Free-standing illuminated brand totems. The corridor camera runs straight
// down the centre (x≈0) with a narrow forward view, so wall signs (x≈±5) fall
// outside frame — these sit near centre (x≈±1.5), alternating sides, facing the
// camera (+z). Marks are emissive (readable on every tier); a soft wash light
// per totem is added only on the high tier.
function BrandTotem({
  position,
  tex,
  highTier,
}: {
  position: [number, number, number]
  tex: THREE.Texture
  highTier: boolean
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
      {highTier && (
        <pointLight position={[0, 1.4, 0.8]} intensity={2.4} color="#C9A36A" distance={3.2} decay={2} />
      )}
    </group>
  )
}

function BrandCorridor({ highTier }: { highTier: boolean }) {
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
      <BrandTotem position={[-1.5, 0, -10.0]} tex={nike} highTier={highTier} />
      <BrandTotem position={[1.5, 0, -10.9]} tex={adidas} highTier={highTier} />
      <BrandTotem position={[-1.5, 0, -11.8]} tex={puma} highTier={highTier} />
      <BrandTotem position={[1.5, 0, -12.7]} tex={on} highTier={highTier} />
    </>
  )
}

export type QualityTier = 'high' | 'low'

interface VaultSceneProps {
  scrollProgress: React.MutableRefObject<number>
  tier?: QualityTier
}

export default function VaultScene({ scrollProgress, tier = 'high' }: VaultSceneProps) {
  const cameraTarget = useMemo(() => new THREE.Vector3(), [])
  const cameraPos = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, delta) => {
    const p = Math.max(0, Math.min(1, scrollProgress.current))

    CAMERA_PATH.getPoint(p, cameraPos)
    LOOK_PATH.getPoint(p, lookTarget)

    // Subtle mouse parallax — premium, alive, never nauseating.
    cameraPos.x += state.pointer.x * 0.28
    cameraPos.y += state.pointer.y * 0.16

    // Frame-rate-independent easing: same feel at 30fps or 120fps. Scroll
    // progress is already damped upstream, so this mainly smooths parallax.
    const f = 1 - Math.exp(-12 * Math.min(delta, 0.1))
    state.camera.position.lerp(cameraPos, f)
    cameraTarget.lerp(lookTarget, f)
    state.camera.lookAt(cameraTarget)

    // Gentle LED breathing on the store strips.
    const t = state.clock.elapsedTime
    stripMat.emissiveIntensity = 1.3 + Math.sin(t * 1.6) * 0.2
  })

  return (
    <>
      {/* Fog */}
      <fog attach="fog" args={['#090806', 10, 35]} />

      {/* Baked environment for warm metal/gold reflections (no CDN, baked once) */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2.2} color="#FFB366" position={[0, 5, -4]} scale={[12, 1.5, 1]} />
        <Lightformer intensity={1.4} color="#FFF4E0" position={[0, 5, -9]} scale={[8, 1, 1]} />
        <Lightformer intensity={1} color="#6E8AB8" position={[0, 3, 13]} scale={[10, 4, 1]} />
        <Lightformer intensity={0.8} color="#BFA06A" form="ring" position={[0, 2, 1]} scale={2} />
      </Environment>

      {/* Lighting — trimmed to the essentials for weak-GPU performance. The
          baked Environment + emissive LED strips / amber / halo carry the
          ambient mood, so a slightly higher ambient compensates for the cut fills. */}
      <ambientLight intensity={0.2} />

      {/* Cool moonlight rim on the storefront exterior (Cairo night) */}
      <directionalLight position={[3, 6, 14]} intensity={0.5} color="#6E8AB8" />
      {/* Warm amber glow leaking out through the glass door / entrance */}
      <pointLight position={[0, 2.3, 8]} intensity={9} color="#FFB366" distance={10} decay={2} />
      {/* Key light on the hero display */}
      <pointLight position={[0, 3.8, 1]} intensity={11} color="#FFF8F0" distance={8} decay={2} />
      {/* Warm mid/back corridor accent (centred on the relocated counter z≈-8) */}
      <pointLight position={[0, 2.2, -8.2]} intensity={3.4} color="#C9A36A" distance={10} decay={2} />
      {/* Dedicated counter + verification-card focal glow — BOTH tiers, so the
          authenticity centrepiece never goes dark on weak GPUs (the low tier). */}
      <pointLight position={[0, 1.85, -7.5]} intensity={9} color="#FFD9A6" distance={6} decay={2} />

      {/* Extra warmth + depth on capable devices — the counter glow, the
          end-of-store amber, and a soft ceiling wash that made it feel alive. */}
      {tier === 'high' && (
        <>
          <pointLight position={[0, 2, -8]} intensity={3} color="#BFA06A" distance={5} decay={2} />
          <pointLight position={[0, 2, -11]} intensity={3} color="#FF8C4A" distance={6} decay={2} />
          <pointLight position={[0, 3, -4]} intensity={1.2} color="#FFF4E0" distance={8} decay={2} />
        </>
      )}

      {/* Floor — capable devices get a real (low-res) reflective floor for the
          premium mirrored look; weak devices get the cheap glossy material that
          reflects only the baked Environment (no per-frame reflection pass). */}
      {tier === 'high' ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -5]}>
          <planeGeometry args={[12, 36]} />
          <MeshReflectorMaterial
            resolution={256}
            blur={[200, 60]}
            mixBlur={1}
            mixStrength={1.4}
            roughness={0.7}
            depthScale={1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            color="#0E0B08"
            metalness={0.5}
          />
        </mesh>
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -5]} material={floorMat}>
          <planeGeometry args={[12, 36]} />
        </mesh>
      )}

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
      <DropFeature highTier={tier === 'high'} />

      {/* Authenticity counter */}
      <AuthenticityCounter />

      {/* Shoebox stacks flanking the counter (moved with it to z≈-8) */}
      <ShoeboxStack position={[-1.6, 0, -7.9]} />
      <ShoeboxStack position={[1.7, 0, -8.1]} />

      {/* Brand corridor — illuminated brand totems (Nike / Adidas / Puma / ON) */}
      <BrandCorridor highTier={tier === 'high'} />

      {/* Subtle floor reflection stripe */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} material={goldMat}>
        <planeGeometry args={[0.02, 30]} />
      </mesh>

      {/* Cinematic post: bloom on emissive LEDs/scan/gold + vignette focus.
          multisampling={0} disables the composer's expensive MSAA (big GPU win
          on integrated chips); a higher bloom threshold blooms only the truly
          bright emissives, which is also a touch cheaper and cleaner. */}
      <EffectComposer multisampling={0}>
        <Bloom
          mipmapBlur
          intensity={0.95}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.32}
        />
        <Vignette offset={0.3} darkness={0.8} />
        {/* Cheap post-process antialiasing — cleans jagged edges that show at
            lower DPR, without the cost of MSAA (multisampling stays 0). */}
        <SMAA />
      </EffectComposer>
    </>
  )
}
