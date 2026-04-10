import { useMemo } from 'react';
import { useSolver } from '../state/SolverContext';
import { HighlightGroup, SolveStep } from '@sudoku/solver-engine';

export interface HighlightData {
  highlights: HighlightGroup[];
  activeStep: SolveStep | null;
}

export function useHighlight(): HighlightData {
  const { state } = useSolver();

  return useMemo(() => {
    if (state.currentStepIndex < 0 || state.currentStepIndex >= state.steps.length) {
      return { highlights: [], activeStep: null };
    }
    const step = state.steps[state.currentStepIndex];
    return { highlights: step.highlights, activeStep: step };
  }, [state.currentStepIndex, state.steps]);
}
