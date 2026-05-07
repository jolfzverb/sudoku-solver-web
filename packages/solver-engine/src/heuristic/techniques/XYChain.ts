import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { CellPosition } from '../../model/types';
import { Elimination } from '../../constraint/types';

/**
 * XY-Chain — generalisation of Y-Wing to chains of arbitrary length N ≥ 4.
 *
 * Cells C1..CN are all bivalue. With X the elimination digit:
 *   C1 = {X, d1}, C2 = {d1, d2}, C3 = {d2, d3}, ..., CN = {d_{N-1}, X}.
 * Consecutive cells must see each other and share exactly one digit
 * (which falls out of bivalue + linkage). Non-adjacent cells need not see
 * each other.
 *
 * If C1 = X, done. Otherwise C1 = d1 forces C2 = d2, ..., CN = X.
 * In every case X is at C1 or at CN, so any cell that sees BOTH endpoints
 * cannot hold X.
 *
 * Length 3 is the standard Y-Wing handled by the YWing heuristic; we start
 * at length 4 here. Iterative deepening biases toward shortest chains.
 */

const MIN_LEN = 4;
const MAX_LEN = 8;

interface Bivalue {
  pos: CellPosition;
  digits: [number, number];
}

function otherDigit(bv: Bivalue, d: number): number {
  return bv.digits[0] === d ? bv.digits[1] : bv.digits[0];
}

function rawSees(grid: Grid, a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row && a.col === b.col) return false;
  for (const region of grid.getRegionsFor(a)) {
    if (region.cells.some(c => c.row === b.row && c.col === b.col)) return true;
  }
  return false;
}

export const XYChain: Heuristic = {
  id: 'xy-chain',
  displayName: 'XY-Chain',
  difficulty: 'advanced',

  apply(grid: Grid, _constraints: ConstraintSet): SolveStep | null {
    const bivalues: Bivalue[] = [];
    for (const cell of grid.getAllCells()) {
      if (cell.value !== null) continue;
      if (cell.candidates.count() !== 2) continue;
      const d = cell.candidates.values();
      bivalues.push({ pos: cell.position, digits: [d[0], d[1]] });
    }

    const N = bivalues.length;
    if (N < MIN_LEN) return null;

    // Precompute bivalue↔bivalue visibility.
    const sees: boolean[][] = Array.from({ length: N }, () => new Array<boolean>(N).fill(false));
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const s = rawSees(grid, bivalues[i].pos, bivalues[j].pos);
        sees[i][j] = s;
        sees[j][i] = s;
      }
    }

    // For each (cellIndex, digit), list of bivalue indices that see this cell and contain digit.
    // Stored as neighborsByDigit[i].get(d) = number[].
    const neighborsByDigit: Array<Map<number, number[]>> = [];
    for (let i = 0; i < N; i++) {
      const map = new Map<number, number[]>();
      for (let j = 0; j < N; j++) {
        if (i === j || !sees[i][j]) continue;
        for (const d of bivalues[j].digits) {
          let arr = map.get(d);
          if (!arr) { arr = []; map.set(d, arr); }
          arr.push(j);
        }
      }
      neighborsByDigit.push(map);
    }

    const inPath = new Uint8Array(N);

    // Iterative deepening: shortest chain first.
    for (let targetLen = MIN_LEN; targetLen <= MAX_LEN; targetLen++) {
      for (let startIdx = 0; startIdx < N; startIdx++) {
        for (const X of bivalues[startIdx].digits) {
          const A = otherDigit(bivalues[startIdx], X);
          inPath[startIdx] = 1;
          const result = extend(grid, bivalues, neighborsByDigit, inPath,
            X, [startIdx], A, targetLen);
          inPath[startIdx] = 0;
          if (result) return result;
        }
      }
    }
    return null;
  },
};

function extend(
  grid: Grid,
  bivalues: Bivalue[],
  neighborsByDigit: Array<Map<number, number[]>>,
  inPath: Uint8Array,
  X: number,
  path: number[],
  outDigit: number,
  targetLen: number,
): SolveStep | null {
  const remaining = targetLen - path.length;

  if (remaining === 0) {
    if (outDigit !== X) return null;
    return tryFinalize(grid, bivalues, path, X);
  }

  const currentIdx = path[path.length - 1];
  const candidates = neighborsByDigit[currentIdx].get(outDigit);
  if (!candidates) return null;

  for (const nextIdx of candidates) {
    if (inPath[nextIdx]) continue;
    const next = bivalues[nextIdx];
    const nextOut = otherDigit(next, outDigit);

    // X may only appear as outgoing at the final cell.
    if (remaining > 1 && nextOut === X) continue;

    inPath[nextIdx] = 1;
    path.push(nextIdx);
    const result = extend(grid, bivalues, neighborsByDigit, inPath,
      X, path, nextOut, targetLen);
    path.pop();
    inPath[nextIdx] = 0;
    if (result) return result;
  }
  return null;
}

function tryFinalize(
  grid: Grid,
  bivalues: Bivalue[],
  pathIdx: number[],
  X: number,
): SolveStep | null {
  const path = pathIdx.map(i => bivalues[i]);
  const c1 = path[0];
  const cN = path[path.length - 1];

  const elims: Elimination[] = [];
  for (const cell of grid.getAllCells()) {
    if (cell.value !== null || !cell.candidates.has(X)) continue;
    const pos = cell.position;
    if (path.some(p => p.pos.row === pos.row && p.pos.col === pos.col)) continue;
    if (rawSees(grid, pos, c1.pos) && rawSees(grid, pos, cN.pos)) {
      elims.push({ cell: pos, digit: X });
    }
  }
  if (elims.length === 0) return null;

  const chainStr = path.map(p => `R${p.pos.row + 1}C${p.pos.col + 1}`).join('-');
  const digitStr = path.map(p => `{${p.digits[0]},${p.digits[1]}}`).join('-');

  const candidates: Array<{ cell: CellPosition; digit: number }> = [];
  for (const p of path) {
    candidates.push({ cell: p.pos, digit: p.digits[0] });
    candidates.push({ cell: p.pos, digit: p.digits[1] });
  }

  return {
    heuristicId: 'xy-chain',
    description: `XY-Chain (length ${path.length}): ${chainStr} ${digitStr} eliminates ${X}`,
    placements: [],
    eliminations: elims,
    highlights: [
      {
        role: 'trigger',
        color: '#4CAF50',
        cells: path.map(p => p.pos),
        candidates,
      },
      {
        role: 'elimination',
        color: '#F44336',
        cells: elims.map(e => e.cell),
        candidates: elims,
      },
    ],
    snapshotBefore: grid.snapshot(),
  };
}
