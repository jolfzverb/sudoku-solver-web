export type { VariantDefinition, VariantExtraData } from './types';
export { VariantRegistry } from './VariantRegistry';
export { ClassicVariant } from './ClassicVariant';
export { DiagonalVariant } from './DiagonalVariant';
export { KillerVariant } from './KillerVariant';
export { ThermoVariant } from './ThermoVariant';
export { ArrowVariant } from './ArrowVariant';
export { JigsawVariant } from './JigsawVariant';

import { VariantRegistry } from './VariantRegistry';
import { ClassicVariant } from './ClassicVariant';
import { DiagonalVariant } from './DiagonalVariant';
import { KillerVariant } from './KillerVariant';
import { ThermoVariant } from './ThermoVariant';
import { ArrowVariant } from './ArrowVariant';
import { JigsawVariant } from './JigsawVariant';

// Auto-register all built-in variants
VariantRegistry.register(ClassicVariant);
VariantRegistry.register(DiagonalVariant);
VariantRegistry.register(KillerVariant);
VariantRegistry.register(ThermoVariant);
VariantRegistry.register(ArrowVariant);
VariantRegistry.register(JigsawVariant);
