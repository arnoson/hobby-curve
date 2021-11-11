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
var abGreaterCd = (a, b, c, d) => a * b > c * d;
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
    knot.deltaX = nextKnot.x - knot.x;
    knot.deltaY = nextKnot.y - knot.y;
    knot.delta = Math.hypot(knot.deltaX, knot.deltaY);
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
    const value = Math.atan2(deltaY[i] * cos - deltaX[i] * sin, deltaX[i] * cos + deltaY[i] * sin);
    knots[i].psi = value;
    psi.push(value);
  }
  return psi;
};
var makeChoices = (knots, cyclic = true) => {
  const [deltaX, deltaY, delta] = calcDeltaValues(knots, cyclic);
  const psi = calcPsiValues(knots, deltaX, deltaY, delta, cyclic);
  if (cyclic) {
    psi.push(psi.shift());
  }
  psi.push(cyclic ? psi[0] : 0);
  psi.unshift(0);
  console.log(psi);
  console.log(knots.map((knot) => knot.psi));
  solveChoices(knots, psi, cyclic);
};
var solveChoices = function(knots, psi, cyclic) {
  const uu = [];
  const ww = [];
  const vv = [];
  const theta = [];
  const firstKnot = knots[0];
  const passes = cyclic ? knots.length + 1 : knots.length;
  if (firstKnot.rightType == Type.Curl) {
    const nextKnot = firstKnot.next;
    if (nextKnot.leftType == Type.Curl) {
      firstKnot.rightType = Type.Explicit;
      nextKnot.leftType = Type.Explicit;
      const lt = Math.abs(nextKnot.leftY);
      const rt = Math.abs(firstKnot.rightY);
      let ff = UNITY / (3 * rt);
      firstKnot.rightX = firstKnot.x + firstKnot.deltaX * ff;
      firstKnot.rightY = firstKnot.y + firstKnot.deltaY * ff;
      ff = UNITY / (3 * lt);
      nextKnot.leftX = nextKnot.x - firstKnot.deltaX * ff;
      nextKnot.leftY = nextKnot.y - firstKnot.deltaY * ff;
      return;
    } else {
      const cc = firstKnot.rightX;
      const lt = Math.abs(nextKnot.leftY);
      const rt = Math.abs(firstKnot.rightY);
      uu[0] = curlRatio(cc, rt, lt);
      vv[0] = -(psi[1] * uu[0]);
      ww[0] = 0;
    }
  } else {
    if (firstKnot.rightType == Type.Open) {
      uu[0] = 0;
      vv[0] = 0;
      ww[0] = 1;
    }
  }
  for (let i = 1; i < passes; i++) {
    const knot = knots[i] ?? firstKnot;
    const nextKnot = knot.next;
    const prevKnot = knot.prev;
    const isLast = i === passes - 1;
    if (cyclic || !isLast) {
      let aa = UNITY / (3 * Math.abs(prevKnot.rightY) - UNITY);
      let dd = knot.delta * (3 - UNITY / Math.abs(prevKnot.rightY));
      let bb = UNITY / (3 * Math.abs(nextKnot.leftY) - UNITY);
      let ee = prevKnot.delta * (3 - UNITY / Math.abs(nextKnot.leftY));
      const cc = 1 - uu[i - 1] * aa;
      dd = dd * cc;
      const lt = Math.abs(knot.leftY);
      const rt = Math.abs(knot.rightY);
      if (lt < rt) {
        dd *= (lt / rt) ** 2;
      } else {
        if (lt > rt) {
          ee *= (rt / lt) ** 2;
        }
      }
      let ff = ee / (ee + dd);
      uu[i] = ff * bb;
      console.log(psi[i], knot.psi);
      let acc = -(psi[i + 1] * uu[i]);
      if (prevKnot.rightType == Type.Curl) {
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
      const cc = knot.leftX;
      const lt = Math.abs(knot.leftY);
      const rt = Math.abs(prevKnot.rightY);
      const ff = curlRatio(cc, lt, rt);
      theta[passes - 1] = -(vv[passes - 2] * ff / (1 - ff * uu[passes - 2]));
      break;
    }
  }
  for (let i = passes - 2; i > -1; i -= 1) {
    theta[i] = vv[i] - theta[i + 1] * uu[i];
  }
  for (let i = 0; i < passes - 1; i++) {
    const knot = knots[i] ?? firstKnot;
    const [ct, st] = sinCos(theta[i]);
    const [cf, sf] = sinCos(-psi[i + 1] - theta[i + 1]);
    setControls(knot, knot.next, knot.deltaX, knot.deltaY, st, ct, sf, cf);
  }
};
var setControls = (knot, nextKnot, deltaX, deltaY, st, ct, sf, cf) => {
  let lt = Math.abs(nextKnot.leftY);
  let rt = Math.abs(knot.rightY);
  let rr = velocity(st, ct, sf, cf, rt);
  let ss = velocity(sf, cf, st, ct, lt);
  if (knot.rightY < 0 || nextKnot.leftY < 0) {
    if (st >= 0 && sf >= 0 || st <= 0 && sf <= 0) {
      let sine = Math.abs(st) * cf + Math.abs(sf) * ct;
      if (sine > 0) {
        sine *= 1.00024414062;
        if (knot.rightY < 0) {
          if (!abGreaterCd(Math.abs(sf), 1, rr, sine)) {
            rr = Math.abs(sf) / sine;
          }
        }
        if (nextKnot.leftY < 0) {
          if (!abGreaterCd(Math.abs(st), 1, ss, sine)) {
            ss = Math.abs(st) / sine;
          }
        }
      }
    }
  }
  knot.rightX = knot.x + (deltaX * ct - deltaY * st) * rr;
  knot.rightY = knot.y + (deltaY * ct + deltaX * st) * rr;
  nextKnot.leftX = nextKnot.x - (deltaX * cf + deltaY * sf) * ss;
  nextKnot.leftY = nextKnot.y - (deltaY * cf - deltaX * sf) * ss;
  knot.rightType = Type.Explicit;
  nextKnot.leftType = Type.Explicit;
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
    knots[i].prev = knots[i - 1] ?? lastKnot;
    knots[i].index = i;
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
