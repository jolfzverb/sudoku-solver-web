# Data Model Reference

All types live in `packages/solver-engine/src/`.

## CellPosition

```ts
interface CellPosition {
  readonly row: number; // 0-based
  readonly col: number; // 0-based
}
```

Simple coordinate pair. Immutable. Used everywhere to reference a cell.

## CandidateSet

```ts
// util/CandidateSet.ts
interface CandidateSet {
  has(digit: number): boolean;
  add(digit: number): void;
  remove(digit: number): void;
  count(): number;
  values(): number[];      // sorted ascending
  clone(): CandidateSet;
  equals(other: CandidateSet): boolean;
  intersect(other: CandidateSet): CandidateSet;
  union(other: CandidateSet): CandidateSet;
  subtract(other: CandidateSet): CandidateSet;
  isEmpty(): boolean;
}
```

**Implementation:** Backed by a single integer bitfield. Bit `i` (1-indexed) represents digit `i`. Supports grids up to 16x16 (bits 1..16 fit in a 32-bit int).

**Invariants:**
- Digits are always in range `[1, grid.spec.size]`.
- `values()` always returns sorted ascending.
- All set operations return new instances (except `add`/`remove` which mutate in place).

**Why bitfield?** Candidate operations are the hottest path in the solver. Bitwise AND/OR/XOR give O(1) intersection/union/difference, enabling fast heuristic scanning.

## Cell

```ts
// model/Cell.ts
interface Cell {
  readonly position: CellPosition;
  value: number | null;         // null = unsolved
  candidates: CandidateSet;     // mutable; managed by solver
  readonly isGiven: boolean;    // true = part of original puzzle, cannot be cleared
}
```

**Invariants:**
- If `value !== null`, `candidates` is empty (solved cell has no candidates).
- If `isGiven`, `value` is always set and cannot be changed by the solver.
- `candidates` is initialized to all digits `[1..size]` for unsolved cells, then pruned by constraint propagation.

## Region

```ts
// model/Region.ts
type RegionType = 'row' | 'column' | 'box' | 'diagonal' | 'cage' | 'thermo' | 'arrow' | 'custom';

interface Region {
  readonly id: string;          // unique, e.g. "row-0", "box-2", "cage-killer-5"
  readonly cells: ReadonlyArray<CellPosition>;
  readonly type: RegionType;
}
```

A region is an ordered group of cells. Regions define the topology of the puzzle:
- **Standard:** rows, columns, boxes (3x3 or irregular).
- **Variant:** diagonals, killer cages, thermometers, arrows, jigsaw regions.

**Invariants:**
- `id` is unique within a grid.
- `cells` is non-empty.
- For thermometer regions, cell order matters (values must increase along the path).

## GridSpec

```ts
// model/Grid.ts
interface GridSpec {
  readonly size: number;        // 4, 9, or 16
  readonly boxWidth: number;    // e.g. 3 for 9x9, 4 for 16x16, 0 for pure jigsaw
  readonly boxHeight: number;   // e.g. 3 for 9x9, 4 for 16x16, 0 for pure jigsaw
  readonly regions: ReadonlyArray<Region>;
}
```

Describes the puzzle's geometry. `boxWidth` and `boxHeight` define standard rectangular boxes. For jigsaw puzzles, `boxWidth = boxHeight = 0` and irregular regions are supplied in `regions`.

## Grid

```ts
// model/Grid.ts
interface Grid {
  readonly spec: GridSpec;
  readonly cells: ReadonlyArray<ReadonlyArray<Cell>>; // [row][col]

  getCell(pos: CellPosition): Cell;
  getRegionsFor(pos: CellPosition): ReadonlyArray<Region>;
  getCellsInRegion(region: Region): ReadonlyArray<Cell>;

  snapshot(): GridSnapshot;
  restore(snapshot: GridSnapshot): void;
}

type GridSnapshot = unknown; // opaque serializable blob
```

**`snapshot()` / `restore()`:** Used for undo/redo and solver backtracking. `snapshot()` creates an immutable deep copy of all cell values and candidates. `restore()` overwrites the current state from a snapshot.

**Invariants:**
- `cells` is always `size x size`.
- `getRegionsFor(pos)` returns all regions that contain the given cell (rows, columns, boxes, and any variant-specific regions).

## GridFactory

```ts
// model/GridFactory.ts
function createGrid(spec: GridSpec, givens?: Map<CellPosition, number>): Grid;
```

Creates a grid from a spec. If `givens` is provided, those cells are marked as `isGiven = true` with their value set, and initial candidate elimination is performed.

## GridSnapshot

Opaque type. Internally a serialized representation of all cell values and candidate sets. The consumer should not depend on its structure — only use it via `Grid.snapshot()` and `Grid.restore()`.

## Serialization

Puzzles can be imported/exported as:

1. **String format:** 81-character string for classic 9x9 (`0` or `.` for empty), e.g. `"530070000600195000098000060800060003400803001700020006060000280000419005000080079"`.

2. **JSON format:** Full puzzle state including variant type, extra data (cages, thermos, etc.), and givens. Used for non-standard variants.

```ts
interface PuzzleData {
  size: number;
  variant: string;             // variant name
  givens: Array<{ row: number; col: number; value: number }>;
  extraData?: VariantExtraData; // cages, thermos, arrows, jigsaw regions
}
```
