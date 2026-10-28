// 운영자 지정·해제. 화면으로 만들지 않고 DB 권한이 있는 사람만 하게 한다 (CON-1)
//   pnpm admin:grant <닉네임 또는 사용자 id>
//   pnpm admin:grant <닉네임 또는 사용자 id> --revoke
import postgres from "postgres";

try {
  process.loadEnvFile(".env.local");
} catch {}

const target = process.argv[2];
const revoke = process.argv.includes("--revoke");
if (!target || target.startsWith("--")) {
  console.log("사용법: pnpm admin:grant <닉네임 또는 사용자 id> [--revoke]");
  process.exit(1);
}

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("MIGRATION_DATABASE_URL 또는 DATABASE_URL이 없습니다 (app/.env.local)");
const sql = postgres(url, { max: 1 });

const isUuid = /^[0-9a-f-]{36}$/i.test(target);
const matches = isUuid
  ? await sql`select id, nickname, role from profiles where id = ${target} and deleted_at is null`
  : await sql`select id, nickname, role from profiles where nickname = ${target} and deleted_at is null`;

if (matches.length !== 1) {
  console.log(matches.length === 0 ? "✗ 해당하는 사용자가 없어요" : "✗ 같은 닉네임이 여러 명이에요. 사용자 id로 다시 실행해 주세요:");
  for (const m of matches) console.log(`  ${m.id}  ${m.nickname}  (${m.role})`);
  await sql.end();
  process.exit(1);
}

const [user] = matches;
const role = revoke ? "member" : "admin";
await sql`update profiles set role = ${role}::member_role where id = ${user.id}`;
console.log(`✓ ${user.nickname} (${String(user.id).slice(0, 8)}…): ${user.role} → ${role}`);
await sql.end();
