import { Knot } from './utils'

export const calcDeltaValues = (knots: Knot[], cyclic: boolean) => {
  const end = cyclic ? knots.length : knots.length - 1
  for (let i = 0; i < end; i++) {
    const knot = knots[i]
    const nextKnot = knots[i + 1] ?? knots[0]

    knot.deltaX = nextKnot.x - knot.x
    knot.deltaY = nextKnot.y - knot.y
    knot.delta = Math.hypot(knot.deltaX, knot.deltaY)
  }
}
