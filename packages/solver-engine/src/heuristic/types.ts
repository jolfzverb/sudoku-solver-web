import { CellPosition, GridSnapshot } from '../model/types';

export type DifficultyTier = 'basic' | 'intermediate' | 'advanced' | 'expert' | 'brute-force';

export interface HighlightGroup {
  role: 'trigger' | 'target' | 'elimination' | 'region';
  color: string;
  cells: CellPosition[];
  candidates?: Array<{ cell: CellPosition; digit: number }>;
}

export interface SolveStep {
  heuristicId: string;
  description: string;
  placements: Array<{ cell: CellPosition; digit: number }>;
  eliminations: Array<{ cell: CellPosition; digit: number }>;
  highlights: HighlightGroup[];
  snapshotBefore: GridSnapshot;
}

export interface Heuristic {
  readonly id: string;
  readonly displayName: string;
  readonly difficulty: DifficultyTier;
  readonly requiresConstraintTypes?: string[];
  apply(grid: import('../model/Grid').Grid, constraints: import('../constraint/ConstraintSet').ConstraintSet): SolveStep | null;
}
