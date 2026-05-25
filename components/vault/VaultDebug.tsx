'use client'

// Dev/QA debug overlay (briefing §8). Toggle with ?debug=1 or Shift+D. It is the
// at-a-glance diagnostic for the weak-laptop problem — the GPU line confirms
// whether the browser is on the discrete GPU or the integrated one (the usual
// cause of a "gaming laptop" looking bad), and TIER/DPR/FPS/DRAW CALLS show the
// quality ladder working. Read-only except the [H][S][L] manual tier override.

import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { QualityTier } from '@/lib/deviceTier'
import { TIER_DPR_CAP } from '@/lib/deviceTier'

export interface DebugSink {
  fps1: number
  fps10: number
  calls: number
  tris: number
}

export function makeDebugSink(): DebugSink {
  return { fps1: 0, fps10: 0, calls: 0, tris: 0 }
}

// Lives INSIDE the Canvas. Samples FPS (1s + rolling 10s) and the renderer's
// per-frame draw-call / triangle counts into the shared sink ref (mutated, never
// setState — this runs every frame).
export function DebugStats({ sink }: { sink: React.MutableRefObject<DebugSink> }) {
  const frames = useRef(0)
  const acc = useRef(0)
  const window10 = useRef<number[]>([])
  const inited = useRef(false)
  // gl comes from the useFrame state param (not useThree) so we're not mutating a
  // hook return. Manual renderer.info control: with autoReset on, the
  // EffectComposer's passes reset the counter mid-frame and we'd read ~1 (the last
  // fullscreen quad). Off, it accumulates the WHOLE frame (scene + every pass); we
  // read the previous frame's total at the top of this one, then reset for the next.
  useFrame((state, delta) => {
    const info = state.gl.info
    if (!inited.current) {
      inited.current = true
      info.autoReset = false
    }
    sink.current.calls = info.render.calls
    sink.current.tris = info.render.triangles
    info.reset()
    frames.current++
    acc.current += delta
    if (acc.current >= 1) {
      const fps = frames.current / acc.current
      sink.current.fps1 = Math.round(fps)
      const w = window10.current
      w.push(fps)
      if (w.length > 10) w.shift()
      sink.current.fps10 = Math.round(w.reduce((a, b) => a + b, 0) / w.length)
      frames.current = 0
      acc.current = 0
    }
  })
  return null
}

const POSTFX: Record<QualityTier, string> = {
  high: 'SSAO + bloom + SMAA',
  standard: 'bloom + SMAA',
  safe: 'tonemap + SMAA',
}

// DOM overlay (OUTSIDE the Canvas). Re-reads the sink on a light interval rather
// than per-frame so it never adds render pressure to the scene it's measuring.
export function DebugOverlay({
  sink,
  tier,
  forced,
  dpr,
  gpu,
  webgl2,
  scrollProgress,
  onForceTier,
}: {
  sink: React.MutableRefObject<DebugSink>
  tier: QualityTier
  forced: boolean
  dpr: number
  gpu: string
  webgl2: boolean
  scrollProgress: React.MutableRefObject<number>
  onForceTier: (t: QualityTier) => void
}) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 250)
    return () => window.clearInterval(id)
  }, [])

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const s = sink.current
  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ color: '#7A6440', width: 92, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#F2EDE4' }}>{value}</span>
    </div>
  )
  const btn = (t: QualityTier, char: string) => (
    <button
      onClick={() => onForceTier(t)}
      style={{
        cursor: 'pointer',
        padding: '0 5px',
        marginLeft: 3,
        background: tier === t ? '#BFA06A' : 'transparent',
        color: tier === t ? '#0C0B0A' : '#BFA06A',
        border: '1px solid #BFA06A',
        borderRadius: 2,
        font: 'inherit',
        pointerEvents: 'auto',
      }}
    >
      {char}
    </button>
  )

  return (
    <div
      style={{
        position: 'fixed',
        top: 56,
        left: 8,
        zIndex: 10000,
        padding: '8px 10px',
        background: 'rgba(8,7,6,0.82)',
        border: '1px solid rgba(191,160,106,0.25)',
        borderRadius: 4,
        color: '#BFA06A',
        font: '11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace',
        pointerEvents: 'none',
        maxWidth: '70vw',
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: '#7A6440', width: 92, flexShrink: 0 }}>TIER</span>
        <span style={{ color: '#F2EDE4' }}>
          {tier.toUpperCase()} {forced ? '(forced)' : '(auto)'}
        </span>
        <span style={{ pointerEvents: 'auto' }}>
          {btn('high', 'H')}
          {btn('standard', 'S')}
          {btn('safe', 'L')}
        </span>
      </div>
      {row('DPR', `${dpr.toFixed(2)}  (cap ${TIER_DPR_CAP[tier].toFixed(2)}, floor 1.00)`)}
      {row('GPU', <span style={{ whiteSpace: 'normal' }}>{gpu || '—'}</span>)}
      {row('WEBGL2', webgl2 ? 'yes' : 'no')}
      {row('FPS 1s/10s', `${s.fps1} / ${s.fps10}`)}
      {row('DRAW CALLS', s.calls)}
      {row('TRIANGLES', s.tris >= 1e6 ? `${(s.tris / 1e6).toFixed(2)}M` : s.tris.toLocaleString())}
      {row('POSTFX', POSTFX[tier])}
      {row('VIDEO', tier === 'safe' ? 'poster only (decode off)' : 'beat-gated h264')}
      {row('REDUCED', reduced ? 'true' : 'false')}
      {row('SCROLL', `${Math.round(scrollProgress.current * 100)}%`)}
    </div>
  )
}
