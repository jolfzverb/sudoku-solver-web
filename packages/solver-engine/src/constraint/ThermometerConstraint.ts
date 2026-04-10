import { CellPosition } from '../model/types';
import { Grid } from '../model/Grid';
import { Constraint, Violation, Elimination } from './types';

export class ThermometerConstraint implements Constraint {
  readonly id: string;
  readonly type = 'thermo';
  readonly affectedCells: ReadonlyArray<CellPosition>;

  constructor(id: string, path: CellPosition[]) {
    this.id = id;
    this.affectedCells = path;
  }

  validate(grid: Grid): Violation[] {
    let prevValue: number | null = null;
    for (const pos of this.affectedCells) {
      const cell = grid.getCell(pos);
      if (cell.value !== null) {
        if (prevValue !== null && cell.value <= prevValue) {
          return [{ constraintId: this.id, message: `Thermometer violation: ${cell.value} <= ${prevValue}`, cells: [...this.affectedCells] }];
        }
        prevValue = cell.value;
      } else {
        prevValue = null;
      }
    }
    return [];
  }

  getDirectEliminations(grid: Grid): Elimination[] {
    const path = this.affectedCells;
    const len = path.length;
    const lower = new Array<number>(len);
    const upper = new Array<number>(len);

    // Forward pass: compute lower bounds using candidate-aware propagation.
    // For each position, find the smallest feasible candidate (>= current lower bound).
    // This becomes the effective minimum, so the next position must be strictly greater.
    for (let i = 0; i < len; i++) {
      let lb = i > 0 ? lower[i - 1] + 1 : 1;
      lb = Math.max(lb, i + 1); // static positional minimum

      const cell = grid.getCell(path[i]);
      if (cell.value !== null) {
        lb = Math.max(lb, cell.value);
      } else {
        // Find minimum candidate >= lb
        let minFeasible = Infinity;
        for (const d of cell.candidates.values()) {
          if (d >= lb && d < minFeasible) minFeasible = d;
        }
        if (minFeasible !== Infinity) lb = minFeasible;
      }
      lower[i] = lb;
    }

    // Backward pass: compute upper bounds using candidate-aware propagation.
    // For each position, find the largest feasible candidate (<= current upper bound).
    // This becomes the effective maximum, so the previous position must be strictly less.
    for (let i = len - 1; i >= 0; i--) {
      let ub = i < len - 1 ? upper[i + 1] - 1 : grid.size;
      ub = Math.min(ub, grid.size - (len - i - 1)); // static positional maximum

      const cell = grid.getCell(path[i]);
      if (cell.value !== null) {
        ub = Math.min(ub, cell.value);
      } else {
        // Find maximum candidate <= ub
        let maxFeasible = -Infinity;
        for (const d of cell.candidates.values()) {
          if (d <= ub && d > maxFeasible) maxFeasible = d;
        }
        if (maxFeasible !== -Infinity) ub = maxFeasible;
      }
      upper[i] = ub;
    }

    // Eliminate candidates outside [lower[i], upper[i]]
    const eliminations: Elimination[] = [];
    for (let i = 0; i < len; i++) {
      const cell = grid.getCell(path[i]);
      if (cell.value === null) {
        for (const d of cell.candidates.values()) {
          if (d < lower[i] || d > upper[i]) {
            eliminations.push({ cell: path[i], digit: d });
          }
        }
      }
    }
    return eliminations;
  }
}
