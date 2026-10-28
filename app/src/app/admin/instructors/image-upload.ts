// 브라우저에서 사진을 두 크기로 줄인다 (화면용 1600px, 목록용 480px). 서버 액션 본문 1MB 안에 들어오게 화질을 낮춰 가며 맞추고
// (한도를 올리면 모든 액션의 공격면이 넓어진다),
// 휴대폰 사진의 회전(EXIF)을 바로잡는다 (specs/instructor-studio findings)

const BUDGET = 900 * 1024;

async function resize(file: File, maxSide: number, quality: number): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("사진을 줄이지 못했어요");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

export async function photoFormData(file: File, fields: Record<string, string | number>): Promise<FormData> {
  if (!file.type.startsWith("image/")) throw new Error("사진 파일만 올릴 수 있어요");
  const thumb = await resize(file, 480, 0.8);
  // 두 장 + 폼 경계가 1MB를 넘지 않게. 대부분 첫 시도에 들어온다
  let full = await resize(file, 1600, 0.82);
  for (const [side, quality] of [[1600, 0.7], [1280, 0.7], [1024, 0.65]] as const) {
    if (full.size + thumb.size <= BUDGET) break;
    full = await resize(file, side, quality);
  }
  if (full.size + thumb.size > BUDGET) throw new Error("사진이 너무 커요. 다른 사진을 골라 주세요");
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.set(k, String(v)));
  fd.set("full", full);
  fd.set("thumb", thumb);
  return fd;
}
