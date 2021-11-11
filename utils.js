export const TYPE_ENDPOINT = 0
export const TYPE_EXPLICIT = 1
export const TYPE_GIVEN = 2
export const TYPE_CURL = 3
export const TYPE_OPEN = 4
export const TYPE_END_CYCLE = 5

/**
 * @param {Knot} knot
 * @param {Knot} nextKnot
 */
export const knotsAreEqual = (knot, nextKnot) =>
  knot.rightType > TYPE_EXPLICIT &&
  (knot.x - nextKnot.x) ** 2 + (knot.y - nextKnot.y) ** 2 < Number.EPSILON ** 2

/**
 * @param {Knot} knot
 */
export const knotIsBreakpoint = knot =>
  knot.leftType != TYPE_OPEN || knot.rightType != TYPE_OPEN

/**
 * @param {number} angle
 * @returns
 */
export const reduceAngle = angle =>
  Math.abs(angle) > Math.PI
    ? angle > 0
      ? angle - 2 * Math.PI
      : angle + 2 * Math.PI
    : angle

/**
 * @param {*} gamma
 * @param {*} tensionA
 * @param {*} tensionB
 * @returns
 */
export const curlRatio = function (gamma, tensionA, tensionB) {
  const alpha = 1 / tensionA
  const beta = 1 / tensionB
  return Math.min(
    4.0,
    ((3.0 - alpha) * alpha ** 2 * gamma + beta ** 3) /
      (alpha ** 3 * gamma + (3.0 - beta) * beta ** 2)
  )
}

/**
 * Tests rigorously if ab is greater than, equal to, or less than cd. In most
 * cases a quick decision is reached. The result is +1, 0, or -1 in the three respective cases.
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @param {number} d
 * @returns
 */

export const abVsCd = (a, b, c, d) =>
  a * b == c * d ? 0 : a * b > c * d ? 1 : -1

/**
 * @param {number} x
 */
export const sinCos = x => [Math.cos(x), Math.sin(x)]

/**
 * Metapost's standard velocity subroutine for cubic Bezier curves.
 * @param {number} st sine of theta
 * @param {number} ct cosine of theta
 * @param {number} sf sine of phi
 * @param {number} cf cosine of phi
 * @param {number} t
 * @returns
 */
export const velocity = (st, ct, sf, cf, t) =>
  Math.min(
    4.0,
    (2.0 + Math.sqrt(2) * (st - sf / 16.0) * (sf - st / 16.0) * (ct - cf)) /
      (1.5 * t * (2 + (Math.sqrt(5) - 1) * ct + (3 - Math.sqrt(5)) * cf))
  )
