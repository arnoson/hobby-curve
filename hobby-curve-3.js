// @ts-check

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
  knotsAreEqual,
  knotIsBreakpoint,
  reduceAngle,
  curlRatio,
  abVsCd,
  sinCos,
  velocity,
  TYPE_ENDPOINT,
  TYPE_EXPLICIT,
  TYPE_GIVEN,
  TYPE_CURL,
  TYPE_OPEN,
  TYPE_END_CYCLE,
} from './utils.js'

const UNITY = 1

/**
 * @param {Array<Knot>} knots
 */
export const makeChoices = knots => {
  const firstKnot = knots[0]

  // If consecutive knots are equal, join them explicitly.
  let p = firstKnot
  while (p) {
    let q = p.next

    if (knotsAreEqual(p, q)) {
      p.rightType = TYPE_EXPLICIT
      if (p.leftType == TYPE_OPEN) {
        p.leftType = TYPE_CURL
        p.leftX = UNITY
      }

      q.leftType = TYPE_EXPLICIT
      if (q.rightType == TYPE_OPEN) {
        q.rightType = TYPE_CURL
        q.rightX = UNITY
      }

      p.rightX = p.x
      p.rightY = p.y

      q.leftX = p.x
      q.leftY = p.y
    }
    p = q

    if (p == firstKnot) break
  }

  // Find the first breakpoint `h` on the path or insert an artificial
  // breakpoint if the path is an unbroken cycle .
  let h = knots.find(knotIsBreakpoint) ?? firstKnot
  if (h == firstKnot) h.leftType = TYPE_END_CYCLE

  p = h
  do {
    // Fill in the control points between `p` and the next breakpoint, then
    // advance `p` to that breakpoint.
    let q = p.next
    if (p.rightType >= TYPE_GIVEN) {
      // Advance until we find another breakpoint. The breakpoints are now
      // `p` and `q`.
      while (!knotIsBreakpoint(q)) {
        q = q.next
      }

      // Calculate the turning angles `psi_k` and the distances `d(k, k+1)`.
      let k = 0
      let s = p
      let n = knots.length

      const deltaX = []
      const deltaY = []
      const delta = []
      const psi = [null]

      do {
        let t = s.next

        deltaX.push(t.x - s.x)
        deltaY.push(t.y - s.y)
        delta.push(Math.hypot(deltaX[k], deltaY[k]))

        if (k > 0) {
          const sine = deltaY[k - 1] / delta[k - 1]
          const cosine = deltaX[k - 1] / delta[k - 1]
          psi.push(
            Math.atan2(
              deltaY[k] * cosine - deltaX[k] * sine,
              deltaX[k] * cosine + deltaY[k] * sine
            )
          )
        }

        k += 1
        s = t
        if (s == q) {
          n = k
        }
      } while (k < n || s.leftType == TYPE_END_CYCLE)

      if (k == n) {
        psi.push(0)
      } else {
        // For closed paths:
        psi.push(psi[1])
      }

      // Remove open types at the breakpoints.
      if (q.leftType == TYPE_OPEN) {
        const deltaX = q.rightX - q.x
        const deltaY = q.rightY - q.y
        if (deltaX ** 2 + deltaY ** 2 < Number.EPSILON ** 2) {
          // Use curl if the controls are not usable for giving an angle.
          q.leftType = TYPE_CURL
          q.leftX = UNITY
        } else {
          q.leftType = TYPE_GIVEN
          q.leftX = Math.atan2(deltaY, deltaX)
        }
      }

      if (p.rightType == TYPE_OPEN && p.leftType == TYPE_EXPLICIT) {
        const deltaX = p.x - p.leftX
        const deltaY = p.y - p.leftY
        if (deltaX ** 2 + deltaY ** 2 < Number.EPSILON ** 2) {
          p.rightType = TYPE_CURL
          p.rightX = UNITY
        } else {
          p.rightType = TYPE_GIVEN
          p.rightX = Math.atan2(deltaY, deltaX)
        }
      }

      solveChoices(p, q, n, deltaX, deltaY, delta, psi)
    } else if (p.rightType == TYPE_ENDPOINT) {
      // Give reasonable values for the unused control points between `p` and
      // `q`.
      p.rightX = p.x
      p.rightY = p.y

      q.leftX = q.x
      q.leftY = q.y
    }
  } while (p && p != h)
}

/**
 * @param {Knot} p knot
 * @param {Knot} q next knot
 * @param {number} n number of knots
 * @param {number[]} deltaX
 * @param {number[]} deltaY
 * @param {number[]} delta
 * @param {number[]} psi
 * @returns
 */
