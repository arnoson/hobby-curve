export enum Type {
  Endpoint,
  Explicit,
  Given,
  Curl,
  Open,
  EndCycle,
}

export interface Knot {
  x: number
  y: number

  leftType: Type
  rightType: Type

  leftY: number
  rightY: number

  leftX: number
  rightX: number

  next: Knot
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

export const abVsCd = (a: number, b: number, c: number, d: number) =>
  a * b == c * d ? 0 : a * b > c * d ? 1 : -1

export const sinCos = (x: number) => [Math.cos(x), Math.sin(x)]

/**
 * Metapost's standard velocity subroutine for cubic Bezier curves.
 */
export const velocity = (
  st: number,
  ct: number,
  sf: number,
  cf: number,
  t: number
) =>
  Math.min(
    4.0,
    (2.0 + Math.sqrt(2) * (st - sf / 16.0) * (sf - st / 16.0) * (ct - cf)) /
      (1.5 * t * (2 + (Math.sqrt(5) - 1) * ct + (3 - Math.sqrt(5)) * cf))
  )
