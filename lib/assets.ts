// Tripo asset paths. The hero sneaker + three shelf sneakers are real GLBs;
// every architectural prop (shelves, counter, card, plinth) is procedural.
// Drop optimized GLBs in /public/models/tripo/ and they load via ModelOrFallback.
import { BASE_PATH } from './basePath'

// BASE_PATH prefixes the URL on a subpath deploy (GitHub Pages); empty locally.
const TRIPO = `${BASE_PATH}/models/tripo`

export const ASSETS = {
  heroSneaker: `${TRIPO}/hero_sports_sneaker_web_v01.optimized.glb`,
} as const

// Lightweight sneakers displayed across the drop-wall shelves (cycled).
export const SHELF_SNEAKERS = [
  `${TRIPO}/shelf_sneaker_white_v01.optimized.glb`,
  `${TRIPO}/shelf_sneaker_pink_v01.optimized.glb`,
  `${TRIPO}/shelf_sneaker_03_v01.optimized.glb`,
  `${TRIPO}/shelf_sneaker_athletic_v01.optimized.glb`,
  `${TRIPO}/shelf_sneaker_olive_v01.optimized.glb`,
  `${TRIPO}/shelf_sneaker_colorful_v01.optimized.glb`,
] as const

export type AssetKey = keyof typeof ASSETS
