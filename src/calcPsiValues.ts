import { Knot } from './utils'

export const calcPsiValues = (knots: Knot[], cyclic: boolean) => {
  const [start, end] = cyclic ? [0, knots.length] : [1, knots.length - 1]
  for (let i = start; i < end; i++) {
    const knot = knots[i]
    const prevKnot = knot.prev

    const sin = prevKnot.deltaY / prevKnot.delta
    const cos = prevKnot.deltaX / prevKnot.delta

    knot.psi = Math.atan2(
      knot.deltaY * cos - knot.deltaX * sin,
      knot.deltaX * cos + knot.deltaY * sin
    )
  }
}
