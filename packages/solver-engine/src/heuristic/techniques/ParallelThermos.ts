import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { CellPosition } from '../../model/types';
import { Constraint, Elimination } from '../../constraint/types';

/**
 * Parallel Thermometers heuristic.
 *
 * If N thermometers of length L share the same row (or column) at each
 * position index, and L + N = gridSize + 1, then each thermometer MUST
 * contain consecutive digits (k, k+1, ..., k+L-1) for some k in {1..N}.
 *
 * Phase 1: Restrict candidates based on valid start values per thermo.
 * Phase 2 (thermo-forcing): External cells that see thermo cells can
 *   eliminate start values — if ALL of an external cell's candidates would
 *   be occupied by a thermo with start k, that start is impossible.
 * Phase 3: Cross-propagate start values between thermos.
 */

function cellsSeeEachOther(grid: Grid, a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row && a.col === b.col) return false;
  for (const region of grid.getRegionsFor(a)) {
    if (region.cells.some(c => c.row === b.row && c.col === b.col)) return true;
  }
  return false;
}

export const ParallelThermos: Heuristic = {
  id: 'parallel-thermos',
  displayName: 'Parallel Thermometers',
  difficulty: 'advanced',

  apply(grid: Grid, constraints: ConstraintSet): SolveStep | null {
    const thermos = constraints.getConstraintsByType('thermo');
    if (thermos.length < 2) return null;

    const groups = findParallelGroups(thermos, grid.size);

    for (const group of groups) {
      const step = processGroup(grid, group.thermos, group.length);
      if (step) return step;
    }

    return null;
  },
};

interface ParallelGroup {
  thermos: Constraint[];
  length: number;
}

function findParallelGroups(thermos: Constraint[], gridSize: number): ParallelGroup[] {
  const groups = new Map<string, Constraint[]>();

  for (const t of thermos) {
    const path = t.affectedCells;
    const len = path.length;

    const rowKey = `R:${len}:${path.map(p => p.row).join(',')}`;
    if (!groups.has(rowKey)) groups.set(rowKey, []);
    groups.get(rowKey)!.push(t);

    const colKey = `C:${len}:${path.map(p => p.col).join(',')}`;
    if (!groups.has(colKey)) groups.set(colKey, []);
    groups.get(colKey)!.push(t);
  }

  const result: ParallelGroup[] = [];
  for (const group of groups.values()) {
    const len = group[0].affectedCells.length;
    if (len + group.length === gridSize + 1) {
      result.push({ thermos: group, length: len });
    }
  }

  return result;
}

function processGroup(grid: Grid, thermos: Constraint[], length: number): SolveStep | null {
  const n = thermos.length;

  // Phase 1: compute valid start values from thermo cell candidates
  const startSets: Set<number>[] = thermos.map(t => {
    const possible = new Set<number>();
    for (let k = 1; k <= n; k++) {
      let valid = true;
      for (let j = 0; j < length; j++) {
        const cell = grid.getCell(t.affectedCells[j]);
        const required = k + j;
        if (cell.value !== null) {
          if (cell.value !== required) { valid = false; break; }
        } else {
          if (!cell.candidates.has(required)) { valid = false; break; }
        }
      }
      if (valid) possible.add(k);
    }
    return possible;
  });

  // Phase 2: external cell forcing — eliminate starts blocked by external cells
  const thermoSets = thermos.map(t =>
    new Set(t.affectedCells.map((p: CellPosition) => `${p.row},${p.col}`))
  );

  for (let i = 0; i < n; i++) {
    filterStartsByExternalCells(grid, thermos[i].affectedCells, startSets[i], length, thermoSets[i]);
  }

  // Phase 3: cross-propagate start values
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < n; i++) {
      if (startSets[i].size === 1) {
        const k = [...startSets[i]][0];
        for (let j = 0; j < n; j++) {
          if (j !== i && startSets[j].has(k)) {
            startSets[j].delete(k);
            changed = true;
          }
        }
      }
    }
  }

  // Generate eliminations
  const elims: Elimination[] = [];
  const triggerCells: CellPosition[] = [];

  for (let i = 0; i < n; i++) {
    const path = thermos[i].affectedCells;
    for (let j = 0; j < length; j++) {
      const cell = grid.getCell(path[j]);
      triggerCells.push(path[j]);
      if (cell.value !== null) continue;

      const valid = new Set<number>();
      for (const k of startSets[i]) valid.add(k + j);

      for (const d of cell.candidates.values()) {
        if (!valid.has(d)) {
          elims.push({ cell: path[j], digit: d });
        }
      }
    }
  }

  if (elims.length === 0) return null;

  return {
    heuristicId: 'parallel-thermos',
    description: `Parallel Thermos: ${n} thermos of length ${length} — consecutive + external forcing`,
    placements: [],
    eliminations: elims,
    highlights: [
      { role: 'trigger', color: '#4CAF50', cells: triggerCells },
      { role: 'elimination', color: '#F44336',
        cells: elims.map(e => e.cell), candidates: elims },
    ],
    snapshotBefore: grid.snapshot(),
  };
}

