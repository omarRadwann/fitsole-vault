'use client'

import { Suspense, Component, type ReactNode, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface BoundaryProps {
  fallback: ReactNode
  children: ReactNode
}
interface BoundaryState {
  hasError: boolean
}

// Catches the throw from useGLTF when a GLB is missing (404) or invalid,
// so the scene falls back to placeholder geometry instead of crashing.
// Exported so the instanced shelf shoes (VaultScene) can reuse the same guard.
export class AssetErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false }

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

interface LoadedModelProps {
  url: string
  scale?: number | [number, number, number]
  position?: [number, number, number]
  rotation?: [number, number, number]
  // Normalize the model's largest dimension to this many world units.
  // Makes any Tripo export fit regardless of the scale it was saved at.
  normalizeTo?: number
  // Where to anchor the normalized model: sitting on the floor or centered.
  seat?: 'bottom' | 'center'
  // Seat a SCALE-only model (no normalizeTo) on the floor: bake the scale, then lift so the lowest
  // vertex sits at y=0 (preserving x/z). Opt-in so wall-mounted props (e.g. the hoop) still hang.
  seatScaled?: boolean
  // Cast shadows from every mesh (hero only — perf cost not justified elsewhere).
  castShadow?: boolean
  // Replace every mesh's material with this shared one (matte-clay treatment for
  // the generic Tripo shelf shoes, so their AI-3D look reads as intentional set dressing).
  material?: THREE.Material
  // Multiply how strongly the model's PBR materials pick up the baked IBL — a
  // safe, reversible lever to make the hero read richer/glossier WITHOUT
  // re-authoring the GLB. Applied to MeshStandardMaterial only.
  envMapIntensity?: number
  // Add a subtle self-illumination so a model still reads in a dark scene (e.g. the
  // basketball keeps its orange even when it rolls out of the light). MeshStandardMaterial only.
  emissive?: THREE.ColorRepresentation
  emissiveIntensity?: number
}

function LoadedModel({
  url,
  scale = 1,
  position,
  rotation,
  normalizeTo,
  seat = 'bottom',
  seatScaled = false,
  castShadow = false,
  material,
  envMapIntensity,
  emissive,
  emissiveIntensity,
}: LoadedModelProps) {
  const gltf = useGLTF(url)
  // Clone so the same GLB can be instanced in multiple places (e.g. shelf modules).
  const object = useMemo(() => {
    const clone = gltf.scene.clone(true)

    if (normalizeTo) {
      const box = new THREE.Box3().setFromObject(clone)
      const size = new THREE.Vector3()
      box.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      if (maxDim > 0) {
        clone.scale.setScalar(normalizeTo / maxDim)
      }
      // Re-anchor after scaling.
      const box2 = new THREE.Box3().setFromObject(clone)
      const center = new THREE.Vector3()
      box2.getCenter(center)
      clone.position.x -= center.x
      clone.position.z -= center.z
      clone.position.y -= seat === 'bottom' ? box2.min.y : center.y
    } else if (seatScaled) {
      // Seat a SCALE-only model on the floor: bake the scale into the clone, then lift its lowest
      // vertex to y=0 (keep x/z — props are explicitly positioned). Fixes props sinking under the floor.
      if (Array.isArray(scale)) clone.scale.set(scale[0], scale[1], scale[2])
      else clone.scale.setScalar(scale)
      const box = new THREE.Box3().setFromObject(clone)
      clone.position.y -= box.min.y
    }

    if (castShadow || material || envMapIntensity !== undefined || emissive !== undefined) {
      clone.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        if (castShadow) mesh.castShadow = true
        if (material) mesh.material = material
        if (envMapIntensity !== undefined || emissive !== undefined) {
          const apply = (mm: THREE.Material) => {
            const std = mm as THREE.MeshStandardMaterial
            if (!std.isMeshStandardMaterial) return
            if (envMapIntensity !== undefined) std.envMapIntensity = envMapIntensity
            if (emissive !== undefined) {
              std.emissive = new THREE.Color(emissive)
              std.emissiveIntensity = emissiveIntensity ?? 1
            }
          }
          if (Array.isArray(mesh.material)) mesh.material.forEach(apply)
          else apply(mesh.material)
        }
      })
    }

    return clone
  }, [gltf.scene, normalizeTo, seat, seatScaled, scale, castShadow, material, envMapIntensity, emissive, emissiveIntensity])

  // normalizeTo AND seatScaled both BAKE the scale (+ a centering / floor-seat offset) into the clone
  // itself. Passing `scale`/`position` on the <primitive> makes R3F apply them to that same object,
  // OVERWRITING the baked transform — `scale` defaults to 1, which wiped normalizeTo and rendered the
  // (nested-hierarchy) basketball at ~3× its intended size + poking under the floor; `position` wiped
  // the seat lift and sank the props. So for both baked modes, apply ONLY the prop's placement
  // (position/rotation) via a wrapper GROUP and render the primitive BARE. Plain scale-only models
  // (e.g. the wall-mounted hoop) are NOT baked, so they still pass scale/position through normally.
  if (normalizeTo || seatScaled) {
    return (
      <group position={position} rotation={rotation}>
        <primitive object={object} />
      </group>
    )
  }
  return <primitive object={object} scale={scale} position={position} rotation={rotation} />
}

interface ModelOrFallbackProps extends LoadedModelProps {
  fallback: ReactNode
}

// Renders the optimized Tripo GLB if it exists; otherwise renders the
// placeholder geometry passed as `fallback`. Drop a GLB into
// /public/models/tripo/optimized/ and reload — it appears automatically.
export default function ModelOrFallback({ fallback, ...props }: ModelOrFallbackProps) {
  return (
    <AssetErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LoadedModel {...props} />
      </Suspense>
    </AssetErrorBoundary>
  )
}
