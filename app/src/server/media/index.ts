// 사진 저장소 (Supabase Storage 버킷 media, 마이그레이션 0006). 올리기·지우기는 운영자 로그인 세션으로만 된다(정책).
// 이 모듈은 Next·Supabase 클라이언트를 모른다: 액션이 세션이 붙은 저장소를 만들어 넘긴다 (app.md 계층)

export const MEDIA_BUCKET = "media";

export type MediaStore = {
  upload(path: string, file: Blob, contentType: string): Promise<void>;
  remove(paths: string[]): Promise<void>;
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BYTES = 2 * 1024 * 1024;

// 브라우저가 줄여 보낸 사진 한 장을 확인한다. 버킷 제한과 같다
export function checkImage(file: unknown): file is File {
  return file instanceof File && (IMAGE_TYPES as readonly string[]).includes(file.type) && file.size > 0 && file.size <= MAX_BYTES;
}

export function extensionOf(type: string): string {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
}

// 화면에서 쓰는 공개 주소
export function mediaUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}
