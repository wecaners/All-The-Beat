# 기술 검증 T-1: 인앱 브라우저 카카오 로그인

- 작성일: 2026-10-27
- 목적: 인스타·카톡 인앱 브라우저에서 **[추가요!] → 카카오 로그인 → 원래 화면 복귀 → 추가요 시트 자동 오픈**이 끊기지 않는지 확인 (07 문서 T-1, 08 문서 2.2, 유저 플로우 3)
- 브랜치: `feat/kakao-login-spike`
- 코드: `app/` (Next.js 16 + Supabase Auth)
- 검증 페이지: `/spike/song` (가짜 곡 상세)

---

## 1. 계정 세팅 (직접 해주셔야 하는 부분)

> 전부 **개인 계정**으로. 회사 계정(GitHub `wade-readypost`, 회사 이메일)으로 만들지 않는다.

### A. Supabase 프로젝트 만들기
1. [supabase.com](https://supabase.com) 가입 (GitHub `wecaners` 또는 개인 이메일)
2. 조직(Organization) 만들기: 이름 `allbeat`, 플랜 Free
3. 프로젝트 만들기: 이름 **`allbeat-dev`**, 리전 **Northeast Asia (Seoul)**, DB 비밀번호는 비밀번호 관리자에 저장
4. 프로젝트 대시보드 → **Connect** (또는 Project Settings → API)에서 두 값을 확인
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (`sb_publishable_...`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. `app/.env.local.example`을 복사해 `app/.env.local`을 만들고 두 값을 넣는다 (이 파일은 Git에 올라가지 않음)

### B. 카카오 개발자 앱 만들기
1. [developers.kakao.com](https://developers.kakao.com) 에 **개인 카카오 계정**으로 로그인
2. 내 애플리케이션 → 애플리케이션 추가: 앱 이름 **`올빗 (개발)`**, 카테고리 엔터테인먼트/라이프스타일 등
3. 앱 키 → **REST API 키** 확인 (Supabase의 Client ID로 쓴다)
4. 카카오 로그인 → **활성화 ON**
5. 카카오 로그인 → **Redirect URI** 등록: `https://<project-ref>.supabase.co/auth/v1/callback`
   (`<project-ref>`는 Supabase Project URL의 앞부분)
6. 카카오 로그인 → **동의항목**
   - 닉네임 `profile_nickname`: **필수 동의**
   - 프로필 사진 `profile_image`: **선택 동의**
   - 카카오계정(이메일): 설정하지 않음 (비즈 앱 전용, 우리는 이메일을 안 받음)
7. 보안 → **Client Secret** 코드 생성 → 활성화 상태 **사용함**
8. 플랫폼 → Web → 사이트 도메인: `http://localhost:3100` (나중에 Vercel 주소도 추가)

### C. Supabase에 카카오 연결
1. Authentication → **Sign In / Providers** → **Kakao** 켜기
   - Client ID: 카카오 **REST API 키**
   - Client Secret: 카카오 **Client Secret 코드**
   - **Allow users without an email: 켜기**
2. Authentication → **URL Configuration**
   - Site URL: `http://localhost:3100` (운영 시작 시 실제 도메인으로)
   - Redirect URLs에 추가:
     - `http://localhost:3100/**`
     - Vercel 주소 (D에서 생김) `https://<프로젝트>.vercel.app/**`, 미리보기용 `https://*-wecaners.vercel.app/**` [가정: Vercel 미리보기 주소 형식은 배포 후 확인]

### D. Vercel 배포 (인앱 브라우저 테스트용 HTTPS 주소)
인앱 브라우저 테스트는 휴대폰에서 열 수 있는 **공개 HTTPS 주소**가 필요해서 `localhost`로는 안 된다.
1. [vercel.com](https://vercel.com) 에 **GitHub `wecaners`로** 가입 (Hobby, 무료)
2. Add New → Project → `wecaners/All-The-Beat` 가져오기
3. **Root Directory: `app`** (중요)
4. Environment Variables에 A-4의 두 값 입력
5. 배포 후 나온 주소를 B-8(카카오 사이트 도메인)과 C-2(Supabase Redirect URLs)에 추가
6. ⚠️ **Settings → Deployment Protection**: 미리보기 배포에 "Vercel Authentication"이 켜져 있으면 인앱 브라우저에서 Vercel 로그인 화면이 먼저 뜬다 → 검증 동안 **끄거나**, 검증 브랜치를 운영(Production) 배포로 올린다

---

## 2. 로컬에서 먼저 확인 (일반 브라우저)

```bash
cd app && npm run dev -- --port 3100
```

`http://localhost:3100/spike/song` → [추가요! (로그인 필요)] → 카카오 로그인 → 돌아와서 초록색 "✓ 원래 화면으로 돌아왔고 추가요 시트가 자동으로 열렸어요"가 보이면 기본 설정은 성공.

---

## 3. 인앱 브라우저 테스트 방법

1. Vercel 주소 `https://<배포주소>/spike/song` 을 **인스타 DM**으로 (친구 계정이나 본인 부계정에게) 보낸다. 카톡은 "나와의 채팅"으로 보낸다
2. 앱 안에서 링크를 눌러 연다 (외부 브라우저로 넘어가지 않게)
3. [추가요! (로그인 필요)]를 누르고 카카오 로그인을 끝까지 진행
4. 돌아온 화면을 **통째로 캡처** (진단 정보·기록 포함)
5. 로그아웃하고 다음 조합으로

**특히 볼 것**
- 카카오톡 앱이 설치된 폰에서는 카카오 로그인이 **카카오톡 앱으로 넘어갔다가** 돌아온다. 이때 **인앱 브라우저로 돌아오는지, 사파리·크롬으로 튀어나가는지**가 핵심 (튀어나가면 로그인은 그쪽 브라우저에만 남는다)
- "브라우저가 본 로그인"과 "서버가 본 로그인"이 둘 다 ✓인지
- "기록"에 "로그인 시작"과 "복귀 성공"이 **둘 다** 남아 있는지 (같은 브라우저 저장소로 돌아왔다는 증거)

---

## 4. 결과 표

| # | 기기 · OS | 앱 (인앱 브라우저) | 카카오 화면 | 돌아온 곳 | 브라우저 로그인 | 서버 로그인 | 시트 자동 오픈 | 기록 유지 | 오류 코드·메모 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | iPhone · iOS | 인스타그램 | 앱 / 웹 | 인앱 / 사파리 | | | | | |
| 2 | iPhone · iOS | 카카오톡 | | | | | | | |
| 3 | iPhone · iOS | 사파리 (기준) | | | | | | | |
| 4 | Android | 인스타그램 | | | | | | | |
| 5 | Android | 카카오톡 | | | | | | | |
| 6 | Android | 크롬 (기준) | | | | | | | |
| 7 | (선택) | 네이버 앱 | | | | | | | |

**통과 기준**: 1·2·4·5 (인스타·카톡 × iOS·안드로이드)에서 **시트 자동 오픈까지 ✓**

## 5. 자주 나오는 오류

| 코드 | 뜻 | 해결 |
|---|---|---|
| KOE006 | Redirect URI 불일치 | B-5 값이 Supabase 콜백 주소와 정확히 같은지 |
| KOE205 | 설정 안 된 동의항목 요청 | Supabase가 이메일 동의를 요청하는 경우 → 결과 기록 후 같이 대응 (비즈 앱 전환 또는 요청 범위 조정) |
| `exchange_failed` | 인가 코드 → 세션 교환 실패 | 로그인 시작한 브라우저와 돌아온 브라우저가 다를 때 주로 발생 (PKCE 쿠키가 없음) → **인앱→외부 브라우저 튐**의 증거 |
| `redirect_to` 무시되고 Site URL로 감 | Supabase Redirect URLs에 주소 누락 | C-2 확인 |

## 6. 실패하면 (대안, 08 문서 AR-1)

| 대안 | 내용 | 비용 |
|---|---|---|
| 외부 브라우저로 열기 안내 | 인앱 감지 시 "사파리/크롬에서 열기" 버튼 (검증 페이지 맨 아래에서 시험 가능) | 낮음. 단 이동 후 맥락이 끊길 수 있음 |
| 로그인 없는 추가요 | 기기 단위로 먼저 저장, 나중에 로그인하면 합치기 | 중간. 중복·조작 위험 |
| 카카오 JS SDK 직접 사용 | Supabase OAuth 대신 카카오 SDK의 인앱 대응 흐름 사용 후 서버에서 세션 생성 | 높음 |

## 7. 결과 요약 (테스트 후 작성)

- 날짜:
- 결론: 통과 / 부분 통과 / 실패
- 다음 행동:
