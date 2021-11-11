import { Type, Knot, velocity, abGreaterCd } from './utils'

export const setControls = (
  knot: Knot,
  st: number,
  ct: number,
  sf: number,
  cf: number
) => {
  const nextKnot = knot.next

  let lt = Math.abs(nextKnot.leftY)
  let rt = Math.abs(knot.rightY)
  let rr = velocity(st, ct, sf, cf, rt)
  let ss = velocity(sf, cf, st, ct, lt)

  if (knot.rightY < 0 || nextKnot.leftY < 0) {
    // Decrease the velocities, if necessary, to stay inside the bounding
    // triangle.
    if ((st >= 0 && sf >= 0) || (st <= 0 && sf <= 0)) {
      let sine = Math.abs(st) * cf + Math.abs(sf) * ct
      if (sine > 0) {
        sine *= 1.00024414062 // safety factor
        if (knot.rightY < 0) {
          if (!abGreaterCd(Math.abs(sf), 1, rr, sine)) {
            rr = Math.abs(sf) / sine
          }
        }
        if (nextKnot.leftY < 0) {
          if (!abGreaterCd(Math.abs(st), 1, ss, sine)) {
            ss = Math.abs(st) / sine
          }
        }
      }
    }
  }

  knot.rightX = knot.x + (knot.deltaX * ct - knot.deltaY * st) * rr
  knot.rightY = knot.y + (knot.deltaY * ct + knot.deltaX * st) * rr
  knot.rightType = Type.Explicit

  nextKnot.leftX = nextKnot.x - (knot.deltaX * cf + knot.deltaY * sf) * ss
  nextKnot.leftY = nextKnot.y - (knot.deltaY * cf - knot.deltaX * sf) * ss
  nextKnot.leftType = Type.Explicit
}
