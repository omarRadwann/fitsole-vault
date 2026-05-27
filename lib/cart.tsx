'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export interface CartLine {
  id: string // `${product.id}-${size}` — same shoe in two sizes = two lines
  slug: string
  name: string
  brand: string
  price: number
  image: string
  size: string
  qty: number
}

interface CartApi {
  lines: CartLine[]
  count: number
  subtotal: number
  open: boolean
  setOpen: (open: boolean) => void
  add: (line: Omit<CartLine, 'qty'> & { qty?: number }) => void
  remove: (id: string) => void
  setQty: (id: string, qty: number) => void
  clear: () => void
}

const STORAGE_KEY = 'fitsole-cart-v1'

const CartContext = createContext<CartApi | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe: start empty so server and first client render match.
  // localStorage is read in an effect, never at module scope / in an initializer.
  const [lines, setLines] = useState<CartLine[]>([])
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setLines(parsed)
      }
    } catch {
      // corrupt / unavailable storage — start clean
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return // don't clobber stored cart with the empty initial state
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // quota / private mode — non-fatal
    }
  }, [lines, hydrated])

  const add = useCallback<CartApi['add']>((line) => {
    const qty = line.qty ?? 1
    setLines((prev) => {
      const i = prev.findIndex((l) => l.id === line.id)
      if (i >= 0) {
        const next = [...prev]
        next[i] = { ...next[i], qty: next[i].qty + qty }
        return next
      }
      return [...prev, { ...line, qty }]
    })
    setOpen(true)
  }, [])

  const remove = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, qty } : l))
    )
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const { count, subtotal } = useMemo(() => {
    let count = 0
    let subtotal = 0
    for (const l of lines) {
      count += l.qty
      subtotal += l.price * l.qty
    }
    return { count, subtotal }
  }, [lines])

  const value: CartApi = {
    lines,
    count,
    subtotal,
    open,
    setOpen,
    add,
    remove,
    setQty,
    clear,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
