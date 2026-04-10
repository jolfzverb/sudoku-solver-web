import { Region } from '../model/types';
import { Grid } from '../model/Grid';
import { Constraint } from '../constraint/types';
import { RegionConstraint } from '../constraint/RegionConstraint';
import { GridFactory } from '../model/GridFactory';
import { VariantDefinition } from './types';

const BOX_DIMS: Record<number, [number, number]> = {
  4: [2, 2], 6: [3, 2], 9: [3, 3], 16: [4, 4],
};

export const ClassicVariant: VariantDefinition = {
  name: 'classic',
  displayName: 'Classic',
  description: 'Standard Sudoku with row, column, and box constraints',
  supportedSizes: [4, 6, 9, 16],

  buildRegions(size: number): Region[] {
    const dims = BOX_DIMS[size];
    if (!dims) throw new Error(`Unsupported size: ${size}`);
    return GridFactory.standardRegions(size, dims[0], dims[1]);
  },

  buildConstraints(grid: Grid): Constraint[] {
    return grid.getRegions().map(region => new RegionConstraint(region));
  },

};
