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
class AssetErrorBoundary extends Component<BoundaryProps, BoundaryState> {
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
}

function LoadedModel({
  url,
  scale = 1,
  position,
  rotation,
  normalizeTo,
  seat = 'bottom',
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
    }

    return clone
  }, [gltf.scene, normalizeTo, seat])

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
