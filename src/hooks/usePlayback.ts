import { useCallback, useEffect, useRef } from 'react';
import { useSolver } from '../state/SolverContext';
import { usePuzzle } from '../state/PuzzleContext';

export function usePlayback() {
  const { state, dispatch } = useSolver();
  const { dispatch: puzzleDispatch } = usePuzzle();
  const timerRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    dispatch({ type: 'RESUME' });
  }, [dispatch]);

  const pause = useCallback(() => {
    stopTimer();
    dispatch({ type: 'PAUSE' });
  }, [dispatch, stopTimer]);

  const stepForward = useCallback(() => {
    puzzleDispatch({ type: 'SELECT_CELL', pos: null });
    dispatch({ type: 'STEP_FORWARD' });
  }, [dispatch, puzzleDispatch]);

  const stepBackward = useCallback(() => {
    puzzleDispatch({ type: 'SELECT_CELL', pos: null });
    dispatch({ type: 'STEP_BACKWARD' });
  }, [dispatch, puzzleDispatch]);

  const jumpTo = useCallback((index: number) => {
    puzzleDispatch({ type: 'SELECT_CELL', pos: null });
    dispatch({ type: 'JUMP_TO_STEP', index });
  }, [dispatch, puzzleDispatch]);

  const setSpeed = useCallback((speed: number) => {
    dispatch({ type: 'SET_SPEED', speed });
  }, [dispatch]);

  // Auto-advance timer when status is 'solving' and we have steps
  useEffect(() => {
    if (state.status === 'solving' && state.steps.length > 0 && state.currentStepIndex < state.steps.length - 1) {
      stopTimer();
      timerRef.current = window.setInterval(() => {
        dispatch({ type: 'STEP_FORWARD' });
      }, state.playbackSpeed);
    } else {
      stopTimer();
      if (state.status === 'solving' && state.currentStepIndex >= state.steps.length - 1) {
        dispatch({ type: 'PAUSE' });
      }
    }
    return stopTimer;
  }, [state.status, state.playbackSpeed, state.currentStepIndex, state.steps.length, dispatch, stopTimer]);

  return {
    play,
    pause,
    stepForward,
    stepBackward,
    jumpTo,
    setSpeed,
    isPlaying: state.status === 'solving',
    currentStep: state.currentStepIndex >= 0 ? state.steps[state.currentStepIndex] : null,
    currentStepIndex: state.currentStepIndex,
    totalSteps: state.steps.length,
    speed: state.playbackSpeed,
    isDone: state.status === 'done',
  };
}
