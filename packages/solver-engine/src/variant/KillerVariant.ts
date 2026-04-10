import { Region, CellPosition } from '../model/types';
import { Grid } from '../model/Grid';
import { Constraint } from '../constraint/types';
import { RegionConstraint } from '../constraint/RegionConstraint';
import { CageSumConstraint } from '../constraint/CageSumConstraint';
import { GridFactory } from '../model/GridFactory';
import { VariantDefinition, VariantExtraData } from './types';

interface CageData {
  cells: Array<{ row: number; col: number }>;
  sum: number;
}

const BOX_DIMS: Record<number, [number, number]> = { 9: [3, 3] };

export const KillerVariant: VariantDefinition = {
  name: 'killer',
  displayName: 'Killer',
  description: 'Standard Sudoku with cage sum constraints',
  supportedSizes: [9],

  buildRegions(size: number): Region[] {
    const dims = BOX_DIMS[size];
    if (!dims) throw new Error(`Unsupported size: ${size}`);
    return GridFactory.standardRegions(size, dims[0], dims[1]);
  },

  buildConstraints(grid: Grid, extraData?: VariantExtraData): Constraint[] {
    const constraints: Constraint[] = grid.getRegions().map(r => new RegionConstraint(r));
    const cages = (extraData?.cages as CageData[] | undefined) ?? [];
    for (let i = 0; i < cages.length; i++) {
      const cage = cages[i];
      const cells: CellPosition[] = cage.cells.map(c => ({ row: c.row, col: c.col }));
      constraints.push(new CageSumConstraint(`cage-${i}`, cells, cage.sum));
    }
    return constraints;
  },

};
