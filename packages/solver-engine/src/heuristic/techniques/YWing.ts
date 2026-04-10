import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { CellPosition } from '../../model/types';
import { Elimination } from '../../constraint/types';

/**
 * Y-Wing (XY-Wing) heuristic.
 *
 * Pivot cell has candidates {A, B}.
 * Wing 1 sees pivot and has candidates {A, C}.
 * Wing 2 sees pivot and has candidates {B, C}.
 *
 * If pivot = A → wing1 ≠ A → wing1 = C.
 * If pivot = B → wing2 ≠ B → wing2 = C.
 * Either way, C appears in one of the wings.
 * → Eliminate C from any cell that sees BOTH wings.
 */

function cellsSeeEachOther(grid: Grid, a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row && a.col === b.col) return false;
  for (const region of grid.getRegionsFor(a)) {
    if (region.cells.some(c => c.row === b.row && c.col === b.col)) return true;
  }
  return false;
}

interface Wing {
  pos: CellPosition;
  otherDigit: number;
}

function findWings(grid: Grid, pivotPos: CellPosition, sharedDigit: number): Wing[] {
  const seen = new Set<string>();
  const result: Wing[] = [];

  for (const region of grid.getRegionsFor(pivotPos)) {
    for (const pos of region.cells) {
      const key = `${pos.row},${pos.col}`;
      if (key === `${pivotPos.row},${pivotPos.col}`) continue;
      if (seen.has(key)) continue;
      seen.add(key);

      const cell = grid.getCell(pos);
      if (cell.value !== null || cell.candidates.count() !== 2) continue;
      if (!cell.candidates.has(sharedDigit)) continue;

      const digits = cell.candidates.values();
      const other = digits[0] === sharedDigit ? digits[1] : digits[0];
      result.push({ pos, otherDigit: other });
    }
  }

  return result;
}

export const YWing: Heuristic = {
  id: 'y-wing',
  displayName: 'Y-Wing',
  difficulty: 'intermediate',

  apply(grid: Grid, _constraints: ConstraintSet): SolveStep | null {
    for (const pivotCell of grid.getAllCells()) {
      if (pivotCell.value !== null || pivotCell.candidates.count() !== 2) continue;

      const [a, b] = pivotCell.candidates.values();
      const pivotPos = pivotCell.position;

      const wingsA = findWings(grid, pivotPos, a); // {A, ?}
      const wingsB = findWings(grid, pivotPos, b); // {B, ?}

      for (const w1 of wingsA) {
        const c = w1.otherDigit; // wing1 = {A, C}
        if (c === b) continue; // wing1 would be {A, B} = pivot's candidates, skip

        for (const w2 of wingsB) {
          if (w2.otherDigit !== c) continue; // wing2 must have {B, C}
          if (w2.pos.row === w1.pos.row && w2.pos.col === w1.pos.col) continue;

          // Find cells that see BOTH wings and have candidate C
          const elims: Elimination[] = [];
          for (const cell of grid.getAllCells()) {
            if (cell.value !== null || !cell.candidates.has(c)) continue;
            const pos = cell.position;
            if (pos.row === pivotPos.row && pos.col === pivotPos.col) continue;
            if (pos.row === w1.pos.row && pos.col === w1.pos.col) continue;
            if (pos.row === w2.pos.row && pos.col === w2.pos.col) continue;

            if (cellsSeeEachOther(grid, pos, w1.pos) && cellsSeeEachOther(grid, pos, w2.pos)) {
              elims.push({ cell: pos, digit: c });
            }
          }

          if (elims.length > 0) {
            return {
              heuristicId: 'y-wing',
              description: `Y-Wing: pivot R${pivotPos.row + 1}C${pivotPos.col + 1} `
                + `{${a},${b}}, wings R${w1.pos.row + 1}C${w1.pos.col + 1} {${a},${c}} `
                + `and R${w2.pos.row + 1}C${w2.pos.col + 1} {${b},${c}}, eliminates ${c}`,
              placements: [],
              eliminations: elims,
              highlights: [
                { role: 'trigger', color: '#4CAF50', cells: [pivotPos],
                  candidates: [{ cell: pivotPos, digit: a }, { cell: pivotPos, digit: b }] },
                { role: 'target', color: '#FF9800', cells: [w1.pos, w2.pos],
                  candidates: [{ cell: w1.pos, digit: c }, { cell: w2.pos, digit: c }] },
                { role: 'elimination', color: '#F44336',
                  cells: elims.map(e => e.cell), candidates: elims },
              ],
              snapshotBefore: grid.snapshot(),
            };
          }
        }
      }
    }

    return null;
  },
};
