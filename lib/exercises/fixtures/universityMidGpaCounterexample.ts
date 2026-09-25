import type { ExerciseDataset } from '../types';

/** University data plus student 6 (GPA 3.75) to catch gpa > 3.7 vs gpa >= 3.8 mistakes. */
export const UNIVERSITY_MID_GPA_COUNTEREXAMPLE: ExerciseDataset = {
  kind: 'embedded',
  schemaSetName: 'University (hidden counterexample)',
  relations: [
    {
      name: 'Students',
      attributes: [
        { name: 'student_id', type: 'number', nullable: false },
        { name: 'name', type: 'string', nullable: false },
        { name: 'major_id', type: 'number', nullable: true },
        { name: 'gpa', type: 'number', nullable: false },
      ],
      rows: [
        { student_id: 1, name: 'Ada Lovelace', major_id: 10, gpa: 3.9 },
        { student_id: 2, name: 'Alan Turing', major_id: 10, gpa: 3.7 },
        { student_id: 3, name: 'Grace Hopper', major_id: 20, gpa: 3.8 },
        { student_id: 4, name: 'Nikola Tesla', major_id: null, gpa: 3.5 },
        { student_id: 5, name: 'Marie Curie', major_id: 30, gpa: 4.0 },
        { student_id: 6, name: 'Hypatia', major_id: 20, gpa: 3.75 },
      ],
    },
    {
      name: 'Majors',
      attributes: [
        { name: 'major_id', type: 'number', nullable: false },
        { name: 'major_name', type: 'string', nullable: false },
        { name: 'department', type: 'string', nullable: false },
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
        { name: 'course_id', type: 'number', nullable: false },
        { name: 'title', type: 'string', nullable: false },
        { name: 'major_id', type: 'number', nullable: false },
        { name: 'credits', type: 'number', nullable: false },
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
        { name: 'student_id', type: 'number', nullable: false },
        { name: 'course_id', type: 'number', nullable: false },
        { name: 'grade', type: 'string', nullable: true },
      ],
      rows: [
        { student_id: 1, course_id: 101, grade: 'A' },
        { student_id: 1, course_id: 102, grade: 'A' },
        { student_id: 2, course_id: 101, grade: 'B' },
        { student_id: 2, course_id: 102, grade: 'A' },
        { student_id: 3, course_id: 201, grade: 'A' },
        { student_id: 5, course_id: 301, grade: 'A' },
        { student_id: 4, course_id: 999, grade: null },
        { student_id: 6, course_id: 201, grade: 'B' },
      ],
    },
    {
      name: 'Professors',
      attributes: [
        { name: 'prof_id', type: 'number', nullable: false },
        { name: 'name', type: 'string', nullable: false },
        { name: 'major_id', type: 'number', nullable: true },
      ],
      rows: [
        { prof_id: 1, name: 'Dr. Codd', major_id: 10 },
        { prof_id: 2, name: 'Dr. Knuth', major_id: 10 },
        { prof_id: 3, name: 'Dr. Noether', major_id: 20 },
        { prof_id: 4, name: 'Dr. Feynman', major_id: null },
      ],
    },
  ],
};
