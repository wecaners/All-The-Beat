-- 곡·아티스트·강사 이름 검색(자동완성)에 쓰는 트라이그램 (09 ERD 4절)
-- Supabase는 확장을 extensions 스키마에 둔다. postgres 역할의 search_path에 포함돼 있어 gin_trgm_ops를 그대로 쓸 수 있다
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
