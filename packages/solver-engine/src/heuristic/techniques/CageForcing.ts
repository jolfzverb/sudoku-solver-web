import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { CageSumConstraint } from '../../constraint/CageSumConstraint';
import { Heuristic, SolveStep } from '../types';
import { CellPosition } from '../../model/types';
import { Elimination } from '../../constraint/types';

/**
 * Cage Forcing heuristic.
 *
 * For each cage combo, check if assigning those digits to the cage would
 * empty an external cell's candidate set. If ALL cage cells see external
 * cell X, then X can't have any digit used by the cage. If X's candidates
 * are a subset of the combo's digits → contradiction → remove that combo.
 *
 * Example: cage sum=15, combos {6,9},{7,8}. External cell X with {7,8}
 * sees both cage cells. Combo {7,8} → X loses 7,8 → empty → excluded.
 * Only {6,9} survives.
 */

function cellsSeeEachOther(grid: Grid, a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row && a.col === b.col) return false;
  for (const region of grid.getRegionsFor(a)) {
    if (region.cells.some(c => c.row === b.row && c.col === b.col)) return true;
  }
  return false;
}

export const CageForcing: Heuristic = {
  id: 'cage-forcing',
  displayName: 'Cage Forcing',
  difficulty: 'advanced',

  apply(grid: Grid, constraints: ConstraintSet): SolveStep | null {
    const cages = constraints.getConstraintsByType('cage-sum') as CageSumConstraint[];
    if (cages.length === 0) return null;

    for (const cage of cages) {
      const step = analyzeCage(grid, cage);
      if (step) return step;
    }

    return null;
  },
};

function analyzeCage(grid: Grid, cage: CageSumConstraint): SolveStep | null {
  const { placedDigits, emptyCells, combos } = cage.computeCombos(grid);
  if (emptyCells.length === 0 || combos.size() < 2) return null;

  const allCageCells = cage.affectedCells;
  const cageSet = new Set(allCageCells.map(p => `${p.row},${p.col}`));

  // Find external cells that see ALL cage cells
  const visibleExternals: Array<{ pos: CellPosition; candidates: Set<number> }> = [];
  for (const cell of grid.getAllCells()) {
    if (cell.value !== null) continue;
    const pos = cell.position;
    if (cageSet.has(`${pos.row},${pos.col}`)) continue;

    let seesAll = true;
    for (const cp of allCageCells) {
      if (!cellsSeeEachOther(grid, pos, cp)) {
        seesAll = false;
        break;
      }
    }
    if (!seesAll) continue;

    const cands = new Set(cell.candidates.values());
    if (cands.size === 0) continue;
    visibleExternals.push({ pos, candidates: cands });
  }

  if (visibleExternals.length === 0) return null;

  // Check each combo: does it empty any external cell?
  const removedCombos: string[] = [];

  for (const combo of combos.getCombos()) {
    const comboSet = new Set(combo);

    for (const ext of visibleExternals) {
      // X sees all cage cells. Placed cage values already eliminated from X
      // by basic constraints. Check: are all X candidates in this combo?
      let allCovered = true;
      for (const d of ext.candidates) {
        if (!comboSet.has(d)) {
          allCovered = false;
          break;
        }
      }

      if (allCovered) {
        // This combo would empty X → invalid
        removedCombos.push(
          `{${combo.join(',')}} blocked by R${ext.pos.row + 1}C${ext.pos.col + 1}`
        );
        break; // one blocker is enough to invalidate this combo
      }
    }
  }

  if (removedCombos.length === 0) return null;

  // Rebuild combo set excluding the invalid ones
  // Re-derive from original combos minus invalid ones
  const invalidComboKeys = new Set<string>();
  for (const combo of combos.getCombos()) {
    const comboSet = new Set(combo);
    for (const ext of visibleExternals) {
      let allCovered = true;
      for (const d of ext.candidates) {
        if (!comboSet.has(d)) { allCovered = false; break; }
      }
      if (allCovered) {
        invalidComboKeys.add(combo.join(','));
        break;
      }
    }
  }

  // Filter combos by excluding invalid digits
  // Use excludeDigit for digits that only appear in invalid combos
  const validCombos = combos.getCombos().filter(c => !invalidComboKeys.has(c.join(',')));
  if (validCombos.length === combos.size()) return null; // nothing removed
  if (validCombos.length === 0) return null; // all invalid = contradiction

  const validDigits = new Set<number>();
  for (const combo of validCombos) {
    for (const d of combo) validDigits.add(d);
  }

  // Generate eliminations from cage cells
  const elims: Elimination[] = [];
  for (const { pos, candidates } of emptyCells) {
    for (const d of candidates) {
      if (placedDigits.has(d)) continue;
      if (!validDigits.has(d)) {
        elims.push({ cell: pos, digit: d });
      }
    }
  }

  if (elims.length === 0) return null;

  return {
    heuristicId: 'cage-forcing',
    description:
      `Cage Forcing: cage ${cage.id} (sum=${cage.targetSum}) — `
      + removedCombos.join('; ')
      + ` → remaining: ${validCombos.map(c => `{${c.join(',')}}`).join(', ')}`,
    placements: [],
    eliminations: elims,
    highlights: [
      {
        role: 'trigger', color: '#4CAF50',
        cells: [...allCageCells],
      },
      {
        role: 'target', color: '#FF9800',
        cells: visibleExternals.map(ext => ext.pos),
      },
      {
        role: 'elimination', color: '#F44336',
        cells: elims.map(e => e.cell), candidates: elims,
      },
    ],
    snapshotBefore: grid.snapshot(),
  };
}
