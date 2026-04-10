import { Region, CellPosition } from '../model/types';
import { Grid } from '../model/Grid';
import { Constraint } from '../constraint/types';
import { RegionConstraint } from '../constraint/RegionConstraint';
import { GridFactory } from '../model/GridFactory';
import { VariantDefinition } from './types';

const BOX_DIMS: Record<number, [number, number]> = {
  4: [2, 2], 9: [3, 3], 16: [4, 4],
};

export const DiagonalVariant: VariantDefinition = {
  name: 'diagonal',
  displayName: 'Diagonal (Sudoku X)',
  description: 'Standard Sudoku plus both main diagonals must contain unique digits',
  supportedSizes: [4, 9, 16],

  buildRegions(size: number): Region[] {
    const dims = BOX_DIMS[size];
    if (!dims) throw new Error(`Unsupported size: ${size}`);
    const regions = GridFactory.standardRegions(size, dims[0], dims[1]);

    const mainDiag: CellPosition[] = [];
    const antiDiag: CellPosition[] = [];
    for (let i = 0; i < size; i++) {
      mainDiag.push({ row: i, col: i });
      antiDiag.push({ row: i, col: size - 1 - i });
    }
    regions.push({ id: 'diagonal-main', type: 'diagonal', cells: mainDiag });
    regions.push({ id: 'diagonal-anti', type: 'diagonal', cells: antiDiag });
    return regions;
  },

  buildConstraints(grid: Grid): Constraint[] {
    return grid.getRegions().map(region => new RegionConstraint(region));
  },

};
