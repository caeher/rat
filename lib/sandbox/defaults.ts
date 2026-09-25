import type { SandboxRelation, SandboxSchemaSet, SandboxState } from './types';

function createId(): string {
  return `id_${Math.random().toString(36).slice(2, 11)}_${Date.now().toString(36)}`;
}

export function createEmptyRelation(name = 'Relation1'): SandboxRelation {
  return {
    id: createId(),
    name,
    attributes: [
      { name: 'id', type: 'number', nullable: false },
      { name: 'label', type: 'string', nullable: true },
    ],
    rows: [],
  };
}

export function createSampleSchemaSet(): SandboxSchemaSet {
  return {
    id: createId(),
    name: 'Lesson Schema',
    relations: [
      {
        id: createId(),
        name: 'Employees',
        attributes: [
          { name: 'emp_id', type: 'number', nullable: false },
          { name: 'name', type: 'string', nullable: false },
          { name: 'dept_id', type: 'number', nullable: true },
        ],
        rows: [
          { emp_id: 1, name: 'Alice', dept_id: 10 },
          { emp_id: 2, name: 'Bob', dept_id: 20 },
        ],
      },
      {
        id: createId(),
        name: 'Departments',
        attributes: [
          { name: 'dept_id', type: 'number', nullable: false },
          { name: 'dept_name', type: 'string', nullable: false },
        ],
        rows: [
          { dept_id: 10, dept_name: 'Engineering' },
          { dept_id: 20, dept_name: 'Marketing' },
        ],
      },
    ],
  };
}

export function createInitialSandboxState(): SandboxState {
  const sample = createSampleSchemaSet();
  return {
    schemaSets: [sample],
    activeSchemaSetId: sample.id,
    dataVersion: 1,
  };
}

export { createId };
