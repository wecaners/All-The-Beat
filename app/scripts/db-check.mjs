// DB 접속 주소가 맞는지 확인한다: pnpm db:check
import postgres from "postgres";

try {
  process.loadEnvFile(".env.local");
} catch {}

// NEXT_PUBLIC_ 값은 코드에서 쓰는 순간 브라우저 번들에 그대로 박힌다. 비밀값이 섞이지 않았는지 이름으로 확인
for (const name of Object.keys(process.env)) {
  if (name.startsWith("NEXT_PUBLIC_") && /PASSWORD|SECRET|DATABASE_URL/.test(name)) {
    console.log(`⚠ ${name}: 비밀값으로 보이는 이름에 NEXT_PUBLIC_이 붙어 있어요. 이 줄은 지우고 서버 전용 이름으로 옮기세요`);
  }
}

for (const name of ["DATABASE_URL", "MIGRATION_DATABASE_URL"]) {
  const url = process.env[name];
  if (!url) {
    console.log(`✗ ${name}: 없음`);
    continue;
  }
  const { hostname: host, port } = new URL(url);
  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });
  try {
    const [row] = await sql`select current_user as "user", version() as version`;
    console.log(`✓ ${name}: ${host}:${port} · ${row.user} · ${row.version.split(" ").slice(0, 2).join(" ")}`);
  } catch (e) {
    console.log(`✗ ${name}: ${host}:${port} · ${e.message}`);
  } finally {
    await sql.end();
  }
}
