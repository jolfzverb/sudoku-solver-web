import { CellPosition } from '../model/types';
import { Grid } from '../model/Grid';

export interface Elimination {
  readonly cell: CellPosition;
  readonly digit: number;
}

export interface Violation {
  readonly constraintId: string;
  readonly message: string;
  readonly cells: ReadonlyArray<CellPosition>;
}

export interface Constraint {
  readonly id: string;
  readonly type: string;
  readonly affectedCells: ReadonlyArray<CellPosition>;
  validate(grid: Grid): Violation[];
  getDirectEliminations(grid: Grid): Elimination[];
}