var solveChoices = function (p, q, n, deltaX, deltaY, delta, psi) {
  var acc
  var lt
  var t
  var ff
  var rt
  var cc

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
  /** @type {Knot} */
  let r = null

  while (true) {
    t = s.next
    if (k == 0) {
      // Get the linear equations started or return with the control points in
      // place, if linear equations needn't be solved.
      if (s.rightType == TYPE_GIVEN) {
        if (t.leftType == TYPE_GIVEN) {
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
        if (s.rightType == TYPE_CURL) {
          if (t.leftType == TYPE_CURL) {
            // Reduce to simple case of straight line and return.
            p.rightType = TYPE_EXPLICIT
            q.leftType = TYPE_EXPLICIT
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
          if (s.rightType == TYPE_OPEN) {
            uu[0] = 0
            vv[0] = 0
            ww[0] = 1
          }
        }
      }
    } else {
      if (s.leftType == TYPE_END_CYCLE || s.leftType == TYPE_OPEN) {
        // Set up equation to match mock curvatures at z_k; then finish loop with
        // theta_n adjusted to equal theta_0, if a cycle has ended.

        // Calculate the values:
        // aa = Ak/Bk, bb = Dk/Ck, dd = (3-alpha_{k-1})d(k,k+1),
        // ee = (3-beta_{k+1})d(k-1,k), cc=(Bk-uk-Ak)/Bk
        let aa = UNITY / (3.0 * Math.abs(r.rightY) - UNITY)
        let dd = delta[k] * (3 - UNITY / Math.abs(r.rightY))

        let bb = UNITY / (3 * Math.abs(t.leftY) - UNITY)
        let ee = delta[k - 1] * (3 - UNITY / Math.abs(t.leftY))

        let cc = 1 - uu[k - 1] * aa

        // Calculate the ratio ff = Ck/(Ck + Bk - uk-1Ak).
        dd = dd * cc
        let lt = Math.abs(s.leftY)
        let rt = Math.abs(s.rightY)

        if (lt < rt) {
          dd *= (lt / rt) ** 2
        } else {
          if (lt > rt) {
            ee *= (rt / lt) ** 2
          }
        }

        ff = ee / (ee + dd)
        uu[k] = ff * bb
        acc = -(psi[k + 1] * uu[k])

        // Calculate the values of vk and wk
        if (r.rightType == TYPE_CURL) {
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
        if (s.leftType == TYPE_END_CYCLE) {
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
        if (s.leftType == TYPE_CURL) {
          cc = s.leftX
          lt = Math.abs(s.leftY)
          rt = Math.abs(r.rightY)
          ff = curlRatio(cc, lt, rt)
          theta[n] = -((vv[n - 1] * ff) / (1 - ff * uu[n - 1]))
          break
        } else {
          if (s.leftType == TYPE_GIVEN) {
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
 * @param {Knot} p
 * @param {Knot} q
 * @param {number} deltaX
 * @param {number} deltaY
 * @param {number} st
 * @param {number} ct
 * @param {number} sf
 * @param {number} cf
 */
var setControls = function (p, q, deltaX, deltaY, st, ct, sf, cf) {
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

  p.rightType = TYPE_EXPLICIT
  q.leftType = TYPE_EXPLICIT
}

class Knot {
  /** @type {Knot | null} */
  next = null

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} tension
   */
  constructor(x, y, tension) {
    this.x = x
    this.y = y
    this.leftType = TYPE_OPEN
    this.rightType = TYPE_OPEN
    this.leftY = tension
    this.rightY = tension
    this.leftX = tension
    this.rightX = tension
  }
}

/**
 * @param {[number, number][]} points
 * @param {*} tension
 * @param {*} cycle
 * @returns
 */
const createKnots = (points, tension = 1, cycle = false) => {
  /** @type {Knot[]} */
  const knots = points.map(([x, y]) => new Knot(x, y, tension))
  const firstKnot = knots[0]
  const lastKnot = knots[knots.length - 1]

  for (let i = 0; i < knots.length; i++) {
    knots[i].next = knots[i + 1] ?? firstKnot
  }

  if (!cycle) {
    lastKnot.rightType = TYPE_ENDPOINT
    lastKnot.leftType = TYPE_CURL
    firstKnot.rightType = TYPE_CURL
  }

  return knots
}

export const createHobbyCurve = (points, tension = 1, cyclic = false) => {
  const knots = createKnots(points, tension, cyclic)
  makeChoices(knots)
  return knots
}
