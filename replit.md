# مقرأة سُحُب

منصة داخلية راقية لإدارة مقرأة قرآنية ومتابعة الطلاب والمعلمين والحضور والإنجاز.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/maqraa-suhub` — واجهة المنصة ومسارات لوحة الإدارة.
- `artifacts/api-server` — API المقرأة ومسارات الطلاب والمعلمين والحضور.
- `lib/api-spec/openapi.yaml` — المصدر الوحيد لعقود API.
- `lib/db/src/schema/maqraa.ts` — جداول بيانات المقرأة.
- `artifacts/maqraa-suhub/src/index.css` — نظام الألوان والخطوط والهوية البصرية.

## Architecture decisions

- تبدأ المنصة بنطاق داخلي للمقرأة، مع فصل واضح بين الطلاب والمعلمين والإدارة.
- تُعرّف الواجهات في OpenAPI أولًا ثم تُولّد hooks وZod schemas منها.
- بيانات الحضور والطلاب تستخدم تواريخ تقويمية/زمنية واضحة لتفادي مشاكل المناطق الزمنية.

## Product

- لوحة نظرة عامة تعرض أعداد الطلاب والمعلمين، نسبة الحضور، التقدم الشهري، توزيع المستويات، وآخر النشاط.
- إدارة الطلاب مع البحث والتصفية والإضافة والتعديل والحذف.
- إدارة المعلمين مع الإضافة والتعديل.
- سجل حضور مع التصفية والتسجيل وملاحظات الغياب أو التأخر.

## User preferences

- اسم المنتج: مقرأة سُحُب.
- الجمهور الأول: مقرأة واحدة بإدارة داخلية.
- الطابع المرغوب: راقٍ وفخم ومميز.

## Gotchas

- بعد تعديل `lib/api-spec/openapi.yaml` يجب تشغيل `pnpm --filter @workspace/api-spec run codegen`.
- تشغيل الخدمات يتم عبر workflows الخاصة بـ API Server وواجهة مقرأة سُحُب.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
