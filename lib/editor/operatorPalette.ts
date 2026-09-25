import { OPERATOR_CONTRACTS, type OperatorContractInfo } from '@/lib/engine/contract';
import type { OperatorType } from '@/lib/engine/types';

export interface OperatorPaletteItem {
  id: string;
  operatorType: OperatorType;
  symbol: string;
  name: string;
  classification: OperatorContractInfo['classification'];
  description: string;
  /** Syntax template with ${placeholder} markers for editable regions */
  template: string;
  /** Human-readable syntax without placeholders */
  syntaxExample: string;
}

const PALETTE_OPERATOR_TYPES: OperatorType[] = [
  'selection',
  'projection',
  'rename_relation',
  'rename_attributes',
  'cartesian_product',
  'natural_join',
  'theta_join',
  'left_join',
  'right_join',
  'full_join',
  'union',
  'intersection',
  'difference',
  'division',
];

const SYNTAX_TEMPLATES: Record<OperatorType, { template: string; example: string }> = {
  selection: {
    template: 'σ ${predicate} ( ${relation} )',
    example: 'σ salary > 50000 ( Employees )',
  },
  projection: {
    template: 'π ${attr1}, ${attr2} ( ${relation} )',
    example: 'π name, dept_id ( Employees )',
  },
  rename_relation: {
    template: 'ρ ${alias} ( ${relation} )',
    example: 'ρ E ( Employees )',
  },
  rename_attributes: {
    template: 'ρ[${oldAttr} -> ${newAttr}] ( ${relation} )',
    example: 'ρ[salary -> pay] ( Employees )',
  },
  rename: {
    template: 'ρ ${alias} ( ${relation} )',
    example: 'ρ S ( R )',
  },
  cartesian_product: {
    template: '${R} ⨯ ${S}',
    example: 'Employees ⨯ Departments',
  },
  natural_join: {
    template: '${R} ⋈ ${S}',
    example: 'Employees ⋈ Departments',
  },
  theta_join: {
    template: '${R} ⋈[${condition}] ${S}',
    example: 'Employees ⋈[Employees.dept_id = Departments.dept_id] Departments',
  },
  left_join: {
    template: '${R} ⟕[${condition}] ${S}',
    example: 'Employees ⟕[Employees.dept_id = Departments.dept_id] Departments',
  },
  right_join: {
    template: '${R} ⟖[${condition}] ${S}',
    example: 'Employees ⟖[Employees.dept_id = Departments.dept_id] Departments',
  },
  full_join: {
    template: '${R} ⟗[${condition}] ${S}',
    example: 'Employees ⟗[Employees.dept_id = Departments.dept_id] Departments',
  },
  union: {
    template: '${R} ∪ ${S}',
    example: 'R1 ∪ R2',
  },
  intersection: {
    template: '${R} ∩ ${S}',
    example: 'R1 ∩ R2',
  },
  difference: {
    template: '${R} − ${S}',
    example: 'R1 − R2',
  },
  division: {
    template: '${R} ÷ ${S}',
    example: 'Enrollment ÷ Courses',
  },
};

export function buildOperatorPaletteItems(): OperatorPaletteItem[] {
  return PALETTE_OPERATOR_TYPES.map((type) => {
    const contract = OPERATOR_CONTRACTS[type];
    const syntax = SYNTAX_TEMPLATES[type];
    return {
      id: type,
      operatorType: type,
      symbol: contract.symbol,
      name: contract.name,
      classification: contract.classification,
      description: contract.description,
      template: syntax.template,
      syntaxExample: syntax.example,
    };
  });
}

export const OPERATOR_PALETTE_ITEMS = buildOperatorPaletteItems();

export function getOperatorPaletteItem(id: string): OperatorPaletteItem | undefined {
  return OPERATOR_PALETTE_ITEMS.find((item) => item.id === id);
}
