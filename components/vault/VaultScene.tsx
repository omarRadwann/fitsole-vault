'use client'

import { useRef, useMemo, useLayoutEffect, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox, useGLTF, useTexture, useVideoTexture } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import ModelOrFallback, { AssetErrorBoundary } from '@/components/three/ModelOrFallback'
import { ASSETS, SHELF_SNEAKERS } from '@/lib/assets'
import { withBase } from '@/lib/basePath'
import { audioEngine } from '@/lib/audioEngine'

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
  new THREE.Vector3(0, 1.38, 2.0),    // hero: shot at the shoe's height + pulled back, so we see the side profile (not the sole) and it isn't cut off
  new THREE.Vector3(-0.25, 1.05, -3), // gentle drift left toward the drop feature
  new THREE.Vector3(0, 1.0, -6.5),    // re-centre, approach the counter (z=-8)
  new THREE.Vector3(0.2, 1.05, -9.5), // gentle drift right into the brand corridor
  new THREE.Vector3(0, 1.1, -12),     // exit deeper down the hall
])

const LOOK_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 1.0, 6),       // look straight down the corridor
  new THREE.Vector3(0, 1.0, 3),
  new THREE.Vector3(0, 1.0, 0),
  new THREE.Vector3(0, 1.26, -0.5),   // hero: look UP at the shoe's profile (raised from 1.05 — was looking under it at the sole)
  new THREE.Vector3(-0.8, 1.0, -5),   // soft glance left at the drop feature / Phase-2 ticker
  new THREE.Vector3(0, 0.82, -8),     // dip to the verification counter
  new THREE.Vector3(0, 1.0, -10.5),   // brand corridor
  new THREE.Vector3(0, 1.05, -16),    // exit: look DOWN the hall toward the back-wall halo
                                      // (was -12 — sat on the camera, a degenerate
                                      // straight-down stare that left the exit an empty void)
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
// Machined dark metal — graphite's colour but far more specular, so chamfered
// edges catch the baked IBL and read as milled metal instead of a flat matte box.
const machinedMat = new THREE.MeshStandardMaterial({
  color: '#2B2723',
  roughness: 0.2,
  metalness: 0.95,
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
// Brass library — warm brushed brass, one source so it reads consistently across
// the hero plinth, the auth-beat plaque, and (later) the sky-moment cube.
const brassMat = new THREE.MeshStandardMaterial({
  color: '#C9A36A',
  roughness: 0.33,
  metalness: 0.9,
})
// Polished near-black marble for the plinth column — low roughness picks up the
// warm baked Environment as a stone sheen (same trick as floorMat).
const marbleMat = new THREE.MeshStandardMaterial({
  color: '#14110E',
  roughness: 0.16,
  metalness: 0.1,
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

function ShelfModule({ x, z }: { x: number; z: number }) {
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
      {/* The sneakers themselves are rendered by <ShelfShoes/> — one InstancedMesh
          per unique model (6 draws for all 18 placements). Placements come from
          SHELF_MODULES below, so furniture and shoes can never drift apart. */}
    </group>
  )
}

// The six shelf modules: left wall (x<0) and right wall (x>0), three depths each.
// `idx` offsets which of the 6 models each module's three shelves cycle from.
// Single source of truth for BOTH the furniture (ShelfModule) and the instanced
// shoes (ShelfShoes).
const SHELF_MODULES = [
  { x: -4.5, z: -3, idx: 0 },
  { x: -4.5, z: -6, idx: 3 },
  { x: -4.5, z: -9, idx: 0 },
  { x: 4.5, z: -3, idx: 2 },
  { x: 4.5, z: -6, idx: 5 },
  { x: 4.5, z: -9, idx: 1 },
] as const

// Instanced shelf sneakers. Each unique GLB is normalized + seated ONCE (the
// exact normalizeTo=0.42 / seat="bottom" math ModelOrFallback used) and baked
// into a geometry, then drawn at every placement via a single InstancedMesh —
// so 18 cloned primitives (~250 extra scene nodes + 18 draw calls) collapse to
// 6 instanced draws. The shelf GLBs are single-mesh/single-material (verified
// via gltf-transform), which makes the single-mesh extraction below exact.
function ShelfShoes() {
  // Spread the readonly SHELF_SNEAKERS tuple into a mutable string[] — useGLTF's
  // array overload wants a mutable Path[].
  const gltfs = useGLTF([...SHELF_SNEAKERS] as string[]) as unknown as {
    scene: THREE.Object3D
  }[]
  const refs = useRef<(THREE.InstancedMesh | null)[]>([])

  const models = useMemo(() => {
    // Group placement matrices by model index. Each placement = T(worldPos)·Ry(yaw);
    // the baked geometry is centred on x/z and seated at y=0, so this reproduces
    // the old per-shoe <group position rotation> exactly.
    const matricesByModel: THREE.Matrix4[][] = SHELF_SNEAKERS.map(() => [])
    for (const { x, z, idx } of SHELF_MODULES) {
      const sx = x > 0 ? 1 : -1
      const yaw = sx > 0 ? -1.15 : 1.15
      SHELF_YS.forEach((y, i) => {
        const mi = (idx + i) % SHELF_SNEAKERS.length
        const m = new THREE.Matrix4().makeRotationY(yaw)
        m.setPosition(x + sx * -0.2, y + 0.015, z + (i - 1) * 0.62)
        matricesByModel[mi].push(m)
      })
    }

    return gltfs.map((gltf, mi) => {
      const clone = gltf.scene.clone(true)
      const box = new THREE.Box3().setFromObject(clone)
      const size = new THREE.Vector3()
      box.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      if (maxDim > 0) clone.scale.setScalar(0.42 / maxDim)
      const box2 = new THREE.Box3().setFromObject(clone)
      const center = new THREE.Vector3()
      box2.getCenter(center)
      clone.position.x -= center.x
      clone.position.z -= center.z
      clone.position.y -= box2.min.y
      clone.updateWorldMatrix(true, true)
      // Bake the normalize into a geometry clone; reuse the GLB's own material.
      let mesh: THREE.Mesh | undefined
      clone.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && !mesh) mesh = o as THREE.Mesh
      })
      const geometry = mesh!.geometry.clone()
      geometry.applyMatrix4(mesh!.matrixWorld)
      return {
        geometry,
        material: mesh!.material as THREE.Material,
        matrices: matricesByModel[mi],
      }
    })
  }, [gltfs])

  useLayoutEffect(() => {
    models.forEach((model, mi) => {
      const inst = refs.current[mi]
      if (!inst) return
      model.matrices.forEach((m, k) => inst.setMatrixAt(k, m))
      inst.instanceMatrix.needsUpdate = true
    })
  }, [models])

  return (
    <>
      {models.map((model, mi) => (
        <instancedMesh
          key={mi}
          ref={(el) => {
            refs.current[mi] = el
          }}
          args={[model.geometry, model.material, model.matrices.length]}
          // The instances span the whole corridor; cull them as a group via the
          // frameloop gate, not per-instance (origin-based culling pops shoes).
          frustumCulled={false}
        />
      ))}
    </>
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
      {/* Machined counter body — chamfered + brushed metal so it reads as milled
          millwork catching the warm IBL, not a flat matte slab. */}
      <RoundedBox
        args={[2.4, 0.9, 0.8]}
        radius={0.04}
        smoothness={4}
        position={[0, 0.45, 0]}
        material={machinedMat}
      />
      {/* Warm under-counter wash near the floor → reads as a lit, floating fixture
          rather than a box on the ground. */}
      <mesh position={[0, 0.07, 0.36]} material={amberMat}>
        <boxGeometry args={[2.14, 0.012, 0.012]} />
      </mesh>
      {/* Smoked-glass top — chamfered edge catches a thin highlight */}
      <RoundedBox
        args={[2.5, 0.05, 0.9]}
        radius={0.018}
        smoothness={3}
        position={[0, 0.92, 0]}
        material={smokedGlassMat}
      />
      {/* Brushed-metal reveal line tucked under the glass lip */}
      <mesh position={[0, 0.885, 0.44]} material={machinedMat}>
        <boxGeometry args={[2.46, 0.022, 0.02]} />
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
        {/* Soft backlight halo so the card reads as a glowing focal object.
            NOTE: this must stay tone-mapped — `toneMapped={false}` bypassed ACES
            and clipped the card to a white blob. Through ACES at 2.0 it glows
            warmly and rolls off instead of blowing out. */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[0.56, 0.42]} />
          <meshStandardMaterial color="#1A1714" emissive="#FFE0B0" emissiveIntensity={2.0} />
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

// Turned profiles for the sculpted brass plinth (revolved via LatheGeometry):
// radius (x) vs height (y), bottom→top. ~9 pts × 48 segments each = very light.
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

function HeroDisplay() {
  const shoeGroupRef = useRef<THREE.Group>(null)
  const sigilRef = useRef<THREE.Group>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const clock = useRef(0)
  const rotTarget = useRef(0)
  // Target the spotlight cone at the sneaker height.
  const spotTarget = useMemo(() => new THREE.Object3D(), [])

  // Etched FitSole sigil for the brass cap. A white base map (→ full brass) with
  // a darker engraved ring + F the material multiplies down into the metal.
  const sigilTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = '#7a5f30'
    ctx.lineWidth = 5
    ctx.beginPath(); ctx.arc(128, 128, 98, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(128, 128, 86, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = '#5e4824'
    ctx.font = 'bold 132px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('F', 128, 142)
    const t = new THREE.CanvasTexture(c)
    t.anisotropy = 4
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])

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
      // The etched sigil turns WITH the pair.
      if (sigilRef.current) sigilRef.current.rotation.y = shoeGroupRef.current.rotation.y
    }
    // Halo: slow specular-style shimmer (~4s) + an audio-reactive pulse on the
    // beat (ACES rolls the peaks off, so it glows brighter without clipping).
    if (haloRef.current) {
      const m = haloRef.current.material as THREE.MeshStandardMaterial
      m.emissiveIntensity =
        2.0 + Math.sin((clock.current * Math.PI * 2) / 4) * 0.6 + audioEngine.getLevel() * 0.9
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
        intensity={20}
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
      <mesh ref={haloRef} position={[0, 1.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.5, 64]} />
        <meshStandardMaterial
          color="#FFB366"
          emissive="#FFB366"
          emissiveIntensity={2.0}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Sculpted brass plinth: turned brass base + slim black-marble column +
          brass capital + an etched sigil cap that turns with the pair. */}
      <mesh material={brassMat} castShadow>
        <latheGeometry args={[PLINTH_BASE, 48]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={marbleMat}>
        <cylinderGeometry args={[0.165, 0.17, 0.68, 48]} />
      </mesh>
      <mesh material={brassMat} receiveShadow>
        <latheGeometry args={[PLINTH_CAPITAL, 48]} />
      </mesh>
      <group ref={sigilRef} position={[0, 1.031, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.4, 64]} />
          <meshStandardMaterial map={sigilTex} color="#C9A36A" metalness={0.85} roughness={0.42} />
        </mesh>
      </group>

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
      <RoundedBox args={[0.55, 0.22, 0.34]} radius={0.014} smoothness={2} position={[0, 0.12, 0]} material={boxBlackMat} />
      <RoundedBox args={[0.55, 0.22, 0.34]} radius={0.014} smoothness={2} position={[0.04, 0.35, 0.02]} rotation={[0, 0.18, 0]} material={boxBoneMat} />
      <RoundedBox args={[0.55, 0.22, 0.34]} radius={0.014} smoothness={2} position={[-0.02, 0.58, -0.01]} rotation={[0, -0.12, 0]} material={graphiteMat} />
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
      {/* Chamfered metal door frame — pillars + header read as milled, not boxy */}
      <RoundedBox position={[-1.1, 1.75, 0]} args={[0.12, 3.5, 0.12]} radius={0.025} smoothness={3} material={metalMat} />
      <RoundedBox position={[1.1, 1.75, 0]} args={[0.12, 3.5, 0.12]} radius={0.025} smoothness={3} material={metalMat} />
      <RoundedBox position={[0, 3.53, 0]} args={[2.34, 0.12, 0.12]} radius={0.025} smoothness={3} material={metalMat} />
      {/* Glass panels */}
      <mesh position={[-0.55, 1.75, 0]} material={glassMat}>
        <planeGeometry args={[0.98, 3.26]} />
      </mesh>
      <mesh position={[0.55, 1.75, 0]} material={glassMat}>
        <planeGeometry args={[0.98, 3.26]} />
      </mesh>
      {/* Door sill gold strip (chamfered) */}
      <RoundedBox position={[0, 0.04, 0]} args={[2.22, 0.04, 0.12]} radius={0.015} smoothness={2} material={goldMat} />
    </group>
  )
}

// ─── Drop-wall video display ────────────────────────────────────────────────
// The "New Drops" beat glances left to x≈-1.6, z≈-5.2 (LOOK_PATH ~p0.45–0.55).
// A premium wall-mounted 16:9 display lives here playing the cinematic AE1
// unboxing (Nano Banana 2 -> Kling) — the video fused INTO the WebGL, with
// playback gated to the scroll beat so the motion arrives as the camera turns
// to it (the "Locomotive Scroll Sequence" pattern). Self-lit (toneMapped off)
// so it reads as a real emitting screen, framed by a graphite bezel + amber edges.
// The featured drop film renders 1:1, so the display is square — and enlarged so
// it reads as a bold cinematic in-vault screen rather than a small side panel.
const SCREEN_W = 1.8
const SCREEN_H = SCREEN_W // 1:1
const BEZEL_W = SCREEN_W + 0.08 // thin, modern-display bezel (was 0.16 — too chunky)
const BEZEL_H = SCREEN_H + 0.08

// Soft warm radial glow used as a backlight halo behind a lit wall panel, so the
// display reads as EMITTING light + lifted off the wall — not a dark box stuck on
// it. One canvas texture, reused; cheap.
function makeGlowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,206,150,0.85)')
  g.addColorStop(0.5, 'rgba(255,176,108,0.3)')
  g.addColorStop(1, 'rgba(255,168,100,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

// Static bezel — also the Suspense fallback while the video texture's metadata
// loads, so a buffering video NEVER blanks the vault. Its OWN Suspense boundary
// keeps the rest of the scene painted (the audit's black-void fix stays intact).
function DropWallBezel({ screen }: { screen?: boolean }) {
  return (
    <>
      {/* Chamfered brushed-metal bezel — a milled frame that catches the IBL,
          not a flat matte slab. */}
      <RoundedBox position={[0, 1.4, 0]} args={[BEZEL_W, BEZEL_H, 0.08]} radius={0.025} smoothness={3} material={machinedMat} />
      {/* Dark screen well so the fallback doesn't look like a blank slab */}
      {!screen && (
        <mesh position={[0, 1.4, 0.043]} material={cardBaseMat}>
          <boxGeometry args={[SCREEN_W, SCREEN_H, 0.005]} />
        </mesh>
      )}
      {/* Warm edge-light framing all four sides → reads as a backlit panel */}
      <mesh position={[0, 1.4 + BEZEL_H / 2 - 0.015, 0.05]} material={amberMat}>
        <boxGeometry args={[BEZEL_W, 0.016, 0.01]} />
      </mesh>
      <mesh position={[0, 1.4 - BEZEL_H / 2 + 0.015, 0.05]} material={amberMat}>
        <boxGeometry args={[BEZEL_W, 0.016, 0.01]} />
      </mesh>
      <mesh position={[-BEZEL_W / 2 + 0.015, 1.4, 0.05]} material={amberMat}>
        <boxGeometry args={[0.016, BEZEL_H, 0.01]} />
      </mesh>
      <mesh position={[BEZEL_W / 2 - 0.015, 1.4, 0.05]} material={amberMat}>
        <boxGeometry args={[0.016, BEZEL_H, 0.01]} />
      </mesh>
    </>
  )
}

function VaultVideoScreen({
  scrollProgress,
}: {
  scrollProgress: React.MutableRefObject<number>
}) {
  const tex = useVideoTexture(withBase('/video/ae1-vault.mp4'), {
    start: false,
    muted: true,
    loop: true,
    playsInline: true,
  })
  tex.colorSpace = THREE.SRGBColorSpace
  const playing = useRef(false)
  const videoMatRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(() => {
    const vid = tex.image as HTMLVideoElement | undefined
    if (!vid) return
    const p = scrollProgress.current
    // Gate to "visible enough to matter": the wall sits in frame roughly
    // 0.30–0.62 of the walk. Play (looping) across that window so the motion is
    // already alive when the camera turns to it; pause outside it to free decode.
    const shouldPlay = p > 0.3 && p < 0.62
    if (shouldPlay && !playing.current) {
      playing.current = true
      vid.play().catch(() => {})
    } else if (!shouldPlay && playing.current) {
      playing.current = false
      vid.pause()
    }
    // Cross-fade the video in over the poster once it has real frames.
    if (videoMatRef.current) {
      const ready = vid.readyState >= 2 && vid.videoWidth > 0
      videoMatRef.current.opacity += ((ready ? 1 : 0) - videoMatRef.current.opacity) * 0.08
    }
  })

  // transparent + depthWrite:false so the invisible plane never occludes the
  // poster behind it before the video has faded in.
  return (
    <mesh position={[0, 1.4, 0.047]}>
      <planeGeometry args={[SCREEN_W, SCREEN_H]} />
      <meshBasicMaterial
        ref={videoMatRef}
        map={tex}
        toneMapped={false}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )
}

// Poster still (the loop's anchor frame) in its OWN component, so it paints the
// screen even if the video never resolves — a CDN 503, the initial load gap, or
// a tab that won't decode media. The video plane fades in over it when ready.
function PosterScreen() {
  const poster = useTexture(withBase('/video/ae1-vault.webp'))
  poster.colorSpace = THREE.SRGBColorSpace
  return (
    <mesh position={[0, 1.4, 0.045]}>
      <planeGeometry args={[SCREEN_W, SCREEN_H]} />
      <meshBasicMaterial map={poster} toneMapped={false} />
    </mesh>
  )
}

function DropFeature({
  scrollProgress,
}: {
  scrollProgress: React.MutableRefObject<number>
}) {
  // Yawed toward the centre aisle so the screen faces the glancing camera. Bezel
  // + poster always render; the video has its OWN boundary so a stalled / 503'd
  // mp4 can never blank the screen — the poster stays painted.
  const glowTex = useMemo(() => makeGlowTexture(), [])
  return (
    <group position={[-1.6, 0, -5.2]} rotation={[0, 0.4, 0]}>
      {/* Soft warm backlight halo so the display reads as a lit panel lifted off
          the wall, even when the on-screen film is dark. */}
      <mesh position={[0, 1.4, -0.07]}>
        <planeGeometry args={[BEZEL_W + 1.1, BEZEL_H + 1.1]} />
        <meshBasicMaterial
          map={glowTex}
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <DropWallBezel screen />
      <Suspense fallback={null}>
        <PosterScreen />
      </Suspense>
      <Suspense fallback={null}>
        <VaultVideoScreen scrollProgress={scrollProgress} />
      </Suspense>
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
      {/* Floor base + slim brushed-metal pylon */}
      <mesh position={[0, 0.04, 0]} material={plinithMat}>
        <cylinderGeometry args={[0.3, 0.34, 0.08, 24]} />
      </mesh>
      <RoundedBox position={[0, 0.66, 0]} args={[0.1, 1.24, 0.1]} radius={0.018} smoothness={2} material={machinedMat} />
      {/* Brushed-metal frame surround → the panel reads as a framed display */}
      <RoundedBox position={[0, 1.4, -0.02]} args={[1.72, 1.24, 0.06]} radius={0.035} smoothness={3} material={machinedMat} />
      {/* Dark, chamfered backing panel — keeps the cream mark popping */}
      <RoundedBox position={[0, 1.4, 0.02]} args={[1.6, 1.12, 0.04]} radius={0.03} smoothness={3} material={cardBaseMat} />
      {/* Warm edge-light framing all four sides */}
      <mesh position={[0, 1.96, 0.05]} material={amberMat}>
        <boxGeometry args={[1.6, 0.022, 0.01]} />
      </mesh>
      <mesh position={[0, 0.84, 0.05]} material={amberMat}>
        <boxGeometry args={[1.6, 0.022, 0.01]} />
      </mesh>
      <mesh position={[-0.81, 1.4, 0.05]} material={amberMat}>
        <boxGeometry args={[0.022, 1.12, 0.01]} />
      </mesh>
      <mesh position={[0.81, 1.4, 0.05]} material={amberMat}>
        <boxGeometry args={[0.022, 1.12, 0.01]} />
      </mesh>
      {/* The mark — emissive cream logo, reads without external light */}
      <mesh position={[0, 1.4, 0.06]}>
        <planeGeometry args={[1.05, 1.05]} />
        <meshStandardMaterial
          map={tex}
          transparent
          emissive="#F2EDE4"
          emissiveMap={tex}
          emissiveIntensity={2.2}
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

// Exit focal point — the camera ends its walk staring into the dark back of the
// store, so the final "Join the Collective" beat used to resolve on an empty
// void. This is a quiet warm halo on the back wall (z≈-16.8) that the camera
// approaches as it exits: it echoes the hero plinth's signature glow ring (a
// closing visual rhyme), gives the eye a focal point, and back-lights the
// membership copy — without faking brand signage. Low intensity so it stays a
// soft resolution, not another lit sign, and sits below the centred headline.
// ─── Membership film wall ───────────────────────────────────────────────────
// A large cinematic hero film on the vault's back wall — the A.E.1 revealed in a
// dark, gold-rimmed void (shoe in the lower third, deep negative space up top so
// the centred "Join the Collective" headline reads clean over black). Resolves
// the closing beat and gives the brand corridor a warm focal point at the hall's
// end. Replaces the old flat exit glow (and the rejected Cairo-skyline film).
const FILM_W = 4.4
const FILM_H = FILM_W * (9 / 16)
const FILM_Z = -17.78
const FILM_Y = 1.66

function MembershipFilm({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const tex = useVideoTexture(withBase('/video/ae1-collective.mp4'), {
    start: false,
    muted: true,
    loop: true,
    playsInline: true,
  })
  tex.colorSpace = THREE.SRGBColorSpace
  const playing = useRef(false)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(() => {
    const vid = tex.image as HTMLVideoElement | undefined
    if (!vid) return
    const p = scrollProgress.current
    // Alive well before the camera arrives (brand corridor → membership). A
    // muted+paused video is essentially free, so starting it early (~p0.55)
    // buys ~2s for the texture to decode — no cold/white frame on arrival,
    // and it survives a refresh that restores scroll past the membership beat.
    const shouldPlay = p > 0.55
    if (shouldPlay && !playing.current) {
      playing.current = true
      vid.play().catch(() => {})
    } else if (!shouldPlay && playing.current) {
      playing.current = false
      vid.pause()
    }
    if (matRef.current) {
      const ready = vid.readyState >= 2 && vid.videoWidth > 0
      matRef.current.opacity += ((ready ? 1 : 0) - matRef.current.opacity) * 0.08
    }
  })

  return (
    <mesh position={[0, FILM_Y, FILM_Z + 0.02]}>
      <planeGeometry args={[FILM_W, FILM_H]} />
      {/* Tone-mapped (NOT self-lit) so any warm highlight rolls off through ACES
          instead of blooming when the exit camera pulls close. The still's dark
          upper void keeps the centred headline legible either way. */}
      <meshBasicMaterial ref={matRef} map={tex} transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

function MembershipFilmPoster() {
  const poster = useTexture(withBase('/video/ae1-collective.webp'))
  poster.colorSpace = THREE.SRGBColorSpace
  return (
    <mesh position={[0, FILM_Y, FILM_Z]}>
      <planeGeometry args={[FILM_W, FILM_H]} />
      <meshBasicMaterial map={poster} />
    </mesh>
  )
}

function MembershipFilmWall({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  return (
    <group>
      {/* Graphite frame + warm gold edge accents */}
      <mesh position={[0, FILM_Y, FILM_Z - 0.07]} material={graphiteMat}>
        <boxGeometry args={[FILM_W + 0.36, FILM_H + 0.36, 0.14]} />
      </mesh>
      <mesh position={[0, FILM_Y + FILM_H / 2 + 0.11, FILM_Z + 0.04]} material={goldMat}>
        <boxGeometry args={[FILM_W + 0.36, 0.025, 0.02]} />
      </mesh>
      <mesh position={[0, FILM_Y - FILM_H / 2 - 0.11, FILM_Z + 0.04]} material={goldMat}>
        <boxGeometry args={[FILM_W + 0.36, 0.025, 0.02]} />
      </mesh>
      {/* Poster + video each in their own boundary, so a stalled / 503'd film
          never blanks the wall — the poster stays painted. */}
      <AssetErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <MembershipFilmPoster />
        </Suspense>
      </AssetErrorBoundary>
      <AssetErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <MembershipFilm scrollProgress={scrollProgress} />
        </Suspense>
      </AssetErrorBoundary>
    </group>
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

    // Audio-reactive vault — the LED strips + amber edges breathe with the
    // music. Upward-only from the base emissive (never dips below the bloom
    // threshold → no flicker, unlike the old breathing) and exactly 0 when
    // muted/silent (getLevel taps the post-gain master). Shared materials, so
    // the whole vault's neon pulses together on the beat.
    const lvl = audioEngine.getLevel()
    stripMat.emissiveIntensity = 1.2 + lvl * 0.7
    amberMat.emissiveIntensity = 2.0 + lvl * 0.9
    mintMat.emissiveIntensity = 1.2 + lvl * 0.8
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
      {/* Global fill — warm + lifted so the moody vault stays LEGIBLE (shelves
          and products read) instead of crushing to black. */}
      <ambientLight intensity={0.4} color="#FFE7CE" />
      <directionalLight position={[3, 6, 14]} intensity={0.6} color="#8FA6C8" />
      {/* Warm amber glow leaking out through the glass door / entrance */}
      <pointLight position={[0, 2.3, 8]} intensity={9} color="#FFB366" distance={10} decay={2} />
      {/* Warm mid/back corridor accent — reaches the deep corridor. */}
      <pointLight position={[0, 2.2, -8.2]} intensity={3.4} color="#C9A36A" distance={16} decay={2} />
      {/* Dedicated counter + verification-card focal glow (trimmed so the card
          no longer clips to white). */}
      <pointLight position={[0, 1.85, -7.5]} intensity={7} color="#FFD9A6" distance={6} decay={2} />
      {/* Shelf product fills — lift the sneakers on the side shelves so they're
          clearly visible (IBL alone left them muddy). Warm, soft, short range. */}
      <pointLight position={[-2.7, 1.7, -6]} intensity={5} color="#FFE0B0" distance={11} decay={2} />
      <pointLight position={[2.7, 1.7, -6]} intensity={5} color="#FFE0B0" distance={11} decay={2} />

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

      {/* Shelf furniture (both walls, three depths each) + the instanced
          sneakers on them — both driven by SHELF_MODULES so they stay in sync. */}
      {SHELF_MODULES.map((m, i) => (
        <ShelfModule key={i} x={m.x} z={m.z} />
      ))}
      <AssetErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <ShelfShoes />
        </Suspense>
      </AssetErrorBoundary>

      {/* Drop-wall video display (the "New Drops" focal element) */}
      <DropFeature scrollProgress={scrollProgress} />

      {/* Authenticity counter */}
      <AuthenticityCounter />

      {/* Shoebox stacks flanking the counter (moved with it to z≈-8) */}
      <ShoeboxStack position={[-1.6, 0, -7.9]} />
      <ShoeboxStack position={[1.7, 0, -8.1]} />

      {/* Brand corridor — illuminated brand totems (Nike / Adidas / Puma / ON) */}
      <BrandCorridor />

      {/* Membership film wall — the golden-hour Cairo skyline that resolves the
          closing "Join the Collective" beat (a window to the city). */}
      <MembershipFilmWall scrollProgress={scrollProgress} />

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
          intensity={0.58}
          luminanceThreshold={0.82}
          luminanceSmoothing={0.3}
        />
        <Vignette offset={0.32} darkness={0.62} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}
