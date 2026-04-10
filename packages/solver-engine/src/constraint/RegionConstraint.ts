import { Region, CellPosition } from '../model/types';
import { Grid } from '../model/Grid';
import { Constraint, Violation, Elimination } from './types';

export class RegionConstraint implements Constraint {
  readonly id: string;
  readonly type = 'region-unique';
  readonly affectedCells: ReadonlyArray<CellPosition>;

  constructor(region: Region) {
    this.id = `region-unique-${region.id}`;
    this.affectedCells = region.cells;
  }

  validate(grid: Grid): Violation[] {
    const violations: Violation[] = [];
    const seen = new Map<number, CellPosition[]>();
    for (const pos of this.affectedCells) {
      const cell = grid.getCell(pos);
      if (cell.value !== null) {
        const existing = seen.get(cell.value) ?? [];
        existing.push(pos);
        seen.set(cell.value, existing);
      }
    }
    for (const [digit, positions] of seen) {
      if (positions.length > 1) {
        violations.push({
          constraintId: this.id,
          message: `Digit ${digit} appears ${positions.length} times`,
          cells: positions,
        });
      }
    }
    return violations;
  }

  getDirectEliminations(grid: Grid): Elimination[] {
    const eliminations: Elimination[] = [];
    const placedDigits = new Set<number>();
    for (const pos of this.affectedCells) {
      const cell = grid.getCell(pos);
      if (cell.value !== null) placedDigits.add(cell.value);
    }
    for (const pos of this.affectedCells) {
      const cell = grid.getCell(pos);
      if (cell.value === null) {
        for (const digit of placedDigits) {
          if (cell.candidates.has(digit)) {
            eliminations.push({ cell: pos, digit });
          }
        }
      }
    }
    return eliminations;
  }
}
