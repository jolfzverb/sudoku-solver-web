/**
 * Tracks the set of valid digit combinations for a killer cage.
 * Provides filtering methods for heuristics to narrow down possibilities.
 */
export class CageComboSet {
  private combos: number[][];

  constructor(combos: number[][]) {
    this.combos = combos;
  }

  /** Enumerate all subsets of `count` unique digits from `available` summing to `target`. */
  static compute(available: number[], count: number, target: number): CageComboSet {
    const combos: number[][] = [];
    enumerate(available, 0, count, target, [], combos);
    return new CageComboSet(combos);
  }

  /** Keep only combos containing digit d. Returns true if any combo was removed. */
  requireDigit(d: number): boolean {
    const before = this.combos.length;
    this.combos = this.combos.filter(c => c.includes(d));
    return this.combos.length < before;
  }

  /** Remove combos containing digit d. Returns true if any combo was removed. */
  excludeDigit(d: number): boolean {
    const before = this.combos.length;
    this.combos = this.combos.filter(c => !c.includes(d));
    return this.combos.length < before;
  }

  /** Keep only combos containing ALL given digits. */
  requireAll(digits: number[]): boolean {
    const before = this.combos.length;
    this.combos = this.combos.filter(c => digits.every(d => c.includes(d)));
    return this.combos.length < before;
  }

  /** Union of all digits across remaining combos. */
  getValidDigits(): Set<number> {
    const result = new Set<number>();
    for (const combo of this.combos) {
      for (const d of combo) result.add(d);
    }
    return result;
  }

  getCombos(): ReadonlyArray<ReadonlyArray<number>> {
    return this.combos;
  }

  size(): number {
    return this.combos.length;
  }

  isEmpty(): boolean {
    return this.combos.length === 0;
  }

  clone(): CageComboSet {
    return new CageComboSet(this.combos.map(c => [...c]));
  }
}

function enumerate(
  available: number[],
  start: number,
  count: number,
  target: number,
  current: number[],
  results: number[][],
): void {
  if (count === 0) {
    if (target === 0) results.push([...current]);
    return;
  }
  if (target <= 0) return;

  for (let i = start; i <= available.length - count; i++) {
    const d = available[i];
    if (d > target) break;

    if (count === 1) {
      if (d === target) {
        current.push(d);
        results.push([...current]);
        current.pop();
      }
      continue;
    }

    let minRest = 0;
    for (let j = 0; j < count - 1; j++) minRest += available[i + 1 + j];
    if (d + minRest > target) break;

    let maxRest = 0;
    for (let j = 0; j < count - 1; j++) maxRest += available[available.length - 1 - j];
    if (d + maxRest < target) continue;

    current.push(d);
    enumerate(available, i + 1, count - 1, target - d, current, results);
    current.pop();
  }
}
