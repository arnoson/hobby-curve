// @ts-check

/*
I cleaned up and rewrote vlad-x's hobby-curves
(https://github.com/vlad-x/hobby-curves) to modern javascript/typescript and
added some of the comments from the PyX implementation for better understanding.
*/

/* Metapost/Hobby curves

Ported to javascript from the PyX implementation (http://pyx.sourceforge.net/)
Copyright (C) 2011 Michael Schindler <m-schindler@users.sourceforge.net>

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
*/

/* Internal functions of MetaPost
This file re-implements some of the functionality of MetaPost
(http://tug.org/metapost). MetaPost was developed by John D. Hobby and
others. The code of Metapost is in the public domain, which we understand as
an implicit permission to reuse the code here (see the comment at
http://www.gnu.org/licenses/license-list.html)

This file is based on the MetaPost version distributed by TeXLive:
svn://tug.org/texlive/trunk/Build/source/texk/web2c/mplibdir revision 22737 #
(2011-05-31)
*/

import {
  abVsCd,
  curlRatio,
  Knot,
  knotIsBreakpoint,
  knotsAreEqual,
  reduceAngle,
  sinCos,
  Type,
  velocity,
} from './utils'

const UNITY = 1

const calcDeltaValues = (knots: Knot[], cyclic: boolean) => {
  const deltaX = []
  const deltaY = []
  const delta = []

  const end = cyclic ? knots.length : knots.length - 1
  for (let i = 0; i < end; i++) {
    const knot = knots[i]
    const nextKnot = knots[i + 1] ?? knots[0]

    deltaX[i] = nextKnot.x - knot.x
    deltaY[i] = nextKnot.y - knot.y
    delta[i] = Math.hypot(deltaX[i], deltaY[i])
  }

  return [deltaX, deltaY, delta]
}

const calcPsiValues = (
  knots: Knot[],
  deltaX: number[],
  deltaY: number[],
  delta: number[],
  cyclic: boolean
) => {
  const psi: number[] = []

  const [start, end] = cyclic ? [0, knots.length] : [1, knots.length - 1]
  for (let i = start; i < end; i++) {
    const lastIndex = i === 0 ? knots.length - 1 : i - 1
    const sin = deltaY[lastIndex] / delta[lastIndex]
    const cos = deltaX[lastIndex] / delta[lastIndex]

    psi.push(
      Math.atan2(
        deltaY[i] * cos - deltaX[i] * sin,
        deltaX[i] * cos + deltaY[i] * sin
      )
    )
  }

  return psi
}

const makeChoices = (knots: Knot[], cyclic = true) => {
  const [deltaX, deltaY, delta] = calcDeltaValues(knots, cyclic)
  const psi = calcPsiValues(knots, deltaX, deltaY, delta, cyclic)

  const n = cyclic ? knots.length : knots.length - 1

  if (cyclic) {
    deltaX.push(deltaX[0])
    deltaY.push(deltaY[0])
    delta.push(delta[0])

    psi.push(psi.shift())
    psi.push(psi[0])
  } else {
    psi.push(0)
  }

  psi.unshift(0)

  solveChoices(knots[0], knots[1], n, deltaX, deltaY, delta, psi)

  console.log('simple')
  console.log({ delta, deltaX, deltaY, psi })
}

