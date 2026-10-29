// seed-showcase.mts로 넣은 테스트 데이터를 지운다: pnpm db:clean:showcase
// 지우는 것: 예약 링크가 example.com/allbeat-test/인 클래스, 인스타 아이디가 allbeat_test_로 시작하는 가상 강사와 그 스튜디오.
// 곡·아티스트는 남긴다 (진짜 곡이고, 사용자의 추가요가 붙었을 수 있다)
import postgres from "postgres";

try {
  process.loadEnvFile(".env.local");
} catch {}

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("MIGRATION_DATABASE_URL 또는 DATABASE_URL이 없습니다 (app/.env.local)");
if (!url.includes("ap-northeast-2") && !process.argv.includes("--force")) {
  throw new Error("dev DB가 아닌 것 같아요. 확실하면 --force");
}

const HANDLE_PREFIX = "allbeat_test_";
const BOOKING_PREFIX = "https://example.com/allbeat-test/";

const sql = postgres(url, { max: 1 });
await sql.begin(async (tx) => {
  const classes = await tx`delete from classes where starts_with(booking_url, ${BOOKING_PREFIX}) returning id`;
  // 가상 강사에게 다른 클래스(운영자가 손으로 만든 것)가 남아 있으면 강사는 지우지 않는다
  const instructors = await tx`
    delete from instructor_profiles ip
    where starts_with(ip.instagram_handle, ${HANDLE_PREFIX})
      and not exists (select 1 from classes c where c.instructor_id = ip.id)
    returning display_name`;
  console.log(`✓ 테스트 클래스 ${classes.length}개, 가상 강사 ${instructors.length}명(스튜디오 포함) 지움`);
});
await sql.end();
