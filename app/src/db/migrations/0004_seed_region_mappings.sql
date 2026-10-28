-- 주소의 구 → 권역 자동 추정 (09 ERD 3.2, specs/admin-song-class-registration findings Issues 1)
-- 구 단위만 넣는다. 동 단위(bname)는 실제 클래스 30개를 모은 뒤 조정한다 [가정]
-- 여기 없는 구는 "기타 서울"(8)로 추정한다
INSERT INTO "region_mappings" ("sigungu", "bname", "region_id") VALUES
  ('마포구', NULL, 1), ('서대문구', NULL, 1),
  ('강남구', NULL, 2), ('서초구', NULL, 2),
  ('광진구', NULL, 3), ('성동구', NULL, 3),
  ('송파구', NULL, 4), ('강동구', NULL, 4),
  ('종로구', NULL, 5), ('중구', NULL, 5),
  ('관악구', NULL, 6), ('동작구', NULL, 6),
  ('노원구', NULL, 7), ('강북구', NULL, 7), ('도봉구', NULL, 7),
  ('용산구', NULL, 8), ('성북구', NULL, 8), ('동대문구', NULL, 8), ('중랑구', NULL, 8),
  ('은평구', NULL, 8), ('양천구', NULL, 8), ('강서구', NULL, 8), ('구로구', NULL, 8),
  ('금천구', NULL, 8), ('영등포구', NULL, 8);
