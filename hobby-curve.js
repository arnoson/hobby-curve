// utils.ts
var Type;
(function(Type2) {
  Type2[Type2["Endpoint"] = 0] = "Endpoint";
  Type2[Type2["Explicit"] = 1] = "Explicit";
  Type2[Type2["Given"] = 2] = "Given";
  Type2[Type2["Curl"] = 3] = "Curl";
  Type2[Type2["Open"] = 4] = "Open";
  Type2[Type2["EndCycle"] = 5] = "EndCycle";
})(Type || (Type = {}));
var knotsAreEqual = (knot, nextKnot) => knot.rightType > 1 && (knot.x - nextKnot.x) ** 2 + (knot.y - nextKnot.y) ** 2 < Number.EPSILON ** 2;
var knotIsBreakpoint = (knot) => knot.leftType != 4 || knot.rightType != 4;
var reduceAngle = (angle) => Math.abs(angle) > Math.PI ? angle > 0 ? angle - 2 * Math.PI : angle + 2 * Math.PI : angle;
var curlRatio = function(gamma, tensionA, tensionB) {
  const alpha = 1 / tensionA;
  const beta = 1 / tensionB;
  return Math.min(4, ((3 - alpha) * alpha ** 2 * gamma + beta ** 3) / (alpha ** 3 * gamma + (3 - beta) * beta ** 2));
};
var abVsCd = (a, b, c, d) => a * b == c * d ? 0 : a * b > c * d ? 1 : -1;
var sinCos = (x) => [Math.cos(x), Math.sin(x)];
var velocity = (st, ct, sf, cf, t) => Math.min(4, (2 + Math.sqrt(2) * (st - sf / 16) * (sf - st / 16) * (ct - cf)) / (1.5 * t * (2 + (Math.sqrt(5) - 1) * ct + (3 - Math.sqrt(5)) * cf)));

