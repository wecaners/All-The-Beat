-- DB는 서버(Drizzle, postgres 역할)만 쓴다 (08 문서 3절)
-- 브라우저용 Data API 역할(anon, authenticated)에서 public 스키마 권한을 거둔다. RLS(정책 없음)와 함께 이중으로 막는다
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;--> statement-breakpoint
-- 앞으로 만들 테이블에도 자동으로 권한이 붙지 않게
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
