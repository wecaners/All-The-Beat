import { integer, pgTable, smallint, text } from "drizzle-orm/pg-core";
import { createdAt } from "./columns";

// 권역 8개는 시드 데이터. id를 고정해서 넣는다
export const regions = pgTable("regions", {
  id: smallint().primaryKey(),
  name: text().notNull().unique(), // "홍대·합정·신촌"
  shortName: text().notNull(), // 칩용 "홍대·합정"
  sortOrder: smallint().notNull(),
  createdAt: createdAt(),
}).enableRLS();

// 주소 → 권역 자동 매핑. (시군구 + 동) → (시군구 전체) → "기타 서울" 순으로 찾는다
export const regionMappings = pgTable("region_mappings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sigungu: text().notNull(), // "마포구"
  bname: text(), // 법정동 "서교동". NULL이면 구 전체
  regionId: smallint()
    .notNull()
    .references(() => regions.id),
  createdAt: createdAt(),
}).enableRLS();
