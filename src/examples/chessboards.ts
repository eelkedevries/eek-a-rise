/** Grey chessboards for the One image mode, drawn procedurally at 400 × 400 (values in [0, 1]). */

export const CHESSBOARD_SIZE = 400;

// A full black-and-white board cannot be scrambled at the same contrast without
// many pixels leaving the displayable range, so the squares are grey.
const CONTRAST = 0.5 / 3.8;

function board(squarePx: number, offset: number, squares: number): Float64Array {
  const size = CHESSBOARD_SIZE;
  const out = new Float64Array(size * size).fill(0.5);
  const extent = squarePx * squares;
  for (let y = 0; y < extent; y++) {
    for (let x = 0; x < extent; x++) {
      const light = (Math.floor(x / squarePx) + Math.floor(y / squarePx)) % 2 === 1;
      out[(y + offset) * size + x + offset] = 0.5 + (light ? CONTRAST : -CONTRAST);
    }
  }
  return out;
}

/** 8 × 8 squares of 50 px, filling the image. */
export function chessboard(): Float64Array {
  return board(50, 0, 8);
}

/** 8 × 8 squares of 40 px, centred on a mid-grey background. */
export function chessboardOnGrey(): Float64Array {
  return board(40, 40, 8);
}
