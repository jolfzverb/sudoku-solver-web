import { useCallback, useRef } from 'react';
import {
  GridFactory, GridSpec, Solver, ConstraintSet,
  VariantRegistry, ThermometerConstraint, CageSumConstraint,
  ArrowSumConstraint, SolveStep, SolveResult,
} from '@sudoku/solver-engine';
import { usePuzzle } from '../state/PuzzleContext';
import { useSolver } from '../state/SolverContext';
import { UserConstraint } from '../state/puzzleReducer';

const BOX_DIMS: Record<number, [number, number]> = {
  4: [2, 2], 6: [3, 2], 9: [3, 3], 16: [4, 4],
};

export function useSolverRunner() {
  const { state: puzzle, dispatch: puzzleDispatch } = usePuzzle();
  const { state: solver, dispatch: solverDispatch } = useSolver();
  const genRef = useRef<Generator<SolveStep, SolveResult> | null>(null);

  const initSolver = useCallback(() => {
    const variant = VariantRegistry.get(puzzle.variant);
    if (!variant) throw new Error(`Unknown variant: ${puzzle.variant}`);

    const regions = variant.buildRegions(puzzle.size);
    const dims = BOX_DIMS[puzzle.size] ?? [3, 3];
    const spec: GridSpec = {
      size: puzzle.size,
      boxWidth: dims[0],
      boxHeight: dims[1],
      regions,
    };

    // Collect givens from current grid
    const givens = puzzle.grid.cells
      .filter(c => c.value !== null)
      .map(c => ({ position: c.position, digit: c.value! }));

    const grid = GridFactory.createWithGivens(spec, givens);

    // Build constraints: variant base + user-defined
    const constraintSet = new ConstraintSet();
    for (const c of variant.buildConstraints(grid)) {
      constraintSet.add(c);
    }
    for (const uc of puzzle.constraints) {
      addUserConstraint(constraintSet, uc);
    }

    // Validate grid before solving
    const violations = constraintSet.validateAll(grid);
    if (violations.length > 0) {
      const messages = violations.map(v => v.message);
      puzzleDispatch({ type: 'SET_ERROR', error: messages.join('; ') });
      return;
    }

    puzzleDispatch({ type: 'SET_ERROR', error: null });
    const snapshot = grid.snapshot();
    puzzleDispatch({ type: 'SELECT_CELL', pos: null });
    puzzleDispatch({ type: 'SET_STATUS', status: 'solving' });
    solverDispatch({ type: 'START_SOLVE', grid: snapshot });

    const solverInstance = new Solver(grid, constraintSet);
    genRef.current = solverInstance.solveIterative();
  }, [puzzle.variant, puzzle.size, puzzle.grid, puzzle.constraints, puzzleDispatch, solverDispatch]);

  const stepOnce = useCallback(() => {
    const gen = genRef.current;
    if (!gen) return;

    puzzleDispatch({ type: 'SELECT_CELL', pos: null });
    const result = gen.next();
    if (result.done) {
      solverDispatch({ type: 'SOLVE_COMPLETE', result: result.value });
      puzzleDispatch({ type: 'SET_STATUS', status: 'solved' });
      genRef.current = null;
    } else {
      solverDispatch({ type: 'ADD_STEP', step: result.value });
    }
  }, [solverDispatch, puzzleDispatch]);

  const solveAll = useCallback(() => {
    const gen = genRef.current;
    if (!gen) return;

    const runBatch = () => {
      for (let i = 0; i < 50; i++) {
        const result = gen.next();
        if (result.done) {
          solverDispatch({ type: 'SOLVE_COMPLETE', result: result.value });
          puzzleDispatch({ type: 'SET_STATUS', status: 'solved' });
          genRef.current = null;
          return;
        }
        solverDispatch({ type: 'ADD_STEP', step: result.value });
      }
      requestAnimationFrame(runBatch);
    };
    requestAnimationFrame(runBatch);
  }, [solverDispatch, puzzleDispatch]);

  const reset = useCallback(() => {
    genRef.current = null;
    solverDispatch({ type: 'RESET' });
    puzzleDispatch({ type: 'SET_STATUS', status: 'setup' });
  }, [solverDispatch, puzzleDispatch]);

  return {
    initSolver,
    stepOnce,
    solveAll,
    reset,
    isSolverReady: genRef.current !== null,
    isSolving: puzzle.status === 'solving',
    isSolved: puzzle.status === 'solved',
    solverStatus: solver.status,
  };
}

function addUserConstraint(cs: ConstraintSet, uc: UserConstraint): void {
  switch (uc.type) {
    case 'thermo':
      cs.add(new ThermometerConstraint(uc.id, uc.cells));
      break;
    case 'cage':
      cs.add(new CageSumConstraint(uc.id, uc.cells, uc.sum!));
      break;
    case 'arrow':
      cs.add(new ArrowSumConstraint(uc.id, uc.cells[0], uc.cells.slice(1)));
      break;
  }
}
