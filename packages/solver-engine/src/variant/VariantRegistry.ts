import { VariantDefinition } from './types';

const registry = new Map<string, VariantDefinition>();

export const VariantRegistry = {
  register(variant: VariantDefinition): void {
    registry.set(variant.name, variant);
  },
  get(name: string): VariantDefinition | undefined {
    return registry.get(name);
  },
  getAll(): VariantDefinition[] {
    return Array.from(registry.values());
  },
  names(): string[] {
    return Array.from(registry.keys());
  },
};