/**
 * For a single thermo, check external cells to eliminate impossible start values.
 *
 * Level 1: a single external cell has ALL candidates blocked → start impossible.
 * Level 2: two external cells in the same region both reduced to a single
 *   identical candidate → they'd conflict → start impossible.
 */
function filterStartsByExternalCells(
  grid: Grid,
  path: ReadonlyArray<CellPosition>,
  startSet: Set<number>,
  length: number,
  thermoSet: Set<string>,
): void {
  // Precompute external cells that see at least one thermo position
  interface ExtCell {
    pos: CellPosition;
    value: number | null;
    candidates: number[];
    seenPositions: number[];
  }
  const extCells: ExtCell[] = [];

  for (const cell of grid.getAllCells()) {
    const pos = cell.position;
    if (thermoSet.has(`${pos.row},${pos.col}`)) continue;

    const seenPositions: number[] = [];
    for (let j = 0; j < length; j++) {
      if (cellsSeeEachOther(grid, pos, path[j])) {
        seenPositions.push(j);
      }
    }
    if (seenPositions.length === 0) continue;

    extCells.push({
      pos,
      value: cell.value,
      candidates: cell.value !== null ? [] : cell.candidates.values(),
      seenPositions,
    });
  }

  for (const k of [...startSet]) {
    if (isStartBlockedByExternals(grid, k, extCells)) {
      startSet.delete(k);
    }
  }
}

function isStartBlockedByExternals(
  grid: Grid,
  k: number,
  extCells: Array<{ pos: CellPosition; value: number | null; candidates: number[]; seenPositions: number[] }>,
): boolean {
  // Check placed values: conflict if k+j = placed value at a seen position
  for (const ext of extCells) {
    if (ext.value !== null) {
      for (const j of ext.seenPositions) {
        if (k + j === ext.value) return true;
      }
    }
  }

  // Compute residual candidates for each unplaced external cell
  const residuals: Array<{ pos: CellPosition; residual: number[] }> = [];

  for (const ext of extCells) {
    if (ext.value !== null || ext.candidates.length === 0) continue;

    const blocked = new Set<number>();
    for (const j of ext.seenPositions) blocked.add(k + j);

    const residual = ext.candidates.filter(d => !blocked.has(d));

    // Level 1: cell with no remaining candidates
    if (residual.length === 0) return true;

    if (residual.length < ext.candidates.length) {
      // Only track cells that actually lost candidates
      residuals.push({ pos: ext.pos, residual });
    }
  }

  // Level 2: two cells in same region both reduced to singleton with same value
  for (let a = 0; a < residuals.length; a++) {
    if (residuals[a].residual.length !== 1) continue;
    const val = residuals[a].residual[0];
    for (let b = a + 1; b < residuals.length; b++) {
      if (residuals[b].residual.length !== 1) continue;
      if (residuals[b].residual[0] !== val) continue;
      if (cellsSeeEachOther(grid, residuals[a].pos, residuals[b].pos)) {
        return true;
      }
    }
  }

  return false;
}
