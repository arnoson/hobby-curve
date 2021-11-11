import { Knot, Type, curlRatio } from './utils'

const UNITY = 1

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
  const passes = cyclic ? knots.length + 1 : knots.length

  // Solve first knot.
  if (!cyclic) {
    const nextKnot = firstKnot.next

    console.log(nextKnot.leftType)

    if (nextKnot.leftType == Type.Curl) {
      console.log('je')

      // Reduce to simple case of straight line and return.
      firstKnot.rightType = Type.Explicit
      nextKnot.leftType = Type.Explicit
      const lt = Math.abs(nextKnot.leftY)
      const rt = Math.abs(firstKnot.rightY)

      let ff = UNITY / (3.0 * rt)
      firstKnot.rightX = firstKnot.x + firstKnot.deltaX * ff
      firstKnot.rightY = firstKnot.y + firstKnot.deltaY * ff

      ff = UNITY / (3.0 * lt)
      nextKnot.leftX = nextKnot.x - firstKnot.deltaX * ff
      nextKnot.leftY = nextKnot.y - firstKnot.deltaY * ff

      return
    } else {
      const cc = firstKnot.rightX
      const lt = Math.abs(nextKnot.leftY)
      const rt = Math.abs(firstKnot.rightY)
      uu[0] = curlRatio(cc, rt, lt)
      vv[0] = -(secondKnot.psi * uu[0])
      ww[0] = 0
    }
  } else {
    uu[0] = 0
    vv[0] = 0
    ww[0] = 1
  }

  // Solve remaining knots (and cycle back to first if path is cyclic).
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
      let aa = UNITY / (3.0 * Math.abs(prevKnot!.rightY) - UNITY)
      let dd = knot.delta * (3 - UNITY / Math.abs(prevKnot!.rightY))

      let bb = UNITY / (3 * Math.abs(nextKnot.leftY) - UNITY)
      let ee = prevKnot.delta * (3 - UNITY / Math.abs(nextKnot.leftY))

      const cc = 1 - uu[i - 1] * aa

      // Calculate the ratio ff = Ck/(Ck + Bk - uk-1Ak).
      dd = dd * cc
      const lt = Math.abs(knot.leftY)
      const rt = Math.abs(knot.rightY)
      if (lt < rt) {
        dd *= (lt / rt) ** 2
      } else {
        if (lt > rt) {
          ee *= (rt / lt) ** 2
        }
      }
      let ff = ee / (ee + dd)
      uu[i] = ff * bb

      // Calculate the values of vk and wk
      let acc = -(nextKnot.psi * uu[i])
      if (prevKnot!.rightType == Type.Curl) {
        ww[i] = 0
        vv[i] = acc - secondKnot.psi * (1 - ff)
      } else {
        ff = (1 - ff) / cc
        acc = acc - knot.psi * ff
        ff = ff * aa
        vv[i] = acc - vv[i - 1] * ff
        ww[i] = -(ww[i - 1] * ff)
      }

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
      const cc = knot.leftX
      const lt = Math.abs(knot.leftY)
      const rt = Math.abs(prevKnot!.rightY)
      const ff = curlRatio(cc, lt, rt)
      lastKnot.theta = -((vv[passes - 2] * ff) / (1 - ff * uu[passes - 2]))
      break
    }
  }

  for (let i = passes - 2; i >= 0; i -= 1) {
    const knot = knots[i]
    knot.theta = vv[i] - knot.next.theta * uu[i]
  }
}
