-- 사진 저장소 (specs/instructor-studio): 공개 읽기 버킷 media. 쓰기는 운영자만
-- 화면은 공개 주소(/storage/v1/object/public/media/...)로 읽고, 올리기·지우기는 서버 액션이 로그인 세션으로 한다

-- 운영자 확인. 브라우저 역할은 public 테이블 권한이 없어서(0002) 정의자 권한으로 profiles를 읽는다
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') $$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;--> statement-breakpoint

-- 한 장 2MB까지, 이미지만 (브라우저가 1600px·480px로 줄여 보낸다)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint

-- 지우기는 조회 권한도 필요하다 (Supabase Storage). 공개 주소 읽기는 정책과 관계없다
CREATE POLICY "media_admin_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'media' AND public.is_admin());--> statement-breakpoint
CREATE POLICY "media_admin_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND public.is_admin());--> statement-breakpoint
CREATE POLICY "media_admin_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND public.is_admin());--> statement-breakpoint
CREATE POLICY "media_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND public.is_admin());
