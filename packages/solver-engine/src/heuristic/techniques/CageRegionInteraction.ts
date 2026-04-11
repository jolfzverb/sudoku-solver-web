import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { CageSumConstraint } from '../../constraint/CageSumConstraint';
import { Heuristic, SolveStep } from '../types';
import { CellPosition, Region } from '../../model/types';
import { Elimination } from '../../constraint/types';
import { formatRegion } from '../utils';

/**
 * Cage Region Interaction heuristic.
 *
 * For each region (row/col/box), find all killer cages fully contained within it.
 * Compute valid digit combinations for each cage (excluding digits already placed
 * in the region). Then check which combinations are mutually compatible — all
 * digits across cages must be distinct within the region.
 *
 * Digits that don't appear in any compatible assignment are eliminated.
 *
 * Example: two 2-cell cages in a row with sums 14 and 15.
 *   Cage 14: combos {5,9}, {6,8}
 *   Cage 15: combos {6,9}, {7,8}
 *   If cage 14 = {6,8} → cage 15 can't use 6 or 8 → no valid combo. Dead end.
 *   If cage 14 = {5,9} → cage 15 can't use 9 → {7,8} only.
 *   → cage 14 must be {5,9}, cage 15 must be {7,8}
 *   → eliminate 6,8 from cage 14 cells; eliminate 6,9 from cage 15 cells
 */

export const CageRegionInteraction: Heuristic = {
  id: 'cage-region-interaction',
  displayName: 'Cage Region Interaction',
  difficulty: 'intermediate',

  apply(grid: Grid, constraints: ConstraintSet): SolveStep | null {
    const cages = constraints.getConstraintsByType('cage-sum') as CageSumConstraint[];
    if (cages.length === 0) return null;

    const regions = grid.getRegions().filter(r =>
      r.type === 'row' || r.type === 'column' || r.type === 'box'
    );

    for (const region of regions) {
      const step = analyzeRegion(grid, region, cages);
      if (step) return step;
    }

    return null;
  },
};

