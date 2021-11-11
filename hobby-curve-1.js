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

const TYPE_ENDPOINT = 0
const TYPE_EXPLICIT = 1
const TYPE_GIVEN = 2
const TYPE_CURL = 3
const TYPE_OPEN = 4
const TYPE_END_CYCLE = 5
const UNITY = 1

/**
 * @param {Knot} knot
 * @param {Knot} nextKnot
 */
const knotsAreEqual = (knot, nextKnot) =>
  knot.rightType > TYPE_EXPLICIT &&
  (knot.x - nextKnot.x) ** 2 + (knot.y - nextKnot.y) ** 2 < Number.EPSILON ** 2

/**
 * @param {Knot} knot
 */
const knotIsBreakpoint = knot =>
  knot.leftType != TYPE_OPEN || knot.rightType != TYPE_OPEN

/**
 * @param {Array<Knot>} knots
 */
export var makeChoices = function (knots) {
  let h
  let k
  let n

  /** @type {Knot} */
  let q

  /** @type {Knot} */
  let p

  let s
  let t

  const firstKnot = knots[0]

  // If consecutive knots are equal, join them explicitly.
  p = firstKnot
  while (p) {
    q = p.next

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

  // If there are no breakpoints, it is necessary to compute the direction
  // angles around an entire cycle. In this case the mp left type of the first
  // node is temporarily changed to end cycle. Find the first breakpoint `h` on
  // the path insert an artificial breakpoint if the path is an unbroken cycle .
  h = knots.find(knotIsBreakpoint) ?? firstKnot
  if (h == firstKnot) h.leftType = TYPE_END_CYCLE

  p = h
  while (p) {
    // Fill in the control points between `p` and the next breakpoint, then
    // advance `p` to that breakpoint.
    q = p.next
    if (p.rightType >= TYPE_GIVEN) {
      // Advance until we find another breakpoint. The breakpoints are now
      // `p` and `q`.
      while (!knotIsBreakpoint(q)) {
        q = q.next
      }

      // Calculate the turning angles `psi_k` and the distances `d(k, k+1)`.
      k = 0
      s = p
      n = knots.length

      const deltaX = []
      const deltaY = []
      const delta = []
      const psi = [null]

      do {
        t = s.next
        // None;
        deltaX.push(t.x - s.x)
        deltaY.push(t.y - s.y)
        delta.push(Math.hypot(deltaX[k], deltaY[k]))
        if (k > 0) {
          const sine = deltaY[k - 1] / delta[k - 1]
          const cosine = deltaX[k - 1] / delta[k - 1]
          psi.push(
            mp_n_arg(
              deltaX[k] * cosine + deltaY[k] * sine,
              deltaY[k] * cosine - deltaX[k] * sine
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
          q.leftX = mp_n_arg(deltaX, deltaY)
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
          p.rightX = mp_n_arg(deltaX, deltaY)
        }
      }

      mp_solve_choices(p, q, n, deltaX, deltaY, delta, psi)
    } else if (p.rightType == TYPE_ENDPOINT) {
      // Give reasonable values for the unused control points between `p` and
      // `q`.
      p.rightX = p.x
      p.rightY = p.y

      q.leftX = q.x
      q.leftY = q.y
    }

    p = q
    if (p == h) {
      break
    }
  }
}

/**
 * @param {Knot} p knot
 * @param {Knot} q next knot
 * @param {number} n number of knots
 * @param {number[]} delta_x
 * @param {number[]} delta_y
 * @param {number[]} delta
 * @param {number[]} psi
 * @returns
 */
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
  r = null
  while (true) {
    t = s.next
    if (k == 0) {
      if (s.rightType == TYPE_GIVEN) {
        if (t.leftType == TYPE_GIVEN) {
          aa = mp_n_arg(delta_x[0], delta_y[0])
          // tuple([ct, st]) = mp_n_sin_cos((p.right_curl() - aa));
          // tuple([cf, sf]) = mp_n_sin_cos((q.left_curl() - aa));
          const ct_st = mp_n_sin_cos(p.rightX - aa)
          const ct = ct_st[0]
          const st = ct_st[1]
          const cf_sf = mp_n_sin_cos(q.leftX - aa)
          const cf = cf_sf[0]
          const sf = cf_sf[1]
          mp_set_controls(p, q, delta_x[0], delta_y[0], st, ct, -sf, cf)
          return
        } else {
          vv[0] = s.rightX - mp_n_arg(delta_x[0], delta_y[0])
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
            uu[0] = mp_curl_ratio(cc, rt, lt)
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
          dd *= (lt / rt) ** 2
        } else {
          if (lt > rt) {
            ee *= (rt / lt) ** 2
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
          // k_val = range(1, n);
          // for (k_idx in k_val) {
          for (var k = 1; k < n; k++) {
            // k = k_val[k_idx];
            vv[k] = vv[k] + aa * ww[k]
          }
          break
        }
      } else {
        if (s.leftType == TYPE_CURL) {
          cc = s.leftX
          lt = Math.abs(s.leftY)
          rt = Math.abs(r.rightY)
          ff = mp_curl_ratio(cc, lt, rt)
          theta[n] = -((vv[n - 1] * ff) / (1 - ff * uu[n - 1]))
          break
        } else {
          if (s.leftType == TYPE_GIVEN) {
            theta[n] = s.leftX - mp_n_arg(delta_x[n - 1], delta_y[n - 1])
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
  // k_val = range((n - 1), -1, -1);
  // for k in range(n-1, -1, -1):
  // for (k_idx in k_val) {
  for (var k = n - 1; k > -1; k -= 1) {
    // console.log('theta0', k, vv[k], uu[k], theta[k + 1]);
    theta[k] = vv[k] - theta[k + 1] * uu[k]
    // console.log('theta', k, theta[k]);
  }
  s = p
  k = 0
  while (true) {
    t = s.next
    // tuple([ct, st]) = mp_n_sin_cos(theta[k]);
    // tuple([cf, sf]) = mp_n_sin_cos((-(psi[k + 1]) - theta[k + 1]));
    const ct_st = mp_n_sin_cos(theta[k])
    const ct = ct_st[0]
    const st = ct_st[1]
    const cf_sf = mp_n_sin_cos(-psi[k + 1] - theta[k + 1])
    const cf = cf_sf[0]
    const sf = cf_sf[1]
    // console.log('mp_set_controls', k, delta_x[k], delta_y[k], st, ct, sf, cf);
    mp_set_controls(s, t, delta_x[k], delta_y[k], st, ct, sf, cf)
    k += 1
    s = t
    if (k == n) {
      break
    }
  }
}

var mp_n_arg = function (x, y) {
  return Math.atan2(y, x)
}
var mp_n_sin_cos = function (z) {
  return [Math.cos(z), Math.sin(z)]
}

/**
 * @param {Knot} p
 * @param {Knot} q
 * @param {number} delta_x
 * @param {number} delta_y
 * @param {number} st
 * @param {number} ct
 * @param {number} sf
 * @param {number} cf
 */
var mp_set_controls = function (p, q, delta_x, delta_y, st, ct, sf, cf) {
  var rt, ss, lt, sine, rr
  lt = Math.abs(q.leftY)
  rt = Math.abs(p.rightY)
  rr = velocity(st, ct, sf, cf, rt)
  ss = velocity(sf, cf, st, ct, lt)

  // console.log('lt rt rr ss', lt, rt, rr, ss);
  if (p.rightY < 0 || q.leftY < 0) {
    if ((st >= 0 && sf >= 0) || (st <= 0 && sf <= 0)) {
      sine = Math.abs(st) * cf + Math.abs(sf) * ct
      if (sine > 0) {
        sine *= 1.00024414062
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
  p.rightX = p.x + (delta_x * ct - delta_y * st) * rr
  p.rightY = p.y + (delta_y * ct + delta_x * st) * rr
  q.leftX = q.x - (delta_x * cf + delta_y * sf) * ss
  q.leftY = q.y - (delta_y * cf - delta_x * sf) * ss
  p.rightType = TYPE_EXPLICIT
  q.leftType = TYPE_EXPLICIT
}

var mp_curl_ratio = function (gamma, a_tension, b_tension) {
  var alpha, beta
  alpha = 1.0 / a_tension
  beta = 1.0 / b_tension
  return Math.min(
    4.0,
    ((3.0 - alpha) * alpha ** 2 * gamma + beta ** 3) /
      (alpha ** 3 * gamma + (3.0 - beta) * beta ** 2)
  )
}

/**
 * Tests rigorously if ab is greater than, equal to, or less than cd. In most
 * cases a quick decision is reached. The result is +1, 0, or -1 in the three respective cases.
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @param {number} d
 * @returns
 */

const abVsCd = (a, b, c, d) => (a * b == c * d ? 0 : a * b > c * d ? 1 : -1)

/**
 * Metapost's standard velocity subroutine for cubic Bezier curves.
 * @param {number} st sine of theta
 * @param {number} ct cosine of theta
 * @param {number} sf sine of phi
 * @param {number} cf cosine of phi
 * @param {number} t
 * @returns
 */
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

export var makeKnots = function (points, tension, cycle) {
  tension = tension || 1

  /** @type {Knot[]} */
  var knots = []

  for (var i = 0; i < points.length; i++) {
    knots.push(new Knot(points[i][0], points[i][1], tension))
  }

  for (var i = 0; i < knots.length; i++) {
    knots[i].next = knots[i + 1] || knots[i]
  }
  knots[knots.length - 1].next = knots[0]

  if (!cycle) {
    knots[knots.length - 1].rightType = TYPE_ENDPOINT
    knots[knots.length - 1].leftType = TYPE_CURL
    knots[0].rightType = TYPE_CURL
  }

  return knots
}

var ctx,
  knots,
  tension = 1

function circle(ctx, x, y, r) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, 2 * Math.PI)
  ctx.stroke()
}

/**
 * @param {any} ctx
 * @param {Knot[]} knots
 * @param {[number, number]} offset
 * @param {*} cycle
 */
function curve(ctx, knots, offset, cycle) {
  var off = offset || [0, 0]

  ctx.strokeStyle = 'red'
  ctx.beginPath()

  for (var i = 0; i < knots.length - 1; i++) {
    // console.log('moveTo', knots[i].x_pt.toFixed(4), knots[i].y_pt.toFixed(4));
    // console.log('bezierCurveTo', knots[i].rx_pt.toFixed(4), knots[i].ry_pt.toFixed(4) ,
    //   knots[i+1].lx_pt.toFixed(4), knots[i+1].ly_pt.toFixed(4),
    //   knots[i+1].x_pt.toFixed(4), knots[i+1].y_pt.toFixed(4));

    ctx.moveTo(off[0] + knots[i].x, off[1] + knots[i].y)
    ctx.bezierCurveTo(
      off[0] + knots[i].rightX,
      off[1] + knots[i].rightY,
      off[0] + knots[i + 1].leftX,
      off[1] + knots[i + 1].leftY,
      off[0] + knots[i + 1].x,
      off[1] + knots[i + 1].y
    )
    ctx.stroke()

    circle(ctx, off[0] + knots[i].x, off[1] + knots[i].y, 3)
    circle(ctx, off[0] + knots[i].rightX, off[1] + knots[i].rightY, 1)
    circle(ctx, off[0] + knots[i + 1].leftX, off[1] + knots[i + 1].leftY, 1)
    circle(ctx, off[0] + knots[i + 1].x, off[1] + knots[i + 1].y, 3)
  }
  if (cycle) {
    i = knots.length - 1
    ctx.moveTo(off[0] + knots[i].x, off[1] + knots[i].y)
    ctx.bezierCurveTo(
      off[0] + knots[i].rightX,
      off[1] + knots[i].rightY,
      off[0] + knots[0].leftX,
      off[1] + knots[0].leftY,
      off[0] + knots[0].x,
      off[1] + knots[0].y
    )
    ctx.stroke()
  }
}

export function test(ctx) {
  ctx.clearRect(0, 0, 600, 770)
  const points = [
    [0, 0],
    [200, 133],
    [130, 300],
    [33, 233],
    [100, 167],
  ]

  knots = makeKnots(points, tension, true)
  makeChoices(knots)
  curve(ctx, knots, [50, 100], true)

  knots = makeKnots(points, tension, false)
  makeChoices(knots)
  curve(ctx, knots, [300, 100], false)
}
