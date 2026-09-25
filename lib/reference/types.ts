import type { OperatorType } from '@/lib/engine/types';
import type { TupleValue } from '@/lib/engine/types';
import type { BundledPresetId } from '@/lib/sandbox/presets/types';

export type ReferenceClassification = 'Fundamental' | 'Derived' | 'Join variant';

export interface ReferenceTable {
  title: string;
  columns: string[];
  rows: Record<string, TupleValue>[];
}

export interface ReferenceCommonMistake {
  title: string;
  explanation: string;
}

export interface ReferenceOperatorDoc {
  id: string;
  operatorTypes: OperatorType[];
  symbol: string;
  name: string;
  classification: ReferenceClassification;
  unicodeSyntax: string;
  asciiSyntax: string;
  asciiAliases: string[];
  operandRequirements: string;
  outputSchema: string;
  semantics: string;
  whenToUse: string;
  commonMistakes: ReferenceCommonMistake[];
  workedExample: {
    caption: string;
    expression: string;
    inputTables: ReferenceTable[];
    outputTable: ReferenceTable;
  };
  executableExampleId?: string;
  searchKeywords?: string[];
}

export interface ReferenceConceptGuide {
  id: string;
  title: string;
  summary: string;
  sections: Array<{
    heading: string;
    body: string;
    table?: ReferenceTable;
  }>;
  relatedOperatorIds?: string[];
  searchKeywords?: string[];
}

export type ReferenceExamplePreset = BundledPresetId | 'lesson';

export interface ReferenceExecutableExample {
  id: string;
  title: string;
  description: string;
  operatorId: string;
  preset: ReferenceExamplePreset;
  expression: string;
  expectedColumns: string[];
  expectedTuples: Record<string, TupleValue>[];
}

export interface ReferenceSearchResult {
  kind: 'operator' | 'concept' | 'example';
  id: string;
  title: string;
  snippet: string;
  href: string;
}
