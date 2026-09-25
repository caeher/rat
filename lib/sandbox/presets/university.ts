import type { BundledPreset } from './types';
import { deepCloneRelations, relationFromTemplate } from './clone';

const relationsTemplate = [
  {
    name: 'Students',
    attributes: [
      { name: 'student_id', type: 'number' as const, nullable: false },
      { name: 'name', type: 'string' as const, nullable: false },
      { name: 'major_id', type: 'number' as const, nullable: true },
      { name: 'gpa', type: 'number' as const, nullable: false },
    ],
    rows: [
      { student_id: 1, name: 'Ada Lovelace', major_id: 10, gpa: 3.9 },
      { student_id: 2, name: 'Alan Turing', major_id: 10, gpa: 3.7 },
      { student_id: 3, name: 'Grace Hopper', major_id: 20, gpa: 3.8 },
      { student_id: 4, name: 'Nikola Tesla', major_id: null, gpa: 3.5 },
      { student_id: 5, name: 'Marie Curie', major_id: 30, gpa: 4.0 },
    ],
  },
  {
    name: 'Majors',
    attributes: [
      { name: 'major_id', type: 'number' as const, nullable: false },
      { name: 'major_name', type: 'string' as const, nullable: false },
      { name: 'department', type: 'string' as const, nullable: false },
    ],
    rows: [
      { major_id: 10, major_name: 'Computer Science', department: 'Engineering' },
      { major_id: 20, major_name: 'Mathematics', department: 'Sciences' },
      { major_id: 30, major_name: 'Physics', department: 'Sciences' },
    ],
  },
  {
    name: 'Courses',
    attributes: [
      { name: 'course_id', type: 'number' as const, nullable: false },
      { name: 'title', type: 'string' as const, nullable: false },
      { name: 'major_id', type: 'number' as const, nullable: false },
      { name: 'credits', type: 'number' as const, nullable: false },
    ],
    rows: [
      { course_id: 101, title: 'Relational Algebra', major_id: 10, credits: 3 },
      { course_id: 102, title: 'Database Systems', major_id: 10, credits: 4 },
      { course_id: 201, title: 'Linear Algebra', major_id: 20, credits: 3 },
      { course_id: 301, title: 'Quantum Mechanics', major_id: 30, credits: 4 },
      { course_id: 999, title: 'Independent Study', major_id: 10, credits: 1 },
    ],
  },
  {
    name: 'Enrolled',
    attributes: [
      { name: 'student_id', type: 'number' as const, nullable: false },
      { name: 'course_id', type: 'number' as const, nullable: false },
      { name: 'grade', type: 'string' as const, nullable: true },
    ],
    rows: [
      { student_id: 1, course_id: 101, grade: 'A' },
      { student_id: 1, course_id: 102, grade: 'A' },
      { student_id: 2, course_id: 101, grade: 'B' },
      { student_id: 2, course_id: 102, grade: 'A' },
      { student_id: 3, course_id: 201, grade: 'A' },
      { student_id: 5, course_id: 301, grade: 'A' },
      { student_id: 4, course_id: 999, grade: null },
    ],
  },
  {
    name: 'Professors',
    attributes: [
      { name: 'prof_id', type: 'number' as const, nullable: false },
      { name: 'name', type: 'string' as const, nullable: false },
      { name: 'major_id', type: 'number' as const, nullable: true },
    ],
    rows: [
      { prof_id: 1, name: 'Dr. Codd', major_id: 10 },
      { prof_id: 2, name: 'Dr. Knuth', major_id: 10 },
      { prof_id: 3, name: 'Dr. Noether', major_id: 20 },
      { prof_id: 4, name: 'Dr. Feynman', major_id: null },
    ],
  },
];

export const universityPreset: BundledPreset = {
  id: 'university',
  displayName: 'University',
  guide: {
    summary:
      'Campus schema with students, majors, courses, enrollments, and faculty. Designed for joins, outer joins, set operations, and division drills.',
    relationships: [
      'Students.major_id → Majors.major_id (natural join; student 4 has no matching major for unmatched rows).',
      'Enrolled links Students and Courses (student_id, course_id).',
      'Courses.major_id → Majors.major_id; Professors.major_id → Majors.major_id.',
      'Course 999 has only one enrollment — useful for difference and anti-join patterns.',
    ],
    starterQuestions: [
      {
        title: 'Honors roll in CS',
        expressionHint: 'π name, gpa ( σ gpa ≥ 3.8 ( Students ⋈ σ major_name = "Computer Science" ( Majors ) ) )',
        concept: 'Selection + natural join',
      },
      {
        title: 'Students without a declared major',
        expressionHint: 'π student_id, name ( σ major_id = NULL ( Students ) )',
        concept: 'Null / unmatched rows',
      },
      {
        title: 'Duplicate names after projection',
        expressionHint: 'π name ( Students )',
        concept: 'Duplicate tuples in projection',
      },
      {
        title: 'Students enrolled in both RA and DB',
        expressionHint: 'π student_id ( σ course_id = 101 ( Enrolled ) ) ∩ π student_id ( σ course_id = 102 ( Enrolled ) )',
        concept: 'Intersection',
      },
      {
        title: 'Majors offering all 3-credit courses',
        expressionHint: 'π major_id, title ( Courses ) ÷ π credits ( σ credits = 3 ( Courses ) )',
        concept: 'Division (explore with simplified divisors)',
      },
    ],
  },
  buildSchemaSet: () => ({
    name: 'University',
    presetId: 'university',
    relations: deepCloneRelations(relationsTemplate.map(relationFromTemplate)),
  }),
};
