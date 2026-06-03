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

const R = 0.17 // ball radius — MUST match the visual normalizeTo (0.34 → radius 0.17). Smaller than
// the 1.0 hero sneakers (~1/3 their length), per the "much smaller ball" request, but still a real
// presence you can grab + shoot. (Visual + physics radius are now locked together — see the JSX.)
// Once settled, the ball gently FLOATS (centre at this Y) like the hero pairs — a levitating-product
// display. This is what stops it reading "buried": at floor level (centre y=R=0.11) it sat ON the
// bright performance ring (its glow washed the lower half → a sunken "dome") and level with the
// sneakers that occluded it. Lifting it clear of the ring + floor reads as ON the stage, not under it.
const BALL_FLOAT = 0.32
// HOME — once settled, the ball gently drifts back here (front-right of the pairs, clearly in view +
// reachable) so it can NEVER be stranded far away where it's too small/distant to grab. A slow magnetic
// return, not a snap. x,z only (y is the float). Behind the pairs' z so they still render in front.
const HOME = new THREE.Vector3(1.05, BALL_FLOAT, -0.7)
const SPAWN = new THREE.Vector3(1.0, 2.5, -1.0) // mid-scene + high → drops INTO VIEW + bounces hard on enter (kept back so it doesn't loom near the camera)
const GRAV = -10
const REST = 0.78 // floor restitution — lively but settles in a few bounces (0.84 felt pinball-y/endless)
const REST_WALL = 0.6
const AIR = 0.01
const ROLL_FRICTION = 1.5
const MAX_SPEED = 14
const THROW_GAIN = 1.9
const THROW_CAP = 11 // capped so even a hard flick reaches ~rim height, never flies off-screen
// SHOOT: a clear up-flick (vel.y > SHOOT_VY) is a SHOT — we SET the velocity to the exact BALLISTIC
// solution that lands the ball in the rim (NOT a blend: blending changed the horizontal speed, so the
// real flight time drifted from the one the vertical solve assumed → the ball sailed over the rim).
// Flick STRENGTH still shapes the arc (via flight time T); a softer / sideways flick (vy below the
// threshold) just dribbles freely. "Flick up = swish" from anywhere on the court — a game, not a sim.
const SHOOT_VY = 1.2
const SLEEP_VY = 0.07
const SLEEP_VXZ = 0.05
const SQUASH_MIN = 0.64
const SQUASH_RECOVER = 9
// Playable area kept INSIDE the camera's view so the ball can never roll/fly off-screen where
// you can't grab it (the studio walls are much further out at x±7.6).
// zMax is BEHIND the sneakers (z0) so they always render in front; zMin reaches past the rim
// (z-4.85) so you can actually shoot it into the hoop. Floor + these 4 walls + CEIL = fully enclosed.
const BOUNDS = { xMin: -2.7, xMax: 2.7, zMin: -5.5, zMax: -0.15 }
const CEIL = 3.7 // hard ceiling (above the backboard ~3.45) → the ball can NEVER fly off-screen / vanish
const OOB = { yFloor: -2, xAbs: 8, zMin: -8, zMax: 4 }

// Rim circle for swish detection (CALIBRATE against the moved hoop with ?debugRim / DEBUG_RIM).
export const RIM = { x: 0, y: 2.42, z: -4.85, r: 0.36 }

