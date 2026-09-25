import React from 'react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';

interface OperatorDoc {
  id: string;
  symbol: string;
  name: string;
  classification: 'Fundamental' | 'Derived';
  syntax: string;
  formalDefinition: string;
  description: string;
  sqlEquivalent: string;
  laws?: string[];
}

const OPERATORS: OperatorDoc[] = [
  {
    id: 'selection',
    symbol: 'σ',
    name: 'Selection (Restrict)',
    classification: 'Fundamental',
    syntax: 'σ <predicate> ( R )',
    formalDefinition: '{ t ∈ R | P(t) }',
    description:
      'Filters tuples from relation R that satisfy the specified boolean proposition P. The output relation retains the exact schema of R.',
    sqlEquivalent: 'SELECT * FROM R WHERE <predicate>;',
    laws: ['σ_P1(σ_P2(R)) ≡ σ_P1 ∧ P2(R) (Cascading)', 'σ_P1(σ_P2(R)) ≡ σ_P2(σ_P1(R)) (Commutativity)'],
  },
  {
    id: 'projection',
    symbol: 'π',
    name: 'Projection',
    classification: 'Fundamental',
    syntax: 'π <a1, a2, ..., an> ( R )',
    formalDefinition: '{ t[a1, a2, ..., an] | t ∈ R }',
    description:
      'Extracts the specified subset of attributes a1...an from relation R and eliminates duplicate tuples from the result.',
    sqlEquivalent: 'SELECT DISTINCT a1, a2 FROM R;',
    laws: ['π_A1(π_A2(R)) ≡ π_A1(R) where A1 ⊆ A2 (Cascading)'],
  },
  {
    id: 'rename',
    symbol: 'ρ',
    name: 'Rename',
    classification: 'Fundamental',
    syntax: 'ρ S(b1, ..., bn) ( R ) or ρ S ( R )',
    formalDefinition: 'Renames relation R to S and its attributes to b1...bn',
    description:
      'Provides an alias for an intermediate relation and optionally renames its attributes, resolving naming ambiguities during self-joins.',
    sqlEquivalent: 'SELECT a1 AS b1 FROM R AS S;',
  },
  {
    id: 'cartesian-product',
    symbol: '⨯',
    name: 'Cartesian Product (Cross Join)',
    classification: 'Fundamental',
    syntax: 'R ⨯ S',
    formalDefinition: '{ t ⌢ q | t ∈ R ∧ q ∈ S }',
    description:
      'Produces all possible tuple pairings between relations R and S. The result cardinality is |R| × |S|.',
    sqlEquivalent: 'SELECT * FROM R CROSS JOIN S;',
    laws: ['R ⨯ S ≡ S ⨯ R (Commutativity)', '(R ⨯ S) ⨯ T ≡ R ⨯ (S ⨯ T) (Associativity)'],
  },
  {
    id: 'natural-join',
    symbol: '⋈',
    name: 'Natural Join',
    classification: 'Derived',
    syntax: 'R ⋈ S',
    formalDefinition: 'π_Schema(R ∪ S) ( σ_{R.common = S.common} ( R ⨯ S ) )',
    description:
      'Equi-join over all attributes that share identical names between relations R and S, projecting out duplicate join attributes.',
    sqlEquivalent: 'SELECT * FROM R NATURAL JOIN S;',
    laws: ['R ⋈ S ≡ S ⋈ R (Commutativity)', '(R ⋈ S) ⋈ T ≡ R ⋈ (S ⋈ T) (Associativity)'],
  },
  {
    id: 'union',
    symbol: '∪',
    name: 'Union',
    classification: 'Fundamental',
    syntax: 'R ∪ S',
    formalDefinition: '{ t | t ∈ R ∨ t ∈ S }',
    description:
      'Combines tuples from relations R and S. R and S must be union-compatible (same degree and corresponding domain types).',
    sqlEquivalent: 'SELECT * FROM R UNION SELECT * FROM S;',
    laws: ['R ∪ S ≡ S ∪ R (Commutativity)', 'R ∪ (S ∪ T) ≡ (R ∪ S) ∪ T (Associativity)'],
  },
  {
    id: 'difference',
    symbol: '−',
    name: 'Set Difference',
    classification: 'Fundamental',
    syntax: 'R − S',
    formalDefinition: '{ t | t ∈ R ∧ t ∉ S }',
    description:
      'Yields all tuples belonging to relation R that do not appear in union-compatible relation S.',
    sqlEquivalent: 'SELECT * FROM R EXCEPT SELECT * FROM S;',
  },
  {
    id: 'intersection',
    symbol: '∩',
    name: 'Set Intersection',
    classification: 'Derived',
    syntax: 'R ∩ S',
    formalDefinition: 'R − (R − S)',
    description:
      'Yields tuples appearing in both union-compatible relations R and S.',
    sqlEquivalent: 'SELECT * FROM R INTERSECT SELECT * FROM S;',
    laws: ['R ∩ S ≡ S ∩ R (Commutativity)'],
  },
  {
    id: 'division',
    symbol: '÷',
    name: 'Relational Division',
    classification: 'Derived',
    syntax: 'R ÷ S',
    formalDefinition: 'π_{A - B}(R) − π_{A - B}((π_{A - B}(R) ⨯ S) − R)',
    description:
      'Suited for universal quantification ("for all" queries). Retains tuples from R(A) that match all combinations of S(B).',
    sqlEquivalent: 'SELECT DISTINCT A FROM R r WHERE NOT EXISTS (SELECT * FROM S s WHERE NOT EXISTS (...));',
  },
];

