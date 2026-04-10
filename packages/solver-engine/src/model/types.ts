export interface CellPosition {
  readonly row: number;
  readonly col: number;
}

export type RegionType = 'row' | 'column' | 'box' | 'diagonal' | 'cage' | 'thermo' | 'arrow' | 'custom';

export interface Region {
  readonly id: string;
  readonly type: RegionType;
  readonly cells: ReadonlyArray<CellPosition>;
}

export interface GridSpec {
  readonly size: number;
  readonly boxWidth: number;
  readonly boxHeight: number;
  readonly regions: ReadonlyArray<Region>;
}

export interface GridSnapshot {
  readonly cells: ReadonlyArray<CellSnapshot>;
  readonly size: number;
}

export interface CellSnapshot {
  readonly position: CellPosition;
  readonly value: number | null;
  readonly candidates: ReadonlyArray<number>;
  readonly isGiven: boolean;
}

export interface PuzzleData {
  readonly size: number;
  readonly variant: string;
  readonly givens: ReadonlyArray<{ position: CellPosition; digit: number }>;
  readonly extraData?: Record<string, unknown>;
}
