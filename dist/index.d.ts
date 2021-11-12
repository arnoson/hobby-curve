interface Point {
    x: number;
    y: number;
}

/**
 * The mathematics of this code is based on vlad-x's javascript port.
 * (https://github.com/vlad-x/hobby-curves) of Michael Schindler's Python
 * Implementation of some internal functions of MetaPost, developed by John
 * D. Hobby and others.
 * Quoted by Michael Schindler: "Metapost's code is in the public domain,
 * which we take as implicit permission to reuse the code here.
 * (see the comment at http://www.gnu.org/licenses/license-list.html)."
 *
 * I heavily refactored and simplified the code from vlad-x, ported it to
 * Typescript and was inspired by Luke Trujillo's javascript implementation
 * (https://github.com/ltrujello/Hobby_Curve_Algorithm/tree/main/javascript)
 * especially for naming and structuring things.
 *
 * I also added and modified some of the comments from Michael Schindler's
 * python implementation to get a better understanding.
 */

/**
 * Create a hobby curve and return a list of bezier entries in the format
 * `{ startControl, endControl, point }`.
 */
declare const createHobbyBezier: (points: Point[], { tension, cyclic }?: {
    tension?: number;
    cyclic?: boolean;
}) => {
    startControl: Point;
    endControl: Point;
    point: Point;
}[];
/**
 * Create a hobby curve and return it's path definition.
 */
declare const createHobbyCurve: (points: Point[], { tension, cyclic }?: {
    tension?: number;
    cyclic?: boolean;
}) => string;

export { createHobbyBezier, createHobbyCurve };
