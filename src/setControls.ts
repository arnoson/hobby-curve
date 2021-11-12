import { Knot, velocity } from './utils'

export const setControlsLine = (knotA: Knot, knotB: Knot) => {
  let factor = 1 / (3 * knotA.rightY)
  knotA.rightX = knotA.x + knotA.deltaX * factor
  knotA.rightY = knotA.y + knotA.deltaY * factor

  factor = 1 / (3 * knotB.leftY)
  knotB.leftX = knotB.x - knotA.deltaX * factor
  knotB.leftY = knotB.y - knotA.deltaY * factor
}

export const setControls = (knotA: Knot, knotB: Knot) => {
  const thetaSin = Math.sin(knotA.theta)
  const thetaCos = Math.cos(knotA.theta)
  const phiSin = Math.sin(knotB.phi)
  const phiCos = Math.cos(knotB.phi)

  const left = knotB.leftY
  const right = knotA.rightY

  const velocityRight = velocity(thetaSin, thetaCos, phiSin, phiCos, left)
  const velocityLeft = velocity(phiSin, phiCos, thetaSin, thetaCos, right)

  knotA.rightX =
    knotA.x +
    (knotA.deltaX * thetaCos - knotA.deltaY * thetaSin) * velocityRight

  knotA.rightY =
    knotA.y +
    (knotA.deltaY * thetaCos + knotA.deltaX * thetaSin) * velocityRight

  knotB.leftX =
    knotB.x - (knotA.deltaX * phiCos + knotA.deltaY * phiSin) * velocityLeft

  knotB.leftY =
    knotB.y - (knotA.deltaY * phiCos - knotA.deltaX * phiSin) * velocityLeft
}