const solveChoices = function (
  p: Knot,
  q: Knot,
  n: number,
  deltaX: number[],
  deltaY: number[],
  delta: number[],
  psi: number[]
) {
  let t
  let ff

  // The 'matrix' is in tridiagonal form, the solution is obtained by Gaussian
  // elimination. `uu` and `ww` are of type fraction, vv and theta are of type
  // angle.
  const matrixLength = delta.length + 1
  // Relations between adjacent angles ('matrix' entries).
  const uu = new Array(matrixLength).fill(0)
  // Additional matrix entries for the cyclic case.
  const ww = new Array(matrixLength).fill(0)
  // Angles ('rhs' entries)
  const vv = new Array(matrixLength).fill(0)
  // Solution of the linear system of equations.
  const theta = new Array(matrixLength).fill(0)

  var k = 0 // current knot index
  let s = p
  let r: Knot | null = null

  while (true) {
    t = s.next
    if (k == 0) {
      // Get the linear equations started or return with the control points in
      // place, if linear equations needn't be solved.
      if (s.rightType == Type.Given) {
        if (t.leftType == Type.Given) {
          // Reduce to simple case of two givens and return.
          const aa = Math.atan2(deltaY[0], deltaX[0])
          const [ct, st] = sinCos(p.rightX - aa)
          const [cf, sf] = sinCos(q.leftX - aa)
          setControls(p, q, deltaX[0], deltaY[0], st, ct, -sf, cf)
          return
        } else {
          vv[0] = s.rightX - Math.atan2(deltaY[0], deltaX[0])
          vv[0] = reduceAngle(vv[0])
          uu[0] = 0
          ww[0] = 0
        }
      } else {
        if (s.rightType == Type.Curl) {
          if (t.leftType == Type.Curl) {
            // Reduce to simple case of straight line and return.
            p.rightType = Type.Explicit
            q.leftType = Type.Explicit
            const lt = Math.abs(q.leftY)
            const rt = Math.abs(p.rightY)

            let ff = UNITY / (3.0 * rt)
            p.rightX = p.x + deltaX[0] * ff
            p.rightY = p.y + deltaY[0] * ff

            ff = UNITY / (3.0 * lt)
            q.leftX = q.x - deltaX[0] * ff
            q.leftY = q.y - deltaY[0] * ff
            return
          } else {
            const cc = s.rightX
            const lt = Math.abs(t.leftY)
            const rt = Math.abs(s.rightY)
            uu[0] = curlRatio(cc, rt, lt)
            vv[0] = -(psi[1] * uu[0])
            ww[0] = 0
          }
        } else {
          if (s.rightType == Type.Open) {
            uu[0] = 0
            vv[0] = 0
            ww[0] = 1
          }
        }
      }
    } else {
      if (s.leftType == Type.EndCycle || s.leftType == Type.Open) {
        // Set up equation to match mock curvatures at z_k; then finish loop with
        // theta_n adjusted to equal theta_0, if a cycle has ended.

        // Calculate the values:
        // aa = Ak/Bk, bb = Dk/Ck, dd = (3-alpha_{k-1})d(k,k+1),
        // ee = (3-beta_{k+1})d(k-1,k), cc=(Bk-uk-Ak)/Bk
        let aa = UNITY / (3.0 * Math.abs(r!.rightY) - UNITY)
        let dd = delta[k] * (3 - UNITY / Math.abs(r!.rightY))

        let bb = UNITY / (3 * Math.abs(t.leftY) - UNITY)
        let ee = delta[k - 1] * (3 - UNITY / Math.abs(t.leftY))

        const cc = 1 - uu[k - 1] * aa

        // Calculate the ratio ff = Ck/(Ck + Bk - uk-1Ak).
        dd = dd * cc
        const lt = Math.abs(s.leftY)
        const rt = Math.abs(s.rightY)

        if (lt < rt) {
          dd *= (lt / rt) ** 2
        } else {
          if (lt > rt) {
            ee *= (rt / lt) ** 2
          }
        }

        let ff = ee / (ee + dd)
        uu[k] = ff * bb
        let acc = -(psi[k + 1] * uu[k])

        // Calculate the values of vk and wk
        if (r!.rightType == Type.Curl) {
          ww[k] = 0
          vv[k] = acc - psi[1] * (1 - ff)
        } else {
          ff = (1 - ff) / cc
          acc = acc - psi[k] * ff
          ff = ff * aa
          vv[k] = acc - vv[k - 1] * ff
          ww[k] = -(ww[k - 1] * ff)
        }

        // Adjust theta_n to equal theta_0 and finish loop.
        if (s.leftType == Type.EndCycle) {
          let aa = 0
          let bb = 1
          while (true) {
            k -= 1
            if (k == 0) {
              k = n
            }
            aa = vv[k] - aa * uu[k]
            bb = ww[k] - bb * uu[k]
            if (k == n) {
              break
            }
          }

          aa = aa / (1 - bb)
          theta[n] = aa
          vv[0] = aa
          for (var k = 1; k < n; k++) {
            vv[k] = vv[k] + aa * ww[k]
          }

          break
        }
      } else {
        if (s.leftType == Type.Curl) {
          const cc = s.leftX
          const lt = Math.abs(s.leftY)
          const rt = Math.abs(r!.rightY)
          const ff = curlRatio(cc, lt, rt)
          theta[n] = -((vv[n - 1] * ff) / (1 - ff * uu[n - 1]))
          break
        } else {
          if (s.leftType == Type.Given) {
            theta[n] = s.leftX - Math.atan2(deltaY[n - 1], deltaX[n - 1])
            theta[n] = reduceAngle(theta[n])
            break
          }
        }
      }
    }
    r = s
    s = t
    k += 1
  }

  // Finish choosing angles and assigning control points.
  for (let i = n - 1; i > -1; i -= 1) {
    theta[i] = vv[i] - theta[i + 1] * uu[i]
  }

  s = p
  k = 0
  while (true) {
    t = s.next
    const [ct, st] = sinCos(theta[k])
    const [cf, sf] = sinCos(-psi[k + 1] - theta[k + 1])
    setControls(s, t, deltaX[k], deltaY[k], st, ct, sf, cf)
    k += 1
    s = t
    if (k == n) {
      break
    }
  }
}

