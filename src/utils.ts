export interface Point {
  x: number
  y: number
}

export interface Knot {
  x: number
  y: number

  leftY: number
  rightY: number

  leftX: number
  rightX: number

  deltaX?: number // Horizontal distance between this point and next.
  deltaY?: number // Vertical between this point and next.
  delta?: number // Distance between this point and next.

  psi?: number // Offset angle.
  phi?: number // Another offset angle.
  theta?: number // Angle of polygonal line from this point to next.

  next: Knot
  prev: Knot
}

export const curlRatio = function (
  gamma: number,
  tensionA: number,
  tensionB: number
) {
  const alpha = 1 / tensionA
  const beta = 1 / tensionB
  return Math.min(
    4.0,
    ((3.0 - alpha) * alpha ** 2 * gamma + beta ** 3) /
      (alpha ** 3 * gamma + (3.0 - beta) * beta ** 2)
  )
}

/**
 * Metapost's standard velocity subroutine for cubic Bezier curves.
 */
export const velocity = (
  thetaSin: number,
  thetaCos: number,
  phiSin: number,
  phiCos: number,
  t: number
) =>
  Math.min(
    4.0,
    (2.0 +
      Math.sqrt(2) *
        (thetaSin - phiSin / 16.0) *
        (phiSin - thetaSin / 16.0) *
        (thetaCos - phiCos)) /
      (1.5 *
        t *
        (2 + (Math.sqrt(5) - 1) * thetaCos + (3 - Math.sqrt(5)) * phiCos))
  )
