import React, { useState } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { EmptyState } from '@/components/ui/EmptyState';
import { ArrowRight, CheckCircle2, Circle, Filter } from 'lucide-react';

interface Exercise {
  id: string;
  title: string;
  category: 'Selection & Projection' | 'Joins' | 'Set Operations' | 'Division';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  schemas: string[];
  solved?: boolean;
}

const EXERCISES: Exercise[] = [
  {
    id: 'ex-01',
    title: 'High-Earning Engineers',
    category: 'Selection & Projection',
    difficulty: 'Beginner',
    description:
      'Find the names and salaries of all employees working in the Engineering department whose salary is greater than $80,000.',
    schemas: ['Employees(id, name, dept_id, salary)', 'Departments(dept_id, dept_name)'],
    solved: true,
  },
  {
    id: 'ex-02',
    title: 'Inter-department Natural Join',
    category: 'Joins',
    difficulty: 'Intermediate',
    description:
      'Retrieve a list of employee names and their respective office locations by performing a natural join between Employees, Departments, and Locations.',
    schemas: ['Employees(id, name, dept_id)', 'Departments(dept_id, loc_id)', 'Locations(loc_id, city)'],
  },
  {
    id: 'ex-03',
    title: 'Universal Project Participants',
    category: 'Division',
    difficulty: 'Advanced',
    description:
      'Find employees who have contributed to all projects managed by the Research division using relational division (÷).',
    schemas: ['EmpProject(emp_id, proj_id)', 'Projects(proj_id, division)'],
  },
  {
    id: 'ex-04',
    title: 'Cross-Disciplinary Course Enrollees',
    category: 'Set Operations',
    difficulty: 'Intermediate',
    description:
      'Identify students who are enrolled in Computer Science courses but are not enrolled in any Mathematics courses.',
    schemas: ['Enrollments(student_id, course_id)', 'Courses(course_id, subject)'],
  },
];

export default function ExercisesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Selection & Projection', 'Joins', 'Set Operations', 'Division'];

  const filteredExercises =
    selectedCategory === 'All'
      ? EXERCISES
      : EXERCISES.filter((ex) => ex.category === selectedCategory);

  return (
    <Layout
      title="RAT Exercises — Relational Algebra Practice Problems"
      description="Practice problem sets and interactive challenges to master Relational Algebra."
    >
      <div className="space-y-8">
        {/* Page Header */}
        <div className="pb-4 border-b border-[var(--color-outline)]/60">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[12px] text-[var(--color-ember)] uppercase tracking-wider">
              Practice Catalogue
            </span>
          </div>
          <h1 className="text-[26px] font-normal tracking-[-0.012em] text-[var(--color-text)]">
            Relational Algebra Exercises
          </h1>
          <p className="text-[15px] text-[var(--color-driftwood)] font-serif mt-1 max-w-2xl leading-relaxed">
            Sharpen your query optimization skills by translating natural language requirements into mathematically sound relational expressions.
          </p>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2" role="group" aria-label="Exercise category filters">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-[4px] text-[13px] font-mono transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[var(--color-ink)] text-[var(--color-canvas)] font-medium'
                  : 'bg-[var(--color-card)] text-[var(--color-text)] hover:bg-[var(--color-elevated)] border border-[var(--color-outline)]/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Exercise Cards Grid */}
        {filteredExercises.length === 0 ? (
          <EmptyState
            icon={<Filter className="w-8 h-8 text-[var(--color-ash)] opacity-60" />}
            title="No exercises found in this category"
            description="Try selecting a different filter category from above."
            action={
              <Button variant="secondary" size="sm" onClick={() => setSelectedCategory('All')}>
                View All Exercises
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredExercises.map((exercise) => (
              <Card key={exercise.id} className="flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {exercise.solved ? (
                        <CheckCircle2 className="w-4 h-4 text-[var(--color-forest)]" />
                      ) : (
                        <Circle className="w-4 h-4 text-[var(--color-outline)]" />
                      )}
                      <span className="font-mono text-[11px] text-[var(--color-ash)]">
                        {exercise.id}
                      </span>
                    </div>
                    <Tag
                      variant={
                        exercise.difficulty === 'Beginner'
                          ? 'forest'
                          : exercise.difficulty === 'Intermediate'
                          ? 'amber'
                          : 'ember'
                      }
                    >
                      {exercise.difficulty}
                    </Tag>
                  </div>

                  <h3 className="text-[18px] font-normal text-[var(--color-text)] mb-2">
                    {exercise.title}
                  </h3>

                  <p className="text-[14px] text-[var(--color-driftwood)] leading-relaxed mb-4">
                    {exercise.description}
                  </p>

                  <div className="p-2.5 bg-[var(--color-canvas)] border border-[var(--color-outline)]/60 rounded-[4px] space-y-1">
                    <div className="text-[11px] font-mono text-[var(--color-ash)]">
                      Available Schemas:
                    </div>
                    {exercise.schemas.map((schema) => (
                      <div key={schema} className="text-[12px] font-mono text-[var(--color-text)]">
                        {schema}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[var(--color-outline)]/40">
                  <span className="text-[12px] font-mono text-[var(--color-ash)]">
                    {exercise.category}
                  </span>
                  <Link href="/sandbox" className="w-full sm:w-auto">
                    <Button variant="secondary" size="sm" className="w-full sm:w-auto justify-center gap-1.5">
                      Solve in Sandbox
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
