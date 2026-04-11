import { describe, it, expect } from 'vitest';
import { buildGrid, buildConstraints, hasElimination, hasPlacement } from './helpers';
import { NakedSingle } from '../heuristic/techniques/NakedSingle';
import { HiddenSingle } from '../heuristic/techniques/HiddenSingle';
import { ConstraintElimination } from '../heuristic/techniques/ConstraintElimination';
import { NakedPair } from '../heuristic/techniques/NakedPair';
import { HiddenPair } from '../heuristic/techniques/HiddenPair';
import { HiddenTriple } from '../heuristic/techniques/HiddenTriple';
import { PointingPair } from '../heuristic/techniques/PointingPair';
import { BoxLineReduction } from '../heuristic/techniques/BoxLineReduction';
import { XWing, Swordfish, Jellyfish } from '../heuristic/techniques/Fish';
import { ThermoFork } from '../heuristic/techniques/ThermoFork';
import { ThermoFish } from '../heuristic/techniques/ThermoFish';
import { ThermoForcing } from '../heuristic/techniques/ThermoForcing';
import { YWing } from '../heuristic/techniques/YWing';
import { ParallelThermos } from '../heuristic/techniques/ParallelThermos';
import { ConstraintClaiming } from '../heuristic/techniques/ConstraintClaiming';
import { TurbotFish } from '../heuristic/techniques/TurbotFish';
import { CageRegionInteraction } from '../heuristic/techniques/CageRegionInteraction';
import { CageComboReduction } from '../heuristic/techniques/CageComboReduction';
import { CageForcing } from '../heuristic/techniques/CageForcing';
import { ConstraintSet } from '../constraint/ConstraintSet';
import { ThermometerConstraint } from '../constraint/ThermometerConstraint';
import { CageSumConstraint } from '../constraint/CageSumConstraint';

// ─── NakedSingle ───────────────────────────────────────────────

describe('NakedSingle', () => {
  it('places digit when cell has exactly 1 candidate', () => {
    // 4x4: cell (0,3) has only candidate 4
    const grid = buildGrid(4, {
      '0,0': { value: 1 },
      '0,1': { value: 2 },
      '0,2': { value: 3 },
      '0,3': { candidates: [4] },
    });
    const cs = buildConstraints(grid);
    const step = NakedSingle.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('naked-single');
    expect(hasPlacement(step!.placements, 0, 3, 4)).toBe(true);
  });

  it('returns null when no cell has exactly 1 candidate', () => {
    const grid = buildGrid(4, {
      '0,0': { candidates: [1, 2] },
      '0,1': { candidates: [1, 2] },
      '0,2': { candidates: [3, 4] },
      '0,3': { candidates: [3, 4] },
    });
    const cs = buildConstraints(grid);
    expect(NakedSingle.apply(grid, cs)).toBeNull();
  });

  it('finds first naked single in scan order', () => {
    const grid = buildGrid(4, {
      '0,0': { candidates: [3] },
      '1,1': { candidates: [2] },
    });
    const cs = buildConstraints(grid);
    const step = NakedSingle.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasPlacement(step!.placements, 0, 0, 3)).toBe(true);
  });
});

// ─── HiddenSingle ──────────────────────────────────────────────

describe('HiddenSingle', () => {
  it('places digit that can only go in one cell in a row', () => {
    // 4x4: In row 0, digit 4 can only go in (0,3) — others don't have 4
    const grid = buildGrid(4, {
      '0,0': { candidates: [1, 2] },
      '0,1': { candidates: [1, 3] },
      '0,2': { candidates: [2, 3] },
      '0,3': { candidates: [1, 4] },
    });
    const cs = buildConstraints(grid);
    const step = HiddenSingle.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('hidden-single');
    expect(hasPlacement(step!.placements, 0, 3, 4)).toBe(true);
  });

  it('places digit that can only go in one cell in a column', () => {
    // 4x4: In col 0, digit 4 can only go in (3,0)
    const grid = buildGrid(4, {
      '0,0': { candidates: [1, 2] },
      '1,0': { candidates: [1, 3] },
      '2,0': { candidates: [2, 3] },
      '3,0': { candidates: [1, 4] },
    });
    const cs = buildConstraints(grid);
    const step = HiddenSingle.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasPlacement(step!.placements, 3, 0, 4)).toBe(true);
  });

  it('places digit that can only go in one cell in a box', () => {
    // 4x4: In box (0,0) [cells (0,0),(0,1),(1,0),(1,1)], digit 4 only in (1,1)
    const grid = buildGrid(4, {
      '0,0': { candidates: [1, 2] },
      '0,1': { candidates: [1, 3] },
      '1,0': { candidates: [2, 3] },
      '1,1': { candidates: [2, 4] },
    });
    const cs = buildConstraints(grid);
    const step = HiddenSingle.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasPlacement(step!.placements, 1, 1, 4)).toBe(true);
  });

  it('skips digit already placed in region', () => {
    const grid = buildGrid(4, {
      '0,0': { value: 4 },
      '0,1': { candidates: [1, 4] }, // has 4 as candidate but 4 is placed in row
      '0,2': { candidates: [2, 3] },
      '0,3': { candidates: [1, 2, 3] },
    });
    const cs = buildConstraints(grid);
    const step = HiddenSingle.apply(grid, cs);
    // Should not try to place 4 again — it's already placed
    if (step) {
      expect(step.placements[0].digit).not.toBe(4);
    }
  });

  it('returns null when no hidden single exists', () => {
    // Every digit appears in multiple cells in every region
    const grid = buildGrid(4, {
      '0,0': { candidates: [1, 2, 3, 4] },
      '0,1': { candidates: [1, 2, 3, 4] },
      '0,2': { candidates: [1, 2, 3, 4] },
      '0,3': { candidates: [1, 2, 3, 4] },
      '1,0': { candidates: [1, 2, 3, 4] },
      '1,1': { candidates: [1, 2, 3, 4] },
      '1,2': { candidates: [1, 2, 3, 4] },
      '1,3': { candidates: [1, 2, 3, 4] },
      '2,0': { candidates: [1, 2, 3, 4] },
      '2,1': { candidates: [1, 2, 3, 4] },
      '2,2': { candidates: [1, 2, 3, 4] },
      '2,3': { candidates: [1, 2, 3, 4] },
      '3,0': { candidates: [1, 2, 3, 4] },
      '3,1': { candidates: [1, 2, 3, 4] },
      '3,2': { candidates: [1, 2, 3, 4] },
      '3,3': { candidates: [1, 2, 3, 4] },
    });
    const cs = buildConstraints(grid);
    expect(HiddenSingle.apply(grid, cs)).toBeNull();
  });
});

// ─── ConstraintElimination ─────────────────────────────────────

describe('ConstraintElimination', () => {
  it('eliminates placed digit from peers via RegionConstraint', () => {
    // 4x4: value 1 at (0,0), cell (0,1) still has candidate 1
    const grid = buildGrid(4, {
      '0,0': { value: 1 },
      '0,1': { candidates: [1, 2, 3] },
    });
    const cs = buildConstraints(grid);
    const step = ConstraintElimination.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasElimination(step!.eliminations, 0, 1, 1)).toBe(true);
  });

  it('eliminates based on ThermometerConstraint bounds', () => {
    // 9x9: thermo path at (0,0)→(0,1)→(0,2), 3 cells
    // Static bounds: [1,7], [2,8], [3,9]
    // Cell (0,0) has candidates [7,8,9] — 8 and 9 should be eliminated (max is 7)
    const grid = buildGrid(9, {
      '0,0': { candidates: [7, 8, 9] },
      '0,1': { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      '0,2': { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    });
    const cs = new ConstraintSet();
    cs.add(new ThermometerConstraint('thermo-1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ]));
    const step = ConstraintElimination.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasElimination(step!.eliminations, 0, 0, 8)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 9)).toBe(true);
  });

  it('eliminates based on ThermometerConstraint with placed values', () => {
    // 9x9: thermo (0,0)→(0,1)→(0,2), value 5 at (0,0)
    // (0,1) must be > 5, (0,2) must be > (0,1)
    const grid = buildGrid(9, {
      '0,0': { value: 5 },
      '0,1': { candidates: [3, 4, 5, 6, 7, 8] },
      '0,2': { candidates: [3, 4, 5, 6, 7, 8, 9] },
    });
    const cs = new ConstraintSet();
    cs.add(new ThermometerConstraint('thermo-1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ]));
    const step = ConstraintElimination.apply(grid, cs);

    expect(step).not.toBeNull();
    // (0,1) must be >= 6: eliminate 3,4,5
    expect(hasElimination(step!.eliminations, 0, 1, 3)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 4)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 5)).toBe(true);
  });

  it('thermo uses candidate-aware propagation', () => {
    // 5-cell thermo: candidates (2,5)-(2,6)-(6,7)-(6,7,8)-(8,9)
    // Candidate-aware forward pass: min feasible = 2,6,7,8,9
    // Candidate-aware backward pass: max feasible = 5,6,7,8,9
    // Bounds: [2,5],[6,6],[7,7],[8,8],[9,9]
    // Should eliminate: 2 from pos1, 6 from pos2, 6&7 from pos3, 8 from pos4
    const grid = buildGrid(9, {
      '0,0': { candidates: [2, 5] },
      '0,1': { candidates: [2, 6] },
      '0,2': { candidates: [6, 7] },
      '0,3': { candidates: [6, 7, 8] },
      '0,4': { candidates: [8, 9] },
    });
    const cs = new ConstraintSet();
    cs.add(new ThermometerConstraint('thermo-1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
      { row: 0, col: 3 }, { row: 0, col: 4 },
    ]));
    const step = ConstraintElimination.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasElimination(step!.eliminations, 0, 1, 2)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 2, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 3, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 3, 7)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 4, 8)).toBe(true);
    expect(step!.eliminations.length).toBe(5);
  });

  it('returns null when no eliminations possible', () => {
    // All cells have correct candidates — no constraint can eliminate anything
    const grid = buildGrid(4, {
      '0,0': { value: 1 },
      '0,1': { value: 2 },
      '0,2': { value: 3 },
      '0,3': { value: 4 },
      '1,0': { value: 3 },
      '1,1': { value: 4 },
      '1,2': { value: 1 },
      '1,3': { value: 2 },
      '2,0': { value: 2 },
      '2,1': { value: 1 },
      '2,2': { value: 4 },
      '2,3': { value: 3 },
      '3,0': { value: 4 },
      '3,1': { value: 3 },
      '3,2': { value: 2 },
      '3,3': { value: 1 },
    });
    const cs = buildConstraints(grid);
    expect(ConstraintElimination.apply(grid, cs)).toBeNull();
  });
});

// ─── NakedPair ─────────────────────────────────────────────────

describe('NakedPair', () => {
  it('eliminates pair digits from other cells in region', () => {
    // 4x4 row 0: two cells with {1,2}, third cell has 1 as candidate
    const grid = buildGrid(4, {
      '0,0': { candidates: [1, 2] },
      '0,1': { candidates: [1, 2] },
      '0,2': { candidates: [1, 3, 4] },
      '0,3': { candidates: [2, 3, 4] },
    });
    const cs = buildConstraints(grid);
    const step = NakedPair.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('naked-pair');
    expect(hasElimination(step!.eliminations, 0, 2, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 3, 2)).toBe(true);
  });

  it('returns null when no naked pair exists', () => {
    const grid = buildGrid(4, {
      '0,0': { candidates: [1, 2] },
      '0,1': { candidates: [1, 3] }, // different pair
      '0,2': { candidates: [2, 4] },
      '0,3': { candidates: [3, 4] },
    });
    const cs = buildConstraints(grid);
    expect(NakedPair.apply(grid, cs)).toBeNull();
  });

  it('returns null when pairs exist but produce no eliminations', () => {
    // Every region has pairs but peer cells never share the pair digits
    const grid = buildGrid(4, {
      '0,0': { candidates: [1, 2] }, '0,1': { candidates: [1, 2] },
      '0,2': { candidates: [3, 4] }, '0,3': { candidates: [3, 4] },
      '1,0': { candidates: [3, 4] }, '1,1': { candidates: [3, 4] },
      '1,2': { candidates: [1, 2] }, '1,3': { candidates: [1, 2] },
      '2,0': { candidates: [1, 3] }, '2,1': { candidates: [2, 4] },
      '2,2': { candidates: [1, 3] }, '2,3': { candidates: [2, 4] },
      '3,0': { candidates: [2, 4] }, '3,1': { candidates: [1, 3] },
      '3,2': { candidates: [2, 4] }, '3,3': { candidates: [1, 3] },
    });
    const cs = buildConstraints(grid);
    expect(NakedPair.apply(grid, cs)).toBeNull();
  });
});

