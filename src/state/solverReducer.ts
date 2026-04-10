import { SolveStep, SolveResult, GridSnapshot } from '@sudoku/solver-engine';

export type SolverStatus = 'idle' | 'solving' | 'paused' | 'done';

export interface SolverState {
  status: SolverStatus;
  steps: SolveStep[];
  currentStepIndex: number;
  playbackSpeed: number;
  solveResult: SolveResult | null;
  currentGrid: GridSnapshot | null;
}

export type SolverAction =
  | { type: 'START_SOLVE'; grid: GridSnapshot }
  | { type: 'ADD_STEP'; step: SolveStep }
  | { type: 'STEP_FORWARD' }
  | { type: 'STEP_BACKWARD' }
  | { type: 'JUMP_TO_STEP'; index: number }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SOLVE_COMPLETE'; result: SolveResult }
  | { type: 'UPDATE_GRID'; grid: GridSnapshot }
  | { type: 'RESET' };

export const initialSolverState: SolverState = {
  status: 'idle',
  steps: [],
  currentStepIndex: -1,
  playbackSpeed: 500,
  solveResult: null,
  currentGrid: null,
};

export function solverReducer(state: SolverState, action: SolverAction): SolverState {
  switch (action.type) {
    case 'START_SOLVE':
      return { ...state, status: 'solving', steps: [], currentStepIndex: -1, solveResult: null, currentGrid: action.grid };
    case 'ADD_STEP':
      return { ...state, steps: [...state.steps, action.step], currentStepIndex: state.steps.length };
    case 'STEP_FORWARD': {
      if (state.currentStepIndex >= state.steps.length - 1) return state;
      const next = state.currentStepIndex + 1;
      return { ...state, currentStepIndex: next };
    }
    case 'STEP_BACKWARD': {
      if (state.currentStepIndex <= 0) return state;
      return { ...state, currentStepIndex: state.currentStepIndex - 1 };
    }
    case 'JUMP_TO_STEP':
      if (action.index < 0 || action.index >= state.steps.length) return state;
      return { ...state, currentStepIndex: action.index };
    case 'SET_SPEED':
      return { ...state, playbackSpeed: action.speed };
    case 'PAUSE':
      return { ...state, status: 'paused' };
    case 'RESUME':
      return { ...state, status: 'solving' };
    case 'SOLVE_COMPLETE':
      return { ...state, status: 'done', solveResult: action.result, currentGrid: action.result.finalGrid };
    case 'UPDATE_GRID':
      return { ...state, currentGrid: action.grid };
    case 'RESET':
      return initialSolverState;
    default:
      return state;
  }
}
