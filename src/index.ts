/*
I cleaned up, heavily refactored and simplified up vlad-x's hobby-curves
(https://github.com/vlad-x/hobby-curves) to modern javascript/typescript and
added some of the comments from the PyX implementation for better understanding.
*/

/* Metapost/Hobby curves
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

import { Point } from './utils'
import { calcDeltaValues } from './calcDeltaValues'
import { calcPsiValues } from './calcPsiValues'
import { calcPhiValues } from './calcPhiValues'
import { calcThetaValues } from './calcThetaValues'
import { setControls } from './setControls'

const createKnot = (x: number, y: number, tension: number) => ({
  x: x,
  y: y,
  leftY: tension,
  rightY: tension,
  leftX: tension,
  rightX: tension,
  psi: 0,
})

export const createHobbyKnots = (
  points: Point[],
  tension: any = 1,
  cyclic = false
) => {
  // @ts-ignore (`next` und `prev` will be set immediately)
  const knots: Knot[] = points.map(({ x, y }) => createKnot(x, y, tension))

  const firstKnot = knots[0]
  const lastKnot = knots[knots.length - 1]
  for (let i = 0; i < knots.length; i++) {
    knots[i].next = knots[i + 1] ?? firstKnot
    knots[i].prev = knots[i - 1] ?? lastKnot
    knots[i].index = i
  }

  calcDeltaValues(knots, cyclic)
  calcPsiValues(knots, cyclic)
  calcThetaValues(knots, cyclic)
  calcPhiValues(knots, cyclic)

  const end = cyclic ? knots.length : knots.length - 1
  for (let i = 0; i < end; i++) {
    const knot = knots[i]
    setControls(knot, knot.next)
  }

  return knots
}

export const createHobbyCurve = (
  points: Point[],
  tension = 1,
  cyclic = false
) => {
  const knots = createHobbyKnots(points, tension, cyclic)
  return createHobbyKnots(points, tension, cyclic)
}

export const createHobbyData = (
  points: Point[],
  tension = 1,
  cyclic = false
) => {
  const knots = createHobbyKnots(points, tension, cyclic)

  let bezierCommands = ''
  const end = cyclic ? knots.length : knots.length - 1
  for (let i = 0; i < end; i++) {
    const knot = knots[i]
    const nextKnot = knot.next
    bezierCommands += `${knot.rightX},${knot.rightY} ${nextKnot.leftX},${nextKnot.leftY} ${nextKnot.x},${nextKnot.y} `
  }

  return `M ${knots[0].x},${knots[0].y} C ${bezierCommands}`
}
