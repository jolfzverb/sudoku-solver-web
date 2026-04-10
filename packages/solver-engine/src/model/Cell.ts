import { CellPosition } from './types';
import { CandidateSet } from './CandidateSet';

export class Cell {
  readonly position: CellPosition;
  private _value: number | null;
  private _candidates: CandidateSet;
  readonly isGiven: boolean;

  constructor(position: CellPosition, value: number | null = null, isGiven = false, candidates?: CandidateSet) {
    this.position = position;
    this._value = value;
    this.isGiven = isGiven;
    this._candidates = candidates ?? new CandidateSet();
    if (this._value !== null) {
      this._candidates = new CandidateSet();
    }
  }

  get value(): number | null {
    return this._value;
  }

  get candidates(): CandidateSet {
    return this._candidates;
  }

  setValue(digit: number): void {
    this._value = digit;
    this._candidates = new CandidateSet();
  }

  clearValue(): void {
    this._value = null;
  }

  clone(): Cell {
    return new Cell(this.position, this._value, this.isGiven, this._candidates.clone());
  }
}
