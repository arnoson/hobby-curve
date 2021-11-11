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

const TYPE_ENDPOINT = 0
const TYPE_EXPLICIT = 1
const TYPE_GIVEN = 2
const TYPE_CURL = 3
const TYPE_OPEN = 4
const TYPE_END_CYCLE = 5

const UNITY = 1

const knotsAreEqual = (knot, nextKnot) =>
  knot.rightType > TYPE_EXPLICIT &&
  (knot.x - nextKnot.x) ** 2 + (knot.y - nextKnot.y) ** 2 < Number.EPSILON ** 2

const knotIsBreakpoint = knot =>
  knot.leftType != TYPE_OPEN || knot.rightType != TYPE_OPEN

export var makeChoices = function (knots) {
  let delX
  let delY
  let numKnots
  let s
  let t
  // "Implements mp_make_choices from metapost (mp.c)";

  const firstKnot = knots[0]

  let currentKnot = firstKnot
  let nextKnot = currentKnot.next

  // If consecutive knots are equal, join them explicitly.
  for (const knot of knots) {
    const nextKnot = knot.next

    if (knotsAreEqual(knot, nextKnot)) {
      knot.rightType = TYPE_EXPLICIT
      if (knot.leftType == TYPE_OPEN) {
        knot.leftType = TYPE_CURL
        knot.leftX = UNITY
      }

      nextKnot.leftType = TYPE_EXPLICIT
      if (nextKnot.rightType == TYPE_OPEN) {
        nextKnot.rightType = TYPE_CURL
        nextKnot.rightX = UNITY
      }

      knot.rightX = knot.x
      knot.rightY = knot.y

      nextKnot.leftX = knot.x
      nextKnot.leftY = knot.y
    }
  }

  // If there are no breakpoints, it is necessary to compute the direction
  // angles around an entire cycle. In this case the left type of the first node
  // is temporarily changed `TYPE_END_CYCLE`.
  // Find the first breakpoint on the path and insert an artificial breakpoint
  // if the path is an unbroken cycle.
  const firstBreakpoint = knots.find(knotIsBreakpoint) ?? firstKnot

  if (firstBreakpoint == firstKnot) {
    firstBreakpoint.leftType = TYPE_END_CYCLE
  }

  currentKnot = firstBreakpoint
  while (true) {
    if (!currentKnot) break

    // Fill in the control points between the first breakpoint and the next breakpoint, then advance to that breakpoint
    nextKnot = currentKnot.next
    if (currentKnot.rightType >= TYPE_GIVEN) {
      while (!knotIsBreakpoint(nextKnot)) {
        nextKnot = nextKnot.next
      }

      let index = 0
      s = currentKnot
      numKnots = knots

      const deltaX = []
      const deltaY = []
      const delta = []
      const turningAngles = [null]

      while (true) {
        t = s.next

        deltaX.push(t.x - s.x)
        deltaY.push(t.y - s.y)
        delta.push(Math.hypot(deltaX[index], deltaY[index]))

        if (index > 0) {
          const sin = deltaY[index - 1] / delta[index - 1]
          const cos = deltaX[index - 1] / delta[index - 1]

          turningAngles.push(
            Math.atan2(
              deltaY[index] * cos - deltaX[index] * sin,
              deltaX[index] * cos + deltaY[index] * sin
            )
          )
        }

        index += 1

        s = t
        if (s == nextKnot) {
          numKnots = index
        }
        if (index >= numKnots && s.leftType != TYPE_END_CYCLE) {
          break
        }
      }

      if (index == numKnots) {
        turningAngles.push(0)
      } else {
        turningAngles.push(turningAngles[1])
      }

      if (nextKnot.leftType == TYPE_OPEN) {
        delX = nextKnot.rightX - nextKnot.x
        delY = nextKnot.rightY - nextKnot.y
        if (
          Math.pow(delX, 2) + Math.pow(delY, 2) <
          Math.pow(Number.EPSILON, 2)
        ) {
          nextKnot.leftType = TYPE_CURL
          nextKnot.leftX = UNITY
        } else {
          nextKnot.leftType = TYPE_GIVEN
          nextKnot.leftX = Math.atan2(delY, delX)
        }
      }
      if (
        currentKnot.rightType == TYPE_OPEN &&
        currentKnot.leftType == TYPE_EXPLICIT
      ) {
        delX = currentKnot.x - currentKnot.leftX
        delY = currentKnot.y - currentKnot.leftY
        if (
          Math.pow(delX, 2) + Math.pow(delY, 2) <
          Math.pow(Number.EPSILON, 2)
        ) {
          currentKnot.rightType = TYPE_CURL
          currentKnot.rightX = UNITY
        } else {
          currentKnot.rightType = TYPE_GIVEN
          currentKnot.rightX = Math.atan2(delY, delX)
        }
      }
      mp_solve_choices(
        currentKnot,
        nextKnot,
        numKnots,
        deltaX,
        deltaY,
        delta,
        turningAngles
      )
    } else if (currentKnot.rightType == TYPE_ENDPOINT) {
      currentKnot.rightX = currentKnot.x
      currentKnot.rightY = currentKnot.y
      nextKnot.leftX = nextKnot.x
      nextKnot.leftY = nextKnot.y
    }
    currentKnot = nextKnot
    if (currentKnot == firstBreakpoint) {
      break
    }
  }
}

