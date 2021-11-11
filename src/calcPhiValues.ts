import { Knot } from './utils'

export const calcPhiValues = (knots: Knot[], cyclic) => {
  for (let i = 0; i < knots.length; i++) {
    const knot = knots[i]
    knot.phi = -knot.psi - knot.theta
  }
}
