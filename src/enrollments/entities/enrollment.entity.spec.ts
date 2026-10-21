import { getMetadataArgsStorage } from 'typeorm';
import { Enrollment } from './enrollment.entity.js';
import { EnrollmentStatus } from '../../common/enums/enrollment-status.enum.js';


describe('Enrollment Entity', () => {
  const metadata = getMetadataArgsStorage();

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
  it('should default enrollment status to active', () => {
    const statusColumn = metadata.columns.find(
      (item) =>
        item.target === Enrollment &&
        item.propertyName === 'status',
    );

    expect(statusColumn?.options.type).toBe('enum');
    expect(statusColumn?.options.default).toBe(EnrollmentStatus.ACTIVE);
    expect(statusColumn?.options.enum).toBe(EnrollmentStatus);
  });

});