import { CellPosition } from '../model/types';
import { Grid } from '../model/Grid';
import { Constraint, Violation, Elimination } from './types';

export class ArrowSumConstraint implements Constraint {
  readonly id: string;
  readonly type = 'arrow-sum';
  readonly affectedCells: ReadonlyArray<CellPosition>;
  readonly circleCell: CellPosition;
  readonly shaftCells: ReadonlyArray<CellPosition>;

  constructor(id: string, circleCell: CellPosition, shaftCells: CellPosition[]) {
    this.id = id;
    this.circleCell = circleCell;
    this.shaftCells = shaftCells;
    this.affectedCells = [circleCell, ...shaftCells];
  }

  validate(grid: Grid): Violation[] {
    const circleValue = grid.getCell(this.circleCell).value;
    if (circleValue === null) return [];
    let shaftSum = 0;
    let allFilled = true;
    for (const pos of this.shaftCells) {
      const cell = grid.getCell(pos);
      if (cell.value !== null) shaftSum += cell.value;
      else allFilled = false;
    }
    if (allFilled && shaftSum !== circleValue) {
      return [{ constraintId: this.id, message: `Arrow sum ${shaftSum} != circle ${circleValue}`, cells: [...this.affectedCells] }];
    }
    return [];
  }

  getDirectEliminations(grid: Grid): Elimination[] {
    const eliminations: Elimination[] = [];
    const circle = grid.getCell(this.circleCell);
    let shaftSum = 0;
    let allShaftFilled = true;
    for (const pos of this.shaftCells) {
      const cell = grid.getCell(pos);
      if (cell.value !== null) shaftSum += cell.value;
      else allShaftFilled = false;
    }
    if (allShaftFilled && circle.value === null) {
      for (const d of circle.candidates.values()) {
        if (d !== shaftSum) eliminations.push({ cell: this.circleCell, digit: d });
      }
    }
    if (circle.value !== null) {
      const shaftData = this.shaftCells.map(pos => {
        const cell = grid.getCell(pos);
        if (cell.value !== null) return { pos, min: cell.value, max: cell.value, filled: true };
        const vals = cell.candidates.values();
        return { pos, min: vals[0] ?? 1, max: vals[vals.length - 1] ?? grid.size, filled: false };
      });
      for (let i = 0; i < shaftData.length; i++) {
        if (shaftData[i].filled) continue;
        let minOther = 0, maxOther = 0;
        for (let j = 0; j < shaftData.length; j++) {
          if (i !== j) { minOther += shaftData[j].min; maxOther += shaftData[j].max; }
        }
        const cell = grid.getCell(shaftData[i].pos);
        for (const d of cell.candidates.values()) {
          if (d + minOther > circle.value || d + maxOther < circle.value) {
            eliminations.push({ cell: shaftData[i].pos, digit: d });
          }
        }
      }
    }
    return eliminations;
  }
}
