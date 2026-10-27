// Supabase 접속 정보. 둘 다 브라우저에 노출돼도 되는 값 (DB 직접 접근은 RLS로 막는다, 08 문서 3절)
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
