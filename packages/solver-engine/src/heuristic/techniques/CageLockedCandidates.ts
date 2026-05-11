import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { CageSumConstraint } from '../../constraint/CageSumConstraint';
import { SumConstraint, Elimination } from '../../constraint/types';
import { enumerateSumAssignments } from '../../constraint/SumEnumeration';
import { Heuristic, SolveStep } from '../types';
import { CellPosition, Region } from '../../model/types';
import { formatRegion } from '../utils';
import { getVirtualCages } from '../VirtualCageRegistry';

/**
 * Cage Locked Candidates heuristic.
 *
 * If a sum-constraint has exactly one valid combination of digits AND its
 * cells fit within a single region (row, column, or box), then those
 * digits must occupy the constraint's cells inside that region. They can
 * be eliminated from every other cell of that region.
 *
 * Applies to user `CageSumConstraint`s and to virtual sum constraints that
 * pass `isPureKillerCage()` — for the latter, this is how single-combo
 * innies/outies propagate locked-candidate eliminations into the rest of
 * their region.
 */

export const CageLockedCandidates: Heuristic = {
  id: 'cage-locked-candidates',
  displayName: 'Cage Locked Candidates',
  difficulty: 'intermediate',

  apply(grid: Grid, constraints: ConstraintSet): SolveStep | null {
    const userCages = constraints.getConstraintsByType('cage-sum') as CageSumConstraint[];
    const virtualPure = getVirtualCages(grid, constraints).filter(v => v.isPureKillerCage());
    const candidates: SumConstraint[] = [...userCages, ...virtualPure];
    if (candidates.length === 0) return null;

    const regions = grid.getRegions().filter(r =>
      r.type === 'row' || r.type === 'column' || r.type === 'box',
    );

    for (const cage of candidates) {
      const step = analyzeCage(grid, cage, regions);
      if (step) return step;
    }

    return null;
  },
};

function analyzeCage(
  grid: Grid,
  cage: SumConstraint,
  regions: ReadonlyArray<Region>,
): SolveStep | null {
  const cells = cage.signedCells.map(sc => sc.pos);

  const emptyIndices: number[] = [];
  for (let i = 0; i < cage.signedCells.length; i++) {
    if (grid.getCell(cage.signedCells[i].pos).value === null) emptyIndices.push(i);
  }
  if (emptyIndices.length === 0) return null;

  const result = enumerateSumAssignments(grid, cage.signedCells, cage.targetSum, cage.distinctEdges);
  if (!result.feasible) return null;

  // Detect single-combo: every empty cell has the same allowed set, of size
  // equal to the empty-cell count. (With full pairwise distinctness — i.e.
  // `isPureKillerCage()` — this is equivalent to "exactly one combination
  // of digits across all valid assignments".)
  const firstAllowed = result.allowedPerCell[emptyIndices[0]];
  if (firstAllowed.size !== emptyIndices.length) return null;
  for (const i of emptyIndices) {
    const set = result.allowedPerCell[i];
    if (set.size !== firstAllowed.size) return null;
    for (const d of set) if (!firstAllowed.has(d)) return null;
  }

  const combo = [...firstAllowed].sort((a, b) => a - b);
  const cageCellSet = new Set(cells.map(p => `${p.row},${p.col}`));

  for (const region of regions) {
    const regionCellSet = new Set(region.cells.map(p => `${p.row},${p.col}`));

    let allInRegion = true;
    for (const p of cells) {
      if (!regionCellSet.has(`${p.row},${p.col}`)) {
        allInRegion = false;
        break;
      }
    }
    if (!allInRegion) continue;

    const elims: Elimination[] = [];
    for (const p of region.cells) {
      if (cageCellSet.has(`${p.row},${p.col}`)) continue;
      const cell = grid.getCell(p);
      if (cell.value !== null) continue;
      for (const d of combo) {
        if (cell.candidates.has(d)) elims.push({ cell: p, digit: d });
      }
    }
    if (elims.length === 0) continue;

    return {
      heuristicId: 'cage-locked-candidates',
      description:
        `Cage Locked Candidates: ${describeCage(cage)} — `
        + `single combo {${combo.join(',')}} fully inside ${formatRegion(region.id)} `
        + `→ eliminate {${combo.join(',')}} from other cells of ${formatRegion(region.id)}`,
      placements: [],
      eliminations: elims,
      highlights: [
        { role: 'trigger', color: '#4CAF50', cells: cells as CellPosition[] },
        {
          role: 'elimination', color: '#F44336',
          cells: elims.map(e => e.cell), candidates: elims,
        },
      ],
      snapshotBefore: grid.snapshot(),
    };
  }

  return null;
}

function describeCage(cage: SumConstraint): string {
  if (cage.type === 'cage-sum') return `cage ${cage.id} (sum=${cage.targetSum})`;
  if (cage.type === 'virtual-sum') {
    const v = cage as SumConstraint & { source?: string };
    return v.source ? `virtual ${cage.id} [${v.source}]` : `virtual ${cage.id}`;
  }
  return `${cage.type} ${cage.id}`;
}
