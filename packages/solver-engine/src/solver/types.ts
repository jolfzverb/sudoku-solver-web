import { GridSnapshot } from '../model/types';
import { SolveStep, DifficultyTier } from '../heuristic/types';

export interface SolveResult {
  solved: boolean;
  error?: string;
  steps: SolveStep[];
  heuristicCounts: Map<string, number>;
  difficulty: DifficultyTier;
  durationMs: number;
  finalGrid: GridSnapshot;
}
