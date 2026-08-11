import { Router, type IRouter } from "express";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import { db, studentsTable, teachersTable, attendanceTable, activityTable } from "@workspace/db";
import {
  CreateStudentBody,
  CreateStudentResponse,
  CreateTeacherBody,
  CreateTeacherResponse,
  DeleteStudentParams,
  GetActivityQueryParams,
  GetActivityResponse,
  GetDashboardSummaryResponse,
  ListAttendanceQueryParams,
  ListAttendanceResponse,
  ListStudentsQueryParams,
  ListStudentsResponse,
  ListTeachersResponse,
  RecordAttendanceBody,
  RecordAttendanceResponse,
  UpdateStudentBody,
  UpdateStudentParams,
  UpdateStudentResponse,
  UpdateTeacherBody,
  UpdateTeacherParams,
  UpdateTeacherResponse,
} from "@workspace/api-zod";
import { ensureMaqraaSeed } from "../lib/maqraa-seed";

const router: IRouter = Router();

const studentWithFallback = (student: typeof studentsTable.$inferSelect) => ({
  ...student,
  phone: student.phone ?? null,
});

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  await ensureMaqraaSeed();
  const [studentCounts] = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${studentsTable.status} = 'active')`,
      attendance: sql<number>`coalesce(round(avg(${studentsTable.attendanceRate})), 0)`,
      progress: sql<number>`coalesce(round(avg(${studentsTable.progress})), 0)`,
    })
    .from(studentsTable);
  const [teacherCounts] = await db.select({ total: count() }).from(teachersTable);

  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const weeklyAttendance = days.map((day, index) => ({
    day,
    rate: [88, 92, 86, 95, 90, 82, 94][index] ?? 88,
  }));
  const levelRows = await db
    .select({ level: studentsTable.level, count: count() })
    .from(studentsTable)
    .groupBy(studentsTable.level)
    .orderBy(desc(count()));

  const summary = {
    studentsCount: Number(studentCounts?.total ?? 0),
    activeStudentsCount: Number(studentCounts?.active ?? 0),
    teachersCount: Number(teacherCounts?.total ?? 0),
    attendanceRate: Number(studentCounts?.attendance ?? 0),
    monthlyProgress: Number(studentCounts?.progress ?? 0),
    weeklyAttendance,
    levelBreakdown: levelRows.map((row) => ({ level: row.level, count: Number(row.count) })),
  };
  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/activity", async (req, res): Promise<void> => {
  await ensureMaqraaSeed();
  const parsed = GetActivityQueryParams.safeParse(req.query);
  const limit = parsed.success ? parsed.data.limit : 6;
  const rows = await db
    .select()
    .from(activityTable)
    .orderBy(desc(activityTable.createdAt))
    .limit(limit);
  res.json(GetActivityResponse.parse(rows));
});

router.get("/students", async (req, res): Promise<void> => {
  await ensureMaqraaSeed();
  const parsed = ListStudentsQueryParams.safeParse(req.query);
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const rows = await db
    .select()
    .from(studentsTable)
    .where(
      and(
        search ? or(ilike(studentsTable.name, `%${search}%`), ilike(studentsTable.email, `%${search}%`)) : undefined,
        status ? eq(studentsTable.status, status) : undefined,
      ),
    )
    .orderBy(asc(studentsTable.name));
  if (!parsed.success && (search !== undefined || status !== undefined)) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(ListStudentsResponse.parse(rows.map(studentWithFallback)));
});

router.post("/students", async (req, res): Promise<void> => {
  await ensureMaqraaSeed();
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [student] = await db
    .insert(studentsTable)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      level: parsed.data.level,
      status: parsed.data.status ?? "active",
      progress: 0,
      attendanceRate: 0,
    })
    .returning();
  await db.insert(activityTable).values({
    type: "student_joined",
    title: "انضمام طالب جديد",
    description: `تم تسجيل ${student.name} في المقرأة`,
  });
  res.status(201).json(CreateStudentResponse.parse(studentWithFallback(student)));
});

router.patch("/students/:id", async (req, res): Promise<void> => {
  await ensureMaqraaSeed();
  const params = UpdateStudentParams.safeParse(req.params);
  const body = UpdateStudentBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [student] = await db
    .update(studentsTable)
    .set(body.data)
    .where(eq(studentsTable.id, params.data.id))
    .returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json(UpdateStudentResponse.parse(studentWithFallback(student)));
});

router.delete("/students/:id", async (req, res): Promise<void> => {
  await ensureMaqraaSeed();
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [student] = await db
    .delete(studentsTable)
    .where(eq(studentsTable.id, params.data.id))
    .returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/teachers", async (_req, res): Promise<void> => {
  await ensureMaqraaSeed();
  const rows = await db.select().from(teachersTable).orderBy(asc(teachersTable.name));
  res.json(ListTeachersResponse.parse(rows));
});

router.post("/teachers", async (req, res): Promise<void> => {
  await ensureMaqraaSeed();
  const parsed = CreateTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [teacher] = await db
    .insert(teachersTable)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      specialty: parsed.data.specialty,
      status: parsed.data.status ?? "active",
      studentsCount: 0,
    })
    .returning();
  await db.insert(activityTable).values({
    type: "teacher_joined",
    title: "إضافة معلم جديد",
    description: `تمت إضافة ${teacher.name} إلى فريق التعليم`,
  });
  res.status(201).json(CreateTeacherResponse.parse(teacher));
});

router.patch("/teachers/:id", async (req, res): Promise<void> => {
  await ensureMaqraaSeed();
  const params = UpdateTeacherParams.safeParse(req.params);
  const body = UpdateTeacherBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [teacher] = await db
    .update(teachersTable)
    .set(body.data)
    .where(eq(teachersTable.id, params.data.id))
    .returning();
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }
  res.json(UpdateTeacherResponse.parse(teacher));
});

router.get("/attendance", async (req, res): Promise<void> => {
  await ensureMaqraaSeed();
  const normalizedQuery = {
    ...req.query,
    date: typeof req.query.date === "string" ? new Date(req.query.date) : undefined,
  };
  const parsed = ListAttendanceQueryParams.safeParse(normalizedQuery);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = await db
    .select({
      id: attendanceTable.id,
      studentId: attendanceTable.studentId,
      studentName: studentsTable.name,
      date: attendanceTable.date,
      status: attendanceTable.status,
      note: attendanceTable.note,
    })
    .from(attendanceTable)
    .innerJoin(studentsTable, eq(attendanceTable.studentId, studentsTable.id))
    .where(
      and(
        parsed.data.studentId ? eq(attendanceTable.studentId, parsed.data.studentId) : undefined,
        parsed.data.date
          ? sql`date(${attendanceTable.date}) = date(${parsed.data.date})`
          : undefined,
      ),
    )
    .orderBy(desc(attendanceTable.date));
  res.json(ListAttendanceResponse.parse(rows));
});

router.post("/attendance", async (req, res): Promise<void> => {
  await ensureMaqraaSeed();
  const parsed = RecordAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, parsed.data.studentId));
  if (!student) {
    res.status(400).json({ error: "Student not found" });
    return;
  }
  const [record] = await db
    .insert(attendanceTable)
    .values({
      studentId: parsed.data.studentId,
      date: parsed.data.date,
      status: parsed.data.status,
      note: parsed.data.note ?? null,
    })
    .returning();
  await db.insert(activityTable).values({
    type: "attendance_recorded",
    title: "تم تحديث سجل الحضور",
    description: `تم تسجيل ${student.name} كـ ${parsed.data.status === "present" ? "حاضر" : "غياب أو تأخر"}`,
  });
  res.status(201).json(
    RecordAttendanceResponse.parse({
      ...record,
      studentName: student.name,
    }),
  );
});

export default router;