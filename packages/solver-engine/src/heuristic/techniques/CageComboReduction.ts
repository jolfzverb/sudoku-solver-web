import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { CageSumConstraint } from '../../constraint/CageSumConstraint';
import { Heuristic, SolveStep } from '../types';
import { CellPosition, Region } from '../../model/types';
import { Elimination } from '../../constraint/types';
import { formatRegion } from '../utils';

/**
 * Cage Combo Reduction heuristic.
 *
 * Uses region analysis (row/col/box) to force or exclude digits from cage
 * combos, then eliminates candidates based on the filtered combo set.
 *
 * Key deduction: if digit D in a region can ONLY go in cells of one cage,
 * that cage MUST contain D. Combos without D are removed, which may
 * eliminate candidates from cage cells.
 *
 * Also handles the reverse: if digit D is placed in the region outside
 * the cage, combos containing D are removed.
 */

export const CageComboReduction: Heuristic = {
  id: 'cage-combo-reduction',
  displayName: 'Cage Combo Reduction',
  difficulty: 'intermediate',

  apply(grid: Grid, constraints: ConstraintSet): SolveStep | null {
    const cages = constraints.getConstraintsByType('cage-sum') as CageSumConstraint[];
    if (cages.length === 0) return null;

    const regions = grid.getRegions().filter(r =>
      r.type === 'row' || r.type === 'column' || r.type === 'box'
    );

    for (const cage of cages) {
      const step = analyzeCage(grid, cage, regions);
      if (step) return step;
    }

    return null;
  },
};

function analyzeCage(
  grid: Grid,
  cage: CageSumConstraint,
  regions: ReadonlyArray<Region>,
): SolveStep | null {
  const { placedDigits, emptyCells, combos: baseCombos } = cage.computeCombos(grid);
  if (emptyCells.length === 0 || baseCombos.isEmpty()) return null;

  const cageCellSet = new Set(cage.affectedCells.map(p => `${p.row},${p.col}`));

  // Work on a clone so we can filter without affecting the original
  const combos = baseCombos.clone();
  const reasons: string[] = [];

  // For each region that overlaps with this cage
  for (const region of regions) {
    const cageCellsInRegion: CellPosition[] = [];
    for (const p of cage.affectedCells) {
      if (region.cells.some(rc => rc.row === p.row && rc.col === p.col)) {
        cageCellsInRegion.push(p);
      }
    }
    if (cageCellsInRegion.length === 0) continue;

    // Only apply region-based logic if ALL cage empty cells are in this region.
    // Otherwise a digit placed in the region might still go in a cage cell
    // outside this region.
    const emptyCageCellsInRegion = emptyCells.filter(ec =>
      region.cells.some(rc => rc.row === ec.pos.row && rc.col === ec.pos.col)
    );
    if (emptyCageCellsInRegion.length !== emptyCells.length) continue;

    // Digits placed in the region outside this cage → cage can't use them
    for (const p of region.cells) {
      if (cageCellSet.has(`${p.row},${p.col}`)) continue;
      const cell = grid.getCell(p);
      if (cell.value !== null) {
        if (combos.excludeDigit(cell.value)) {
          reasons.push(`${cell.value} placed in ${formatRegion(region.id)}`);
        }
      }
    }

    // For each digit: if it can only go in cage cells within this region → cage must have it
    for (let d = 1; d <= grid.size; d++) {
      if (placedDigits.has(d)) continue;

      // Is D already placed in the region?
      let alreadyPlaced = false;
      for (const p of region.cells) {
        if (grid.getCell(p).value === d) { alreadyPlaced = true; break; }
      }
      if (alreadyPlaced) continue;

      // Find cells in region (outside cage) that can hold D
      let canGoOutsideCage = false;
      for (const p of region.cells) {
        if (cageCellSet.has(`${p.row},${p.col}`)) continue;
        const cell = grid.getCell(p);
        if (cell.value === null && cell.candidates.has(d)) {
          canGoOutsideCage = true;
          break;
        }
      }

      if (!canGoOutsideCage) {
        // D can only go in cage cells within this region → cage MUST contain D
        // Check if any cage cell can hold D
        const canGoInCage = emptyCells.some(ec => ec.candidates.includes(d));
        if (canGoInCage && combos.requireDigit(d)) {
          reasons.push(`${d} forced into cage from ${formatRegion(region.id)}`);
        }
      }
    }
  }

  if (combos.isEmpty()) return null; // shouldn't happen in valid puzzle

  // Compute eliminations from filtered combos
  const validDigits = combos.getValidDigits();
  const elims: Elimination[] = [];

  for (const { pos, candidates } of emptyCells) {
    for (const d of candidates) {
      if (placedDigits.has(d)) continue; // already handled by constraint elimination
      if (!validDigits.has(d)) {
        elims.push({ cell: pos, digit: d });
      }
    }
  }

  if (elims.length === 0) return null;

  return {
    heuristicId: 'cage-combo-reduction',
    description:
      `Cage Combo Reduction: cage ${cage.id} (sum=${cage.targetSum}) — `
      + reasons.join('; ')
      + ` → valid combos: ${combos.getCombos().map(c => `{${c.join(',')}}`).join(', ')}`,
    placements: [],
    eliminations: elims,
    highlights: [
      {
        role: 'trigger', color: '#4CAF50',
        cells: [...cage.affectedCells],
      },
      {
        role: 'elimination', color: '#F44336',
        cells: elims.map(e => e.cell), candidates: elims,
      },
    ],
    snapshotBefore: grid.snapshot(),
  };
}