// ─── HiddenPair ────────────────────────────────────────────────

describe('HiddenPair', () => {
  it('eliminates non-pair candidates from cells containing the hidden pair', () => {
    // 4x4 row 0: digits 3,4 appear only in cells (0,0) and (0,1)
    // but those cells also have other candidates
    const grid = buildGrid(4, {
      '0,0': { candidates: [1, 3, 4] },
      '0,1': { candidates: [2, 3, 4] },
      '0,2': { candidates: [1, 2] },
      '0,3': { candidates: [1, 2] },
    });
    const cs = buildConstraints(grid);
    const step = HiddenPair.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('hidden-pair');
    // Should eliminate 1 from (0,0) and 2 from (0,1)
    expect(hasElimination(step!.eliminations, 0, 0, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 2)).toBe(true);
  });

  it('returns null when no hidden pair exists', () => {
    const grid = buildGrid(4, {
      '0,0': { candidates: [1, 2, 3, 4] },
      '0,1': { candidates: [1, 2, 3, 4] },
      '0,2': { candidates: [1, 2, 3, 4] },
      '0,3': { candidates: [1, 2, 3, 4] },
    });
    const cs = buildConstraints(grid);
    expect(HiddenPair.apply(grid, cs)).toBeNull();
  });

  it('returns null when pair found but no extra candidates to eliminate', () => {
    // Full 4x4: digits 3,4 only in (0,0) and (0,1), but those cells only have {3,4}
    // No other hidden pair pattern anywhere
    const grid = buildGrid(4, {
      '0,0': { candidates: [3, 4] }, '0,1': { candidates: [3, 4] },
      '0,2': { candidates: [1, 2] }, '0,3': { candidates: [1, 2] },
      '1,0': { candidates: [1, 2] }, '1,1': { candidates: [1, 2] },
      '1,2': { candidates: [3, 4] }, '1,3': { candidates: [3, 4] },
      '2,0': { candidates: [1, 2] }, '2,1': { candidates: [1, 2] },
      '2,2': { candidates: [3, 4] }, '2,3': { candidates: [3, 4] },
      '3,0': { candidates: [3, 4] }, '3,1': { candidates: [3, 4] },
      '3,2': { candidates: [1, 2] }, '3,3': { candidates: [1, 2] },
    });
    const cs = buildConstraints(grid);
    expect(HiddenPair.apply(grid, cs)).toBeNull();
  });
});

// ─── HiddenTriple ──────────────────────────────────────────────

