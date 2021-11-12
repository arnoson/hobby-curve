import { Knot, curlRatio } from './utils'

export const calcThetaValues = function (knots: Knot[], cyclic: boolean) {
  // The 'matrix' is in tridiagonal form, the solution is obtained by Gaussian
  // elimination. `uu` and `ww` are of type fraction, vv and theta are of type
  // angle.
  // Relations between adjacent angles ('matrix' entries).
  const uu = []
  // Additional matrix entries for the cyclic case.
  const ww = []
  // Angles ('rhs' entries)
  const vv = []

  const firstKnot = knots[0]
  const secondKnot = knots[1]
  const lastKnot = knots[knots.length - 1]
  // Cycle back to the first knot on cyclic paths.
  const passes = cyclic ? knots.length + 1 : knots.length

  // First pass
  if (!cyclic) {
    const nextKnot = firstKnot.next
    const gamma = firstKnot.rightX
    const leftTension = Math.abs(nextKnot.leftY)
    const rightTension = Math.abs(firstKnot.rightY)
    uu[0] = curlRatio(gamma, rightTension, leftTension)
    vv[0] = -(secondKnot.psi * uu[0])
    ww[0] = 0
  } else {
    uu[0] = 0
    vv[0] = 0
    ww[0] = 1
  }

  // Remaining passes
  for (let i = 1; i < passes; i++) {
    const knot = knots[i] ?? firstKnot
    const nextKnot = knot.next
    const prevKnot = knot.prev
    const isLast = i === passes - 1

    if (cyclic || !isLast) {
      // Set up equation to match mock curvatures at z_k; then finish loop with
      // theta_n adjusted to equal theta_0, if a cycle has ended.

      // Calculate the values:
      // aa = Ak/Bk, bb = Dk/Ck, dd = (3-alpha_{k-1})d(k,k+1),
      // ee = (3-beta_{k+1})d(k-1,k), cc=(Bk-uk-Ak)/Bk
      let aa = 1 / (3 * Math.abs(prevKnot!.rightY) - 1)
      let dd = knot.delta * (3 - 1 / Math.abs(prevKnot.rightY))

      let bb = 1 / (3 * Math.abs(nextKnot.leftY) - 1)
      let ee = prevKnot.delta * (3 - 1 / Math.abs(nextKnot.leftY))

      const cc = 1 - uu[i - 1] * aa

      // Calculate the ratio ff = Ck/(Ck + Bk - uk-1Ak).
      dd = dd * cc
      const tensionLeft = Math.abs(knot.leftY)
      const tensionRight = Math.abs(knot.rightY)
      if (tensionLeft < tensionRight) {
        dd *= (tensionLeft / tensionRight) ** 2
      } else {
        ee *= (tensionRight / tensionLeft) ** 2
      }
      let ff = ee / (ee + dd)
      uu[i] = ff * bb

      // Calculate the values of vk and wk.
      let acc = -(nextKnot.psi * uu[i])
      ff = (1 - ff) / cc
      acc = acc - knot.psi * ff
      ff = ff * aa
      vv[i] = acc - vv[i - 1] * ff
      ww[i] = -(ww[i - 1] * ff)

      // Adjust theta_n to equal theta_0 and finish loop.
      if (cyclic && isLast) {
        let aa = 0
        let bb = 1

        for (let j = i - 1; j >= 0; j--) {
          const index = j === 0 ? passes - 1 : j
          aa = vv[index] - aa * uu[index]
          bb = ww[index] - bb * uu[index]
        }

        aa = aa / (1 - bb)
        firstKnot.theta = aa
        vv[0] = aa
        for (let i = 1; i < passes - 1; i++) {
          vv[i] = vv[i] + aa * ww[i]
        }

        break
      }
    } else {
      // Last knot on a non-cyclic path.
      const gamma = knot.leftX
      const tensionLeft = Math.abs(knot.leftY)
      const tensionRight = Math.abs(prevKnot.rightY)
      const ff = curlRatio(gamma, tensionLeft, tensionRight)
      lastKnot.theta = -((vv[passes - 2] * ff) / (1 - ff * uu[passes - 2]))
      break
    }
  }

  for (let i = passes - 2; i >= 0; i -= 1) {
    knots[i].theta = vv[i] - knots[i].next.theta * uu[i]
  }
}
