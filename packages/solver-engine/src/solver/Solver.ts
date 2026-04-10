import { Grid } from '../model/Grid';
import { ConstraintSet } from '../constraint/ConstraintSet';
import { HeuristicRegistry } from '../heuristic/HeuristicRegistry';
import { SolveStep, DifficultyTier, Heuristic } from '../heuristic/types';
import { SolveResult } from './types';

const TIER_ORDER: DifficultyTier[] = ['basic', 'intermediate', 'advanced', 'expert'];

export class Solver {
  private grid: Grid;
  private constraints: ConstraintSet;
  private heuristics: Heuristic[];
  private maxSteps: number;

  constructor(grid: Grid, constraints: ConstraintSet, maxSteps = 10000) {
    this.grid = grid;
    this.constraints = constraints;
    this.maxSteps = maxSteps;
    this.heuristics = HeuristicRegistry.getAll();
  }

  solve(): SolveResult {
    const gen = this.solveIterative();
    const steps: SolveStep[] = [];
    let result = gen.next();
    while (!result.done) {
      steps.push(result.value);
      result = gen.next();
    }
    return result.value;
  }

  *solveIterative(): Generator<SolveStep, SolveResult> {
    const startTime = Date.now();
    const steps: SolveStep[] = [];
    const heuristicCounts = new Map<string, number>();
    let maxDifficulty: DifficultyTier = 'basic';

    // Main deduction loop
    yield* this.deductionLoop(steps, heuristicCounts, (d) => {
      if (TIER_ORDER.indexOf(d) > TIER_ORDER.indexOf(maxDifficulty)) maxDifficulty = d;
    });

    return {
      solved: this.isSolved(),
      steps,
      heuristicCounts,
      difficulty: maxDifficulty,
      durationMs: Date.now() - startTime,
      finalGrid: this.grid.snapshot(),
    };
  }

  private *deductionLoop(
    steps: SolveStep[],
    counts: Map<string, number>,
    onDifficulty: (d: DifficultyTier) => void,
  ): Generator<SolveStep> {
    let progress = true;
    while (progress && steps.length < this.maxSteps) {
      progress = false;
      if (this.isSolved()) break;

      for (const h of this.heuristics) {
        const step = h.apply(this.grid, this.constraints);
        if (step) {
          this.applyStep(step);
          steps.push(step);
          counts.set(h.id, (counts.get(h.id) ?? 0) + 1);
          onDifficulty(h.difficulty);
          yield step;
          progress = true;
          break;
        }
      }
    }
  }

  private isSolved(): boolean {
    return this.grid.getAllCells().every(c => c.value !== null);
  }

  private applyStep(step: SolveStep): void {
    for (const { cell: pos, digit } of step.placements) {
      const cell = this.grid.getCell(pos);
      cell.setValue(digit);
      // Remove digit from peers' candidates
      for (const region of this.grid.getRegionsFor(pos)) {
        for (const peerPos of region.cells) {
          if (peerPos.row === pos.row && peerPos.col === pos.col) continue;
          const peer = this.grid.getCell(peerPos);
          if (peer.value === null) peer.candidates.remove(digit);
        }
      }
    }
    for (const { cell: pos, digit } of step.eliminations) {
      const cell = this.grid.getCell(pos);
      if (cell.value === null) cell.candidates.remove(digit);
    }
  }
}