/**
 * Put the control points into a pair of consecutive knots p and q. Global
 * variables are used to record the values of sin(theta), cos(theta), sin(phi),
 * and cos(phi) needed in this  calculation.
 */
const setControls = (
  p: Knot,
  q: Knot,
  deltaX: number,
  deltaY: number,
  st: number,
  ct: number,
  sf: number,
  cf: number
) => {
  let lt = Math.abs(q.leftY)
  let rt = Math.abs(p.rightY)
  let rr = velocity(st, ct, sf, cf, rt)
  let ss = velocity(sf, cf, st, ct, lt)

  if (p.rightY < 0 || q.leftY < 0) {
    // Decrease the velocities, if necessary, to stay inside the bounding
    // triangle.
    if ((st >= 0 && sf >= 0) || (st <= 0 && sf <= 0)) {
      let sine = Math.abs(st) * cf + Math.abs(sf) * ct
      if (sine > 0) {
        sine *= 1.00024414062 // safety factor
        if (p.rightY < 0) {
          if (abVsCd(Math.abs(sf), 1, rr, sine) < 0) {
            rr = Math.abs(sf) / sine
          }
        }
        if (q.leftY < 0) {
          if (abVsCd(Math.abs(st), 1, ss, sine) < 0) {
            ss = Math.abs(st) / sine
          }
        }
      }
    }
  }

  p.rightX = p.x + (deltaX * ct - deltaY * st) * rr
  p.rightY = p.y + (deltaY * ct + deltaX * st) * rr

  q.leftX = q.x - (deltaX * cf + deltaY * sf) * ss
  q.leftY = q.y - (deltaY * cf - deltaX * sf) * ss

  p.rightType = Type.Explicit
  q.leftType = Type.Explicit
}

const createKnot = (x, y, tension) => ({
  x: x,
  y: y,
  leftType: Type.Open,
  rightType: Type.Open,
  leftY: tension,
  rightY: tension,
  leftX: tension,
  rightX: tension,
})

const createKnots = (
  points: [number, number][],
  tension: any = 1,
  cyclic: any = false
) => {
  // @ts-ignore (`next` will be set later)
  const knots: Knot[] = points.map(([x, y]) => createKnot(x, y, tension))
  const firstKnot = knots[0]
  const lastKnot = knots[knots.length - 1]

  for (let i = 0; i < knots.length; i++) {
    knots[i].next = knots[i + 1] ?? firstKnot
  }

  if (cyclic) {
    firstKnot.leftType = Type.EndCycle
    firstKnot.rightType = Type.Open
  } else {
    firstKnot.leftType = Type.EndCycle
    firstKnot.rightType = Type.Curl

    lastKnot.leftType = Type.Curl
    lastKnot.rightType = Type.Endpoint
  }

  return knots
}

export const createHobbyCurve = (
  points: [number, number][],
  tension = 1,
  cyclic = false
) => {
  const knots = createKnots(points, tension, cyclic)
  makeChoices(knots)
  console.log('nope', knots)

  const knots2 = createKnots(points, tension, cyclic)
  makeChoices(knots2, cyclic)
  console.log('simple', knots2)

  return knots2
}
