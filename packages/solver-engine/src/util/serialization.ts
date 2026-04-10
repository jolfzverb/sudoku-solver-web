import { CellPosition, PuzzleData } from '../model/types';

export function parse81(input: string): PuzzleData {
  const clean = input.replace(/[^0-9.]/g, '');
  if (clean.length !== 81) throw new Error(`Expected 81 characters, got ${clean.length}`);
  const givens: Array<{ position: CellPosition; digit: number }> = [];
  for (let i = 0; i < 81; i++) {
    const ch = clean[i];
    if (ch !== '0' && ch !== '.') {
      const digit = parseInt(ch, 10);
      givens.push({ position: { row: Math.floor(i / 9), col: i % 9 }, digit });
    }
  }
  return { size: 9, variant: 'classic', givens };
}

export function gridToString81(cells: ReadonlyArray<{ value: number | null }>): string {
  return cells.map(c => c.value?.toString() ?? '.').join('');
}
