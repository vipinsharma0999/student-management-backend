import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';

@Injectable()
export class StudentsService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  // ── CREATE — calls sp_create_student ────────────────────
  async create(dto: CreateStudentDto) {
    // fn_email_exists() checks uniqueness
    const { rows: emailCheck } = await this.pool.query(
      'SELECT fn_email_exists($1) AS exists',
      [dto.email.toLowerCase()],
    );
    if (emailCheck[0].exists) throw new ConflictException('Email already registered');

    // fn_student_count() gives current count for ID generation
    const { rows: countRows } = await this.pool.query('SELECT fn_student_count() AS count');
    const prefix     = dto.course.slice(0, 2).toUpperCase();
    const year       = new Date().getFullYear();
    const num        = String(Number(countRows[0].count) + 1).padStart(4, '0');
    const student_id = `${prefix}${year}${num}`;

    // sp_create_student() does the INSERT
    await this.pool.query(
      `CALL sp_create_student($1,$2,$3,$4,$5,$6::DATE,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        student_id,
        dto.first_name, dto.last_name, dto.email.toLowerCase(), dto.phone ?? null,
        dto.date_of_birth, dto.gender, dto.course, dto.semester, dto.gpa ?? 0,
        dto.address ?? null, dto.city ?? null, dto.state ?? null,
        dto.country ?? 'India', dto.pincode ?? null,
      ],
    );

    // Return the newly created student via fn_email_exists trick — just fetch by email
    const { rows } = await this.pool.query(
      'SELECT * FROM students WHERE email = $1',
      [dto.email.toLowerCase()],
    );
    return rows[0];
  }

  // ── READ ALL — calls fn_find_all_students() ──────────────
  async findAll(query: any) {
    const { search, course, status, semester, page = 1, limit = 10 } = query;
    const offset = (Number(page) - 1) * Number(limit);

    const { rows } = await this.pool.query(
      `SELECT * FROM fn_find_all_students($1, $2, $3, $4, $5, $6)`,
      [
        search   ?? null,
        course   ?? null,
        status   ?? null,
        semester ? Number(semester) : null,
        Number(limit),
        offset,
      ],
    );

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    // strip total_count from each row before returning
    const data  = rows.map(({ total_count, ...rest }) => rest);

    return {
      data,
      meta: {
        total,
        page:       Number(page),
        limit:      Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
        hasNext:    Number(page) * Number(limit) < total,
        hasPrev:    Number(page) > 1,
      },
    };
  }

  // ── READ ONE — calls fn_get_student() ───────────────────
  async findOne(id: string) {
    const { rows } = await this.pool.query(
      'SELECT * FROM fn_get_student($1::UUID)',
      [id],
    );
    if (!rows.length) throw new NotFoundException('Student not found');
    return rows[0];
  }

  // ── DASHBOARD — calls fn_dashboard_overview(), fn_course_stats(), fn_gpa_distribution()
  async getDashboard() {
    const [overview, courseStats, gpaRows] = await Promise.all([
      this.pool.query('SELECT * FROM fn_dashboard_overview()'),
      this.pool.query('SELECT * FROM fn_course_stats()'),
      this.pool.query('SELECT * FROM fn_gpa_distribution()'),
    ]);

    return {
      overview:        overview.rows[0],
      courseStats:     courseStats.rows,
      gpaDistribution: gpaRows.rows,
    };
  }

  // ── UPDATE — calls sp_update_student() ──────────────────
  async update(id: string, dto: UpdateStudentDto) {
    await this.findOne(id); // throws 404 if not found

    await this.pool.query(
      `CALL sp_update_student(
         $1::UUID, $2, $3, $4, $5, $6::DATE,
         $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
       )`,
      [
        id,
        dto.first_name    ?? null,
        dto.last_name     ?? null,
        dto.email         ?? null,
        dto.phone         ?? null,
        dto.date_of_birth ?? null,
        dto.gender        ?? null,
        dto.course        ?? null,
        dto.semester      ?? null,
        dto.gpa           ?? null,
        dto.status        ?? null,
        dto.address       ?? null,
        dto.city          ?? null,
        dto.state         ?? null,
        dto.country       ?? null,
        dto.pincode       ?? null,
      ],
    );

    return this.findOne(id); // return updated record via fn_get_student
  }

  // ── DELETE — calls sp_delete_student() ──────────────────
  async remove(id: string) {
    await this.findOne(id); // throws 404 if not found
    await this.pool.query('CALL sp_delete_student($1::UUID)', [id]);
    return { message: 'Student deleted successfully', id };
  }
}
