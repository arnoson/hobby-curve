// @ts-check

/*
I cleaned up and rewrote vlad-x's hobby-curves
(https://github.com/vlad-x/hobby-curves) to modern javascript/typescript and
added some of the comments from the PyX implementation for better understanding.
*/

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

import { Type } from './utils'
import { makeChoices } from './makeChoices'

const createKnot = (x: number, y: number, tension: number) => ({
  x: x,
  y: y,
  leftType: Type.Open,
  rightType: Type.Open,
  leftY: tension,
  rightY: tension,
  leftX: tension,
  rightX: tension,
  psi: 0,
})

const createKnots = (
  points: [number, number][],
  tension: any = 1,
  cyclic: any = false
) => {
  // @ts-ignore (`next` und `prev` will be set immediately)
  const knots: Knot[] = points.map(([x, y]) => createKnot(x, y, tension))
  const firstKnot = knots[0]
  const lastKnot = knots[knots.length - 1]

  for (let i = 0; i < knots.length; i++) {
    knots[i].next = knots[i + 1] ?? firstKnot
    knots[i].prev = knots[i - 1] ?? lastKnot
    knots[i].index = i
  }

  if (cyclic) {
    firstKnot.leftType = Type.EndCycle
    firstKnot.rightType = Type.Open
  } else {
    firstKnot.leftType = Type.EndCycle
    firstKnot.rightType = Type.Curl

    lastKnot.leftType = Type.Curl
    lastKnot.rightType = Type.Endpoint
  }

  return knots
}

export const createHobbyCurve = (
  points: [number, number][],
  tension = 1,
  cyclic = false
) => {
  const knots = createKnots(points, tension, cyclic)
  makeChoices(knots, cyclic)

  return knots
}