// Solid props the ball BOUNCES off (hand-rolled sphere↔AABB). World-space boxes (centre ± half) +
// restitution. The backboard box sits ABOVE + behind the rim so a swish drops UNDER it but a long /
// flat shot bounces. The lockers (z≈-6) are behind the ball's reach, so they need no collider.
// Calibrate with DEBUG_COLLIDERS (a wireframe box per entry).
export const PROP_COLLIDERS = (
  [
    { c: [-3.05, 0.46, -2.7], h: [0.85, 0.5, 0.5], rest: 0.5 }, // bench (yaw-rotated → widened)
    { c: [3.05, 0.95, -2.9], h: [0.6, 0.95, 0.5], rest: 0.5 }, // ball rack (widened)
    { c: [0, 3.0, -5.35], h: [0.6, 0.45, 0.12], rest: 0.7 }, // hoop backboard (swish passes UNDER)
    { c: [0, 0.2, 0], h: [0.7, 0.35, 0.4], rest: 0.55 }, // the hero sneakers' footprint
  ] as const
).map((p) => ({
  box: new THREE.Box3(
    new THREE.Vector3(p.c[0] - p.h[0], p.c[1] - p.h[1], p.c[2] - p.h[2]),
    new THREE.Vector3(p.c[0] + p.h[0], p.c[1] + p.h[1], p.c[2] + p.h[2])
  ),
  rest: p.rest,
}))

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
      target: new THREE.Vector3(),
      dragAnchor: new THREE.Vector3(),
      dragAnchored: false,
      eul: new THREE.Euler(),
      dq: new THREE.Quaternion(),
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
      if (S.vel.y > SHOOT_VY) {
        // SHOOT — set the EXACT ballistic velocity that lands the ball in the rim. Pick the flight
        // time T from the flick strength (harder up-flick → shorter, flatter, faster shot), then solve
        // v = Δ/T for x,z and v = Δ/T − ½·g·T for y. Horizontal + vertical stay consistent → a true
        // swish (no over-the-rim sail). Not capped: the solution is naturally bounded (~9 u/s).
        const T = clamp(0.95 - (S.vel.y - SHOOT_VY) * 0.03, 0.6, 0.95)
        // Drag compensation: the integrator applies AIR per frame, so over the flight the ball loses
        // speed and a no-drag ballistic undershoots (more on long shots). Boost the launch velocity by
        // the average drag loss (~half the flight's frames) so the ball still reaches the rim.
        const comp = 1 / Math.pow(1 - AIR, 30 * T)
        S.vel.x = ((RIM.x - S.pos.x) / T) * comp
        S.vel.z = ((RIM.z - S.pos.z) / T) * comp
        S.vel.y = ((RIM.y - S.pos.y) / T + 0.5 * -GRAV * T) * comp
      } else if (S.vel.lengthSq() > THROW_CAP * THROW_CAP) {
        S.vel.setLength(THROW_CAP) // cap only free throws/dribbles; shots are the bounded ballistic above
      }
    } else {
      S.vel.set(0, 0, 0) // a tap → just drop
    }
    S.drag.samples = []
    S.released = true
    S.sleeping = false
  }

  // Imperative handle for SkyBridge (release a stranded drag on park; fresh drop on re-entry).
  useEffect(() => {
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
    S.dragAnchored = false // re-anchor the drag plane at the ball's current depth this grab
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
      // DRAG — project the pointer onto a plane anchored at the ball's depth + the camera's facing
      // WHEN the grab began. Both the anchor AND the normal are frozen at grab: the camera's subtle
      // breath (and any orbit) must NOT wobble the plane mid-drag, or it jitters the sampled throw
      // velocity (a flick could misfire). SMOOTH the rendered pos; sample the RAW target → crisp flick.
      if (!S.dragAnchored) { S.dragAnchor.copy(S.pos); state.camera.getWorldDirection(S.camFwd); S.dragAnchored = true }
      S.plane.setFromNormalAndCoplanarPoint(S.camFwd, S.dragAnchor)
      state.raycaster.setFromCamera(state.pointer, state.camera)
      if (state.raycaster.ray.intersectPlane(S.plane, S.hit)) {
        S.target.set(
          clamp(S.hit.x, BOUNDS.xMin, BOUNDS.xMax),
          Math.max(S.hit.y, R),
          clamp(S.hit.z, BOUNDS.zMin, BOUNDS.zMax)
        )
        S.pos.lerp(S.target, 1 - Math.exp(-70 * dt)) // frame-rate-independent, TIGHT tracking (was 22 →
        // floaty/laggy: the ball trailed the cursor; 70 sticks it to the cursor while still de-jittering)
        S.drag.samples.push({ x: S.target.x, y: S.target.y, z: S.target.z, t: state.clock.elapsedTime })
        if (S.drag.samples.length > 6) S.drag.samples.shift()
      }
    } else if (!S.released) {
      // HOLD the ball up until the user actually scrolls into the finale (~p0.06), THEN release →
      // it drops + bounces HARD in view (you SEE the landing, not a ball that settled off-screen).
      S.pos.copy(SPAWN)
      if (p > 0.06) {
        S.released = true
        S.vel.set(0, -2.5, 0)
      }
    } else if (!S.sleeping) {
      // INTEGRATE with SUBSTEPS — dt is clamped to 0.05, so a fast ball moves up to ~0.7/frame and
      // would TUNNEL through thin colliders. Substep so each move ≤ R/2; floor / walls / ceiling /
      // props all resolve inside the loop. (AIR drag, sleep, OOB, spin stay once-per-frame, below.)
      const steps = Math.min(8, Math.max(1, Math.ceil((S.vel.length() * dt) / (R * 0.5))))
      const h = dt / steps
      for (let i = 0; i < steps; i++) {
        S.vel.y += GRAV * h
        S.pos.addScaledVector(S.vel, h)
        // floor
        if (S.pos.y < R) {
          S.pos.y = R
          if (S.vel.y < 0) {
            const impact = -S.vel.y
            S.vel.y = impact * REST
            S.squash = clamp(1 - (impact / 8) * (1 - SQUASH_MIN), SQUASH_MIN, 1)
          }
          const f = Math.max(0, 1 - ROLL_FRICTION * h)
          S.vel.x *= f
          S.vel.z *= f
        }
        // ceiling (full enclosure → the ball can never fly off the top + vanish)
        if (S.pos.y > CEIL && S.vel.y > 0) { S.pos.y = CEIL; S.vel.y = -S.vel.y * REST_WALL }
        // walls
        if (S.pos.x < BOUNDS.xMin) { S.pos.x = BOUNDS.xMin; if (S.vel.x < 0) S.vel.x = -S.vel.x * REST_WALL }
        if (S.pos.x > BOUNDS.xMax) { S.pos.x = BOUNDS.xMax; if (S.vel.x > 0) S.vel.x = -S.vel.x * REST_WALL }
        if (S.pos.z < BOUNDS.zMin) { S.pos.z = BOUNDS.zMin; if (S.vel.z < 0) S.vel.z = -S.vel.z * REST_WALL }
        if (S.pos.z > BOUNDS.zMax) { S.pos.z = BOUNDS.zMax; if (S.vel.z > 0) S.vel.z = -S.vel.z * REST_WALL }
        // PROP collision — sphere ↔ AABB; bounce off bench / rack / backboard / sneakers. 2 passes
        // resolve corners / overlapping boxes.
        for (let pass = 0; pass < 2; pass++) {
          let any = false
          for (let ci = 0; ci < PROP_COLLIDERS.length; ci++) {
            const b = PROP_COLLIDERS[ci].box
            const cx = clamp(S.pos.x, b.min.x, b.max.x)
            const cy = clamp(S.pos.y, b.min.y, b.max.y)
            const cz = clamp(S.pos.z, b.min.z, b.max.z)
            let nx = S.pos.x - cx, ny = S.pos.y - cy, nz = S.pos.z - cz
            const d2 = nx * nx + ny * ny + nz * nz
            if (d2 >= R * R) continue
            any = true
            const d = Math.sqrt(d2)
            if (d > 1e-6) {
              const inv = 1 / d; nx *= inv; ny *= inv; nz *= inv
              const push = R - d
              S.pos.x += nx * push; S.pos.y += ny * push; S.pos.z += nz * push
            } else {
              // centre inside the box → eject along the least-penetration axis
              const dxl = S.pos.x - b.min.x, dxr = b.max.x - S.pos.x
              const dyl = S.pos.y - b.min.y, dyr = b.max.y - S.pos.y
              const dzl = S.pos.z - b.min.z, dzr = b.max.z - S.pos.z
              const mx = Math.min(dxl, dxr), my = Math.min(dyl, dyr), mz = Math.min(dzl, dzr)
              nx = 0; ny = 0; nz = 0
              if (mx <= my && mx <= mz) { nx = dxl < dxr ? -1 : 1; S.pos.x += nx * (mx + R) }
              else if (my <= mz) { ny = dyl < dyr ? -1 : 1; S.pos.y += ny * (my + R) }
              else { nz = dzl < dzr ? -1 : 1; S.pos.z += nz * (mz + R) }
            }
            const vn = S.vel.x * nx + S.vel.y * ny + S.vel.z * nz
            if (vn < 0) {
              const j = (1 + PROP_COLLIDERS[ci].rest) * vn
              S.vel.x -= j * nx; S.vel.y -= j * ny; S.vel.z -= j * nz
            }
          }
          if (!any) break
        }
      }
      // once per frame
      S.vel.multiplyScalar(1 - AIR)
      if (S.vel.lengthSq() > MAX_SPEED * MAX_SPEED) S.vel.setLength(MAX_SPEED)
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
    } else {
      // SLEEPING — the ball has settled, so FLOAT it (centre eased toward BALL_FLOAT) with the same
      // gentle breath as the hero pairs: it reads as a levitating product ON the stage, clear of the
      // bright ring + floor, instead of a sphere half-sunk into them. Grab/throw clears `sleeping`
      // (onPointerDown / meet-kick), so the moment you touch it, gravity + bounce physics resume.
      const floatY = reduced ? BALL_FLOAT : BALL_FLOAT + Math.sin(state.clock.elapsedTime * 1.1) * 0.014
      S.pos.y += (floatY - S.pos.y) * Math.min(1, 5 * dt)
      // Magnetic HOME drift (x,z) — a settled ball eases back to a reachable spot so it's never stranded
      // far away. Slow (rate 1.3 → ~2-3 s) so it reads as an intentional return to its display pose.
      S.pos.x += (HOME.x - S.pos.x) * Math.min(1, 1.3 * dt)
      S.pos.z += (HOME.z - S.pos.z) * Math.min(1, 1.3 * dt)
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
    // blob shadow follows the ball; fades + shrinks with height. Strong + wide so the FLOATING ball
    // reads as clearly grounded (a levitating product with a real shadow under it), not sunk in.
    if (blob.current) {
      const k = clamp(1 - (S.pos.y - R) / 1.8, 0, 1)
      blob.current.visible = k > 0.02 // skip the draw when the ball is high (blob invisible)
      if (blob.current.visible) {
        blob.current.position.set(S.pos.x, 0.012, S.pos.z)
        const s = 0.34 * (1.3 - 0.4 * k)
        blob.current.scale.set(s, s, s)
        ;(blob.current.material as THREE.MeshBasicMaterial).opacity = 0.62 * k
      }
    }
  })

  return (
    <>
      <group ref={group}>
        <Suspense fallback={null}>
          <ModelOrFallback
            url={ASSETS.basketball}
            normalizeTo={R * 2}
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
        {/* invisible (colorWrite off) larger grab target — a generous hit-sphere (≈2× the ball)
            makes the small ball easy to catch, even while it's moving */}
        <mesh onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
          <sphereGeometry args={[R * 2, 16, 12]} />
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
