import { Region, CellPosition } from '../model/types';
import { Grid } from '../model/Grid';
import { Constraint } from '../constraint/types';
import { RegionConstraint } from '../constraint/RegionConstraint';
import { ThermometerConstraint } from '../constraint/ThermometerConstraint';
import { GridFactory } from '../model/GridFactory';
import { VariantDefinition, VariantExtraData } from './types';

const BOX_DIMS: Record<number, [number, number]> = { 9: [3, 3] };

export const ThermoVariant: VariantDefinition = {
  name: 'thermo',
  displayName: 'Thermometer',
  description: 'Standard Sudoku with thermometer constraints (digits increase along path)',
  supportedSizes: [9],

  buildRegions(size: number): Region[] {
    const dims = BOX_DIMS[size];
    if (!dims) throw new Error(`Unsupported size: ${size}`);
    return GridFactory.standardRegions(size, dims[0], dims[1]);
  },

  buildConstraints(grid: Grid, extraData?: VariantExtraData): Constraint[] {
    const constraints: Constraint[] = grid.getRegions().map(r => new RegionConstraint(r));
    const thermos = (extraData?.thermos as Array<Array<{ row: number; col: number }>> | undefined) ?? [];
    for (let i = 0; i < thermos.length; i++) {
      const path: CellPosition[] = thermos[i].map(c => ({ row: c.row, col: c.col }));
      constraints.push(new ThermometerConstraint(`thermo-${i}`, path));
    }
    return constraints;
  },

};
