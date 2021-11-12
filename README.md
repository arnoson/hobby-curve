# Hobby Curve

A tiny (1.3kb gzip) typescript implementation of the hobby curve algorithm without dependencies.

## Install

```
npm i hobby-curve
```

## Usage

```js
import { createHobbyCurve } from 'hobby-curve'

const points = [
  { x: 0, y: 0 },
  { x: 200, y: 133 },
  { x: 130, y: 300 },
  { x: 33, y: 233 },
  { x: 100, y: 167 },
]
const pathDescription = createHobbyCurve(points, { tension: 1, cyclic: true })
const svg = `<svg><path d="${pathDescription}" /></svg>`

// Use the svg path somewhere.
document.body.innerHtml = svg
```

If you don't need an svg path, you can create just the bézier points:

```js
import { createHobbyBezier } from 'hobby-curve'

const points = [
  { x: 0, y: 0 },
  { x: 200, y: 133 },
  { x: 130, y: 300 },
  { x: 33, y: 233 },
  { x: 100, y: 167 },
]

const bezier = createHobbyBezier(points, { tension: 1, cyclic: true })
bezier.forEach(({ startControl, endControl, point }) =>
  // do something
)

```

## Credits

- The mathematics is based on vlad-x's javascript port (https://github.com/vlad-x/hobby-curves) of Michael Schindler's python implementation.

- Naming and structuring things is inspired by Luke Trujillo's javascript implementation (https://github.com/ltrujello/Hobby_Curve_Algorithm/tree/main/javascript)

- I also added and modified some of the comments from Michael Schindler's
  python implementation to get a better understanding.