describe('HiddenTriple', () => {
  it('eliminates non-triple candidates from cells containing the hidden triple', () => {
    // 9x9 row 0: digits 7,8,9 appear only in cells (0,0), (0,1), (0,2)
    // but those cells also have extra candidates
    const specs: Record<string, { candidates?: number[]; value?: number }> = {};
    specs['0,0'] = { candidates: [1, 7, 8] };
    specs['0,1'] = { candidates: [2, 7, 9] };
    specs['0,2'] = { candidates: [3, 8, 9] };
    // Other row-0 cells don't have 7,8,9
    for (let c = 3; c < 9; c++) {
      specs[`0,${c}`] = { candidates: [1, 2, 3, 4, 5, 6] };
    }
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    const step = HiddenTriple.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('hidden-triple');
    // Should eliminate 1 from (0,0), 2 from (0,1), 3 from (0,2)
    expect(hasElimination(step!.eliminations, 0, 0, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 2)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 2, 3)).toBe(true);
    expect(step!.eliminations.length).toBe(3);
  });

  it('returns null when no hidden triple exists', () => {
    const specs: Record<string, { candidates?: number[] }> = {};
    for (let c = 0; c < 9; c++) {
      specs[`0,${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
    }
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    expect(HiddenTriple.apply(grid, cs)).toBeNull();
  });

  it('handles triple digits spread across exactly 3 cells', () => {
    // Digits 1,2,3 appear in cells (0,0)(0,1)(0,2) only — but some cells have only 2 of the 3
    const specs: Record<string, { candidates?: number[] }> = {};
    specs['0,0'] = { candidates: [1, 2, 5, 6] };    // has 1,2
    specs['0,1'] = { candidates: [2, 3, 5, 6] };    // has 2,3
    specs['0,2'] = { candidates: [1, 3, 5, 6] };    // has 1,3
    for (let c = 3; c < 9; c++) {
      specs[`0,${c}`] = { candidates: [4, 5, 6, 7, 8, 9] };
    }
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    const step = HiddenTriple.apply(grid, cs);

    expect(step).not.toBeNull();
    // Should eliminate 5,6 from cells (0,0),(0,1),(0,2)
    expect(hasElimination(step!.eliminations, 0, 0, 5)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 5)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 2, 5)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 2, 6)).toBe(true);
  });
});

// ─── PointingPair ──────────────────────────────────────────────

describe('PointingPair', () => {
  it('eliminates from rest of row when digit confined to one row in a box', () => {
    // 9x9: In box 0 (rows 0-2, cols 0-2), digit 5 only appears in row 0
    // Digit 5 also appears in (0,5) outside box → should be eliminated
    const specs: Record<string, { candidates?: number[]; value?: number }> = {};
    // Box 0: digit 5 only in row 0
    specs['0,0'] = { candidates: [1, 5] };
    specs['0,1'] = { candidates: [2, 5] };
    specs['0,2'] = { candidates: [3, 4] };  // no 5
    specs['1,0'] = { candidates: [3, 4] };  // no 5
    specs['1,1'] = { candidates: [3, 4] };  // no 5
    specs['1,2'] = { candidates: [3, 4] };  // no 5
    specs['2,0'] = { candidates: [3, 4] };
    specs['2,1'] = { candidates: [3, 4] };
    specs['2,2'] = { candidates: [3, 4] };
    // Row 0 outside box 0: cell with digit 5
    specs['0,5'] = { candidates: [1, 5, 6] };
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    const step = PointingPair.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('pointing-pair');
    expect(hasElimination(step!.eliminations, 0, 5, 5)).toBe(true);
  });

  it('eliminates from rest of column when digit confined to one col in a box', () => {
    // 9x9: In box 0, digit 7 only in col 0 → eliminate 7 from (3,0) in rest of col
    const specs: Record<string, { candidates?: number[]; value?: number }> = {};
    specs['0,0'] = { candidates: [1, 7] };
    specs['1,0'] = { candidates: [2, 7] };
    specs['2,0'] = { candidates: [3, 4] };  // no 7
    specs['0,1'] = { candidates: [3, 4] };
    specs['0,2'] = { candidates: [3, 4] };
    specs['1,1'] = { candidates: [3, 4] };
    specs['1,2'] = { candidates: [3, 4] };
    specs['2,1'] = { candidates: [3, 4] };
    specs['2,2'] = { candidates: [3, 4] };
    // Col 0 outside box: cell with 7
    specs['3,0'] = { candidates: [1, 7, 8] };
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    const step = PointingPair.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasElimination(step!.eliminations, 3, 0, 7)).toBe(true);
  });

  it('returns null when no pointing pattern exists', () => {
    // 9x9: digit 5 in box 0 is in multiple rows and cols
    const specs: Record<string, { candidates?: number[] }> = {};
    specs['0,0'] = { candidates: [1, 5] };
    specs['1,1'] = { candidates: [2, 5] }; // different row AND col
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    expect(PointingPair.apply(grid, cs)).toBeNull();
  });
});

// ─── BoxLineReduction ──────────────────────────────────────────

describe('BoxLineReduction', () => {
  it('eliminates from rest of box when digit in a row is confined to one box', () => {
    // 9x9: In row 0, digit 6 only appears in cols 0-2 (box 0)
    // Digit 6 also in (1,1) inside box 0 → should be eliminated
    const specs: Record<string, { candidates?: number[]; value?: number }> = {};
    // Row 0: digit 6 only in box 0
    specs['0,0'] = { candidates: [1, 6] };
    specs['0,1'] = { candidates: [2, 6] };
    specs['0,2'] = { candidates: [3, 4] };  // no 6 in row, but in box
    // Rest of row 0: no 6
    for (let c = 3; c < 9; c++) {
      specs[`0,${c}`] = { candidates: [1, 2, 3, 4, 5] };
    }
    // Other cells in box 0 that have 6 → should be eliminated
    specs['1,1'] = { candidates: [3, 6, 7] };
    specs['2,2'] = { candidates: [4, 6, 8] };
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    const step = BoxLineReduction.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('box-line-reduction');
    expect(hasElimination(step!.eliminations, 1, 1, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 2, 2, 6)).toBe(true);
  });

  it('works for columns too', () => {
    // 9x9: In col 0, digit 8 only in rows 0-2 (box 0)
    // Cell (1,2) in box 0 has 8 → should be eliminated
    const specs: Record<string, { candidates?: number[]; value?: number }> = {};
    specs['0,0'] = { candidates: [1, 8] };
    specs['1,0'] = { candidates: [2, 8] };
    specs['2,0'] = { candidates: [3, 4] };
    // Rest of col 0: no 8
    for (let r = 3; r < 9; r++) {
      specs[`${r},0`] = { candidates: [1, 2, 3, 4, 5] };
    }
    // Other cell in box 0 with 8
    specs['1,2'] = { candidates: [3, 8, 9] };
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    const step = BoxLineReduction.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasElimination(step!.eliminations, 1, 2, 8)).toBe(true);
  });

  it('returns null when digit spans multiple boxes in a line', () => {
    const specs: Record<string, { candidates?: number[] }> = {};
    // Row 0: digit 3 in both box 0 and box 1
    specs['0,0'] = { candidates: [1, 3] };
    specs['0,4'] = { candidates: [2, 3] }; // box 1
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    expect(BoxLineReduction.apply(grid, cs)).toBeNull();
  });
});

// ─── ThermometerConstraint (direct) ────────────────────────────

describe('ThermometerConstraint', () => {
  it('produces static positional eliminations', () => {
    // 3-cell thermo on 9x9: bounds [1,7],[2,8],[3,9]
    const grid = buildGrid(9, {});
    const thermo = new ThermometerConstraint('t1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ]);
    const elims = thermo.getDirectEliminations(grid);

    // (0,0) can't be 8 or 9
    expect(elims.some(e => e.cell.row === 0 && e.cell.col === 0 && e.digit === 8)).toBe(true);
    expect(elims.some(e => e.cell.row === 0 && e.cell.col === 0 && e.digit === 9)).toBe(true);
    // (0,2) can't be 1 or 2
    expect(elims.some(e => e.cell.row === 0 && e.cell.col === 2 && e.digit === 1)).toBe(true);
    expect(elims.some(e => e.cell.row === 0 && e.cell.col === 2 && e.digit === 2)).toBe(true);
  });

  it('tightens bounds based on placed values', () => {
    // 3-cell thermo, value 5 at position 0 → pos1 >= 6, pos2 >= 7
    const grid = buildGrid(9, {
      '0,0': { value: 5 },
      '0,1': { candidates: [1, 2, 3, 4, 5, 6, 7, 8] },
      '0,2': { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    });
    const thermo = new ThermometerConstraint('t1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ]);
    const elims = thermo.getDirectEliminations(grid);

    // (0,1) should lose 1-5
    for (let d = 1; d <= 5; d++) {
      expect(elims.some(e => e.cell.row === 0 && e.cell.col === 1 && e.digit === d)).toBe(true);
    }
    // (0,2) should lose 1-6
    for (let d = 1; d <= 6; d++) {
      expect(elims.some(e => e.cell.row === 0 && e.cell.col === 2 && e.digit === d)).toBe(true);
    }
  });

  it('uses candidate-aware propagation to tighten bounds', () => {
    // The key test case: (2,5)-(2,6)-(6,7)-(6,7,8)-(8,9)
    const grid = buildGrid(9, {
      '0,0': { candidates: [2, 5] },
      '0,1': { candidates: [2, 6] },
      '0,2': { candidates: [6, 7] },
      '0,3': { candidates: [6, 7, 8] },
      '0,4': { candidates: [8, 9] },
    });
    const thermo = new ThermometerConstraint('t1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
      { row: 0, col: 3 }, { row: 0, col: 4 },
    ]);
    const elims = thermo.getDirectEliminations(grid);

    // Expected: bounds [2,5],[6,6],[7,7],[8,8],[9,9]
    expect(hasElimination(elims, 0, 1, 2)).toBe(true);  // 2 < 6
    expect(hasElimination(elims, 0, 2, 6)).toBe(true);  // 6 < 7
    expect(hasElimination(elims, 0, 3, 6)).toBe(true);  // 6 < 8
    expect(hasElimination(elims, 0, 3, 7)).toBe(true);  // 7 < 8
    expect(hasElimination(elims, 0, 4, 8)).toBe(true);  // 8 < 9
    expect(elims.length).toBe(5);
  });

  it('validates correctly', () => {
    const grid = buildGrid(9, {
      '0,0': { value: 5 },
      '0,1': { value: 3 }, // violation: 3 <= 5
    });
    const thermo = new ThermometerConstraint('t1', [
      { row: 0, col: 0 }, { row: 0, col: 1 },
    ]);
    expect(thermo.validate(grid).length).toBeGreaterThan(0);
  });
});

// ─── CageSumConstraint ─────────────────────────────────────────

describe('CageSumConstraint', () => {
  it('eliminates candidates exceeding remaining sum', () => {
    // 2-cell cage sum=5, one cell placed as 2 → remaining=3
    // Other cell has {1,2,3,4,5} → 4 and 5 exceed remaining, 2 is duplicate
    const grid = buildGrid(9, {
      '0,0': { value: 2 },
      '0,1': { candidates: [1, 2, 3, 4, 5] },
    });
    const cs = new ConstraintSet();
    cs.add(new CageSumConstraint('cage-1', [
      { row: 0, col: 0 }, { row: 0, col: 1 },
    ], 5));
    const step = ConstraintElimination.apply(grid, cs);

    expect(step).not.toBeNull();
    // 2 eliminated (duplicate), 4 and 5 eliminated (> remaining 3)
    expect(hasElimination(step!.eliminations, 0, 1, 2)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 4)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 5)).toBe(true);
  });

  it('solves last empty cell in cage', () => {
    // 2-cell cage sum=7, one cell placed as 3 → remaining=4
    // emptyCount=1, only d===4 survives
    const grid = buildGrid(9, {
      '0,0': { value: 3 },
      '0,1': { candidates: [1, 2, 3, 4, 5] },
    });
    const cs = new ConstraintSet();
    cs.add(new CageSumConstraint('cage-1', [
      { row: 0, col: 0 }, { row: 0, col: 1 },
    ], 7));
    const step = ConstraintElimination.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasElimination(step!.eliminations, 0, 1, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 2)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 3)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 5)).toBe(true);
    // 4 should NOT be eliminated
    expect(hasElimination(step!.eliminations, 0, 1, 4)).toBe(false);
  });

  it('low sum eliminates large digits via combination analysis', () => {
    // 3-cell cage sum=9. Valid combos: {1,2,6},{1,3,5},{2,3,4}. Max digit=6.
    // Digits 7,8,9 impossible.
    const grid = buildGrid(9, {
      '0,0': { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      '0,1': { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      '0,2': { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    });
    const cs = new ConstraintSet();
    cs.add(new CageSumConstraint('cage-low', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ], 9));
    const step = ConstraintElimination.apply(grid, cs);

    expect(step).not.toBeNull();
    for (const c of [0, 1, 2]) {
      expect(hasElimination(step!.eliminations, 0, c, 7)).toBe(true);
      expect(hasElimination(step!.eliminations, 0, c, 8)).toBe(true);
      expect(hasElimination(step!.eliminations, 0, c, 9)).toBe(true);
      // 1-6 should stay
      expect(hasElimination(step!.eliminations, 0, c, 1)).toBe(false);
      expect(hasElimination(step!.eliminations, 0, c, 6)).toBe(false);
    }
  });

  it('high sum eliminates small digits via combination analysis', () => {
    // 3-cell cage sum=24. Only valid combo: {7,8,9}. Digits 1-6 impossible.
    const grid = buildGrid(9, {
      '0,0': { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      '0,1': { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      '0,2': { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    });
    const cs = new ConstraintSet();
    cs.add(new CageSumConstraint('cage-high', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ], 24));
    const step = ConstraintElimination.apply(grid, cs);

    expect(step).not.toBeNull();
    for (const c of [0, 1, 2]) {
      for (let d = 1; d <= 6; d++) {
        expect(hasElimination(step!.eliminations, 0, c, d)).toBe(true);
      }
      expect(hasElimination(step!.eliminations, 0, c, 7)).toBe(false);
      expect(hasElimination(step!.eliminations, 0, c, 8)).toBe(false);
      expect(hasElimination(step!.eliminations, 0, c, 9)).toBe(false);
    }
  });

  it('combination analysis works with partially placed cage', () => {
    // 3-cell cage sum=15, one cell placed as 1 → remaining sum=14, 2 empty cells
    // Valid combos for 2 cells summing to 14 (excluding 1): {5,9},{6,8}
    // Digits 2,3,4,7 impossible
    const grid = buildGrid(9, {
      '0,0': { value: 1 },
      '0,1': { candidates: [2, 3, 4, 5, 6, 7, 8, 9] },
      '0,2': { candidates: [2, 3, 4, 5, 6, 7, 8, 9] },
    });
    const cs = new ConstraintSet();
    cs.add(new CageSumConstraint('cage-partial', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ], 15));
    const step = ConstraintElimination.apply(grid, cs);

    expect(step).not.toBeNull();
    for (const c of [1, 2]) {
      expect(hasElimination(step!.eliminations, 0, c, 2)).toBe(true);
      expect(hasElimination(step!.eliminations, 0, c, 3)).toBe(true);
      expect(hasElimination(step!.eliminations, 0, c, 4)).toBe(true);
      expect(hasElimination(step!.eliminations, 0, c, 7)).toBe(true);
      // 5,6,8,9 should stay
      expect(hasElimination(step!.eliminations, 0, c, 5)).toBe(false);
      expect(hasElimination(step!.eliminations, 0, c, 6)).toBe(false);
      expect(hasElimination(step!.eliminations, 0, c, 8)).toBe(false);
      expect(hasElimination(step!.eliminations, 0, c, 9)).toBe(false);
    }
  });

  it('candidate-aware combos: eliminates digits not feasible given cell candidates', () => {
    // 2-cell cage sum=10. Cells have candidates {1,2,3,4,6,9}.
    // All combos for sum=10: {1,9},{2,8},{3,7},{4,6}
    // But 7 and 8 not in candidates → {2,8} and {3,7} infeasible.
    // Feasible combos: {1,9},{4,6}. Valid digits: {1,4,6,9}. Eliminate 2,3.
    const grid = buildGrid(9, {
      '0,0': { candidates: [1, 2, 3, 4, 6, 9] },
      '0,1': { candidates: [1, 2, 3, 4, 6, 9] },
    });
    const cs = new ConstraintSet();
    cs.add(new CageSumConstraint('c10', [
      { row: 0, col: 0 }, { row: 0, col: 1 },
    ], 10));
    const step = ConstraintElimination.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasElimination(step!.eliminations, 0, 0, 2)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 3)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 2)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 3)).toBe(true);
    // 1,4,6,9 should stay
    expect(hasElimination(step!.eliminations, 0, 0, 1)).toBe(false);
    expect(hasElimination(step!.eliminations, 0, 0, 4)).toBe(false);
    expect(hasElimination(step!.eliminations, 0, 0, 6)).toBe(false);
    expect(hasElimination(step!.eliminations, 0, 0, 9)).toBe(false);
  });
});

// ─── X-Wing ────────────────────────────────────────────────────

describe('XWing', () => {
  it('eliminates digit from cover columns when locked in 2 rows', () => {
    // 9x9: digit 5 in row 0 only in cols 2,6; in row 4 only in cols 2,6
    // → eliminate 5 from cols 2,6 in all other rows
    const specs: Record<string, { candidates?: number[]; value?: number }> = {};
    // Row 0: digit 5 only in cols 2 and 6
    for (let c = 0; c < 9; c++) {
      specs[`0,${c}`] = { candidates: (c === 2 || c === 6) ? [1, 5] : [1, 2, 3] };
    }
    // Row 4: digit 5 only in cols 2 and 6
    for (let c = 0; c < 9; c++) {
      specs[`4,${c}`] = { candidates: (c === 2 || c === 6) ? [3, 5] : [2, 3, 4] };
    }
    // Some other row has 5 in col 2 → should be eliminated
    specs['7,2'] = { candidates: [4, 5, 8] };
    specs['7,6'] = { candidates: [5, 7, 9] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    const step = XWing.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('x-wing');
    expect(hasElimination(step!.eliminations, 7, 2, 5)).toBe(true);
    expect(hasElimination(step!.eliminations, 7, 6, 5)).toBe(true);
  });

  it('works for column-based x-wing', () => {
    // digit 3 in col 1 only in rows 0,5; in col 7 only in rows 0,5
    // → eliminate 3 from rows 0,5 in other cols
    const specs: Record<string, { candidates?: number[]; value?: number }> = {};
    for (let r = 0; r < 9; r++) {
      specs[`${r},1`] = { candidates: (r === 0 || r === 5) ? [2, 3] : [1, 2, 4] };
      specs[`${r},7`] = { candidates: (r === 0 || r === 5) ? [3, 6] : [1, 4, 6] };
    }
    // Row 0 has 3 in another col → should be eliminated
    specs['0,4'] = { candidates: [3, 7, 8] };
    specs['5,4'] = { candidates: [3, 6, 9] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    const step = XWing.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasElimination(step!.eliminations, 0, 4, 3)).toBe(true);
    expect(hasElimination(step!.eliminations, 5, 4, 3)).toBe(true);
  });

  it('returns null when no x-wing pattern exists', () => {
    // digit 5 in row 0 in cols {2,6}, in row 4 in cols {2,7} → union is 3, not 2
    const specs: Record<string, { candidates?: number[] }> = {};
    for (let c = 0; c < 9; c++) {
      specs[`0,${c}`] = { candidates: (c === 2 || c === 6) ? [1, 5] : [1, 2] };
      specs[`4,${c}`] = { candidates: (c === 2 || c === 7) ? [3, 5] : [2, 3] };
    }
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    expect(XWing.apply(grid, cs)).toBeNull();
  });
});

// ─── Swordfish ─────────────────────────────────────────────────

describe('Swordfish', () => {
  it('eliminates digit from cover columns when locked in 3 rows', () => {
    // digit 4 in:
    //   row 1: cols {0, 3}
    //   row 4: cols {0, 6}
    //   row 7: cols {3, 6}
    // Union of cols = {0, 3, 6} = 3 → swordfish
    // → eliminate 4 from cols 0,3,6 in other rows
    const specs: Record<string, { candidates?: number[]; value?: number }> = {};
    for (let c = 0; c < 9; c++) {
      specs[`1,${c}`] = { candidates: (c === 0 || c === 3) ? [2, 4] : [1, 2, 3] };
      specs[`4,${c}`] = { candidates: (c === 0 || c === 6) ? [4, 7] : [1, 7, 8] };
      specs[`7,${c}`] = { candidates: (c === 3 || c === 6) ? [4, 9] : [1, 8, 9] };
    }
    // Other rows with 4 in those cols → should be eliminated
    specs['2,0'] = { candidates: [4, 5, 6] };
    specs['5,3'] = { candidates: [4, 8] };
    specs['8,6'] = { candidates: [4, 7] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    const step = Swordfish.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('swordfish');
    expect(hasElimination(step!.eliminations, 2, 0, 4)).toBe(true);
    expect(hasElimination(step!.eliminations, 5, 3, 4)).toBe(true);
    expect(hasElimination(step!.eliminations, 8, 6, 4)).toBe(true);
  });

  it('returns null when no swordfish exists', () => {
    const grid = buildGrid(9, {});
    const cs = buildConstraints(grid);
    expect(Swordfish.apply(grid, cs)).toBeNull();
  });
});

// ─── Jellyfish ─────────────────────────────────────────────────

describe('Jellyfish', () => {
  it('eliminates digit from cover columns when locked in 4 rows', () => {
    // digit 2 in:
    //   row 0: cols {1, 4}
    //   row 2: cols {1, 5}
    //   row 5: cols {4, 8}
    //   row 8: cols {5, 8}
    // Union of cols = {1, 4, 5, 8} = 4 → jellyfish
    const specs: Record<string, { candidates?: number[]; value?: number }> = {};
    for (let c = 0; c < 9; c++) {
      specs[`0,${c}`] = { candidates: (c === 1 || c === 4) ? [2, 3] : [3, 5, 6] };
      specs[`2,${c}`] = { candidates: (c === 1 || c === 5) ? [2, 7] : [5, 7, 8] };
      specs[`5,${c}`] = { candidates: (c === 4 || c === 8) ? [2, 9] : [6, 8, 9] };
      specs[`8,${c}`] = { candidates: (c === 5 || c === 8) ? [2, 6] : [1, 3, 6] };
    }
    // Elimination target: row 3, col 1 has digit 2
    specs['3,1'] = { candidates: [2, 4, 7] };
    specs['6,8'] = { candidates: [2, 3, 5] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    const step = Jellyfish.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('jellyfish');
    expect(hasElimination(step!.eliminations, 3, 1, 2)).toBe(true);
    expect(hasElimination(step!.eliminations, 6, 8, 2)).toBe(true);
  });
});

// ─── ThermoFork ────────────────────────────────────────────────

describe('ThermoFork', () => {
  it('eliminates large values from fork cell when divergent cells see each other', () => {
    // Two thermos share prefix (0,0)→(0,1), then fork:
    //   Thermo A: (0,0)→(0,1)→(0,2)
    //   Thermo B: (0,0)→(0,1)→(1,1)
    // (0,2) and (1,1) are in the same box (box 0) → see each other
    // Fork cell (0,1) candidates: {2,3,4}
    // (0,2) candidates: {3,4,5}, (1,1) candidates: {3,4,5}
    // For v=4: values>4 in (0,2)={5}, in (1,1)={5}. Union={5}, size=1 < 2 → eliminate 4
    // For v=3: values>3 in both = {4,5}. Union={4,5}, size=2 → OK
    // For v=2: values>2 = {3,4,5}. Union size=3 → OK
    const grid = buildGrid(9, {
      '0,0': { candidates: [1, 2, 3] },
      '0,1': { candidates: [2, 3, 4] },
      '0,2': { candidates: [3, 4, 5] },
      '1,1': { candidates: [3, 4, 5] },
    });
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ]));
    cs.add(new ThermometerConstraint('t2', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 },
    ]));
    const step = ThermoFork.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('thermo-fork');
    expect(hasElimination(step!.eliminations, 0, 1, 4)).toBe(true);
    expect(step!.eliminations.length).toBe(1);
  });

  it('eliminates small values from merge cell when converging cells see each other', () => {
    // Two thermos merge into shared suffix:
    //   Thermo A: (0,2)→(0,1)→(0,0)  — wait, thermos must increase
    // Let me use: thermos converge at the END
    //   Thermo A: (0,2)→(1,2)→(2,2)
    //   Thermo B: (0,1)→(1,2)→(2,2)  — shared suffix is (1,2)→(2,2)
    // Wait, but (1,2) is the first shared suffix cell. The pre-merge cells are (0,2) and (0,1).
    // (0,1) and (0,2) are in the same row → see each other
    // Merge cell (1,2) candidates: {3,4,5}
    // (0,2) candidates: {1,2,3}, (0,1) candidates: {1,2,3}
    // For v=3: values<3 in both = {1,2}. Union={1,2}, size=2 → OK
    // For v=2: values<2 in both = {1}. Union={1}, size=1 < 2 → eliminate 2
    const grid = buildGrid(9, {
      '0,1': { candidates: [1, 2, 3] },
      '0,2': { candidates: [1, 2, 3] },
      '1,2': { candidates: [2, 3, 4] },
      '2,2': { candidates: [4, 5, 6] },
    });
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 2 },
    ]));
    cs.add(new ThermometerConstraint('t2', [
      { row: 0, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 2 },
    ]));
    const step = ThermoFork.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasElimination(step!.eliminations, 1, 2, 2)).toBe(true);
  });

  it('returns null when divergent cells do not see each other', () => {
    // Two thermos fork but divergent cells in different boxes/rows/cols
    const grid = buildGrid(9, {
      '0,0': { candidates: [1, 2, 3] },
      '0,1': { candidates: [2, 3, 4] },
      '0,2': { candidates: [3, 4, 5] },
      '5,5': { candidates: [3, 4, 5] }, // far away
    });
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ]));
    cs.add(new ThermometerConstraint('t2', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 5, col: 5 },
    ]));
    expect(ThermoFork.apply(grid, cs)).toBeNull();
  });

  it('returns null when enough distinct values exist after fork', () => {
    // Fork cell (0,1) = {2,3,4}
    // (0,2) = {3,4,5,6}, (1,1) = {3,4,5,6}
    // For v=4: values>4 = {5,6} in both. Union={5,6}, size=2 → OK
    const grid = buildGrid(9, {
      '0,0': { candidates: [1, 2] },
      '0,1': { candidates: [2, 3, 4] },
      '0,2': { candidates: [3, 4, 5, 6] },
      '1,1': { candidates: [3, 4, 5, 6] },
    });
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ]));
    cs.add(new ThermometerConstraint('t2', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 },
    ]));
    expect(ThermoFork.apply(grid, cs)).toBeNull();
  });

  it('user example: (2,5)-(2,6)-(3,4,5) forking with (3,4,5)-(4,5,6)', () => {
    // Thermo A: P0→P1→P2  candidates {1,2,3}→{2,3,4}→{3,4,5}
    // Thermo B: P0→P1→P3  candidates {1,2,3}→{2,3,4}→{3,4,5}
    // P2=(0,2), P3=(1,1), same box → see each other
    // Fork cell P1 candidates {2,3,4}
    // v=4: above in P2={5}, P3={5}. Union={5}, <2 → eliminate 4 ✓
    // v=3: above in P2={4,5}, P3={4,5}. size=2 → OK
    const grid = buildGrid(9, {
      '0,0': { candidates: [1, 2, 3] },
      '0,1': { candidates: [2, 3, 4] },
      '0,2': { candidates: [3, 4, 5] },
      '1,1': { candidates: [3, 4, 5] },
    });
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ]));
    cs.add(new ThermometerConstraint('t2', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 },
    ]));
    const step = ThermoFork.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasElimination(step!.eliminations, 0, 1, 4)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 3)).toBe(false);
    expect(hasElimination(step!.eliminations, 0, 1, 2)).toBe(false);
  });
});

// ─── ThermoFish ───────────────��────────────────────────────────

describe('ThermoFish', () => {
  it('eliminates D+1 from early row and D-1 from late row in row-based X-Wing', () => {
    // X-Wing for digit 5: row 0 cols {2,6}, row 3 cols {2,6}
    // Thermos: (0,2)→...→(3,2) and (0,6)→...→(3,6) — both row 0 < row 3
    // → early row = 0, late row = 3
    // → eliminate 6 from (0,2),(0,6); eliminate 4 from (3,2),(3,6)
    const specs: Record<string, { candidates?: number[]; value?: number }> = {};
    // Row 0: digit 5 only in cols 2 and 6
    for (let c = 0; c < 9; c++) {
      specs[`0,${c}`] = { candidates: (c === 2 || c === 6)
        ? [3, 4, 5, 6] : [1, 2, 3, 4] };
    }
    // Row 3: digit 5 only in cols 2 and 6
    for (let c = 0; c < 9; c++) {
      specs[`3,${c}`] = { candidates: (c === 2 || c === 6)
        ? [4, 5, 6, 7] : [1, 2, 6, 7] };
    }
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    // Thermo col 2: (0,2) before (3,2)
    cs.add(new ThermometerConstraint('t1', [
      { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 2 }, { row: 3, col: 2 },
    ]));
    // Thermo col 6: (0,6) before (3,6)
    cs.add(new ThermometerConstraint('t2', [
      { row: 0, col: 6 }, { row: 1, col: 6 }, { row: 2, col: 6 }, { row: 3, col: 6 },
    ]));
    const step = ThermoFish.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('thermo-fish');
    // Early row 0: eliminate D+1 = 6
    expect(hasElimination(step!.eliminations, 0, 2, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 6, 6)).toBe(true);
    // Late row 3: eliminate D-1 = 4
    expect(hasElimination(step!.eliminations, 3, 2, 4)).toBe(true);
    expect(hasElimination(step!.eliminations, 3, 6, 4)).toBe(true);
  });

  it('handles reversed thermo direction', () => {
    // X-Wing for digit 3: row 1 cols {0,4}, row 5 cols {0,4}
    // Thermos go from row 5 → row 1 (row 5 is early, row 1 is late)
    // Only digit 3 (not 2) forms X-Wing to avoid earlier match
    const specs: Record<string, { candidates?: number[]; value?: number }> = {};
    for (let c = 0; c < 9; c++) {
      specs[`1,${c}`] = { candidates: (c === 0 || c === 4)
        ? [2, 3, 4] : [1, 5, 6] };
      specs[`5,${c}`] = { candidates: (c === 0 || c === 4)
        ? [3, 4] : [5, 6, 7] };
    }
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 5, col: 0 }, { row: 4, col: 0 }, { row: 3, col: 0 },
      { row: 2, col: 0 }, { row: 1, col: 0 },
    ]));
    cs.add(new ThermometerConstraint('t2', [
      { row: 5, col: 4 }, { row: 4, col: 4 }, { row: 3, col: 4 },
      { row: 2, col: 4 }, { row: 1, col: 4 },
    ]));
    const step = ThermoFish.apply(grid, cs);

    expect(step).not.toBeNull();
    // Early row = 5, late row = 1, digit = 3
    // Eliminate D+1=4 from early row (5)
    expect(hasElimination(step!.eliminations, 5, 0, 4)).toBe(true);
    expect(hasElimination(step!.eliminations, 5, 4, 4)).toBe(true);
    // Eliminate D-1=2 from late row (1)
    expect(hasElimination(step!.eliminations, 1, 0, 2)).toBe(true);
    expect(hasElimination(step!.eliminations, 1, 4, 2)).toBe(true);
  });

  it('handles opposite thermo directions (cross pattern)', () => {
    // X-Wing for digit 5: rows 0,3 cols 2,6
    // Col 2 thermo: r0 → r3 (r0 early)
    // Col 6 thermo: r3 → r0 (r3 early) — opposite direction!
    //
    // Col 2: (0,2) early ≤5 → elim 6; (3,2) late ≥5 → elim 4
    // Col 6: (3,6) early ≤5 → elim 6; (0,6) late ≥5 → elim 4
    const specs: Record<string, { candidates?: number[]; value?: number }> = {};
    for (let c = 0; c < 9; c++) {
      specs[`0,${c}`] = { candidates: (c === 2 || c === 6)
        ? [3, 4, 5, 6] : [1, 2, 3, 4] };
      specs[`3,${c}`] = { candidates: (c === 2 || c === 6)
        ? [4, 5, 6, 7] : [1, 2, 6, 7] };
    }
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 0, col: 2 }, { row: 3, col: 2 }, // r0 < r3
    ]));
    cs.add(new ThermometerConstraint('t2', [
      { row: 3, col: 6 }, { row: 0, col: 6 }, // r3 < r0 — opposite!
    ]));
    const step = ThermoFish.apply(grid, cs);

    expect(step).not.toBeNull();
    // Col 2: (0,2) early → elim 6; (3,2) late → elim 4
    expect(hasElimination(step!.eliminations, 0, 2, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 3, 2, 4)).toBe(true);
    // Col 6: (3,6) early → elim 6; (0,6) late → elim 4
    expect(hasElimination(step!.eliminations, 3, 6, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 6, 4)).toBe(true);
  });

  it('returns null when no thermo connects X-Wing cells', () => {
    const specs: Record<string, { candidates?: number[] }> = {};
    for (let c = 0; c < 9; c++) {
      specs[`0,${c}`] = { candidates: (c === 2 || c === 6) ? [3, 5, 6] : [1, 2] };
      specs[`3,${c}`] = { candidates: (c === 2 || c === 6) ? [4, 5, 6] : [1, 2] };
    }
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    expect(ThermoFish.apply(grid, cs)).toBeNull();
  });

  it('derived: X-Wing for 2 + thermo predecessors lock digit 1 in predecessor rows', () => {
    // User example (1-indexed → 0-indexed):
    // X-Wing for 2: r3c0, r5c0, r3c6, r5c6
    // Thermos: r2c0→r3c0, r6c0→r5c0, r2c6→r3c6, r6c6→r5c6
    // Predecessors: r2c0, r6c0, r2c6, r6c6 — all forced to 1 (only digit < 2)
    // → digit 1 in row 2 locked to {c0, c6}, in row 6 locked to {c0, c6}
    // → eliminate 1 from other cells in rows 2 and 6
    const specs: Record<string, { candidates?: number[]; value?: number }> = {};
    // X-Wing rows: digit 2 only in cols 0 and 6
    for (let c = 0; c < 9; c++) {
      specs[`3,${c}`] = { candidates: (c === 0 || c === 6) ? [2, 3, 4] : [3, 4, 5] };
      specs[`5,${c}`] = { candidates: (c === 0 || c === 6) ? [2, 3, 4] : [3, 4, 5] };
    }
    // Predecessor rows: have 1 as candidate in many cells
    for (let c = 0; c < 9; c++) {
      specs[`2,${c}`] = { candidates: [1, 5, 6, 7] };
      specs[`6,${c}`] = { candidates: [1, 5, 6, 7] };
    }
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    // Thermos connecting predecessors to X-Wing cells
    cs.add(new ThermometerConstraint('t1', [{ row: 2, col: 0 }, { row: 3, col: 0 }]));
    cs.add(new ThermometerConstraint('t2', [{ row: 6, col: 0 }, { row: 5, col: 0 }]));
    cs.add(new ThermometerConstraint('t3', [{ row: 2, col: 6 }, { row: 3, col: 6 }]));
    cs.add(new ThermometerConstraint('t4', [{ row: 6, col: 6 }, { row: 5, col: 6 }]));
    const step = ThermoFish.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('thermo-fish');
    // Digit 1 eliminated from row 2 at cols other than 0, 6
    expect(hasElimination(step!.eliminations, 2, 1, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 2, 2, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 2, 3, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 2, 4, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 2, 5, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 2, 7, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 2, 8, 1)).toBe(true);
    // Digit 1 NOT eliminated from locked cells
    expect(hasElimination(step!.eliminations, 2, 0, 1)).toBe(false);
    expect(hasElimination(step!.eliminations, 2, 6, 1)).toBe(false);
    // Same for row 6
    expect(hasElimination(step!.eliminations, 6, 1, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 6, 0, 1)).toBe(false);
    expect(hasElimination(step!.eliminations, 6, 6, 1)).toBe(false);
  });
});

// ─── ThermoForcing ─────────────────────────────────────────────

describe('ThermoForcing', () => {
  it('eliminates low value at end when forced chain blocks external cell', () => {
    // Thermo: (0,0){1,2,3} → (0,1){2,3,4} → (0,2){3,4,5}
    // External cell (1,0) in same col as (0,0), same row-region? No —
    // (1,0) is in box 0 with (0,0),(0,1),(0,2) if they're in box 0
    // 9x9 box 0 = rows 0-2, cols 0-2. So (1,0) sees (0,0),(0,1),(0,2). ✓
    // (1,0) candidates: {1,2,3}
    //
    // If (0,2)=3: forces (0,1)=2, (0,0)=1. Chain={1,2,3}.
    // (1,0) sees all three. Candidates {1,2,3} all blocked → contradiction.
    // → eliminate 3 from (0,2)
    const grid = buildGrid(9, {
      '0,0': { candidates: [1, 2, 3] },
      '0,1': { candidates: [2, 3, 4] },
      '0,2': { candidates: [3, 4, 5] },
      '1,0': { candidates: [1, 2, 3] },
    });
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ]));
    const step = ThermoForcing.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('thermo-forcing');
    expect(hasElimination(step!.eliminations, 0, 2, 3)).toBe(true);
  });

  it('eliminates high value at start when forced chain blocks external cell (reverse)', () => {
    // Same thermo, external cell (1,0) candidates {3,4,5}
    // If (0,0)=3: forces (0,1)=4, (0,2)=5. Chain={3,4,5}.
    // (1,0) sees all three, candidates {3,4,5} all blocked → contradiction.
    // → eliminate 3 from (0,0)
    const grid = buildGrid(9, {
      '0,0': { candidates: [1, 2, 3] },
      '0,1': { candidates: [2, 3, 4] },
      '0,2': { candidates: [3, 4, 5] },
      '1,0': { candidates: [3, 4, 5] },
    });
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ]));
    const step = ThermoForcing.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasElimination(step!.eliminations, 0, 0, 3)).toBe(true);
  });

  it('works from middle of thermometer', () => {
    // Thermo: (0,0){1,2} → (0,1){2,3} → (0,2){3,4,5}
    // External (1,1) in box 0, candidates {2,3}
    // If (0,1)=3: backward (0,0) < 3, from {1,2} → {1,2} has 2 options → NOT forced. Skip.
    // If (0,1)=2: backward (0,0) < 2, from {1,2} → {1}. Forced! Forward (0,2) > 2, from {3,4,5} → 3 options. NOT forced.
    // Chain = {(0,0)=1, (0,1)=2}. (1,1) sees both. Candidates {2,3}: 2 blocked by (0,1)=2. 3 NOT blocked (no forced cell has value 3 that (1,1) sees). Not all blocked.
    //
    // Let me use tighter candidates:
    // Thermo: (0,0){1,2} → (0,1){2,3} → (0,2){3,4}
    // External (1,1){1,2,3}
    // If (0,1)=2: back: (0,0)<2 from {1,2}→{1}. fwd: (0,2)>2 from {3,4}→{3,4} (2 options, not forced).
    // Chain = {(0,0)=1, (0,1)=2}. Only 2 forced values. (1,1) has {1,2,3}. 1 blocked by (0,0), 2 blocked by (0,1), 3 NOT blocked. Not all blocked.
    //
    // Better: (0,0){1} → (0,1){2,3} → (0,2){3,4}. External (1,0){1,2}
    // If (0,1)=2: back: (0,0)<2, already value or from {1}→{1}. fwd: (0,2)>2 from {3,4}→two options.
    // Chain={(0,0)=1, (0,1)=2}. (1,0) sees both. {1,2}: 1 by (0,0), 2 by (0,1). All blocked!
    // → eliminate 2 from (0,1)
    const grid = buildGrid(9, {
      '0,0': { candidates: [1] },
      '0,1': { candidates: [2, 3] },
      '0,2': { candidates: [3, 4] },
      '1,0': { candidates: [1, 2] },
    });
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ]));
    const step = ThermoForcing.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasElimination(step!.eliminations, 0, 1, 2)).toBe(true);
  });

  it('returns null when chain is not fully forced', () => {
    // Thermo: (0,0){1,2,3} → (0,1){2,3,4} → (0,2){3,4,5}
    // External (1,0){1,2,3}
    // If (0,2)=4: back: (0,1) < 4, from {2,3,4} → {2,3} (TWO options, not forced). Chain breaks.
    // If (0,2)=5: back: (0,1) < 5, from {2,3,4} → {2,3,4} (THREE options). Not forced.
    // Only (0,2)=3 forces. That test is covered above.
    // But here we remove the condition for (0,2)=3 by changing external cell.
    const grid = buildGrid(9, {
      '0,0': { candidates: [1, 2, 3] },
      '0,1': { candidates: [2, 3, 4] },
      '0,2': { candidates: [4, 5] }, // min is 4, not 3
      '1,0': { candidates: [1, 2, 3] },
    });
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ]));
    // (0,2)=4: back (0,1)<4 from {2,3,4}→{2,3}. 2 options, not forced.
    // (0,2)=5: back (0,1)<5 from {2,3,4}→{2,3,4}. Not forced.
    expect(ThermoForcing.apply(grid, cs)).toBeNull();
  });

  it('returns null when external cell has candidates not covered by forced chain', () => {
    const grid = buildGrid(9, {
      '0,0': { candidates: [1, 2, 3] },
      '0,1': { candidates: [2, 3, 4] },
      '0,2': { candidates: [3, 4, 5] },
      '1,0': { candidates: [1, 2, 3, 7] }, // 7 is not in any forced chain
    });
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ]));
    expect(ThermoForcing.apply(grid, cs)).toBeNull();
  });
});

// ─── YWing ─────────────────────────────────────────────────────

describe('YWing', () => {
  it('user example: pivot r7c8{5,6} eliminates 7 from r9c8', () => {
    // 1-indexed → 0-indexed:
    // r1c8(5,7) = (0,7){5,7} — wing1 (shares col 7 with pivot)
    // r7c8(5,6) = (6,7){5,6} — pivot
    // r7c7(6,7) = (6,6){6,7} — wing2 (shares row 6 with pivot)
    // r9c8(5,7,8) = (8,7){5,7,8} — target (sees wing1 via col 7, sees wing2 via box 8)
    //
    // Pivot{5,6}: if 5 → wing1 can't be 5 → wing1=7. if 6 → wing2 can't be 6 → wing2=7.
    // Either way 7 appears at a cell visible to (8,7) → eliminate 7 from (8,7).
    const grid = buildGrid(9, {
      '0,7': { candidates: [5, 7] },
      '6,7': { candidates: [5, 6] },
      '6,6': { candidates: [6, 7] },
      '8,7': { candidates: [5, 7, 8] },
    });
    const cs = buildConstraints(grid);
    const step = YWing.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('y-wing');
    expect(hasElimination(step!.eliminations, 8, 7, 7)).toBe(true);
  });

  it('basic Y-Wing in a single box + row', () => {
    // 9x9: Pivot (0,0){1,2}, Wing1 (0,3){1,3} (same row), Wing2 (1,0){2,3} (same col/box)
    // If pivot=1 → wing1≠1 → wing1=3. If pivot=2 → wing2≠2 → wing2=3.
    // Cell (1,3) sees wing1 (same row? no: row 1 vs row 0. Same col? col 3 vs col 3: no, 0 vs 3)
    // Hmm let me pick better positions.
    //
    // Pivot (0,0){1,2}
    // Wing1 (0,2){1,3} — same row 0
    // Wing2 (2,0){2,3} — same col 0
    // C=3. Target must see both wings.
    // (2,2) sees wing1? (2,2) and (0,2) share col 2. ✓
    // (2,2) sees wing2? (2,2) and (2,0) share row 2 and box 0. ✓
    // So eliminate 3 from (2,2).
    const grid = buildGrid(9, {
      '0,0': { candidates: [1, 2] },
      '0,2': { candidates: [1, 3] },
      '2,0': { candidates: [2, 3] },
      '2,2': { candidates: [3, 5, 6] },
    });
    const cs = buildConstraints(grid);
    const step = YWing.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasElimination(step!.eliminations, 2, 2, 3)).toBe(true);
  });

  it('returns null when no Y-Wing pattern exists', () => {
    const grid = buildGrid(9, {
      '0,0': { candidates: [1, 2] },
      '0,2': { candidates: [1, 4] }, // other digit 4, not matching
      '2,0': { candidates: [2, 3] }, // other digit 3
    });
    const cs = buildConstraints(grid);
    expect(YWing.apply(grid, cs)).toBeNull();
  });

  it('returns null when no target cell sees both wings', () => {
    // Pivot (0,0){1,2}, Wing1 (0,8){1,3}, Wing2 (8,0){2,3}
    // C=3. A cell would need to see both (0,8) and (8,0) — they're far apart.
    // (8,8) sees (0,8)? col 8 ✓. Sees (8,0)? row 8 ✓. But does (8,8) have candidate 3?
    // Let's say no.
    const grid = buildGrid(9, {
      '0,0': { candidates: [1, 2] },
      '0,8': { candidates: [1, 3] },
      '8,0': { candidates: [2, 3] },
      '8,8': { candidates: [4, 5] }, // no 3
    });
    const cs = buildConstraints(grid);
    expect(YWing.apply(grid, cs)).toBeNull();
  });
});

// ─── ParallelThermos ───────────────────────────────────────────

describe('ParallelThermos', () => {
  it('user example: 5 parallel thermos of length 5 force consecutive sequences', () => {
    // 5 thermos, length 5, rows 2-6 (0-indexed), cols 0,2,4,6,8
    // L=5, N=5, L+N=10=9+1 ✓
    // Each thermo must be one of: (1,2,3,4,5),(2,3,4,5,6),(3,4,5,6,7),(4,5,6,7,8),(5,6,7,8,9)
    // At position j, valid values are {j+1, ..., j+5}
    // Cell at position 0 should have candidates restricted to {1,2,3,4,5}
    // Cell at position 4 should be restricted to {5,6,7,8,9}
    const specs: Record<string, { candidates?: number[] }> = {};
    const thermoCols = [0, 2, 4, 6, 8];
    for (const c of thermoCols) {
      for (let r = 2; r <= 6; r++) {
        // Give full candidates — the heuristic should eliminate the invalid ones
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    for (const c of thermoCols) {
      cs.add(new ThermometerConstraint(`t-c${c}`, [
        { row: 2, col: c }, { row: 3, col: c }, { row: 4, col: c },
        { row: 5, col: c }, { row: 6, col: c },
      ]));
    }
    const step = ParallelThermos.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('parallel-thermos');
    // Position 0 (row 2): valid {1,2,3,4,5} → eliminate 6,7,8,9
    expect(hasElimination(step!.eliminations, 2, 0, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 2, 0, 9)).toBe(true);
    // Position 4 (row 6): valid {5,6,7,8,9} → eliminate 1,2,3,4
    expect(hasElimination(step!.eliminations, 6, 0, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 6, 0, 4)).toBe(true);
    // Position 2 (row 4): valid {3,4,5,6,7} → eliminate 1,2,8,9
    expect(hasElimination(step!.eliminations, 4, 0, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 4, 0, 8)).toBe(true);
  });

  it('cross-propagation narrows start values', () => {
    // 2 thermos of length 8 through rows 0-7, L+N=8+2=10 ✓
    // Possible starts: k=1 → (1..8), k=2 → (2..9)
    // Thermo A at col 0: position 0 cell has only candidate 1 → start must be 1
    // → Thermo B can only start at 2
    // → Thermo B position 0 can only be 2: eliminate everything else
    const specs: Record<string, { candidates?: number[] }> = {};
    for (let r = 0; r < 8; r++) {
      specs[`${r},0`] = { candidates: r === 0 ? [1] : [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      specs[`${r},1`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
    }
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('tA', Array.from({ length: 8 }, (_, r) => ({ row: r, col: 0 }))));
    cs.add(new ThermometerConstraint('tB', Array.from({ length: 8 }, (_, r) => ({ row: r, col: 1 }))));
    const step = ParallelThermos.apply(grid, cs);

    expect(step).not.toBeNull();
    // Thermo A: start=1, all positions forced: 1,2,3,4,5,6,7,8
    // Position 1 of thermo A: only 2 valid → eliminate 1,3,4,...,9
    expect(hasElimination(step!.eliminations, 1, 0, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 1, 0, 3)).toBe(true);
    // Thermo B: start=2, position 0: only 2 valid → eliminate 1,3,...
    expect(hasElimination(step!.eliminations, 0, 1, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 3)).toBe(true);
  });

  it('returns null when thermos are not parallel', () => {
    // Two thermos of length 8 but different row sequences
    const grid = buildGrid(9, {});
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('tA', Array.from({ length: 8 }, (_, r) => ({ row: r, col: 0 }))));
    cs.add(new ThermometerConstraint('tB', Array.from({ length: 8 }, (_, r) => ({ row: r + 1, col: 1 })))); // rows 1-8 vs 0-7
    expect(ParallelThermos.apply(grid, cs)).toBeNull();
  });

  it('returns null when L + N != size + 1', () => {
    // 3 thermos of length 5: 5+3=8 ≠ 10
    const grid = buildGrid(9, {});
    const cs = buildConstraints(grid);
    for (const c of [0, 2, 4]) {
      cs.add(new ThermometerConstraint(`t${c}`, Array.from({ length: 5 }, (_, r) => ({ row: r, col: c }))));
    }
    expect(ParallelThermos.apply(grid, cs)).toBeNull();
  });

  it('external cell forcing: cell {4,6} in col 6 eliminates starts 2,3,4 from thermo in col 6', () => {
    // 5 parallel thermos length 5, rows 2-6, cols 0,2,4,6,8
    // External cell (0,6) has candidates {4,6} — in col 6, sees all thermo cells of col-6 thermo
    // k=2 → (2,3,4,5,6): 4 and 6 both blocked → impossible
    // k=3 → (3,4,5,6,7): 4 and 6 blocked → impossible
    // k=4 → (4,5,6,7,8): 4 and 6 blocked → impossible
    // k=1 → (1,2,3,4,5): 6 NOT blocked → OK
    // k=5 → (5,6,7,8,9): 4 NOT blocked → OK
    // So col-6 thermo can only start at 1 or 5
    // At position 0 (row 2): valid values {1+0, 5+0} = {1, 5}
    // At position 2 (row 4): valid values {3, 7}
    const specs: Record<string, { candidates?: number[] }> = {};
    const thermoCols = [0, 2, 4, 6, 8];
    for (const c of thermoCols) {
      for (let r = 2; r <= 6; r++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    // External cell that forces restriction on col-6 thermo
    specs['0,6'] = { candidates: [4, 6] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    for (const c of thermoCols) {
      cs.add(new ThermometerConstraint(`t-c${c}`, [
        { row: 2, col: c }, { row: 3, col: c }, { row: 4, col: c },
        { row: 5, col: c }, { row: 6, col: c },
      ]));
    }
    const step = ParallelThermos.apply(grid, cs);

    expect(step).not.toBeNull();
    // Col-6 thermo position 0 (row 2): only {1, 5} valid → eliminate 2,3,4
    expect(hasElimination(step!.eliminations, 2, 6, 2)).toBe(true);
    expect(hasElimination(step!.eliminations, 2, 6, 3)).toBe(true);
    expect(hasElimination(step!.eliminations, 2, 6, 4)).toBe(true);
    // 1 and 5 should NOT be eliminated from position 0
    expect(hasElimination(step!.eliminations, 2, 6, 1)).toBe(false);
    expect(hasElimination(step!.eliminations, 2, 6, 5)).toBe(false);
    // Col-6 thermo position 2 (row 4): only {3, 7} valid → eliminate 4,5,6
    expect(hasElimination(step!.eliminations, 4, 6, 4)).toBe(true);
    expect(hasElimination(step!.eliminations, 4, 6, 5)).toBe(true);
    expect(hasElimination(step!.eliminations, 4, 6, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 4, 6, 3)).toBe(false);
    expect(hasElimination(step!.eliminations, 4, 6, 7)).toBe(false);
  });

  it('multi-cell forcing: two external cells both reduced to same singleton → start eliminated', () => {
    // 2 thermos of length 8 through rows 0-7, cols 0 and 1. L=8, N=2, L+N=10 ✓
    // Possible starts: k=1 → (1,2,3,4,5,6,7,8), k=2 → (2,3,4,5,6,7,8,9)
    // Thermo col 0: path (0,0)→(1,0)→...→(7,0)
    // External cells in col 0: (8,0) with candidates {3,4,6} and another cell that sees thermo.
    // Actually let me use a box-based example:
    //
    // Thermo in col 4: (0,4)→(1,4)→...→(7,4)
    // External cell A: (8,4) with {3,4,6} — in col 4, sees all thermo cells
    // External cell B: (8,3) with {4,6} — in row 8 same as A, shares box 8 [rows 6-8, cols 3-5]
    //   B sees thermo cells (6,4) and (7,4) via box 8
    //
    // For k=1 (thermo = 1..8):
    //   Cell A residual: {3,4,6} minus {1,2,3,4,5,6,7,8} (all blocked by col 4) → {} → impossible!
    // Actually that makes it too easy (single cell empty). Let me adjust.
    //
    // Let me use thermo length 5 with 5 parallel thermos but focus on multi-cell check.
    // 5 thermos length 5, rows 2-6, cols 0,2,4,6,8
    // Thermo col 6: starts k=1→(1..5) or k=5→(5..9) (after previous external forcing)
    // Now TWO external cells in col 6: (0,6){3,6} and (1,6){3,6}
    //   Both in col 6, see all thermo cells in col 6
    //   For k=1 (thermo = 1,2,3,4,5):
    //     (0,6) residual: {3,6} minus {1,2,3,4,5} = {6}
    //     (1,6) residual: {3,6} minus {1,2,3,4,5} = {6}
    //     Both = {6} and they see each other (same col 6) → conflict → k=1 impossible!
    //   For k=5 (thermo = 5,6,7,8,9):
    //     (0,6) residual: {3,6} minus {5,6,7,8,9} = {3}
    //     (1,6) residual: {3,6} minus {5,6,7,8,9} = {3}
    //     Both = {3} and same col → also conflict → k=5 impossible!
    //   Hmm, both impossible means no valid start. That's a contradiction, not useful.
    //   Let me pick candidates so only k=1 conflicts.
    //
    // (0,6){3,6} and (1,6){4,6}
    //   k=1 (1..5): (0,6) = {3,6}∖{1,2,3,4,5} = {6}. (1,6) = {4,6}∖{1,2,3,4,5} = {6}.
    //     Both {6}, same col → conflict! k=1 impossible.
    //   k=2 (2..6): (0,6) = {3,6}∖{2,3,4,5,6} = {}. Empty → impossible by level 1.
    //   k=3 (3..7): (0,6) = {3,6}∖{3,4,5,6,7} = {}. Same.
    //   k=4 (4..8): (0,6) = {3,6}∖{4,5,6,7,8} = {3}. (1,6) = {4,6}∖{4,5,6,7,8} = {}. Empty.
    //   k=5 (5..9): (0,6) = {3,6}∖{5,6,7,8,9} = {3}. (1,6) = {4,6}∖{5,6,7,8,9} = {4}. OK.
    //
    // So without level 2 check, k=2,3,4 killed by level 1, k=5 OK, k=1 NOT killed → bad.
    // WITH level 2 check, k=1 also killed. Only k=5 remains.
    //
    // Thermo col 6 at position 0 (row 2): only k=5 → value 5
    const specs: Record<string, { candidates?: number[] }> = {};
    const thermoCols = [0, 2, 4, 6, 8];
    for (const c of thermoCols) {
      for (let r = 2; r <= 6; r++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['0,6'] = { candidates: [3, 6] };
    specs['1,6'] = { candidates: [4, 6] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    for (const c of thermoCols) {
      cs.add(new ThermometerConstraint(`t-c${c}`, [
        { row: 2, col: c }, { row: 3, col: c }, { row: 4, col: c },
        { row: 5, col: c }, { row: 6, col: c },
      ]));
    }
    const step = ParallelThermos.apply(grid, cs);

    expect(step).not.toBeNull();
    // Col-6 thermo: only k=5 → position 0 = 5 only
    // Eliminate 1,2,3,4 from (2,6); eliminate 6,7,8,9 from (2,6)
    // Actually only {1,2,3,4,6,7,8,9} eliminated; 5 stays
    expect(hasElimination(step!.eliminations, 2, 6, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 2, 6, 4)).toBe(true);
    expect(hasElimination(step!.eliminations, 2, 6, 5)).toBe(false);
    expect(hasElimination(step!.eliminations, 2, 6, 6)).toBe(true);
    // Position 4 (row 6): only k=5 → value 9
    expect(hasElimination(step!.eliminations, 6, 6, 8)).toBe(true);
    expect(hasElimination(step!.eliminations, 6, 6, 9)).toBe(false);
  });
});

// ─── ConstraintClaiming ────────────────────────────────────────

describe('ConstraintClaiming', () => {
  it('thermo column: 4 external cells on col lock 4 cells in box, eliminate large digits', () => {
    // 9x9 grid. Thermo: r6c0→r5c0→r4c0→r3c0→r2c1→r2c2→r2c3
    // (0-indexed: rows 6,5,4,3 in col 0, then row 2 cols 1,2,3)
    // Box top-left (rows 0-2, cols 0-2):
    //   internal thermo cells: (2,1), (2,2)
    //   external on col 0: (3,0),(4,0),(5,0),(6,0) — 4 cells
    //   excluded in box: col 0 cells {(0,0),(1,0),(2,0)} + internal {(2,1),(2,2)} = 5
    //   available: {(0,1),(0,2),(1,1),(1,2)} = 4 = |external| → locked set
    //
    // Thermo length=7, external cells are positions 0-3 → values ≤ 6
    // So eliminate 7,8,9 from available cells
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    // Fill all cells with full candidates
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    // Thermo cells get appropriate candidates reflecting thermo ordering
    // Pos 0 (r6c0): 1-3, Pos 1 (r5c0): 2-4, Pos 2 (r4c0): 3-5, Pos 3 (r3c0): 4-6
    // Pos 4 (r2c1): 5-7, Pos 5 (r2c2): 6-8, Pos 6 (r2c3): 7-9
    specs['6,0'] = { candidates: [1, 2, 3] };
    specs['5,0'] = { candidates: [2, 3, 4] };
    specs['4,0'] = { candidates: [3, 4, 5] };
    specs['3,0'] = { candidates: [4, 5, 6] };
    specs['2,1'] = { candidates: [5, 6, 7] };
    specs['2,2'] = { candidates: [6, 7, 8] };
    specs['2,3'] = { candidates: [7, 8, 9] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 6, col: 0 }, { row: 5, col: 0 }, { row: 4, col: 0 }, { row: 3, col: 0 },
      { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
    ]));

    const step = ConstraintClaiming.apply(grid, cs);
    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('constraint-claiming');

    // Available cells: (0,1),(0,2),(1,1),(1,2) should lose 7,8,9
    // External candidates union = {1,2,3,4,5,6} → eliminate 7,8,9
    for (const [r, c] of [[0, 1], [0, 2], [1, 1], [1, 2]]) {
      expect(hasElimination(step!.eliminations, r, c, 7)).toBe(true);
      expect(hasElimination(step!.eliminations, r, c, 8)).toBe(true);
      expect(hasElimination(step!.eliminations, r, c, 9)).toBe(true);
    }
    // Should NOT eliminate values that ARE possible for external cells
    expect(hasElimination(step!.eliminations, 0, 1, 1)).toBe(false);
    expect(hasElimination(step!.eliminations, 0, 1, 6)).toBe(false);
  });

  it('thermo row: external cells on same row lock cells in box', () => {
    // Thermo going along row 2: r2c6→r2c5→r2c4→r2c3→r1c2→r1c1→r1c0
    // Box top-left (rows 0-2, cols 0-2):
    //   internal: (1,2), (1,1), (1,0)
    //   external on row 2: (2,3),(2,4),(2,5),(2,6) — 4 cells
    //   excluded: row 2 in box {(2,0),(2,1),(2,2)} + internal {(1,0),(1,1),(1,2)} = 6
    //   available: {(0,0),(0,1),(0,2)} = 3 ≠ 4 → no locked set
    // Adjust: use shorter thermo so |external| = 3
    // Thermo: r2c5→r2c4→r2c3→r1c2→r1c1→r1c0 (length 6)
    //   external on row 2: (2,3),(2,4),(2,5) — 3 cells
    //   internal: (1,2),(1,1),(1,0) — 3 cells
    //   excluded: row 2 in box {(2,0),(2,1),(2,2)} + internal {(1,0),(1,1),(1,2)} = 6
    //   available: {(0,0),(0,1),(0,2)} = 3 = |external| ✓
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    // Thermo positions: pos 0 (r2c5): 1-4, pos 1 (r2c4): 2-5, pos 2 (r2c3): 3-6
    specs['2,5'] = { candidates: [1, 2, 3, 4] };
    specs['2,4'] = { candidates: [2, 3, 4, 5] };
    specs['2,3'] = { candidates: [3, 4, 5, 6] };
    specs['1,2'] = { candidates: [4, 5, 6, 7] };
    specs['1,1'] = { candidates: [5, 6, 7, 8] };
    specs['1,0'] = { candidates: [6, 7, 8, 9] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t-row', [
      { row: 2, col: 5 }, { row: 2, col: 4 }, { row: 2, col: 3 },
      { row: 1, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 0 },
    ]));

    const step = ConstraintClaiming.apply(grid, cs);
    expect(step).not.toBeNull();

    // External candidates union = {1,2,3,4,5,6} → eliminate 7,8,9 from available
    for (const [r, c] of [[0, 0], [0, 1], [0, 2]]) {
      expect(hasElimination(step!.eliminations, r, c, 7)).toBe(true);
      expect(hasElimination(step!.eliminations, r, c, 8)).toBe(true);
      expect(hasElimination(step!.eliminations, r, c, 9)).toBe(true);
      // 1-6 should NOT be eliminated
      expect(hasElimination(step!.eliminations, r, c, 1)).toBe(false);
    }
  });

  it('killer cage: external cells lock cells in box', () => {
    // Cage with 6 cells: 4 external on col 0 outside box, 2 internal in box
    // Cage cells: (3,0),(4,0),(5,0),(6,0),(2,1),(2,2) — sum=27
    // Box top-left (rows 0-2, cols 0-2):
    //   internal: (2,1),(2,2)
    //   external on col 0: (3,0),(4,0),(5,0),(6,0) — 4 cells
    //   excluded: col 0 in box {(0,0),(1,0),(2,0)} + internal {(2,1),(2,2)} = 5
    //   available: {(0,1),(0,2),(1,1),(1,2)} = 4 = |external| ✓
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    // External cage cells have candidates {1,2,3,4,5}
    specs['3,0'] = { candidates: [1, 2, 3, 4, 5] };
    specs['4,0'] = { candidates: [1, 2, 3, 4, 5] };
    specs['5,0'] = { candidates: [1, 2, 3, 4, 5] };
    specs['6,0'] = { candidates: [1, 2, 3, 4, 5] };
    // Internal cage cells
    specs['2,1'] = { candidates: [6, 7, 8] };
    specs['2,2'] = { candidates: [7, 8, 9] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new CageSumConstraint('cage1',
      [{ row: 3, col: 0 }, { row: 4, col: 0 }, { row: 5, col: 0 }, { row: 6, col: 0 },
       { row: 2, col: 1 }, { row: 2, col: 2 }],
      27,
    ));

    const step = ConstraintClaiming.apply(grid, cs);
    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('constraint-claiming');

    // External candidates union = {1,2,3,4,5} → eliminate 6,7,8,9 from available cells
    for (const [r, c] of [[0, 1], [0, 2], [1, 1], [1, 2]]) {
      expect(hasElimination(step!.eliminations, r, c, 6)).toBe(true);
      expect(hasElimination(step!.eliminations, r, c, 7)).toBe(true);
      expect(hasElimination(step!.eliminations, r, c, 8)).toBe(true);
      expect(hasElimination(step!.eliminations, r, c, 9)).toBe(true);
      expect(hasElimination(step!.eliminations, r, c, 5)).toBe(false);
    }
  });

  it('returns null when available cells count does not match external count', () => {
    // Thermo with only 2 external cells on col 0 and 1 internal cell
    // excluded: col 0 in box (3) + internal (1) = 4
    // available: 9 - 4 = 5 ≠ 2 → no locked set
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['3,0'] = { candidates: [1, 2, 3] };
    specs['4,0'] = { candidates: [2, 3, 4] };
    specs['2,1'] = { candidates: [3, 4, 5] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t-short', [
      { row: 3, col: 0 }, { row: 4, col: 0 }, { row: 2, col: 1 },
    ]));

    const step = ConstraintClaiming.apply(grid, cs);
    expect(step).toBeNull();
  });

  it('returns null when no constraint has distinct values', () => {
    // Arrow constraint doesn't guarantee distinct values — should be skipped
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    // No thermo or cage constraints → nothing to claim
    const step = ConstraintClaiming.apply(grid, cs);
    expect(step).toBeNull();
  });

  it('returns null when eliminations already done (no new elims)', () => {
    // Same setup as first test but available cells already have only {1-6}
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['6,0'] = { candidates: [1, 2, 3] };
    specs['5,0'] = { candidates: [2, 3, 4] };
    specs['4,0'] = { candidates: [3, 4, 5] };
    specs['3,0'] = { candidates: [4, 5, 6] };
    specs['2,1'] = { candidates: [5, 6, 7] };
    specs['2,2'] = { candidates: [6, 7, 8] };
    specs['2,3'] = { candidates: [7, 8, 9] };
    // Available cells already restricted to possible values only
    specs['0,1'] = { candidates: [1, 2, 3, 4, 5, 6] };
    specs['0,2'] = { candidates: [1, 2, 3, 4, 5, 6] };
    specs['1,1'] = { candidates: [1, 2, 3, 4, 5, 6] };
    specs['1,2'] = { candidates: [1, 2, 3, 4, 5, 6] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 6, col: 0 }, { row: 5, col: 0 }, { row: 4, col: 0 }, { row: 3, col: 0 },
      { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
    ]));

    const step = ConstraintClaiming.apply(grid, cs);
    expect(step).toBeNull();
  });

  it('works with placed values on external thermo cells', () => {
    // Some external cells have placed values — their values contribute to possibleValues
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['6,0'] = { value: 1 };
    specs['5,0'] = { value: 2 };
    specs['4,0'] = { candidates: [3, 4] };
    specs['3,0'] = { candidates: [4, 5] };
    specs['2,1'] = { candidates: [5, 6, 7] };
    specs['2,2'] = { candidates: [6, 7, 8] };
    specs['2,3'] = { candidates: [7, 8, 9] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new ThermometerConstraint('t1', [
      { row: 6, col: 0 }, { row: 5, col: 0 }, { row: 4, col: 0 }, { row: 3, col: 0 },
      { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
    ]));

    const step = ConstraintClaiming.apply(grid, cs);
    expect(step).not.toBeNull();

    // External values: placed {1,2} + candidates {3,4,5} → union {1,2,3,4,5}
    // Eliminate 6,7,8,9 from available
    for (const [r, c] of [[0, 1], [0, 2], [1, 1], [1, 2]]) {
      expect(hasElimination(step!.eliminations, r, c, 6)).toBe(true);
      expect(hasElimination(step!.eliminations, r, c, 9)).toBe(true);
      expect(hasElimination(step!.eliminations, r, c, 1)).toBe(false);
    }
  });
});

// ─── TurbotFish ────────────────────────────────────────────────

describe('TurbotFish', () => {
  it('skyscraper: two columns connected by shared row', () => {
    // Digit 1: col 0 in {r0, r5}, col 6 in {r0, r3}
    // Chain: r5c0 ==col0== r0c0 --row0-- r0c6 ==col6== r3c6
    // Either r5c0=1 or r3c6=1 → eliminate 1 from cells seeing both.
    // Target r3c2: sees r5c0 (box 1,0) and r3c6 (row 3).
    // Note: target must NOT be in col 0 or col 6 to preserve conjugate pairs.
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['0,0'] = { candidates: [1, 2] };
    specs['5,0'] = { candidates: [1, 3] };
    specs['0,6'] = { candidates: [1, 4] };
    specs['3,6'] = { candidates: [1, 5] };
    // Target: r3c2 sees r5c0 (box-1-0) and r3c6 (row 3)
    specs['3,2'] = { candidates: [1, 6, 7] };
    // Break row-0 strong link (add third cell with 1 in row 0)
    specs['0,3'] = { candidates: [1, 8] };
    // Break row-3 strong link (add third cell with 1 in row 3)
    specs['3,4'] = { candidates: [1, 9] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    const step = TurbotFish.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('turbot-fish');
    expect(hasElimination(step!.eliminations, 3, 2, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 5, 0, 1)).toBe(false);
    expect(hasElimination(step!.eliminations, 3, 6, 1)).toBe(false);
  });

  it('2-string kite: col + box connected through row', () => {
    // Only 2 strong links: col-6(r2c6, r4c6) and box-1-0(r4c2, r5c0)
    // Weak link: r4c6 and r4c2 share row 4
    // Chain: r2c6 ==col6== r4c6 --row4-- r4c2 ==box(1,0)== r5c0
    // Target r2c0: sees r2c6 (row 2) and r5c0 (col 0)
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['2,6'] = { candidates: [1, 5] };
    specs['4,6'] = { candidates: [1, 8] };
    specs['4,2'] = { candidates: [1, 3] };
    specs['5,0'] = { candidates: [1, 7] };
    specs['2,0'] = { candidates: [1, 4, 9] };
    // Break col-0 (r2c0, r5c0 → add r7c0), row-2, row-4
    specs['7,0'] = { candidates: [1, 6] };
    specs['2,3'] = { candidates: [1, 2] };
    specs['4,4'] = { candidates: [1, 9] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    const step = TurbotFish.apply(grid, cs);

    expect(step).not.toBeNull();
    expect(hasElimination(step!.eliminations, 2, 0, 1)).toBe(true);
  });

  it('6-node X-Chain: 3 strong links + 2 weak links', () => {
    // Digit 1: col 0 in {r0, r6}, col 3 in {r3, r6}, col 7 in {r0, r5}
    // No 4-node chain produces eliminations (targets have no candidate 1).
    // 6-node chain: r5c7 ==col7== r0c7 --row0-- r0c0 ==col0== r6c0 --row6-- r6c3 ==col3== r3c3
    // Target: r5c3 sees r5c7 (row 5) and r3c3 (col 3)
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['0,0'] = { candidates: [1, 2] };
    specs['6,0'] = { candidates: [1, 3] };
    specs['3,3'] = { candidates: [1, 4] };
    specs['6,3'] = { candidates: [1, 5] };
    specs['0,7'] = { candidates: [1, 6] };
    specs['5,7'] = { candidates: [1, 7] };
    // Target
    specs['5,3'] = { candidates: [1, 8, 9] };
    // Break row strong links (add 3rd cell with 1 in each row)
    specs['0,4'] = { candidates: [1, 2] };
    specs['5,1'] = { candidates: [1, 3] };
    specs['6,8'] = { candidates: [1, 4] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    const step = TurbotFish.apply(grid, cs);

    expect(step).not.toBeNull();
    // Chain: r6c0==col0==r0c0--r0c7==col7==r5c7--r5c3==box(1,1)==r3c3
    // Endpoints: r6c0, r3c3. r6c3 sees both (row 6 + col 3) → eliminate
    expect(hasElimination(step!.eliminations, 6, 3, 1)).toBe(true);
    // Chain nodes and endpoints should NOT be eliminated
    expect(hasElimination(step!.eliminations, 6, 0, 1)).toBe(false);
    expect(hasElimination(step!.eliminations, 3, 3, 1)).toBe(false);
    expect(hasElimination(step!.eliminations, 5, 3, 1)).toBe(false);
  });

  it('returns null when no conjugate pairs exist', () => {
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    expect(TurbotFish.apply(grid, cs)).toBeNull();
  });
});

// ─── CageRegionInteraction ─────────────────────────────────────

describe('CageRegionInteraction', () => {
  it('two cages in same row: incompatible combos eliminated', () => {
    // Row 0: cage sum=14 at (0,0)+(0,1), cage sum=15 at (0,2)+(0,3)
    // Cage 14 combos: {5,9}, {6,8}
    // Cage 15 combos: {6,9}, {7,8}
    // Compatible: cage14={5,9} + cage15={7,8} only.
    // → cage14 cells: only {5,9}; cage15 cells: only {7,8}
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['0,0'] = { candidates: [5, 6, 8, 9] };
    specs['0,1'] = { candidates: [5, 6, 8, 9] };
    specs['0,2'] = { candidates: [6, 7, 8, 9] };
    specs['0,3'] = { candidates: [6, 7, 8, 9] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new CageSumConstraint('c14', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 14));
    cs.add(new CageSumConstraint('c15', [{ row: 0, col: 2 }, { row: 0, col: 3 }], 15));

    const step = CageRegionInteraction.apply(grid, cs);
    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('cage-region-interaction');

    // Cage 14: only {5,9} valid → eliminate 6,8
    expect(hasElimination(step!.eliminations, 0, 0, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 8)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 5)).toBe(false);
    expect(hasElimination(step!.eliminations, 0, 0, 9)).toBe(false);

    // Cage 15: only {7,8} valid → eliminate 6,9
    expect(hasElimination(step!.eliminations, 0, 2, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 2, 9)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 2, 7)).toBe(false);
    expect(hasElimination(step!.eliminations, 0, 2, 8)).toBe(false);
  });

  it('accounts for placed digits in region', () => {
    // Row 0: digit 9 placed at (0,8). Cage sum=14 at (0,0)+(0,1).
    // Without 9 in row: combos {5,9},{6,8}
    // With 9 placed: {5,9} invalid → only {6,8}
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['0,8'] = { value: 9 };
    specs['0,0'] = { candidates: [5, 6, 8] };
    specs['0,1'] = { candidates: [5, 6, 8] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new CageSumConstraint('c14', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 14));

    const step = CageRegionInteraction.apply(grid, cs);
    expect(step).not.toBeNull();

    // Only {6,8} valid → eliminate 5
    expect(hasElimination(step!.eliminations, 0, 0, 5)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 5)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 6)).toBe(false);
    expect(hasElimination(step!.eliminations, 0, 0, 8)).toBe(false);
  });

  it('returns null when all combos already compatible', () => {
    // Cage sum=3 at (0,0)+(0,1): only combo {1,2}
    // Cage sum=7 at (0,2)+(0,3): combos {3,4} — no conflict with {1,2}
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['0,0'] = { candidates: [1, 2] };
    specs['0,1'] = { candidates: [1, 2] };
    specs['0,2'] = { candidates: [3, 4] };
    specs['0,3'] = { candidates: [3, 4] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new CageSumConstraint('c3', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 3));
    cs.add(new CageSumConstraint('c7', [{ row: 0, col: 2 }, { row: 0, col: 3 }], 7));

    const step = CageRegionInteraction.apply(grid, cs);
    expect(step).toBeNull();
  });

  it('works with cages in same box', () => {
    // Box (0,0): cage sum=4 at (0,0)+(1,0), cage sum=16 at (0,1)+(1,1)
    // Cage 4 combos: {1,3}
    // Cage 16 combos: {7,9}
    // All compatible. But if cage 4 had {1,3},{2,2} — only {1,3} valid (unique).
    // Let's use: cage 3 at (0,0)+(1,0), cage 17 at (0,1)+(1,1)
    // Cage 3: {1,2}
    // Cage 17: {8,9}
    // Compatible, no eliminations. Boring.
    // Better: cage 11 at (0,0)+(1,0), cage 11 at (0,1)+(1,1)
    // Cage 11: {2,9},{3,8},{4,7},{5,6}
    // Two cages with same combos → must use non-overlapping combos
    // {2,9}+{3,8}: ok. {2,9}+{4,7}: ok. {2,9}+{5,6}: ok.
    // {3,8}+{2,9}: ok. {3,8}+{4,7}: ok. {3,8}+{5,6}: ok.
    // {4,7}+{5,6}: ok. etc.
    // All combos valid → no elimination. Still boring.
    // Use: cage 15 at (0,0)+(1,0), cage 15 at (0,1)+(1,1) with digit 9 placed elsewhere in box
    // 9 excluded → cage 15: {6,9}→invalid, {7,8}
    // Both cages = {7,8} → conflict (need 4 distinct digits from {7,8})
    // → dead end / contradiction
    // Let me try: cage 13 at (0,0)+(1,0), cage 15 at (0,1)+(1,1)
    // Cage 13: {4,9},{5,8},{6,7}
    // Cage 15: {6,9},{7,8}
    // Compatible: {4,9}+{6,... nah 6 ok, 7,8}: {4,9}+{7,8}: ok. {4,9}+{6,9}: 9 conflict.
    // {5,8}+{6,9}: ok. {5,8}+{7,8}: 8 conflict.
    // {6,7}+{6,9}: 6 conflict. {6,7}+{7,8}: 7 conflict.
    // Valid: {4,9}+{7,8}, {5,8}+{6,9}
    // Cage 13 valid digits: {4,5,8,9}. Cage 15 valid digits: {6,7,8,9}.
    // Cage 13: eliminate 6,7. Cage 15: no elim (all {6,7,8,9} valid).
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['0,0'] = { candidates: [4, 5, 6, 7, 8, 9] };
    specs['1,0'] = { candidates: [4, 5, 6, 7, 8, 9] };
    specs['0,1'] = { candidates: [6, 7, 8, 9] };
    specs['1,1'] = { candidates: [6, 7, 8, 9] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new CageSumConstraint('c13', [{ row: 0, col: 0 }, { row: 1, col: 0 }], 13));
    cs.add(new CageSumConstraint('c15', [{ row: 0, col: 1 }, { row: 1, col: 1 }], 15));

    const step = CageRegionInteraction.apply(grid, cs);
    expect(step).not.toBeNull();

    // Cage 13: valid {4,5,8,9} → eliminate 6,7
    expect(hasElimination(step!.eliminations, 0, 0, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 7)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 4)).toBe(false);
    expect(hasElimination(step!.eliminations, 0, 0, 9)).toBe(false);
  });
});

// ─── CageComboReduction ───────────────────────────────────────

describe('CageComboReduction', () => {
  it('digit forced into cage by region → combos without it removed', () => {
    // Row 0: cage sum=10 at (0,0)+(0,1). All other row 0 cells lack digit 1.
    // So digit 1 MUST be in the cage → only combos with 1: {1,9}.
    // Combos without digit 1 ({4,6},{2,8},{3,7}) removed → valid = {1,9}.
    // Cage cells lose everything except 1,9.
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [2, 3, 4, 5, 6, 7, 8, 9] }; // no 1
      }
    }
    specs['0,0'] = { candidates: [1, 3, 4, 6, 9] };
    specs['0,1'] = { candidates: [1, 4, 6, 8, 9] };
    // All other row 0 cells: no candidate 1 (default above)

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new CageSumConstraint('cR', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 10));

    const step = CageComboReduction.apply(grid, cs);
    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('cage-combo-reduction');

    // Only combo {1,9} survives. Valid digits = {1,9}.
    // Eliminate 3,4,6 from (0,0); eliminate 4,6,8 from (0,1)
    expect(hasElimination(step!.eliminations, 0, 0, 3)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 4)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 1)).toBe(false);
    expect(hasElimination(step!.eliminations, 0, 0, 9)).toBe(false);

    expect(hasElimination(step!.eliminations, 0, 1, 4)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 6)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 8)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 1)).toBe(false);
    expect(hasElimination(step!.eliminations, 0, 1, 9)).toBe(false);
  });

  it('placed digit in region excludes combos containing it', () => {
    // Box (0,0): digit 9 placed at (2,2). Cage sum=10 at (0,0)+(0,1).
    // Cage combos for sum=10: {1,9},{2,8},{3,7},{4,6}
    // 9 placed in box → exclude {1,9} → valid: {2,8},{3,7},{4,6}
    // Valid digits = {2,3,4,6,7,8}. Cage cells lose 1,9.
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['2,2'] = { value: 9 };
    specs['0,0'] = { candidates: [1, 2, 3, 4, 6, 7, 8, 9] };
    specs['0,1'] = { candidates: [1, 2, 3, 4, 6, 7, 8, 9] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new CageSumConstraint('cB', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 10));

    const step = CageComboReduction.apply(grid, cs);
    expect(step).not.toBeNull();

    // 1 and 9 eliminated (combo {1,9} excluded because 9 in box)
    expect(hasElimination(step!.eliminations, 0, 0, 1)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 9)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 2)).toBe(false);
    expect(hasElimination(step!.eliminations, 0, 0, 8)).toBe(false);
  });

  it('returns null when no reduction possible', () => {
    // Cage with all combos still valid, no external forcing
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['0,0'] = { candidates: [1, 2, 3, 4, 6, 7, 8, 9] };
    specs['0,1'] = { candidates: [1, 2, 3, 4, 6, 7, 8, 9] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new CageSumConstraint('cN', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 10));

    const step = CageComboReduction.apply(grid, cs);
    expect(step).toBeNull();
  });
});

// ─── CageForcing ──────────────────────────────────────────────

describe('CageForcing', () => {
  it('external cell blocks combo whose digits cover all its candidates', () => {
    // Cage sum=15, (0,0)+(0,1). Combos: {6,9},{7,8}.
    // External cell (1,0) has {7,8} and sees both cage cells (col 0 + box).
    // Combo {7,8} → (1,0) loses 7,8 → empty → combo excluded.
    // Only {6,9} survives → eliminate 7,8 from cage cells.
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['0,0'] = { candidates: [6, 7, 8, 9] };
    specs['0,1'] = { candidates: [6, 7, 8, 9] };
    specs['1,0'] = { candidates: [7, 8] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new CageSumConstraint('cF', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 15));

    const step = CageForcing.apply(grid, cs);
    expect(step).not.toBeNull();
    expect(step!.heuristicId).toBe('cage-forcing');

    // Only {6,9} valid → eliminate 7,8
    expect(hasElimination(step!.eliminations, 0, 0, 7)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 8)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 7)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 1, 8)).toBe(true);
    expect(hasElimination(step!.eliminations, 0, 0, 6)).toBe(false);
    expect(hasElimination(step!.eliminations, 0, 0, 9)).toBe(false);
  });

  it('does not block combo when external has candidates outside combo', () => {
    // Cage sum=15, (0,0)+(0,1). Combos: {6,9},{7,8}.
    // External cell (1,0) has {5,7,8}. Combo {7,8} → (1,0) loses 7,8 → {5} remains. OK!
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['0,0'] = { candidates: [6, 7, 8, 9] };
    specs['0,1'] = { candidates: [6, 7, 8, 9] };
    specs['1,0'] = { candidates: [5, 7, 8] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new CageSumConstraint('cF', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 15));

    expect(CageForcing.apply(grid, cs)).toBeNull();
  });

  it('returns null with only one combo', () => {
    // Cage sum=17, (0,0)+(0,1). Only combo: {8,9}. Nothing to eliminate.
    const specs: Record<string, { value?: number; candidates?: number[] }> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        specs[`${r},${c}`] = { candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
      }
    }
    specs['0,0'] = { candidates: [8, 9] };
    specs['0,1'] = { candidates: [8, 9] };

    const grid = buildGrid(9, specs);
    const cs = buildConstraints(grid);
    cs.add(new CageSumConstraint('cF', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 17));

    expect(CageForcing.apply(grid, cs)).toBeNull();
  });
});

