import { createContext, useContext, useReducer, ReactNode } from 'react';
import { puzzleReducer, initialPuzzleState, PuzzleState, PuzzleAction } from './puzzleReducer';

interface PuzzleContextValue {
  state: PuzzleState;
  dispatch: React.Dispatch<PuzzleAction>;
}

const PuzzleContext = createContext<PuzzleContextValue | null>(null);

export function PuzzleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(puzzleReducer, initialPuzzleState);
  return (
    <PuzzleContext.Provider value={{ state, dispatch }}>
      {children}
    </PuzzleContext.Provider>
  );
}

export function usePuzzle(): PuzzleContextValue {
  const ctx = useContext(PuzzleContext);
  if (!ctx) throw new Error('usePuzzle must be used within PuzzleProvider');
  return ctx;
}
