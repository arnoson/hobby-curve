/**
 * The mathematics of this code is based on vlad-x's javascript port.
 * (https://github.com/vlad-x/hobby-curves) of Michael Schindler's Python
 * Implementation of some internal functions of MetaPost, developed by John
 * D. Hobby and others.
 * Quoted by Michael Schindler: "Metapost's code is in the public domain,
 * which we take as implicit permission to reuse the code here.
 * (see the comment at http://www.gnu.org/licenses/license-list.html)."
 *
 * I heavily refactored and simplified the code from vlad-x, ported it to
 * Typescript and was inspired by Luke Trujillo's javascript implementation
 * (https://github.com/ltrujello/Hobby_Curve_Algorithm/tree/main/javascript)
 * especially for naming and structuring things.
 *
 * I also added and modified some of the comments from Michael Schindler's
 * python implementation to get a better understanding.
 */

import { Point } from './utils'
import { calcDeltaValues } from './calcDeltaValues'
import { calcPsiValues } from './calcPsiValues'
import { calcPhiValues } from './calcPhiValues'
import { calcThetaValues } from './calcThetaValues'
import { setControls, setControlsLine } from './setControls'

const createKnot = (x: number, y: number, tension: number) => ({
  x: x,
  y: y,

  leftY: tension,
  rightY: tension,

  leftX: tension,
  rightX: tension,

  deltaX: 0,
  deltaY: 0,
  delta: 0,

  theta: 0,
  phi: 0,
  psi: 0,
})

const createHobbyKnots = (
  points: Point[],
  tension: any = 1,
  cyclic = false
) => {
  // @ts-ignore (`next` und `prev` are missing, but will be set immediately)
  const knots: Knot[] = points.map(({ x, y }) => createKnot(x, y, tension))
  const firstKnot = knots[0]
  const lastKnot = knots[knots.length - 1]
  for (let i = 0; i < knots.length; i++) {
    knots[i].next = knots[i + 1] ?? firstKnot
    knots[i].prev = knots[i - 1] ?? lastKnot
  }

  calcDeltaValues(knots, cyclic)
  // If we only have two points on a non-cyclic path we can take a shortcut and
  // just set the control points as a straight line.
  if (points.length === 2 && !cyclic) {
    setControlsLine(firstKnot, lastKnot)
    return knots
  }
  calcPsiValues(knots, cyclic)
  calcThetaValues(knots, cyclic)
  calcPhiValues(knots, cyclic)

  const end = cyclic ? knots.length : knots.length - 1
  for (let i = 0; i < end; i++) {
    setControls(knots[i], knots[i].next)
  }

  return knots
}

/**
 * Create a hobby curve and return a list of bezier entries in the format
 * `{ startControl, endControl, point }`.
 */
export const createHobbyBezier = (
  points: Point[],
  { tension = 1, cyclic = false } = {}
) => {
  const knots = createHobbyKnots(points, tension, cyclic)
  const bezier: { startControl: Point; endControl: Point; point: Point }[] = []

  const end = cyclic ? knots.length : knots.length - 1
  for (let i = 0; i < end; i++) {
    const knot = knots[i]
    bezier.push({
      startControl: { x: knot.rightX, y: knot.rightY },
      endControl: { x: knot.next.leftX, y: knot.next.leftY },
      point: { x: knot.next.x, y: knot.next.y },
    })
  }

  return bezier
}

/**
 * Create a hobby curve and return it's path definition.
 */
export const createHobbyCurve = (
  points: Point[],
  { tension = 1, cyclic = false } = {}
) => {
  const bezier = createHobbyBezier(points, { tension, cyclic })

  const toString = (point: Point) => [point.x, point.y].join(',')
  const bezierCommands = bezier.map(({ startControl, endControl, point }) =>
    [toString(startControl), toString(endControl), toString(point)].join(' ')
  )

  return `M ${points[0].x},${points[0].y} C ${bezierCommands}`
}
