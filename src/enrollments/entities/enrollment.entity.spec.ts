
import { getMetadataArgsStorage } from 'typeorm';
import { Enrollment } from './enrollment.entity.js';
import { EnrollmentStatus } from '../../common/enums/enrollment-status.enum.js';

describe('Enrollment Entity', () => {
  const metadata = getMetadataArgsStorage();

  const getColumn = (propertyName: string) =>
    metadata.columns.find(
      (item) =>
        item.target === Enrollment &&
        item.propertyName === propertyName,
    );

  it('should use the enrollments table', () => {
    const table = metadata.tables.find(
      (item) => item.target === Enrollment,
    );

    expect(table?.name).toBe('enrollments');
  });

  it('should prevent duplicate student-course enrollments', () => {
    const uniqueConstraint = metadata.uniques.find(
      (item) =>
        item.target === Enrollment &&
        item.name === 'UQ_enrollments_student_course',
    );

    expect(uniqueConstraint?.columns).toEqual([
      'studentId',
      'courseId',
    ]);
  });

  it('should link each enrollment to a user', () => {
    const relation = metadata.relations.find(
      (item) =>
        item.target === Enrollment &&
        item.propertyName === 'student',
    );

    expect(relation?.relationType).toBe('many-to-one');
    expect(relation?.options.nullable).toBe(false);
    expect(relation?.options.onDelete).toBe('RESTRICT');
  });

  it('should default enrollment status to not started', () => {
    const statusColumn = getColumn('status');

    expect(statusColumn?.options.type).toBe('enum');
    expect(statusColumn?.options.default).toBe(
      EnrollmentStatus.NOT_STARTED,
    );
    expect(statusColumn?.options.enum).toBe(EnrollmentStatus);
  });

  it('should default completion percentage to zero', () => {
    const column = getColumn('completionPercentage');

    expect(column?.options.name).toBe('completion_percentage');
    expect(column?.options.type).toBe('numeric');
    expect(column?.options.precision).toBe(5);
    expect(column?.options.scale).toBe(2);
    expect(column?.options.default).toBe(0);
  });

  it('should default completed lessons to zero', () => {
    const column = getColumn('lessonsCompleted');

    expect(column?.options.name).toBe('lessons_completed');
    expect(column?.options.type).toBe('int');
    expect(column?.options.default).toBe(0);
  });

  it('should allow last activity date to be null', () => {
    const column = getColumn('lastActivityAt');

    expect(column?.options.name).toBe('last_activity_at');
    expect(column?.options.type).toBe('timestamptz');
    expect(column?.options.nullable).toBe(true);
  });

  it('should allow completion date to be null', () => {
    const column = getColumn('completedAt');

    expect(column?.options.name).toBe('completed_at');
    expect(column?.options.type).toBe('timestamptz');
    expect(column?.options.nullable).toBe(true);
  });

  it('should allow cancellation date to be null', () => {
    const column = getColumn('cancelledAt');

    expect(column?.options.name).toBe('cancelled_at');
    expect(column?.options.type).toBe('timestamptz');
    expect(column?.options.nullable).toBe(true);
  });

  it('should use timestamptz for enrollment dates', () => {
    const enrolledAt = getColumn('enrolledAt');
    const updatedAt = getColumn('updatedAt');

    expect(enrolledAt?.options.type).toBe('timestamptz');
    expect(updatedAt?.options.type).toBe('timestamptz');
  });
});