// hobby-curve.ts
var UNITY = 1;
var makeSimpleChoices = (knots, cyclic = true) => {
  const deltaX = [];
  const deltaY = [];
  const delta = [];
  const psi = [0];
  const calcPsi = (index) => {
    const lastIndex = index === 0 ? knots.length - 1 : index - 1;
    const sin = deltaY[lastIndex] / delta[lastIndex];
    const cos = deltaX[lastIndex] / delta[lastIndex];
    return Math.atan2(deltaY[index] * cos - deltaX[index] * sin, deltaX[index] * cos + deltaY[index] * sin);
  };
  for (let i = 0; i < knots.length; i++) {
    const knot = knots[i];
    const nextKnot = knots[i + 1] ?? knots[0];
    knot.leftType = Type.Open;
    knot.rightType = Type.Open;
    const isFirst = i === 0;
    const isLast = i === knots.length - 1;
    if (cyclic || !isLast) {
      deltaX[i] = nextKnot.x - knot.x;
      deltaY[i] = nextKnot.y - knot.y;
      delta[i] = Math.hypot(deltaX[i], deltaY[i]);
    }
    if (!isFirst && (cyclic || !isLast)) {
      psi.push(calcPsi(i));
    }
  }
  if (cyclic) {
    psi.push(calcPsi(0));
  }
  if (cyclic) {
    knots[0].leftType = Type.EndCycle;
    knots[0].rightType = Type.Open;
  } else {
    knots[0].leftType = Type.EndCycle;
    knots[0].rightType = Type.Curl;
    knots[knots.length - 1].leftType = Type.Curl;
    knots[knots.length - 1].rightType = Type.Endpoint;
  }
  const n = cyclic ? knots.length : knots.length - 1;
  if (cyclic) {
    deltaX.push(deltaX[0]);
    deltaY.push(deltaY[0]);
    delta.push(delta[0]);
  }
  psi.push(cyclic ? psi[1] : 0);
  solveChoices(knots[0], knots[1], n, deltaX, deltaY, delta, psi);
  console.log("simple");
  console.log({ delta, deltaX, deltaY, psi });
};
var makeChoices = (knots) => {
  const firstKnot = knots[0];
  let p = firstKnot;
  while (p) {
    let q = p.next;
    if (knotsAreEqual(p, q)) {
      p.rightType = Type.Explicit;
      if (p.leftType == Type.Open) {
        p.leftType = Type.Curl;
        p.leftX = UNITY;
      }
      q.leftType = Type.Explicit;
      if (q.rightType == Type.Open) {
        q.rightType = Type.Curl;
        q.rightX = UNITY;
      }
      p.rightX = p.x;
      p.rightY = p.y;
      q.leftX = p.x;
      q.leftY = p.y;
    }
    p = q;
    if (p == firstKnot)
      break;
  }
  let h = knots.find(knotIsBreakpoint) ?? firstKnot;
  if (h == firstKnot)
    h.leftType = Type.EndCycle;
  p = h;
  do {
    let q = p.next;
    if (p.rightType >= Type.Given) {
      while (!knotIsBreakpoint(q)) {
        q = q.next;
      }
      let k = 0;
      let s = p;
      let n = knots.length;
      const deltaX = [];
      const deltaY = [];
      const delta = [];
      const psi = [0];
      do {
        let t = s.next;
        deltaX.push(t.x - s.x);
        deltaY.push(t.y - s.y);
        delta.push(Math.hypot(deltaX[k], deltaY[k]));
        if (k > 0) {
          const sine = deltaY[k - 1] / delta[k - 1];
          const cosine = deltaX[k - 1] / delta[k - 1];
          psi.push(Math.atan2(deltaY[k] * cosine - deltaX[k] * sine, deltaX[k] * cosine + deltaY[k] * sine));
        }
        k += 1;
        s = t;
        if (s == q) {
          n = k;
        }
      } while (k < n || s.leftType == Type.EndCycle);
      if (k == n) {
        psi.push(0);
      } else {
        psi.push(psi[1]);
      }
      if (q.leftType == Type.Open) {
        const deltaX2 = q.rightX - q.x;
        const deltaY2 = q.rightY - q.y;
        if (deltaX2 ** 2 + deltaY2 ** 2 < Number.EPSILON ** 2) {
          q.leftType = Type.Curl;
          q.leftX = UNITY;
        } else {
          q.leftType = Type.Given;
          q.leftX = Math.atan2(deltaY2, deltaX2);
        }
      }
      if (p.rightType == Type.Open && p.leftType == Type.Explicit) {
        const deltaX2 = p.x - p.leftX;
        const deltaY2 = p.y - p.leftY;
        if (deltaX2 ** 2 + deltaY2 ** 2 < Number.EPSILON ** 2) {
          p.rightType = Type.Curl;
          p.rightX = UNITY;
        } else {
          p.rightType = Type.Given;
          p.rightX = Math.atan2(deltaY2, deltaX2);
        }
      }
      console.log("nope");
      console.log({ delta, deltaX, deltaY, psi });
    } else if (p.rightType == Type.Endpoint) {
      p.rightX = p.x;
      p.rightY = p.y;
      q.leftX = q.x;
      q.leftY = q.y;
    }
  } while (p && p != h);
};
var solveChoices = function(p, q, n, deltaX, deltaY, delta, psi) {
  let t;
  let ff;
  const matrixLength = delta.length + 1;
  const uu = new Array(matrixLength).fill(0);
  const ww = new Array(matrixLength).fill(0);
  const vv = new Array(matrixLength).fill(0);
  const theta = new Array(matrixLength).fill(0);
  var k = 0;
  let s = p;
  let r = null;
  while (true) {
    t = s.next;
    if (k == 0) {
      if (s.rightType == Type.Given) {
        if (t.leftType == Type.Given) {
          const aa = Math.atan2(deltaY[0], deltaX[0]);
          const [ct, st] = sinCos(p.rightX - aa);
          const [cf, sf] = sinCos(q.leftX - aa);
          setControls(p, q, deltaX[0], deltaY[0], st, ct, -sf, cf);
          return;
        } else {
          vv[0] = s.rightX - Math.atan2(deltaY[0], deltaX[0]);
          vv[0] = reduceAngle(vv[0]);
          uu[0] = 0;
          ww[0] = 0;
        }
      } else {
        if (s.rightType == Type.Curl) {
          if (t.leftType == Type.Curl) {
            p.rightType = Type.Explicit;
            q.leftType = Type.Explicit;
            const lt = Math.abs(q.leftY);
            const rt = Math.abs(p.rightY);
            let ff2 = UNITY / (3 * rt);
            p.rightX = p.x + deltaX[0] * ff2;
            p.rightY = p.y + deltaY[0] * ff2;
            ff2 = UNITY / (3 * lt);
            q.leftX = q.x - deltaX[0] * ff2;
            q.leftY = q.y - deltaY[0] * ff2;
            return;
          } else {
            const cc = s.rightX;
            const lt = Math.abs(t.leftY);
            const rt = Math.abs(s.rightY);
            uu[0] = curlRatio(cc, rt, lt);
            vv[0] = -(psi[1] * uu[0]);
            ww[0] = 0;
          }
        } else {
          if (s.rightType == Type.Open) {
            uu[0] = 0;
            vv[0] = 0;
            ww[0] = 1;
          }
        }
      }
    } else {
      if (s.leftType == Type.EndCycle || s.leftType == Type.Open) {
        let aa = UNITY / (3 * Math.abs(r.rightY) - UNITY);
        let dd = delta[k] * (3 - UNITY / Math.abs(r.rightY));
        let bb = UNITY / (3 * Math.abs(t.leftY) - UNITY);
        let ee = delta[k - 1] * (3 - UNITY / Math.abs(t.leftY));
        const cc = 1 - uu[k - 1] * aa;
        dd = dd * cc;
        const lt = Math.abs(s.leftY);
        const rt = Math.abs(s.rightY);
        if (lt < rt) {
          dd *= (lt / rt) ** 2;
        } else {
          if (lt > rt) {
            ee *= (rt / lt) ** 2;
          }
        }
        let ff2 = ee / (ee + dd);
        uu[k] = ff2 * bb;
        let acc = -(psi[k + 1] * uu[k]);
        if (r.rightType == Type.Curl) {
          ww[k] = 0;
          vv[k] = acc - psi[1] * (1 - ff2);
        } else {
          ff2 = (1 - ff2) / cc;
          acc = acc - psi[k] * ff2;
          ff2 = ff2 * aa;
          vv[k] = acc - vv[k - 1] * ff2;
          ww[k] = -(ww[k - 1] * ff2);
        }
        if (s.leftType == Type.EndCycle) {
          let aa2 = 0;
          let bb2 = 1;
          while (true) {
            k -= 1;
            if (k == 0) {
              k = n;
            }
            aa2 = vv[k] - aa2 * uu[k];
            bb2 = ww[k] - bb2 * uu[k];
            if (k == n) {
              break;
            }
          }
          aa2 = aa2 / (1 - bb2);
          theta[n] = aa2;
          vv[0] = aa2;
          for (var k = 1; k < n; k++) {
            vv[k] = vv[k] + aa2 * ww[k];
          }
          break;
        }
      } else {
        if (s.leftType == Type.Curl) {
          const cc = s.leftX;
          const lt = Math.abs(s.leftY);
          const rt = Math.abs(r.rightY);
          const ff2 = curlRatio(cc, lt, rt);
          theta[n] = -(vv[n - 1] * ff2 / (1 - ff2 * uu[n - 1]));
          break;
        } else {
          if (s.leftType == Type.Given) {
            theta[n] = s.leftX - Math.atan2(deltaY[n - 1], deltaX[n - 1]);
            theta[n] = reduceAngle(theta[n]);
            break;
          }
        }
      }
    }
    r = s;
    s = t;
    k += 1;
  }
  for (let i = n - 1; i > -1; i -= 1) {
    theta[i] = vv[i] - theta[i + 1] * uu[i];
  }
  s = p;
  k = 0;
  while (true) {
    t = s.next;
    const [ct, st] = sinCos(theta[k]);
    const [cf, sf] = sinCos(-psi[k + 1] - theta[k + 1]);
    setControls(s, t, deltaX[k], deltaY[k], st, ct, sf, cf);
    k += 1;
    s = t;
    if (k == n) {
      break;
    }
  }
};
var setControls = (p, q, deltaX, deltaY, st, ct, sf, cf) => {
  let lt = Math.abs(q.leftY);
  let rt = Math.abs(p.rightY);
  let rr = velocity(st, ct, sf, cf, rt);
  let ss = velocity(sf, cf, st, ct, lt);
  if (p.rightY < 0 || q.leftY < 0) {
    if (st >= 0 && sf >= 0 || st <= 0 && sf <= 0) {
      let sine = Math.abs(st) * cf + Math.abs(sf) * ct;
      if (sine > 0) {
        sine *= 1.00024414062;
        if (p.rightY < 0) {
          if (abVsCd(Math.abs(sf), 1, rr, sine) < 0) {
            rr = Math.abs(sf) / sine;
          }
        }
        if (q.leftY < 0) {
          if (abVsCd(Math.abs(st), 1, ss, sine) < 0) {
            ss = Math.abs(st) / sine;
          }
        }
      }
    }
  }
  p.rightX = p.x + (deltaX * ct - deltaY * st) * rr;
  p.rightY = p.y + (deltaY * ct + deltaX * st) * rr;
  q.leftX = q.x - (deltaX * cf + deltaY * sf) * ss;
  q.leftY = q.y - (deltaY * cf - deltaX * sf) * ss;
  p.rightType = Type.Explicit;
  q.leftType = Type.Explicit;
};
var createKnots = (points, tension = 1, cycle = false) => {
  const knots = points.map(([x, y]) => ({
    x,
    y,
    leftType: Type.Open,
    rightType: Type.Open,
    leftY: tension,
    rightY: tension,
    leftX: tension,
    rightX: tension
  }));
  const firstKnot = knots[0];
  const lastKnot = knots[knots.length - 1];
  for (let i = 0; i < knots.length; i++) {
    knots[i].next = knots[i + 1] ?? firstKnot;
  }
  if (!cycle) {
    lastKnot.rightType = Type.Endpoint;
    lastKnot.leftType = Type.Curl;
    firstKnot.rightType = Type.Curl;
  }
  return knots;
};
var createHobbyCurve = (points, tension = 1, cyclic = false) => {
  const knots = createKnots(points, tension, cyclic);
  makeChoices(knots);
  console.log("nope", knots);
  const knots2 = createKnots(points, tension, cyclic);
  makeSimpleChoices(knots2, cyclic);
  console.log("simple", knots2);
  return knots2;
};
export {
  createHobbyCurve,
  makeChoices,
  makeSimpleChoices
};
