import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { CellPosition } from '../../model/types';
import { Elimination } from '../../constraint/types';

/**
 * Thermometer Fork / Merge heuristic.
 *
 * If two thermometers share a prefix and their first divergent cells
 * see each other (same row/col/box), those cells must hold distinct values,
 * both strictly greater than the fork cell. This limits the fork cell's max.
 *
 * Mirror logic applies for shared suffixes (merge point).
 */

function samePos(a: CellPosition, b: CellPosition): boolean {
  return a.row === b.row && a.col === b.col;
}

function cellsSeeEachOther(grid: Grid, a: CellPosition, b: CellPosition): boolean {
  if (samePos(a, b)) return false;
  for (const region of grid.getRegionsFor(a)) {
    if (region.cells.some(c => c.row === b.row && c.col === b.col)) {
      return true;
    }
  }
  return false;
}

export const ThermoFork: Heuristic = {
  id: 'thermo-fork',
  displayName: 'Thermometer Fork',
  difficulty: 'advanced',

  apply(grid: Grid, constraints: ConstraintSet): SolveStep | null {
    const thermos = constraints.getConstraintsByType('thermo');
    if (thermos.length < 2) return null;

    for (let i = 0; i < thermos.length; i++) {
      for (let j = i + 1; j < thermos.length; j++) {
        const pathA = thermos[i].affectedCells;
        const pathB = thermos[j].affectedCells;

        const prefix = checkPrefix(grid, pathA, pathB);
        if (prefix) return prefix;

        const suffix = checkSuffix(grid, pathA, pathB);
        if (suffix) return suffix;
      }
    }
    return null;
  },
};

/**
 * Shared prefix: two thermos fork after a common start.
 * The divergent cells C, D must both be > fork cell's value and C ≠ D.
 * Eliminate V from fork cell if fewer than 2 distinct values > V
 * exist across C's and D's candidates.
 */
function checkPrefix(
  grid: Grid,
  pathA: ReadonlyArray<CellPosition>,
  pathB: ReadonlyArray<CellPosition>,
): SolveStep | null {
  let prefixLen = 0;
  while (prefixLen < pathA.length && prefixLen < pathB.length
    && samePos(pathA[prefixLen], pathB[prefixLen])) {
    prefixLen++;
  }
  if (prefixLen === 0 || prefixLen >= pathA.length || prefixLen >= pathB.length) return null;

  const cellC = pathA[prefixLen];
  const cellD = pathB[prefixLen];
  if (!cellsSeeEachOther(grid, cellC, cellD)) return null;

  const forkPos = pathA[prefixLen - 1];
  const forkCell = grid.getCell(forkPos);
  if (forkCell.value !== null) return null;

  const cCell = grid.getCell(cellC);
  const dCell = grid.getCell(cellD);

  const elims: Elimination[] = [];

  for (const v of forkCell.candidates.values()) {
    const sC = valuesAbove(cCell, v);
    const sD = valuesAbove(dCell, v);
    const union = new Set([...sC, ...sD]);
    if (union.size < 2) {
      elims.push({ cell: forkPos, digit: v });
    }
  }

  if (elims.length === 0) return null;

  return {
    heuristicId: 'thermo-fork',
    description: `Thermo fork at R${forkPos.row + 1}C${forkPos.col + 1}: `
      + `R${cellC.row + 1}C${cellC.col + 1} and R${cellD.row + 1}C${cellD.col + 1} see each other`,
    placements: [],
    eliminations: elims,
    highlights: [
      { role: 'trigger', color: '#4CAF50', cells: [forkPos, cellC, cellD] },
      { role: 'elimination', color: '#F44336', cells: [forkPos], candidates: elims },
    ],
    snapshotBefore: grid.snapshot(),
  };
}

/**
 * Shared suffix: two thermos merge into a common tail.
 * The last pre-merge cells C, D must both be < merge cell's value and C ≠ D.
 * Eliminate V from merge cell if fewer than 2 distinct values < V
 * exist across C's and D's candidates.
 */
function checkSuffix(
  grid: Grid,
  pathA: ReadonlyArray<CellPosition>,
  pathB: ReadonlyArray<CellPosition>,
): SolveStep | null {
  let suffixLen = 0;
  while (suffixLen < pathA.length && suffixLen < pathB.length
    && samePos(pathA[pathA.length - 1 - suffixLen], pathB[pathB.length - 1 - suffixLen])) {
    suffixLen++;
  }
  if (suffixLen === 0 || suffixLen >= pathA.length || suffixLen >= pathB.length) return null;

  const cellC = pathA[pathA.length - 1 - suffixLen];
  const cellD = pathB[pathB.length - 1 - suffixLen];
  if (!cellsSeeEachOther(grid, cellC, cellD)) return null;

  const mergePos = pathA[pathA.length - suffixLen];
  const mergeCell = grid.getCell(mergePos);
  if (mergeCell.value !== null) return null;

  const cCell = grid.getCell(cellC);
  const dCell = grid.getCell(cellD);

  const elims: Elimination[] = [];

  for (const v of mergeCell.candidates.values()) {
    const sC = valuesBelow(cCell, v);
    const sD = valuesBelow(dCell, v);
    const union = new Set([...sC, ...sD]);
    if (union.size < 2) {
      elims.push({ cell: mergePos, digit: v });
    }
  }

  if (elims.length === 0) return null;

  return {
    heuristicId: 'thermo-fork',
    description: `Thermo merge at R${mergePos.row + 1}C${mergePos.col + 1}: `
      + `R${cellC.row + 1}C${cellC.col + 1} and R${cellD.row + 1}C${cellD.col + 1} see each other`,
    placements: [],
    eliminations: elims,
    highlights: [
      { role: 'trigger', color: '#4CAF50', cells: [mergePos, cellC, cellD] },
      { role: 'elimination', color: '#F44336', cells: [mergePos], candidates: elims },
    ],
    snapshotBefore: grid.snapshot(),
  };
}

function valuesAbove(cell: { value: number | null; candidates: { values(): number[] } }, threshold: number): Set<number> {
  if (cell.value !== null) {
    return cell.value > threshold ? new Set([cell.value]) : new Set();
  }
  return new Set(cell.candidates.values().filter(d => d > threshold));
}

function valuesBelow(cell: { value: number | null; candidates: { values(): number[] } }, threshold: number): Set<number> {
  if (cell.value !== null) {
    return cell.value < threshold ? new Set([cell.value]) : new Set();
  }
  return new Set(cell.candidates.values().filter(d => d < threshold));
}
