import { createContext, useContext, useReducer, ReactNode } from 'react';
import { solverReducer, initialSolverState, SolverState, SolverAction } from './solverReducer';

interface SolverContextValue {
  state: SolverState;
  dispatch: React.Dispatch<SolverAction>;
}

const SolverContext = createContext<SolverContextValue | null>(null);

export function SolverProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(solverReducer, initialSolverState);
  return (
    <SolverContext.Provider value={{ state, dispatch }}>
      {children}
    </SolverContext.Provider>
  );
}

export function useSolver(): SolverContextValue {
  const ctx = useContext(SolverContext);
  if (!ctx) throw new Error('useSolver must be used within SolverProvider');
  return ctx;
}
