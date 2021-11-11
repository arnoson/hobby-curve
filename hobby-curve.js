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
var calcDeltaValues = (knots, cyclic) => {
  const deltaX = [];
  const deltaY = [];
  const delta = [];
  const end = cyclic ? knots.length : knots.length - 1;
  for (let i = 0; i < end; i++) {
    const knot = knots[i];
    const nextKnot = knots[i + 1] ?? knots[0];
    deltaX[i] = nextKnot.x - knot.x;
    deltaY[i] = nextKnot.y - knot.y;
    delta[i] = Math.hypot(deltaX[i], deltaY[i]);
  }
  return [deltaX, deltaY, delta];
};
var calcPsiValues = (knots, deltaX, deltaY, delta, cyclic) => {
  const psi = [];
  const [start, end] = cyclic ? [0, knots.length] : [1, knots.length - 1];
  for (let i = start; i < end; i++) {
    const lastIndex = i === 0 ? knots.length - 1 : i - 1;
    const sin = deltaY[lastIndex] / delta[lastIndex];
    const cos = deltaX[lastIndex] / delta[lastIndex];
    psi.push(Math.atan2(deltaY[i] * cos - deltaX[i] * sin, deltaX[i] * cos + deltaY[i] * sin));
  }
  return psi;
};
var makeChoices = (knots, cyclic = true) => {
  const [deltaX, deltaY, delta] = calcDeltaValues(knots, cyclic);
  const psi = calcPsiValues(knots, deltaX, deltaY, delta, cyclic);
  if (cyclic) {
    deltaX.push(deltaX[0]);
    deltaY.push(deltaY[0]);
    delta.push(delta[0]);
    psi.push(psi.shift());
  }
  psi.push(cyclic ? psi[0] : 0);
  psi.unshift(0);
  solveChoices(knots, deltaX, deltaY, delta, psi, cyclic);
};
var solveChoices = function(knots, deltaX, deltaY, delta, psi, cyclic) {
  const matrixLength = delta.length + 1;
  const uu = new Array(matrixLength).fill(0);
  const ww = new Array(matrixLength).fill(0);
  const vv = new Array(matrixLength).fill(0);
  const theta = new Array(matrixLength).fill(0);
  const p = knots[0];
  let q = knots[1];
  const passes = cyclic ? knots.length + 1 : knots.length;
  const lastIndex = passes - 1;
  let s = p;
  let r = null;
  for (let i = 0; i < passes; i++) {
    const t = s.next;
    const isFirst = i === 0;
    const isLast = i === passes - 1;
    if (isFirst) {
      if (s.rightType == Type.Curl) {
        if (t.leftType == Type.Curl) {
          p.rightType = Type.Explicit;
          q.leftType = Type.Explicit;
          const lt = Math.abs(q.leftY);
          const rt = Math.abs(p.rightY);
          let ff = UNITY / (3 * rt);
          p.rightX = p.x + deltaX[0] * ff;
          p.rightY = p.y + deltaY[0] * ff;
          ff = UNITY / (3 * lt);
          q.leftX = q.x - deltaX[0] * ff;
          q.leftY = q.y - deltaY[0] * ff;
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
    } else {
      if (cyclic || !isLast) {
        let aa = UNITY / (3 * Math.abs(r.rightY) - UNITY);
        let dd = delta[i] * (3 - UNITY / Math.abs(r.rightY));
        let bb = UNITY / (3 * Math.abs(t.leftY) - UNITY);
        let ee = delta[i - 1] * (3 - UNITY / Math.abs(t.leftY));
        const cc = 1 - uu[i - 1] * aa;
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
        let ff = ee / (ee + dd);
        uu[i] = ff * bb;
        let acc = -(psi[i + 1] * uu[i]);
        if (r.rightType == Type.Curl) {
          ww[i] = 0;
          vv[i] = acc - psi[1] * (1 - ff);
        } else {
          ff = (1 - ff) / cc;
          acc = acc - psi[i] * ff;
          ff = ff * aa;
          vv[i] = acc - vv[i - 1] * ff;
          ww[i] = -(ww[i - 1] * ff);
        }
        if (cyclic && isLast) {
          let aa2 = 0;
          let bb2 = 1;
          for (let j = i - 1; j >= 0; j--) {
            const index = j === 0 ? passes - 1 : j;
            aa2 = vv[index] - aa2 * uu[index];
            bb2 = ww[index] - bb2 * uu[index];
          }
          aa2 = aa2 / (1 - bb2);
          theta[passes - 1] = aa2;
          vv[0] = aa2;
          for (let i2 = 1; i2 < passes - 1; i2++) {
            vv[i2] = vv[i2] + aa2 * ww[i2];
          }
          break;
        }
      } else {
        const cc = s.leftX;
        const lt = Math.abs(s.leftY);
        const rt = Math.abs(r.rightY);
        const ff = curlRatio(cc, lt, rt);
        theta[passes - 1] = -(vv[passes - 2] * ff / (1 - ff * uu[passes - 2]));
        break;
      }
    }
    r = s;
    s = t;
  }
  for (let i = passes - 2; i > -1; i -= 1) {
    theta[i] = vv[i] - theta[i + 1] * uu[i];
  }
  s = p;
  for (let i = 0; i < passes - 1; i++) {
    const t = s.next;
    const [ct, st] = sinCos(theta[i]);
    const [cf, sf] = sinCos(-psi[i + 1] - theta[i + 1]);
    setControls(s, t, deltaX[i], deltaY[i], st, ct, sf, cf);
    s = t;
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
var createKnot = (x, y, tension) => ({
  x,
  y,
  leftType: Type.Open,
  rightType: Type.Open,
  leftY: tension,
  rightY: tension,
  leftX: tension,
  rightX: tension
});
var createKnots = (points, tension = 1, cyclic = false) => {
  const knots = points.map(([x, y]) => createKnot(x, y, tension));
  const firstKnot = knots[0];
  const lastKnot = knots[knots.length - 1];
  for (let i = 0; i < knots.length; i++) {
    knots[i].next = knots[i + 1] ?? firstKnot;
  }
  if (cyclic) {
    firstKnot.leftType = Type.EndCycle;
    firstKnot.rightType = Type.Open;
  } else {
    firstKnot.leftType = Type.EndCycle;
    firstKnot.rightType = Type.Curl;
    lastKnot.leftType = Type.Curl;
    lastKnot.rightType = Type.Endpoint;
  }
  return knots;
};
var createHobbyCurve = (points, tension = 1, cyclic = false) => {
  const knots = createKnots(points, tension, cyclic);
  makeChoices(knots, cyclic);
  return knots;
};
export {
  createHobbyCurve
};
