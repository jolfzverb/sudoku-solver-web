import { CellPosition } from '../model/types';
import { Grid } from '../model/Grid';
import { Constraint, Violation, Elimination } from './types';

export class ConstraintSet {
  private _constraints: Map<string, Constraint> = new Map();
  private _cellIndex: Map<string, Constraint[]> = new Map();

  add(constraint: Constraint): void {
    this._constraints.set(constraint.id, constraint);
    for (const pos of constraint.affectedCells) {
      const key = `${pos.row},${pos.col}`;
      const existing = this._cellIndex.get(key) ?? [];
      existing.push(constraint);
      this._cellIndex.set(key, existing);
    }
  }

  remove(id: string): void {
    const constraint = this._constraints.get(id);
    if (!constraint) return;
    this._constraints.delete(id);
    for (const pos of constraint.affectedCells) {
      const key = `${pos.row},${pos.col}`;
      const existing = this._cellIndex.get(key) ?? [];
      this._cellIndex.set(key, existing.filter(c => c.id !== id));
    }
  }

  getConstraintsFor(pos: CellPosition): Constraint[] {
    return this._cellIndex.get(`${pos.row},${pos.col}`) ?? [];
  }

  getConstraintsByType(type: string): Constraint[] {
    return Array.from(this._constraints.values()).filter(c => c.type === type);
  }

  getAll(): Constraint[] {
    return Array.from(this._constraints.values());
  }

  validateAll(grid: Grid): Violation[] {
    const violations: Violation[] = [];
    for (const constraint of this._constraints.values()) {
      violations.push(...constraint.validate(grid));
    }
    return violations;
  }

  getAllDirectEliminations(grid: Grid): Elimination[] {
    const eliminations: Elimination[] = [];
    for (const constraint of this._constraints.values()) {
      eliminations.push(...constraint.getDirectEliminations(grid));
    }
    return eliminations;
  }
}
