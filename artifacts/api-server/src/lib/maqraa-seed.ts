import { db, studentsTable, teachersTable, attendanceTable, activityTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";

let seedPromise: Promise<void> | null = null;

export function ensureMaqraaSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const [{ value: studentCount }] = await db
        .select({ value: count() })
        .from(studentsTable);
      if (studentCount > 0) return;

      const [yasmin, salma, abdullah, faris] = await db
        .insert(studentsTable)
        .values([
          {
            name: "ياسمين العتيبي",
            email: "yasmin@sohub.example",
            phone: "0501234567",
            level: "جزء عمّ",
            progress: 78,
            attendanceRate: 96,
            status: "active",
            joinedAt: new Date("2026-01-12T08:00:00Z"),
          },
          {
            name: "سلمى القحطاني",
            email: "salma@sohub.example",
            phone: "0507654321",
            level: "سورة البقرة",
            progress: 64,
            attendanceRate: 91,
            status: "active",
            joinedAt: new Date("2026-02-03T08:00:00Z"),
          },
          {
            name: "عبدالله الحربي",
            email: "abdullah@sohub.example",
            phone: null,
            level: "جزء تبارك",
            progress: 52,
            attendanceRate: 87,
            status: "active",
            joinedAt: new Date("2026-03-18T08:00:00Z"),
          },
          {
            name: "فارس السالم",
            email: "faris@sohub.example",
            phone: "0552468101",
            level: "التأسيس",
            progress: 31,
            attendanceRate: 74,
            status: "paused",
            joinedAt: new Date("2026-04-26T08:00:00Z"),
          },
        ])
        .returning();

      await db.insert(teachersTable).values([
        {
          name: "أ. محمد العبدالله",
          email: "mohammed@sohub.example",
          specialty: "الإقراء والتجويد",
          studentsCount: 18,
          status: "active",
        },
        {
          name: "أ. نورة السالم",
          email: "noura@sohub.example",
          specialty: "التأسيس للصغار",
          studentsCount: 12,
          status: "active",
        },
        {
          name: "أ. خالد الزهراني",
          email: "khaled@sohub.example",
          specialty: "المراجعة والإتقان",
          studentsCount: 15,
          status: "on_leave",
        },
      ]);

      await db.insert(attendanceTable).values([
        { studentId: yasmin.id, date: new Date("2026-08-10T16:00:00Z"), status: "present" },
        { studentId: salma.id, date: new Date("2026-08-10T16:00:00Z"), status: "present" },
        { studentId: abdullah.id, date: new Date("2026-08-10T16:00:00Z"), status: "late", note: "وصل بعد بداية الحلقة بدقائق" },
        { studentId: faris.id, date: new Date("2026-08-10T16:00:00Z"), status: "absent", note: "غياب بعذر" },
        { studentId: yasmin.id, date: new Date("2026-08-09T16:00:00Z"), status: "present" },
        { studentId: salma.id, date: new Date("2026-08-09T16:00:00Z"), status: "present" },
      ]);

      await db.insert(activityTable).values([
        {
          type: "progress_updated",
          title: "تقدم ملحوظ في الحفظ",
          description: "أتمت ياسمين العتيبي مراجعة سورة الملك بإتقان",
          createdAt: new Date("2026-08-10T17:35:00Z"),
        },
        {
          type: "attendance_recorded",
          title: "تم تسجيل حضور الحلقة",
          description: "اكتمل تسجيل حضور حلقة الفترة المسائية",
          createdAt: new Date("2026-08-10T16:30:00Z"),
        },
        {
          type: "student_joined",
          title: "انضمام طالبة جديدة",
          description: "تم تسجيل دانة الشهري ضمن برنامج التأسيس",
          createdAt: new Date("2026-08-09T10:15:00Z"),
        },
      ]);
    })();
  }
  return seedPromise;
}