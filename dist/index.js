// src/calcDeltaValues.ts
var calcDeltaValues = (knots, cyclic) => {
  const end = cyclic ? knots.length : knots.length - 1;
  for (let i = 0; i < end; i++) {
    const knot = knots[i];
    const nextKnot = knots[i + 1] ?? knots[0];
    knot.deltaX = nextKnot.x - knot.x;
    knot.deltaY = nextKnot.y - knot.y;
    knot.delta = Math.hypot(knot.deltaX, knot.deltaY);
  }
};

// src/calcPsiValues.ts
var calcPsiValues = (knots, cyclic) => {
  const [start, end] = cyclic ? [0, knots.length] : [1, knots.length - 1];
  for (let i = start; i < end; i++) {
    const knot = knots[i];
    const prevKnot = knot.prev;
    const sin = prevKnot.deltaY / prevKnot.delta;
    const cos = prevKnot.deltaX / prevKnot.delta;
    knot.psi = Math.atan2(knot.deltaY * cos - knot.deltaX * sin, knot.deltaX * cos + knot.deltaY * sin);
  }
};

// src/calcPhiValues.ts
var calcPhiValues = (knots, cyclic) => {
  for (let i = 0; i < knots.length; i++) {
    const knot = knots[i];
    knot.phi = -knot.psi - knot.theta;
  }
};

// src/utils.ts
var curlRatio = function(gamma, tensionA, tensionB) {
  const alpha = 1 / tensionA;
  const beta = 1 / tensionB;
  return Math.min(4, ((3 - alpha) * alpha ** 2 * gamma + beta ** 3) / (alpha ** 3 * gamma + (3 - beta) * beta ** 2));
};
var velocity = (thetaSin, thetaCos, phiSin, phiCos, t) => Math.min(4, (2 + Math.sqrt(2) * (thetaSin - phiSin / 16) * (phiSin - thetaSin / 16) * (thetaCos - phiCos)) / (1.5 * t * (2 + (Math.sqrt(5) - 1) * thetaCos + (3 - Math.sqrt(5)) * phiCos)));

// src/calcThetaValues.ts
var UNITY = 1;
var calcThetaValues = function(knots, cyclic) {
  const uu = [];
  const ww = [];
  const vv = [];
  const firstKnot = knots[0];
  const secondKnot = knots[1];
  const lastKnot = knots[knots.length - 1];
  const passes = cyclic ? knots.length + 1 : knots.length;
  if (!cyclic) {
    const nextKnot = firstKnot.next;
    const cc = firstKnot.rightX;
    const lt = Math.abs(nextKnot.leftY);
    const rt = Math.abs(firstKnot.rightY);
    uu[0] = curlRatio(cc, rt, lt);
    vv[0] = -(secondKnot.psi * uu[0]);
    ww[0] = 0;
  } else {
    uu[0] = 0;
    vv[0] = 0;
    ww[0] = 1;
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
      let acc = -(nextKnot.psi * uu[i]);
      ff = (1 - ff) / cc;
      acc = acc - knot.psi * ff;
      ff = ff * aa;
      vv[i] = acc - vv[i - 1] * ff;
      ww[i] = -(ww[i - 1] * ff);
      if (cyclic && isLast) {
        let aa2 = 0;
        let bb2 = 1;
        for (let j = i - 1; j >= 0; j--) {
          const index = j === 0 ? passes - 1 : j;
          aa2 = vv[index] - aa2 * uu[index];
          bb2 = ww[index] - bb2 * uu[index];
        }
        aa2 = aa2 / (1 - bb2);
        firstKnot.theta = aa2;
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
      lastKnot.theta = -(vv[passes - 2] * ff / (1 - ff * uu[passes - 2]));
      break;
    }
  }
  for (let i = passes - 2; i >= 0; i -= 1) {
    const knot = knots[i];
    knot.theta = vv[i] - knot.next.theta * uu[i];
  }
};

// src/setControls.ts
var setControlsLine = (knotA, knotB) => {
  let factor = 1 / (3 * knotA.rightY);
  knotA.rightX = knotA.x + knotA.deltaX * factor;
  knotA.rightY = knotA.y + knotA.deltaY * factor;
  factor = 1 / (3 * knotB.leftY);
  knotB.leftX = knotB.x - knotA.deltaX * factor;
  knotB.leftY = knotB.y - knotA.deltaY * factor;
};
var setControls = (knotA, knotB) => {
  const thetaSin = Math.sin(knotA.theta);
  const thetaCos = Math.cos(knotA.theta);
  const phiSin = Math.sin(knotB.phi);
  const phiCos = Math.cos(knotB.phi);
  const left = knotB.leftY;
  const right = knotA.rightY;
  const velocityRight = velocity(thetaSin, thetaCos, phiSin, phiCos, left);
  const velocityLeft = velocity(phiSin, phiCos, thetaSin, thetaCos, right);
  knotA.rightX = knotA.x + (knotA.deltaX * thetaCos - knotA.deltaY * thetaSin) * velocityRight;
  knotA.rightY = knotA.y + (knotA.deltaY * thetaCos + knotA.deltaX * thetaSin) * velocityRight;
  knotB.leftX = knotB.x - (knotA.deltaX * phiCos + knotA.deltaY * phiSin) * velocityLeft;
  knotB.leftY = knotB.y - (knotA.deltaY * phiCos - knotA.deltaX * phiSin) * velocityLeft;
};

// src/index.ts
var createKnot = (x, y, tension) => ({
  x,
  y,
  leftY: tension,
  rightY: tension,
  leftX: tension,
  rightX: tension,
  psi: 0
});
var createHobbyKnots = (points, tension = 1, cyclic = false) => {
  const knots = points.map(({ x, y }) => createKnot(x, y, tension));
  const firstKnot = knots[0];
  const lastKnot = knots[knots.length - 1];
  for (let i = 0; i < knots.length; i++) {
    knots[i].next = knots[i + 1] ?? firstKnot;
    knots[i].prev = knots[i - 1] ?? lastKnot;
  }
  calcDeltaValues(knots, cyclic);
  if (points.length === 2 && !cyclic) {
    setControlsLine(firstKnot, lastKnot);
    return knots;
  }
  calcPsiValues(knots, cyclic);
  calcThetaValues(knots, cyclic);
  calcPhiValues(knots, cyclic);
  const end = cyclic ? knots.length : knots.length - 1;
  for (let i = 0; i < end; i++) {
    setControls(knots[i], knots[i].next);
  }
  return knots;
};
var createHobbyCurve = (points, tension = 1, cyclic = false) => {
  const knots = createHobbyKnots(points, tension, cyclic);
  let bezierCommands = "";
  const end = cyclic ? knots.length : knots.length - 1;
  for (let i = 0; i < end; i++) {
    const knot = knots[i];
    const nextKnot = knot.next;
    bezierCommands += `${knot.rightX},${knot.rightY} ${nextKnot.leftX},${nextKnot.leftY} ${nextKnot.x},${nextKnot.y} `;
  }
  return `M ${knots[0].x},${knots[0].y} C ${bezierCommands}`;
};
export {
  createHobbyCurve,
  createHobbyKnots
};
