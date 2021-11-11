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

import { abGreaterCd, curlRatio, Knot, sinCos, Type, velocity } from './utils'

const UNITY = 1

const calcDeltaValues = (knots: Knot[], cyclic: boolean) => {
  const deltaX = []
  const deltaY = []
  const delta = []

  const end = cyclic ? knots.length : knots.length - 1
  for (let i = 0; i < end; i++) {
    const knot = knots[i]
    const nextKnot = knots[i + 1] ?? knots[0]

    knot.deltaX = nextKnot.x - knot.x
    knot.deltaY = nextKnot.y - knot.y
    knot.delta = Math.hypot(knot.deltaX, knot.deltaY)

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

    const value = Math.atan2(
      deltaY[i] * cos - deltaX[i] * sin,
      deltaX[i] * cos + deltaY[i] * sin
    )

    knots[i].psi = value

    psi.push(value)
  }

  return psi
}

const makeChoices = (knots: Knot[], cyclic = true) => {
  const [deltaX, deltaY, delta] = calcDeltaValues(knots, cyclic)
  const psi = calcPsiValues(knots, deltaX, deltaY, delta, cyclic)

  if (cyclic) {
    psi.push(psi.shift())
  }

  psi.push(cyclic ? psi[0] : 0)
  psi.unshift(0)

  console.log(psi)
  console.log(knots.map(knot => knot.psi))

  solveChoices(knots, psi, cyclic)
}

const solveChoices = function (knots: Knot[], psi: number[], cyclic: boolean) {
  // The 'matrix' is in tridiagonal form, the solution is obtained by Gaussian
  // elimination. `uu` and `ww` are of type fraction, vv and theta are of type
  // angle.
  // Relations between adjacent angles ('matrix' entries).
  const uu = []
  // Additional matrix entries for the cyclic case.
  const ww = []
  // Angles ('rhs' entries)
  const vv = []
  // Solution of the linear system of equations.
  const theta = []

  const firstKnot = knots[0]
  const passes = cyclic ? knots.length + 1 : knots.length

  // Solve first knot.
  if (firstKnot.rightType == Type.Curl) {
    const nextKnot = firstKnot.next

    if (nextKnot.leftType == Type.Curl) {
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
      vv[0] = -(psi[1] * uu[0])
      ww[0] = 0
    }
  } else {
    if (firstKnot.rightType == Type.Open) {
      uu[0] = 0
      vv[0] = 0
      ww[0] = 1
    }
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

      console.log(psi[i], knot.psi)

      // Calculate the values of vk and wk
      let acc = -(psi[i + 1] * uu[i])
      if (prevKnot!.rightType == Type.Curl) {
        ww[i] = 0
        vv[i] = acc - psi[1] * (1 - ff)
      } else {
        ff = (1 - ff) / cc
        acc = acc - psi[i] * ff
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
        theta[passes - 1] = aa
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
      theta[passes - 1] = -((vv[passes - 2] * ff) / (1 - ff * uu[passes - 2]))
      break
    }
  }

  // Finish choosing angles and assigning control points.
  for (let i = passes - 2; i > -1; i -= 1) {
    theta[i] = vv[i] - theta[i + 1] * uu[i]
  }

  for (let i = 0; i < passes - 1; i++) {
    const knot = knots[i] ?? firstKnot
    const [ct, st] = sinCos(theta[i])
    const [cf, sf] = sinCos(-psi[i + 1] - theta[i + 1])
    setControls(knot, knot.next, knot.deltaX, knot.deltaY, st, ct, sf, cf)
  }
}

/**
 * Put the control points into a pair of consecutive knots p and q. Global
 * variables are used to record the values of sin(theta), cos(theta), sin(phi),
 * and cos(phi) needed in this  calculation.
 */
const setControls = (
  knot: Knot,
  nextKnot: Knot,
  deltaX: number,
  deltaY: number,
  st: number,
  ct: number,
  sf: number,
  cf: number
) => {
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

  knot.rightX = knot.x + (deltaX * ct - deltaY * st) * rr
  knot.rightY = knot.y + (deltaY * ct + deltaX * st) * rr

  nextKnot.leftX = nextKnot.x - (deltaX * cf + deltaY * sf) * ss
  nextKnot.leftY = nextKnot.y - (deltaY * cf - deltaX * sf) * ss

  knot.rightType = Type.Explicit
  nextKnot.leftType = Type.Explicit
}

const createKnot = (x: number, y: number, tension: number) => ({
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
    knots[i].prev = knots[i - 1] ?? lastKnot
    knots[i].index = i
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
  makeChoices(knots, cyclic)

  return knots
}
