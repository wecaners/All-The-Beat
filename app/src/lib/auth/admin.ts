import { notFound } from "next/navigation";
import { cache } from "react";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import { isAdmin } from "@/server/admin/shared";

// 운영자가 아니면 404. 운영 기능이 있다는 것도 드러내지 않는다 (specs/admin-song-class-registration FR-1)
// 같은 요청 안에서는 한 번만 확인한다. 화면·서버 액션마다 반드시 부른다
export const requireAdmin = cache(async (): Promise<CurrentUser> => {
  const user = await getCurrentUser();
  if (!user || !(await isAdmin(user.id))) notFound();
  return user;
});