var mp_solve_choices = function (p, q, n, delta_x, delta_y, delta, psi) {
  var aa, acc, vv, bb, ldelta, ee, k, s, ww, uu, lt, r, t, ff, theta, rt, dd, cc
  // "Implements mp_solve_choices form metapost (mp.c)";
  ldelta = delta.length + 1
  uu = new Array(ldelta)
  ww = new Array(ldelta)
  vv = new Array(ldelta)
  theta = new Array(ldelta)
  for (var i = 0; i < ldelta; i++) {
    theta[i] = vv[i] = ww[i] = uu[i] = 0
  }
  k = 0
  s = p
  r = 0
  while (true) {
    t = s.next
    if (k == 0) {
      if (s.rightType == TYPE_GIVEN) {
        if (t.leftType == TYPE_GIVEN) {
          aa = Math.atan2(delta_y[0], delta_x[0])
          const ct_st = mp_n_sin_cos((p.rightX = -aa))
          ct = ct_st[0]
          st = ct_st[1]
          cf_sf = mp_n_sin_cos(q.leftX - aa)
          cf = cf_sf[0]
          sf = cf_sf[1]
          mp_set_controls(p, q, delta_x[0], delta_y[0], st, ct, -sf, cf)
          return
        } else {
          vv[0] = s.rightX = -Math.atan(delta_y[0], delta_x[0])
          vv[0] = reduceAngle(vv[0])
          uu[0] = 0
          ww[0] = 0
        }
      } else {
        if (s.rightType == TYPE_CURL) {
          if (t.leftType == TYPE_CURL) {
            p.rightType = TYPE_EXPLICIT
            q.leftType = TYPE_EXPLICIT
            lt = Math.abs(q.leftY)
            rt = Math.abs(p.rightY)
            ff = UNITY / (3.0 * rt)
            p.rightX = p.x + delta_x[0] * ff
            p.rightY = p.y + delta_y[0] * ff
            ff = UNITY / (3.0 * lt)
            q.leftX = q.x - delta_x[0] * ff
            q.leftY = q.y - delta_y[0] * ff
            return
          } else {
            cc = s.rightX
            lt = Math.abs(t.leftY)
            rt = Math.abs(s.rightY)
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
        aa = UNITY / (3.0 * Math.abs(r.rightY) - UNITY)
        dd = delta[k] * (3 - UNITY / Math.abs(r.rightY))
        bb = UNITY / (3 * Math.abs(t.leftY) - UNITY)
        ee = delta[k - 1] * (3 - UNITY / Math.abs(t.leftY))
        cc = 1 - uu[k - 1] * aa
        dd = dd * cc
        lt = Math.abs(s.leftY)
        rt = Math.abs(s.rightY)
        if (lt < rt) {
          dd *= Math.pow(lt / rt, 2)
        } else {
          if (lt > rt) {
            ee *= Math.pow(rt / lt, 2)
          }
        }
        ff = ee / (ee + dd)
        uu[k] = ff * bb
        acc = -(psi[k + 1] * uu[k])
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
        if (s.leftType == TYPE_END_CYCLE) {
          aa = 0
          bb = 1
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
            theta[n] = s.leftX - Math.atan2(delta_y[n - 1], delta_x[n - 1])
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

  for (var k = n - 1; k > -1; k -= 1) {
    theta[k] = vv[k] - theta[k + 1] * uu[k]
  }
  s = p
  k = 0
  while (true) {
    t = s.next
    const ct_st = mp_n_sin_cos(theta[k])
    const ct = ct_st[0]
    const st = ct_st[1]
    const cf_sf = mp_n_sin_cos(-psi[k + 1] - theta[k + 1])
    const cf = cf_sf[0]
    const sf = cf_sf[1]
    mp_set_controls(s, t, delta_x[k], delta_y[k], st, ct, sf, cf)
    k += 1
    s = t
    if (k == n) {
      break
    }
  }
}

var mp_n_sin_cos = function (z) {
  return [Math.cos(z), Math.sin(z)]
}
var mp_set_controls = function (p, q, delta_x, delta_y, st, ct, sf, cf) {
  const lt = Math.abs(q.leftY)
  const rt = Math.abs(p.rightY)
  const rr = velocity(st, ct, sf, cf, rt)
  const ss = velocity(sf, cf, st, ct, lt)

  if (p.rightY < 0 || q.leftY < 0) {
    if ((st >= 0 && sf >= 0) || (st <= 0 && sf <= 0)) {
      sine = Math.abs(st) * cf + Math.abs(sf) * ct
      if (sine > 0) {
        sine *= 1.00024414062
        if (p.rightY < 0) {
          if (mp_ab_vs_cd(Math.abs(sf), 1, rr, sine) < 0) {
            rr = abs(sf) / sine
          }
        }
        if (q.leftY < 0) {
          if (mp_ab_vs_cd(Math.abs(st), 1, ss, sine) < 0) {
            ss = Math.abs(st) / sine
          }
        }
      }
    }
  }
  p.rightX = p.x + (delta_x * ct - delta_y * st) * rr
  p.rightY = p.y + (delta_y * ct + delta_x * st) * rr
  q.leftX = q.x - (delta_x * cf + delta_y * sf) * ss
  q.leftY = q.y - (delta_y * cf - delta_x * sf) * ss
  p.rightType = TYPE_EXPLICIT
  q.leftType = TYPE_EXPLICIT
}

const curlRatio = (gamma, a_tension, b_tension) => {
  var alpha, beta
  alpha = 1.0 / a_tension
  beta = 1.0 / b_tension
  return Math.min(
    4.0,
    ((3.0 - alpha) * Math.pow(alpha, 2) * gamma + Math.pow(beta, 3)) /
      (Math.pow(alpha, 3) * gamma + (3.0 - beta) * Math.pow(beta, 2))
  )
}
var mp_ab_vs_cd = function (a, b, c, d) {
  if (a * b == c * d) {
    return 0
  }
  if (a * b > c * d) {
    return 1
  }
  return -1
}

const velocity = (st, ct, sf, cf, t) =>
  Math.min(
    4.0,
    (2.0 + Math.sqrt(2) * (st - sf / 16.0) * (sf - st / 16.0) * (ct - cf)) /
      (1.5 * t * (2 + (Math.sqrt(5) - 1) * ct + (3 - Math.sqrt(5)) * cf))
  )

const reduceAngle = angle =>
  Math.abs(angle) > Math.PI
    ? angle > 0
      ? angle - 2 * Math.PI
      : angle + 2 * Math.PI
    : angle

const createPoint = ([x, y]) => ({
  x,
  y,

  leftType: TYPE_OPEN,
  rightType: TYPE_OPEN,

  leftY: tension,
  leftX: tension,

  rightY: tension,
  rightX: tension,
})

export var makeKnots = function (points, tension = 1, cycle) {
  const knots = points.map(createPoint)

  for (let i = 0; i < knots.length; i++) {
    knots[i].next = knots[i + 1]
  }
  knots[knots.length - 1].next = knots[0]

  if (!cycle) {
    knots[knots.length - 1].rightType = TYPE_ENDPOINT
    knots[knots.length - 1].leftType = TYPE_CURL
    knots[0].rightType = TYPE_CURL
  }

  return knots
}
