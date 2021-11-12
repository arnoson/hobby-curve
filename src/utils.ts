export interface Point {
  x: number
  y: number
}

export interface Knot {
  x: number
  y: number

  handleIn: { x: number; y: number }
  handleOut: { x: number; y: number }

  leftY: number
  rightY: number

  leftX: number
  rightX: number

  next: Knot
  prev: Knot

  deltaX?: number
  deltaY?: number
  delta?: number

  psi?: number
  phi?: number
  theta?: number
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