function analyzeRegion(
  grid: Grid,
  region: Region,
  allCages: CageSumConstraint[],
): SolveStep | null {
  const regionCellSet = new Set(region.cells.map(p => `${p.row},${p.col}`));

  // Find cages fully contained in this region with at least one empty cell
  const regionCages: CageSumConstraint[] = [];
  for (const cage of allCages) {
    if (cage.affectedCells.every(p => regionCellSet.has(`${p.row},${p.col}`))) {
      if (cage.affectedCells.some(p => grid.getCell(p).value === null)) {
        regionCages.push(cage);
      }
    }
  }

  if (regionCages.length === 0) return null;

  // Digits placed anywhere in the region — no cage can use these
  const placedInRegion = new Set<number>();
  for (const p of region.cells) {
    const cell = grid.getCell(p);
    if (cell.value !== null) placedInRegion.add(cell.value);
  }

  // Compute valid combos for each cage
  const cageCombos: number[][][] = [];
  for (const cage of regionCages) {
    let placedSum = 0;
    let emptyCount = 0;
    const cageCandidateUnion = new Set<number>();
    for (const p of cage.affectedCells) {
      const cell = grid.getCell(p);
      if (cell.value !== null) {
        placedSum += cell.value;
      } else {
        emptyCount++;
        for (const d of cell.candidates.values()) {
          if (!placedInRegion.has(d)) cageCandidateUnion.add(d);
        }
      }
    }

    // Available: not placed in region AND a candidate of at least one empty cage cell
    const cageAvailable: number[] = [];
    for (let d = 1; d <= grid.size; d++) {
      if (cageCandidateUnion.has(d)) cageAvailable.push(d);
    }

    const combos: number[][] = [];
    findCombos(cageAvailable, 0, emptyCount, cage.targetSum - placedSum, [], combos);
    if (combos.length === 0) return null; // unsatisfiable
    cageCombos.push(combos);
  }

  // Find compatible assignments across all cages
  const validDigitsPerCage: Set<number>[] = regionCages.map(() => new Set<number>());

  (function enumerate(cageIdx: number, used: Set<number>) {
    if (cageIdx === regionCages.length) return;

    for (const combo of cageCombos[cageIdx]) {
      // Check combo doesn't conflict with digits used by previous cages
      let ok = true;
      for (const d of combo) {
        if (used.has(d)) { ok = false; break; }
      }
      if (!ok) continue;

      // Temporarily mark these digits as used
      for (const d of combo) used.add(d);

      let valid: boolean;
      if (cageIdx === regionCages.length - 1) {
        // Last cage — this is a complete valid assignment
        valid = true;
      } else {
        // Check if remaining cages can be satisfied
        valid = canComplete(cageCombos, cageIdx + 1, used);
      }

      if (valid) {
        for (const d of combo) validDigitsPerCage[cageIdx].add(d);
        // Continue to find more valid assignments for earlier cages
        if (cageIdx < regionCages.length - 1) {
          enumerate(cageIdx + 1, used);
        }
      }

      for (const d of combo) used.delete(d);
    }
  })(0, new Set<number>());

  // Generate eliminations
  const elims: Elimination[] = [];
  const triggerCells: CellPosition[] = [];

  for (let i = 0; i < regionCages.length; i++) {
    const cage = regionCages[i];
    const valid = validDigitsPerCage[i];

    for (const pos of cage.affectedCells) {
      const cell = grid.getCell(pos);
      if (cell.value !== null) continue;
      triggerCells.push(pos);

      for (const d of cell.candidates.values()) {
        if (placedInRegion.has(d)) continue; // handled by constraint elimination
        if (!valid.has(d)) {
          elims.push({ cell: pos, digit: d });
        }
      }
    }
  }

  if (elims.length === 0) return null;

  const cageIds = regionCages.map(c => c.id).join(', ');
  return {
    heuristicId: 'cage-region-interaction',
    description: `Cage Region Interaction: cages [${cageIds}] in ${formatRegion(region.id)} — compatible combinations restrict candidates`,
    placements: [],
    eliminations: elims,
    highlights: [
      { role: 'region', color: '#90CAF9', cells: [...region.cells] },
      { role: 'trigger', color: '#4CAF50', cells: triggerCells },
      { role: 'elimination', color: '#F44336',
        cells: elims.map(e => e.cell), candidates: elims },
    ],
    snapshotBefore: grid.snapshot(),
  };
}

/** Check if cages from cageIdx onwards can all find a compatible combo. */
function canComplete(
  cageCombos: number[][][],
  cageIdx: number,
  used: Set<number>,
): boolean {
  if (cageIdx >= cageCombos.length) return true;

  for (const combo of cageCombos[cageIdx]) {
    let ok = true;
    for (const d of combo) {
      if (used.has(d)) { ok = false; break; }
    }
    if (!ok) continue;

    for (const d of combo) used.add(d);
    const result = canComplete(cageCombos, cageIdx + 1, used);
    for (const d of combo) used.delete(d);

    if (result) return true;
  }

  return false;
}

/** Find all subsets of `count` digits from available[start..] summing to target. */
function findCombos(
  available: number[],
  start: number,
  count: number,
  target: number,
  current: number[],
  results: number[][],
): void {
  if (count === 0) {
    if (target === 0) results.push([...current]);
    return;
  }
  if (target <= 0) return;

  for (let i = start; i <= available.length - count; i++) {
    const d = available[i];
    if (d > target) break;

    // Prune: min possible remaining sum
    let minRest = 0;
    for (let j = 0; j < count - 1; j++) minRest += available[i + 1 + j];
    if (d + minRest > target) break;

    // Prune: max possible remaining sum
    let maxRest = 0;
    for (let j = 0; j < count - 1; j++) maxRest += available[available.length - 1 - j];
    if (d + maxRest < target) continue;

    current.push(d);
    findCombos(available, i + 1, count - 1, target - d, current, results);
    current.pop();
  }
}
