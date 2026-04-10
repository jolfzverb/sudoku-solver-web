import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { CellPosition } from '../../model/types';

/**
 * Thermo Forcing heuristic.
 *
 * If placing candidate V at thermo position k forces a unique chain of values
 * along the thermometer (each step has exactly 1 feasible candidate), and some
 * external cell that sees all the forced cells has ALL its candidates blocked
 * by those forced values → V is impossible, eliminate it.
 *
 * Works in both directions: setting a low value forces backward, setting a
 * high value forces forward.
 */

function cellsSeeEachOther(grid: Grid, a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row && a.col === b.col) return false;
  for (const region of grid.getRegionsFor(a)) {
    if (region.cells.some(c => c.row === b.row && c.col === b.col)) return true;
  }
  return false;
}

interface ForcedEntry {
  idx: number;
  pos: CellPosition;
  value: number;
}

function computeForcedChain(
  grid: Grid,
  path: ReadonlyArray<CellPosition>,
  startIdx: number,
  startValue: number,
): ForcedEntry[] {
  const forced: ForcedEntry[] = [{ idx: startIdx, pos: path[startIdx], value: startValue }];

  // Force backward (decreasing values)
  let v = startValue;
  for (let i = startIdx - 1; i >= 0; i--) {
    const cell = grid.getCell(path[i]);
    if (cell.value !== null) {
      if (cell.value < v) {
        forced.push({ idx: i, pos: path[i], value: cell.value });
        v = cell.value;
      } else {
        break;
      }
      continue;
    }
    const below = cell.candidates.values().filter(d => d < v);
    if (below.length === 1) {
      forced.push({ idx: i, pos: path[i], value: below[0] });
      v = below[0];
    } else {
      break;
    }
  }

  // Force forward (increasing values)
  v = startValue;
  for (let i = startIdx + 1; i < path.length; i++) {
    const cell = grid.getCell(path[i]);
    if (cell.value !== null) {
      if (cell.value > v) {
        forced.push({ idx: i, pos: path[i], value: cell.value });
        v = cell.value;
      } else {
        break;
      }
      continue;
    }
    const above = cell.candidates.values().filter(d => d > v);
    if (above.length === 1) {
      forced.push({ idx: i, pos: path[i], value: above[0] });
      v = above[0];
    } else {
      break;
    }
  }

  return forced;
}

export const ThermoForcing: Heuristic = {
  id: 'thermo-forcing',
  displayName: 'Thermo Forcing',
  difficulty: 'advanced',

  apply(grid: Grid, constraints: ConstraintSet): SolveStep | null {
    const thermos = constraints.getConstraintsByType('thermo');

    for (const thermo of thermos) {
      const path = thermo.affectedCells;
      const thermoSet = new Set(path.map(p => `${p.row},${p.col}`));

      for (let k = 0; k < path.length; k++) {
        const cell = grid.getCell(path[k]);
        if (cell.value !== null) continue;

        for (const v of cell.candidates.values()) {
          const chain = computeForcedChain(grid, path, k, v);
          if (chain.length < 2) continue;

          // Check if any external cell is fully blocked by the forced chain
          const blocked = findBlockedCell(grid, thermoSet, chain);
          if (!blocked) continue;

          const forcedCells = chain.map(e => e.pos);
          return {
            heuristicId: 'thermo-forcing',
            description: `Thermo forcing: ${v} at R${path[k].row + 1}C${path[k].col + 1} `
              + `forces chain ${chain.map(e => e.value).join('→')}, `
              + `blocking R${blocked.row + 1}C${blocked.col + 1}`,
            placements: [],
            eliminations: [{ cell: path[k], digit: v }],
            highlights: [
              { role: 'trigger', color: '#4CAF50', cells: forcedCells,
                candidates: chain.map(e => ({ cell: e.pos, digit: e.value })) },
              { role: 'target', color: '#FF9800', cells: [blocked] },
              { role: 'elimination', color: '#F44336', cells: [path[k]],
                candidates: [{ cell: path[k], digit: v }] },
            ],
            snapshotBefore: grid.snapshot(),
          };
        }
      }
    }

    return null;
  },
};

function findBlockedCell(
  grid: Grid,
  thermoSet: Set<string>,
  chain: ForcedEntry[],
): CellPosition | null {
  for (const cell of grid.getAllCells()) {
    if (cell.value !== null) continue;
    if (cell.candidates.count() === 0) continue;
    const key = `${cell.position.row},${cell.position.col}`;
    if (thermoSet.has(key)) continue;

    // Check: is every candidate of this cell blocked by a forced cell it sees?
    let allBlocked = true;
    for (const d of cell.candidates.values()) {
      const blocked = chain.some(e =>
        e.value === d && cellsSeeEachOther(grid, cell.position, e.pos)
      );
      if (!blocked) {
        allBlocked = false;
        break;
      }
    }

    if (allBlocked) return cell.position;
  }
  return null;
}
