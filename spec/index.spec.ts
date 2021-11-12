import { createHobbyBezier, createHobbyCurve } from '../src/index'

const points = [
  { x: 0, y: 0 },
  { x: 200, y: 133 },
  { x: 130, y: 300 },
  { x: 33, y: 233 },
  { x: 100, y: 167 },
]

describe('createHobbyBezier', () => {
  it('handles cyclic and non-cyclic paths', () => {
    expect(
      createHobbyBezier(points, { tension: 1, cyclic: true })
    ).toMatchSnapshot()
    expect(
      createHobbyBezier(points, { tension: 1, cyclic: false })
    ).toMatchSnapshot()
  })

  it('handles 2-point paths', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 200, y: 133 },
    ]
    expect(
      createHobbyBezier(points, { tension: 1, cyclic: true })
    ).toMatchSnapshot()
    expect(
      createHobbyBezier(points, { tension: 1, cyclic: false })
    ).toMatchSnapshot()
  })

  it('handles low tension', () => {
    expect(
      createHobbyBezier(points, { tension: 0.3, cyclic: true })
    ).toMatchSnapshot()
    expect(
      createHobbyBezier(points, { tension: 0.3, cyclic: false })
    ).toMatchSnapshot()
  })

  it('handles high tension', () => {
    expect(
      createHobbyBezier(points, { tension: 4, cyclic: true })
    ).toMatchSnapshot()
    expect(
      createHobbyBezier(points, { tension: 4, cyclic: false })
    ).toMatchSnapshot()
  })
})

describe('createHobbyCurve', () => {
  it('creates an svg path description', () => {
    expect(
      createHobbyCurve(points, { tension: 1, cyclic: true })
    ).toMatchSnapshot()
    expect(
      createHobbyCurve(points, { tension: 1, cyclic: false })
    ).toMatchSnapshot()
  })
})
