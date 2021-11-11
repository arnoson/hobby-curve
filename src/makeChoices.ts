import { Knot } from './utils'
import { solveChoices } from './solveChoices'

const calcDeltaValues = (knots: Knot[], cyclic: boolean) => {
  const end = cyclic ? knots.length : knots.length - 1
  for (let i = 0; i < end; i++) {
    const knot = knots[i]
    const nextKnot = knots[i + 1] ?? knots[0]

    knot.deltaX = nextKnot.x - knot.x
    knot.deltaY = nextKnot.y - knot.y
    knot.delta = Math.hypot(knot.deltaX, knot.deltaY)
  }
}

const calcPsiValues = (knots: Knot[], cyclic: boolean) => {
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

export const makeChoices = (knots: Knot[], cyclic = true) => {
  calcDeltaValues(knots, cyclic)
  calcPsiValues(knots, cyclic)
  solveChoices(knots, cyclic)
}
