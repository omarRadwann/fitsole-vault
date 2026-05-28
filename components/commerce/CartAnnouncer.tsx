'use client'

import { useEffect, useRef, useState } from 'react'
import { useCart } from '@/lib/cart'

/**
 * Visually-hidden polite live region that announces cart changes to screen
 * readers (the cart drawer itself is a visual affordance). Lives OUTSIDE the
 * drawer's `aria-hidden` wrapper so the announcement fires even as the drawer
 * opens. Announces only on an actual count change after mount — never the
 * initial render — so it doesn't speak on page load.
 */
export default function CartAnnouncer() {
  const { count } = useCart()
  const [message, setMessage] = useState('')
  const prev = useRef<number | null>(null)

  useEffect(() => {
    if (prev.current === null) {
      prev.current = count // seed; don't announce the initial state
      return
    }
    if (count === prev.current) return
    const added = count > prev.current
    prev.current = count
    setMessage(
      count === 0
        ? 'Your cart is empty.'
        : `${added ? 'Added to cart. ' : 'Removed. '}${count} ${count === 1 ? 'item' : 'items'} in your cart.`
    )
  }, [count])

  return (
    <div aria-live="polite" role="status" className="sr-only">
      {message}
    </div>
  )
}
