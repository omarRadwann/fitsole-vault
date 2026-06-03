'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import ModelOrFallback from '@/components/three/ModelOrFallback'
import { ASSETS } from '@/lib/assets'

// ── Hand-rolled basketball physics (NO physics engine — one ball is ~free, and rapier's WASM
// is painful under `output: export` + a GH-Pages basePath). All state lives in REFS so the
// component renders exactly once (zero React churn). Desktop-only finale → mouse-drag never
// fights wheel-scroll. Grab it, drag it, throw it; it bounces hard + can be sunk through the hoop. ──

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)

// A soft radial-gradient blob texture (black, alpha-faded edge) — a cheap drop shadow used for
// the floating pairs + the ball. Lazily built once (client-only), shared across all blobs. This
// replaces drei <ContactShadows> (which re-rendered the whole scene to a depth RT every frame —
// the heaviest per-frame GPU op; removing it buys the headroom the interactive ball needs).
let _blobTex: THREE.CanvasTexture | null = null
export function blobTexture(): THREE.CanvasTexture {
  if (_blobTex) return _blobTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(0,0,0,0.9)')
  g.addColorStop(0.45, 'rgba(0,0,0,0.45)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  _blobTex = new THREE.CanvasTexture(c)
  return _blobTex
}

const R = 0.11 // ball radius (matches normalizeTo 0.22 — much smaller, per request)
const SPAWN = new THREE.Vector3(1.0, 2.5, -1.0) // mid-scene + high → drops INTO VIEW + bounces hard on enter (kept back so it doesn't loom near the camera)
const GRAV = -10
const REST = 0.84 // floor restitution (lively, hard bounce)
const REST_WALL = 0.6
const AIR = 0.01
const ROLL_FRICTION = 1.5
const MAX_SPEED = 14
const THROW_GAIN = 1.9
const THROW_CAP = 10.5 // capped so even a hard flick reaches ~rim height, never flies off-screen
const SHOOT_FWD = 1.35 // an upward flick arcs the ball FORWARD toward the hoop (the "shoot" mechanic)
const SLEEP_VY = 0.07
const SLEEP_VXZ = 0.05
const SQUASH_MIN = 0.64
const SQUASH_RECOVER = 9
// Playable area kept INSIDE the camera's view so the ball can never roll/fly off-screen where
// you can't grab it (the studio walls are much further out at x±7.6).
const BOUNDS = { xMin: -2.7, xMax: 2.7, zMin: -3.8, zMax: 0.8 } // zMax kept back so the ball never looms huge near the camera
const OOB = { yFloor: -2, xAbs: 8, zMin: -8, zMax: 4 }

// Rim circle for swish detection (CALIBRATE against the moved hoop with ?debugRim / DEBUG_RIM).
export const RIM = { x: 0, y: 2.42, z: -4.85, r: 0.36 }

export interface BallControl {
  releaseDrag: () => void
  requestReset: () => void
}

export default function Basketball({
  reduced,
  scrollProgress,
  controlRef,
  onScore,
}: {
  reduced: boolean
  scrollProgress: React.MutableRefObject<number>
  controlRef?: React.MutableRefObject<BallControl | null>
  onScore?: () => void
}) {
  const group = useRef<THREE.Group>(null)
  const blob = useRef<THREE.Mesh>(null)
  const { gl } = useThree()

  // All mutable physics state + pre-allocated scratch (never allocate in useFrame).
  const S = useMemo(
    () => ({
      pos: SPAWN.clone(),
      vel: new THREE.Vector3(),
      angVel: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      squash: 1,
      sleeping: false,
      released: false,
      scoreCooldown: 0,
      prevY: SPAWN.y,
      prevP: 0,
      meetKickCd: 0,
      drag: { active: false, samples: [] as { x: number; y: number; z: number; t: number }[] },
      plane: new THREE.Plane(),
      camFwd: new THREE.Vector3(),
      hit: new THREE.Vector3(),
      eul: new THREE.Euler(),
      dq: new THREE.Quaternion(),
      scr: new THREE.Vector3(),
      dbg: { sx: 0, sy: 0, wx: 0, wy: 0, wz: 0, vy: 0, speed: 0, sleeping: false, dragging: false, onScreen: false },
    }),
    []
  )

  const respawn = () => {
    S.pos.copy(SPAWN)
    S.vel.set(0, 0, 0)
    S.angVel.set(0, 0, 0)
    S.squash = 1
    S.sleeping = false
    S.released = false // hold high again → drops + bounces when re-entered
    S.prevY = SPAWN.y
  }

  const releaseDrag = () => {
    if (!S.drag.active) return
    S.drag.active = false
    const s = S.drag.samples
    if (s.length >= 2) {
      const a = s[0]
      const b = s[s.length - 1]
      const dt = Math.max(0.001, b.t - a.t)
      S.vel.set(((b.x - a.x) / dt) * THROW_GAIN, ((b.y - a.y) / dt) * THROW_GAIN, ((b.z - a.z) / dt) * THROW_GAIN)
      // SHOOT — an upward flick arcs the ball FORWARD toward the hoop (a real shot) instead of just
      // lobbing it up in the screen plane. Flick UP to score; flick sideways to dribble around.
      if (S.vel.y > 0.6) S.vel.z -= S.vel.y * SHOOT_FWD
      if (S.vel.lengthSq() > THROW_CAP * THROW_CAP) S.vel.setLength(THROW_CAP)
    } else {
      S.vel.set(0, 0, 0) // a tap → just drop
    }
    S.drag.samples = []
    S.released = true
    S.sleeping = false
  }

  // Imperative handle for SkyBridge (release a stranded drag on park; fresh drop on re-entry).
  useEffect(() => {
    ;(window as unknown as { __ball?: object }).__ball = S.dbg
    if (controlRef) controlRef.current = { releaseDrag, requestReset: respawn }
    return () => {
      if (controlRef) controlRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlRef])

  // Backstop: catch pointerup/cancel anywhere on the canvas (pointer capture usually routes it
  // to the ball mesh, but this guarantees a release even if the capture is lost).
  useEffect(() => {
    const el = gl.domElement
    const up = () => releaseDrag()
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl])

  const onPointerDown = (e: any) => {
    e.stopPropagation()
    try {
      e.target?.setPointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }
    S.drag.active = true
    S.drag.samples = []
    S.sleeping = false
    S.vel.set(0, 0, 0)
    S.angVel.set(0, 0, 0)
  }
  const onPointerUp = (e: any) => {
    e.stopPropagation()
    try {
      e.target?.releasePointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }
    releaseDrag()
  }

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const p = scrollProgress.current
    if (S.scoreCooldown > 0) S.scoreCooldown -= dt

    if (S.drag.active) {
      // DRAG — project the pointer onto a plane through the ball facing the (orbiting) camera.
      state.camera.getWorldDirection(S.camFwd)
      S.plane.setFromNormalAndCoplanarPoint(S.camFwd, S.pos)
      state.raycaster.setFromCamera(state.pointer, state.camera)
      if (state.raycaster.ray.intersectPlane(S.plane, S.hit)) {
        S.pos.set(
          clamp(S.hit.x, BOUNDS.xMin, BOUNDS.xMax),
          Math.max(S.hit.y, R),
          clamp(S.hit.z, BOUNDS.zMin, BOUNDS.zMax)
        )
        S.drag.samples.push({ x: S.pos.x, y: S.pos.y, z: S.pos.z, t: state.clock.elapsedTime })
        if (S.drag.samples.length > 6) S.drag.samples.shift()
      }
    } else if (!S.released) {
      // HOLD the ball up until the user actually scrolls into the finale (entrance fade lifts
      // ~p0.06), THEN release → it drops + bounces HARD in view (you SEE the landing, not a
      // ball that already settled off-screen during the warm-up).
      S.pos.copy(SPAWN)
      if (p > 0.06) {
        S.released = true
        S.vel.set(0, -2.5, 0)
      }
    } else if (!S.sleeping) {
      // INTEGRATE
      S.vel.y += GRAV * dt
      S.vel.multiplyScalar(1 - AIR)
      S.pos.addScaledVector(S.vel, dt)

      // floor
      if (S.pos.y < R) {
        S.pos.y = R
        if (S.vel.y < 0) {
          const impact = -S.vel.y
          S.vel.y = impact * REST
          S.squash = clamp(1 - (impact / 8) * (1 - SQUASH_MIN), SQUASH_MIN, 1)
        }
        const f = Math.max(0, 1 - ROLL_FRICTION * dt)
        S.vel.x *= f
        S.vel.z *= f
      }
      // walls
      if (S.pos.x < BOUNDS.xMin) { S.pos.x = BOUNDS.xMin; if (S.vel.x < 0) S.vel.x = -S.vel.x * REST_WALL }
      if (S.pos.x > BOUNDS.xMax) { S.pos.x = BOUNDS.xMax; if (S.vel.x > 0) S.vel.x = -S.vel.x * REST_WALL }
      if (S.pos.z < BOUNDS.zMin) { S.pos.z = BOUNDS.zMin; if (S.vel.z < 0) S.vel.z = -S.vel.z * REST_WALL }
      if (S.pos.z > BOUNDS.zMax) { S.pos.z = BOUNDS.zMax; if (S.vel.z > 0) S.vel.z = -S.vel.z * REST_WALL }

      if (S.vel.lengthSq() > MAX_SPEED * MAX_SPEED) S.vel.setLength(MAX_SPEED)

      // sleep (no perpetual micro-bounces)
      if (S.pos.y <= R + 0.006 && Math.abs(S.vel.y) < SLEEP_VY && Math.hypot(S.vel.x, S.vel.z) < SLEEP_VXZ) {
        S.pos.y = R
        S.vel.set(0, 0, 0)
        S.angVel.set(0, 0, 0)
        S.sleeping = true
      }
      if (S.pos.y < OOB.yFloor || Math.abs(S.pos.x) > OOB.xAbs || S.pos.z < OOB.zMin || S.pos.z > OOB.zMax) respawn()

      // rolling-without-slip spin from horizontal velocity
      S.angVel.set(S.vel.z / R, 0, -S.vel.x / R)
      if (S.angVel.lengthSq() > 1e-6) {
        S.eul.set(S.angVel.x * dt, S.angVel.y * dt, S.angVel.z * dt)
        S.dq.setFromEuler(S.eul)
        S.quat.premultiply(S.dq).normalize()
      }
    }

    // squash recovers toward round
    S.squash += (1 - S.squash) * Math.min(1, SQUASH_RECOVER * dt)

    // SWISH detection — trajectory-based (never reads scroll), so scroll-back is safe.
    if (S.scoreCooldown <= 0 && !S.drag.active && S.prevY > RIM.y && S.pos.y <= RIM.y && S.vel.y < 0) {
      const dx = S.pos.x - RIM.x
      const dz = S.pos.z - RIM.z
      if (dx * dx + dz * dz <= RIM.r * RIM.r) {
        S.scoreCooldown = 0.6
        onScore?.()
      }
    }
    S.prevY = S.pos.y

    // MEET kick — the ball gives a gentle HOP at the climactic meet (edge-trigger on the p=0.5
    // crossing), nudged toward CENTRE so it never gets flung into a wall / off-screen, with a
    // cooldown so rapid scroll back/forth across 0.5 can't fling it repeatedly.
    if (S.meetKickCd > 0) S.meetKickCd -= dt
    if (!reduced && !S.drag.active && S.meetKickCd <= 0) {
      if ((S.prevP < 0.5 && p >= 0.5) || (S.prevP > 0.5 && p <= 0.5)) {
        S.sleeping = false
        S.released = true
        S.vel.y += 2.2
        S.vel.x += (S.pos.x >= 0 ? -1 : 1) * 0.8 // toward centre, not into the wall
        S.meetKickCd = 1.2
      }
    }
    S.prevP = p

    // write transform (the only place we touch the group)
    if (group.current) {
      group.current.position.copy(S.pos)
      group.current.quaternion.copy(S.quat)
      const inv = 1 / Math.sqrt(S.squash)
      group.current.scale.set(inv, S.squash, inv)
    }
    // blob shadow follows the ball; fades + shrinks with height
    if (blob.current) {
      const k = clamp(1 - (S.pos.y - R) / 1.6, 0, 1)
      blob.current.visible = k > 0.02 // skip the draw when the ball is high (blob invisible)
      if (blob.current.visible) {
        blob.current.position.set(S.pos.x, 0.012, S.pos.z)
        const s = R * (1.7 - 0.6 * k)
        blob.current.scale.set(s, s, s)
        ;(blob.current.material as THREE.MeshBasicMaterial).opacity = 0.36 * k
      }
    }

    // DEBUG (Playwright test harness) — allocation-free: mutate a persistent object.
    S.scr.copy(S.pos).project(state.camera)
    S.dbg.sx = (S.scr.x * 0.5 + 0.5) * window.innerWidth
    S.dbg.sy = (-S.scr.y * 0.5 + 0.5) * window.innerHeight
    S.dbg.wx = S.pos.x; S.dbg.wy = S.pos.y; S.dbg.wz = S.pos.z
    S.dbg.vy = S.vel.y; S.dbg.speed = S.vel.length()
    S.dbg.sleeping = S.sleeping; S.dbg.dragging = S.drag.active
    S.dbg.onScreen = S.scr.z < 1 && Math.abs(S.scr.x) < 1 && Math.abs(S.scr.y) < 1
  })

  return (
    <>
      <group ref={group}>
        <Suspense fallback={null}>
          <ModelOrFallback
            url={ASSETS.basketball}
            normalizeTo={0.22}
            seat="center"
            envMapIntensity={1.0}
            emissive="#e0641e"
            emissiveIntensity={0.16}
            fallback={
              <mesh>
                <sphereGeometry args={[R, 24, 16]} />
                <meshStandardMaterial color="#C8642A" roughness={0.85} />
              </mesh>
            }
          />
        </Suspense>
        {/* invisible (colorWrite off) slightly-larger grab target — easy to catch a moving ball */}
        <mesh onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
          <sphereGeometry args={[0.22, 16, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      </group>
      {/* soft drop shadow (a cheap textured blob — no per-frame render pass) */}
      <mesh ref={blob} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <circleGeometry args={[1, 28]} />
        <meshBasicMaterial map={blobTexture()} transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  )
}
