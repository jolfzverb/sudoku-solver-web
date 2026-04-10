import { Grid } from '../model/Grid';
import { Cell } from '../model/Cell';
import { CandidateSet } from '../model/CandidateSet';
import { GridFactory } from '../model/GridFactory';
import { ConstraintSet } from '../constraint/ConstraintSet';
import { RegionConstraint } from '../constraint/RegionConstraint';
import { CellPosition } from '../model/types';

const BOX_DIMS: Record<number, [number, number]> = {
  4: [2, 2],
  9: [3, 3],
};

export interface CellSpec {
  value?: number;
  candidates?: number[];
}

/**
 * Build a grid with precise control over cell values and candidates.
 * - specs key format: "row,col" (0-based)
 * - Cells with `value` are set as givens (no candidates)
 * - Cells with `candidates` get exactly those candidates
 * - Unspecified cells get full candidates (1..size)
 */
export function buildGrid(size: number, specs: Record<string, CellSpec>): Grid {
  const [bw, bh] = BOX_DIMS[size] ?? [3, 3];
  const regions = GridFactory.standardRegions(size, bw, bh);
  const cells: Cell[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const key = `${row},${col}`;
      const spec = specs[key];
      if (spec?.value !== undefined) {
        cells.push(new Cell({ row, col }, spec.value, true));
      } else if (spec?.candidates) {
        cells.push(new Cell({ row, col }, null, false, CandidateSet.fromDigits(spec.candidates)));
      } else {
        cells.push(new Cell({ row, col }, null, false, CandidateSet.full(size)));
      }
    }
  }
  return new Grid(size, cells, regions);
}

/**
 * Build a ConstraintSet with RegionConstraints for all regions of a grid.
 */
export function buildConstraints(grid: Grid): ConstraintSet {
  const cs = new ConstraintSet();
  for (const r of grid.getRegions()) {
    cs.add(new RegionConstraint(r));
  }
  return cs;
}

/**
 * Check if eliminations contain a specific {cell, digit} pair.
 */
export function hasElimination(
  elims: ReadonlyArray<{ cell: CellPosition; digit: number }>,
  row: number, col: number, digit: number,
): boolean {
  return elims.some(e => e.cell.row === row && e.cell.col === col && e.digit === digit);
}

/**
 * Check if placements contain a specific {cell, digit} pair.
 */
export function hasPlacement(
  placements: ReadonlyArray<{ cell: CellPosition; digit: number }>,
  row: number, col: number, digit: number,
): boolean {
  return placements.some(p => p.cell.row === row && p.cell.col === col && p.digit === digit);
}