export default function ReferencePage() {
  return (
    <Layout
      title="RAT Reference — Relational Algebra Operators & Formal Syntax"
      description="Comprehensive operator documentation, algebraic laws, and SQL mappings for Relational Algebra."
    >
      <div className="space-y-10">
        {/* Page Title */}
        <div className="pb-4 border-b border-[var(--color-outline)]/60">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[12px] text-[var(--color-ember)] uppercase tracking-wider">
              Operator Documentation
            </span>
          </div>
          <h1 className="text-[26px] font-normal tracking-[-0.012em] text-[var(--color-text)]">
            Relational Algebra Operator Reference
          </h1>
          <p className="text-[15px] text-[var(--color-driftwood)] font-serif mt-1 max-w-2xl leading-relaxed">
            Mathematical definitions, operational semantics, algebraic equivalence laws, and ANSI SQL equivalents.
          </p>
        </div>

        {/* Operators List */}
        <div className="space-y-6">
          {OPERATORS.map((op) => (
            <Card key={op.id} id={op.id} className="scroll-mt-20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--color-outline)]/60">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-[4px] bg-[var(--color-elevated)] flex items-center justify-center font-mono text-[18px] font-bold text-[var(--color-text)]">
                    {op.symbol}
                  </span>
                  <div>
                    <h3 className="text-[18px] font-medium text-[var(--color-text)]">
                      {op.name}
                    </h3>
                    <div className="font-mono text-[12px] text-[var(--color-ash)]">
                      Syntax: {op.syntax}
                    </div>
                  </div>
                </div>

                <Tag variant={op.classification === 'Fundamental' ? 'forest' : 'amber'}>
                  {op.classification}
                </Tag>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
                <div className="md:col-span-7 space-y-3">
                  <p className="text-[14px] text-[var(--color-driftwood)] leading-relaxed">
                    {op.description}
                  </p>

                  <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-outline)]/60 rounded-[4px]">
                    <div className="text-[11px] font-mono text-[var(--color-ash)] mb-1">
                      Set-Theoretic Definition:
                    </div>
                    <div className="font-mono text-[13px] text-[var(--color-text)]">
                      {op.formalDefinition}
                    </div>
                  </div>

                  {op.laws && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-mono text-[var(--color-ash)]">
                        Equivalence Laws:
                      </div>
                      <ul className="list-disc list-inside text-[12px] font-mono text-[var(--color-driftwood)] space-y-0.5">
                        {op.laws.map((law, idx) => (
                          <li key={idx}>{law}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="md:col-span-5 flex flex-col justify-between p-3 bg-[var(--color-canvas)] border border-[var(--color-outline)]/60 rounded-[4px]">
                  <div>
                    <div className="text-[11px] font-mono text-[var(--color-ash)] mb-1.5">
                      SQL Equivalent:
                    </div>
                    <pre className="font-mono text-[12px] text-[var(--color-text)] whitespace-pre-wrap leading-relaxed bg-[var(--color-card)] p-2.5 rounded-[3px] border border-[var(--color-outline)]/40">
                      {op.sqlEquivalent}
                    </pre>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--color-outline)]/40 flex justify-end">
                    <Link href="/sandbox">
                      <Button variant="ghost" size="sm" className="text-[12px]">
                        Test in Sandbox →
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
