import { Heuristic, DifficultyTier } from './types';

const registry: Heuristic[] = [];

const TIER_ORDER: DifficultyTier[] = ['basic', 'intermediate', 'advanced', 'expert', 'brute-force'];

export const HeuristicRegistry = {
  register(heuristic: Heuristic): void {
    registry.push(heuristic);
    registry.sort((a, b) => TIER_ORDER.indexOf(a.difficulty) - TIER_ORDER.indexOf(b.difficulty));
  },

  getAll(): Heuristic[] {
    return [...registry];
  },

  getById(id: string): Heuristic | undefined {
    return registry.find(h => h.id === id);
  },

  getByTier(tier: DifficultyTier): Heuristic[] {
    return registry.filter(h => h.difficulty === tier);
  },
};
