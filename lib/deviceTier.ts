// Quality tiers for the WebGL vault. The scene runs the SAME camera, models and
// composition on every tier — only the per-frame COST scales (postprocessing,
// particles, shadows, env-map resolution, video decode) plus the DPR cap. The DPR
// FLOOR is 1.0 on every tier: we never render below native resolution (that was
// the old behaviour that made weak laptops look blurry). We cut expensive EFFECTS
// first and only cap DPR on hi-dpi displays — never crush it.
export type QualityTier = 'high' | 'standard' | 'safe'

// DPR is clamped to [1.0, cap]. The cap only bites on hi-dpi (retina) screens; a
// 1.0-dpr laptop stays crisp at 1.0 on every tier and the effect cuts do the work.
export const TIER_DPR_CAP: Record<QualityTier, number> = {
  high: 2.0,
  standard: 1.5,
  safe: 1.25,
}

export function clampDpr(tier: QualityTier, integrated = false): number {
  const native = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  // Integrated GPUs are FILL-RATE bound: rendering at 1.5× device pixels is 2.25×
  // the pixel work of 1.0×, and that — not triangles or postFX — is the single
  // biggest cost on an iGPU (measured: Iris Xe at DPR 1.5 = 1–2 fps; the scene
  // becomes a slideshow that starves video decode into looking "frozen"). So we
  // pin integrated GPUs to native 1.0 on every tier. Discrete GPUs keep the cap.
  const cap = integrated ? 1.0 : TIER_DPR_CAP[tier]
  return Math.max(1.0, Math.min(native, cap))
}

// Conservative boot guess from synchronous signals (no GL context yet). We start
// STANDARD unless something strongly says otherwise — never boot HIGH then crash
// to SAFE. The GPU read (post-create) and the FPS sample only ever DOWNGRADE.
export function initialTier(): QualityTier {
  if (typeof window === 'undefined') return 'standard'
  const mm = (q: string) => window.matchMedia(q).matches
  if (mm('(prefers-reduced-motion: reduce)')) return 'safe'
  // Small phones (coarse pointer + short side) — keep it safe even before GPU read.
  if (mm('(pointer: coarse)') && Math.min(window.innerWidth, window.innerHeight) <= 480) {
    return 'safe'
  }
  const cores = navigator.hardwareConcurrency ?? 4
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4
  if (cores <= 4 || mem <= 4) return 'safe' // low-end → start safe, GPU may lift to standard
  return 'standard'
}

// Read the unmasked GPU renderer string (needs a live GL context → call from
// Canvas onCreated). Returns '' when the extension is blocked.
export function readGpuRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : ''
  } catch {
    return ''
  }
}

// Map a GPU renderer string to a tier. Discrete/Apple-Silicon GPUs → HIGH; Intel
// integrated, software rasterizers and mobile GPUs → SAFE. null = unknown (keep
// the boot guess). This is the single most-diagnostic signal: a "gaming laptop"
// that looks bad is almost always Chrome running on the Intel iGPU, which this
// catches → SAFE.
export function tierFromGpu(renderer: string): QualityTier | null {
  const r = renderer.toLowerCase()
  if (!r) return null
  // Discrete / Apple Silicon → HIGH. (Intel Arc is discrete → matches here.)
  if (/(rtx|gtx|geforce|radeon|\barc\b|apple m[1-9]|quadro|nvidia)/.test(r)) return 'high'
  // Capable Intel iGPUs (Iris Xe/Plus, UHD) → STANDARD, NEVER high.
  // HARD-LEARNED: the old "/iris/ → high" rule (claiming Iris Xe holds the full
  // stack at 100+ fps) was wrong on real hardware — measured Iris Xe at HIGH
  // (SSAO + bloom + SMAA, DPR 1.5) = 1–2 fps; at STANDARD@DPR1.0 it's ~70 fps.
  // STANDARD drops SSAO and, via the integrated DPR-1.0 cap (see clampDpr), cuts
  // fill rate ~2.25× — while KEEPING the screen videos on. The PerformanceMonitor
  // can still step STANDARD→SAFE for a weaker iGPU.
  if (/iris|uhd/.test(r)) return 'standard'
  // Older/weaker Intel (HD Graphics, pre-UHD) + software / mobile GPUs → SAFE
  // (guaranteed-smooth: no shadows/SSAO/bloom/particles, posters instead of video
  // decode). "HD Graphics" (6th–7th-gen i5 era) can't hold STANDARD comfortably, so
  // it gets the smooth cinematic floor by default. A ?tier=standard override is
  // still available for anyone who wants to push it.
  if (/(intel|hd graphics|mali|adreno|powervr|llvmpipe|swiftshader|microsoft basic|softwarerasterizer)/.test(r)) {
    return 'safe'
  }
  return null
}

// Fill-rate-bound integrated / mobile / software GPUs → DPR capped to 1.0 (see
// clampDpr). Discrete GPUs (NVIDIA / Radeon / Apple Silicon / Intel Arc) return
// false and keep their tier's DPR cap. Call with the unmasked renderer string.
export function isIntegratedGpu(renderer: string): boolean {
  const r = renderer.toLowerCase()
  if (!r || /\barc\b/.test(r)) return false // Arc is discrete
  return /iris|uhd|hd graphics|intel|mali|adreno|powervr|llvmpipe|swiftshader|microsoft basic|softwarerasterizer/.test(r)
}

// Resolve a ?tier= override (SSR-safe). Pins the tier so PerformanceMonitor /
// GPU read can't move it — for measuring a specific tier on a real device.
export function readForcedTier(): QualityTier | null {
  if (typeof window === 'undefined') return null
  const t = new URLSearchParams(window.location.search).get('tier')
  return t === 'high' || t === 'standard' || t === 'safe' ? t : null
}
