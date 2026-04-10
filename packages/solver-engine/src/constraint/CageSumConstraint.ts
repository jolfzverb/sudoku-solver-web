import { CellPosition } from '../model/types';
import { Grid } from '../model/Grid';
import { Constraint, Violation, Elimination } from './types';

export class CageSumConstraint implements Constraint {
  readonly id: string;
  readonly type = 'cage-sum';
  readonly affectedCells: ReadonlyArray<CellPosition>;
  readonly targetSum: number;

  constructor(id: string, cells: CellPosition[], targetSum: number) {
    this.id = id;
    this.affectedCells = cells;
    this.targetSum = targetSum;
  }

  validate(grid: Grid): Violation[] {
    const values: number[] = [];
    let allFilled = true;
    for (const pos of this.affectedCells) {
      const cell = grid.getCell(pos);
      if (cell.value !== null) {
        values.push(cell.value);
      } else {
        allFilled = false;
      }
    }
    const violations: Violation[] = [];
    const seen = new Set<number>();
    for (const v of values) {
      if (seen.has(v)) {
        violations.push({ constraintId: this.id, message: `Duplicate digit ${v} in cage`, cells: [...this.affectedCells] });
        break;
      }
      seen.add(v);
    }
    if (allFilled) {
      const sum = values.reduce((a, b) => a + b, 0);
      if (sum !== this.targetSum) {
        violations.push({ constraintId: this.id, message: `Cage sum is ${sum}, expected ${this.targetSum}`, cells: [...this.affectedCells] });
      }
    }
    return violations;
  }

  getDirectEliminations(grid: Grid): Elimination[] {
    const eliminations: Elimination[] = [];
    const placedDigits = new Set<number>();
    let placedSum = 0;
    let emptyCount = 0;
    for (const pos of this.affectedCells) {
      const cell = grid.getCell(pos);
      if (cell.value !== null) { placedDigits.add(cell.value); placedSum += cell.value; }
      else emptyCount++;
    }
    const remaining = this.targetSum - placedSum;
    for (const pos of this.affectedCells) {
      const cell = grid.getCell(pos);
      if (cell.value === null) {
        for (const d of cell.candidates.values()) {
          if (placedDigits.has(d)) eliminations.push({ cell: pos, digit: d });
          else if (emptyCount === 1 && d !== remaining) eliminations.push({ cell: pos, digit: d });
          else if (d > remaining) eliminations.push({ cell: pos, digit: d });
        }
      }
    }
    return eliminations;
  }
}
