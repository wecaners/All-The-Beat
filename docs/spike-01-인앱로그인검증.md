# 기술 검증 T-1: 인앱 브라우저 카카오 로그인

- 작성일: 2026-10-27
- 목적: 인스타·카톡 인앱 브라우저에서 **[추가요!] → 카카오 로그인 → 원래 화면 복귀 → 추가요 시트 자동 오픈**이 끊기지 않는지 확인 (07 문서 T-1, 08 문서 2.2, 유저 플로우 3)
- 브랜치: `feat/kakao-login-spike`
- 코드: `app/` (Next.js 16 + Supabase Auth)
- 검증 페이지: `/spike/song` (가짜 곡 상세)

---

## 1. 계정 세팅 (직접 해주셔야 하는 부분)

> 전부 **개인 계정**으로. 회사 계정(GitHub `wade-readypost`, 회사 이메일)으로 만들지 않는다.

**이 프로젝트의 실제 값** (비밀값 아님)

| 항목 | 값 |
|---|---|
| Supabase Project URL | `https://itkzhrcbfnmnisrlqmme.supabase.co` (서울 `ap-northeast-2`) |
| 카카오 Redirect URI (B-5) | `https://itkzhrcbfnmnisrlqmme.supabase.co/auth/v1/callback` |
| Vercel 운영 주소 | `https://all-the-beat.vercel.app` (main 브랜치) |
| Supabase Redirect URLs (C-2) | `http://localhost:3100/**`, `https://all-the-beat.vercel.app/**` |

진행 상황 (2026-10-27): A ✅ · B ✅ · C ✅ · D ✅ · **PC 브라우저 로그인 → 복귀 → 시트 자동 오픈 통과**. 남은 것: 인앱 브라우저(4절 표)

세팅하며 막혔던 것
- Vercel Framework Preset이 "Other"로 잡혀 전 페이지 404 → Next.js로 바꾸고 Redeploy
- Supabase Kakao Client ID에 프로젝트 이름을 넣음 → REST API 키로
- KOE205 → Supabase가 요청하는 `profile_nickname`·`profile_image`·`account_email` **세 항목이 모두** 설정돼 있어야 함 (프로필 사진이 꺼져 있었음)
- 배포 주소에서 로그인 후 `localhost:3000`으로 감 → Supabase Redirect URLs에 배포 주소가 없어서 Site URL 기본값으로 떨어진 것
- 처음 프로젝트가 **시드니**(`ap-southeast-2`)에 생김: 새 생성 화면의 "Asia-Pacific"은 대륙만 고르는 일반 리전이라 Supabase가 시드니를 배정. 접속 0.31초 vs 서울 0.03초 → 지우고 **ADVANCED CONFIGURATION에서 서울**로 다시 만듦. 같이 설정: Automatically expose new tables **끔**, Enable automatic RLS **켬**

### A. Supabase 프로젝트 만들기
1. [supabase.com](https://supabase.com) 가입 (GitHub `wecaners` 또는 개인 이메일)
2. 조직(Organization) 만들기: 이름 `allbeat`, 플랜 Free
3. 프로젝트 만들기: 이름 **`allbeat-dev`**, 리전은 **ADVANCED CONFIGURATION → Northeast Asia (Seoul)** (위쪽 "Asia-Pacific"을 고르면 시드니가 될 수 있음), DB 비밀번호는 **영문·숫자만** 16자 이상으로 하고 비밀번호 관리자에 저장. Security: Automatically expose new tables **끔**, Enable automatic RLS **켬**
4. 프로젝트 대시보드 → **Connect** (또는 Project Settings → API)에서 두 값을 확인
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (`sb_publishable_...`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. `app/.env.local.example`을 복사해 `app/.env.local`을 만들고 두 값을 넣는다 (이 파일은 Git에 올라가지 않음)

### B. 카카오 개발자 앱 만들기
1. [developers.kakao.com](https://developers.kakao.com) 에 **개인 카카오 계정**으로 로그인
2. 내 애플리케이션 → 애플리케이션 추가: 앱 이름 **`올빗 (개발)`**, 카테고리 엔터테인먼트/라이프스타일 등
> 카카오 콘솔이 개편돼서 키 관련 설정이 **앱 → 플랫폼 키 → REST API 키** 한 화면에 모였다 (2026-10 카카오 공식 문서 기준)

3. 앱 → 플랫폼 키 → **REST API 키** 값 확인 (Supabase의 Client ID로 쓴다)
4. 카카오 로그인 → 사용 설정 → **상태 ON** (OFF면 `KOE004`)
5. 플랫폼 키 → REST API 키 → **카카오 로그인 리다이렉트 URI**: `https://<project-ref>.supabase.co/auth/v1/callback` 입력 → 저장
   (`<project-ref>`는 Supabase Project URL의 앞부분. 끝 슬래시까지 정확히 같아야 함)
6. 카카오 로그인 → **동의항목**
   - 닉네임 `profile_nickname`: **필수 동의**
   - 프로필 사진 `profile_image`: **선택 동의**
   - 카카오계정(이메일): **선택 동의**. Supabase는 `account_email`을 항상 scope에 넣어서(코드상 기본값, 뺄 수 없음) 이 항목이 없으면 **KOE205**가 난다. 이메일 항목은 비즈 앱만 쓸 수 있으므로 먼저 B-6a로 전환
6a. **개인 개발자 비즈 앱 전환** (사업자등록번호 없이 가능)
   - 카카오디벨로퍼스 우측 상단 프로필 → 계정 설정 → **본인인증**
   - 앱 → 일반 → 비즈니스 정보 → **개인 개발자 비즈 앱** → 카카오비즈니스 통합 서비스 약관 동의 → 전환
   - 앱 아이콘을 요구하면 아무 이미지나 먼저 등록
   - 전환 후 동의항목에서 이메일을 바로 켤 수 없고 "신청"이 뜨면 심사를 거친다 (데브톡 사례상 앱마다 다름)
7. 플랫폼 키 → REST API 키 → **클라이언트 시크릿**: 코드가 없으면 생성 → 복사 버튼으로 복사 → 활성화 **ON** 확인 → 저장
   (REST API 키는 시크릿이 켜진 상태로 만들어지므로 보통 코드가 이미 있다. 재발급하면 이전 코드는 바로 못 쓰게 됨)
8. (필요 없음) 예전 "플랫폼 → Web 사이트 도메인"은 이제 **JavaScript SDK 도메인**이고 JS SDK용이다. 우리는 Supabase를 거친 REST 방식이라 등록하지 않아도 된다

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
3. **Root Directory: `app`** (중요). **Framework Preset이 Next.js인지도 확인**: "Other"로 잡히면 `public/` 파일만 나오고 모든 페이지가 404
4. Environment Variables에 A-4의 두 값 입력
5. 배포 후 나온 주소를 C-2(Supabase Redirect URLs)에 추가
6. ⚠️ **Settings → Deployment Protection**: 미리보기 배포에 "Vercel Authentication"이 켜져 있으면 인앱 브라우저에서 Vercel 로그인 화면이 먼저 뜬다 → 검증 동안 **끄거나**, 검증 브랜치를 운영(Production) 배포로 올린다

---

## 2. 로컬에서 먼저 확인 (일반 브라우저)

```bash
cd app && pnpm dev --port 3100
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
| 1 | iPhone · iOS | 인스타그램 | 카카오톡 앱 | 인앱 ✅ (수동 복귀) | ✅ | | ✅ | | 2026-10-27 통과. 카톡 앱에서 승인 후 **자동으로 안 돌아오고**, 사용자가 iOS 왼쪽 위 "◀ Instagram"을 눌러 복귀 → 인스타 안에서 로그인 이어짐. 서버 로그인·기록 캡처 미확인 |
| 2 | iPhone · iOS | 카카오톡 | | | | | | | |
| 3 | iPhone · iOS | 사파리 (기준) | | | | | | | |
| 4 | Android | 인스타그램 | | | | | | | |
| 5 | Android | 카카오톡 | | | | | | | |
| 6 | Android | 크롬 (기준) | | | | | | | |
| 7 | (선택) | 네이버 앱 | | | | | | | |

**통과 기준**: 1·2·4·5 (인스타·카톡 × iOS·안드로이드)에서 **시트 자동 오픈까지 ✓**

**발견: 카톡 앱 경유 시 수동 복귀 (UX 위험)**
- iPhone에서 카카오톡 앱으로 넘어가 승인하면 원래 앱(인스타)으로 **자동 복귀하지 않는다**. 사용자가 iOS 상태바 왼쪽 위 "◀ 이전 앱"을 누르거나 앱 전환으로 돌아와야 로그인이 마무리된다
- 이걸 모르는 사용자는 카톡에 남아 이탈할 수 있다 → 로그인 시트(U-08)에 **"카카오톡에서 확인 후, 왼쪽 위 ◀를 눌러 돌아와 주세요"** 안내를 넣는다
- 카카오 화면의 "다른 방법으로 로그인"(아이디·비밀번호)은 인앱 안에서 끝나므로 수동 복귀가 없다
- 출시 후 지표: 로그인 시작 대비 복귀 성공 비율 (events에 `login_start`·`login_return` 기록 검토)

## 5. 자주 나오는 오류

| 코드 | 뜻 | 해결 |
|---|---|---|
| KOE006 | Redirect URI 불일치 | B-5 값이 Supabase 콜백 주소와 정확히 같은지 |
| KOE205 | 설정 안 된 동의항목 요청 | **실제로 발생 (2026-10-27)**. Supabase가 `account_email`을 항상 요청함 → B-6a 개인 개발자 비즈 앱 전환 후 이메일을 선택 동의로 |
| `exchange_failed` | 인가 코드 → 세션 교환 실패 | 로그인 시작한 브라우저와 돌아온 브라우저가 다를 때 주로 발생 (PKCE 쿠키가 없음) → **인앱→외부 브라우저 튐**의 증거 |
| `redirect_to` 무시되고 Site URL로 감 (예: `localhost:3000`) | Supabase Redirect URLs에 주소 누락 | C-2 확인. **실제로 발생 (2026-10-27)** |

## 6. 실패하면 (대안, 08 문서 AR-1)

| 대안 | 내용 | 비용 |
|---|---|---|
| 외부 브라우저로 열기 안내 | 인앱 감지 시 "사파리/크롬에서 열기" 버튼 (검증 페이지 맨 아래에서 시험 가능) | 낮음. 단 이동 후 맥락이 끊길 수 있음 |
| 로그인 없는 추가요 | 기기 단위로 먼저 저장, 나중에 로그인하면 합치기 | 중간. 중복·조작 위험 |
| 카카오 JS SDK 직접 사용 | Supabase OAuth 대신 카카오 SDK의 인앱 대응 흐름 사용 후 서버에서 세션 생성 | 높음 |

## 7. 결과 요약

- 날짜: 2026-10-27
- 결론: **부분 통과 — 진행 결정**. 가장 위험한 조합(iPhone + 인스타, 카톡 앱 경유)에서 로그인이 인스타 안으로 이어지고 시트가 자동으로 열렸다. 외부 브라우저로 튀는 문제는 없었다. 대안(AR-1)은 지금 필요 없음
- 남은 것 (출시 전 확인, 개발을 막지 않음): #2 iPhone 카톡 · #4·#5 안드로이드 인스타·카톡
- 다음 행동
  - 로그인 시트(U-08)에 카톡 복귀 안내 문구 추가 (4절 "발견")
  - 카카오 앱은 **개인 개발자 비즈 앱 + 이메일 선택 동의**로 운영 (07 문서 T-5 갱신). 개인정보처리방침에 "선택: 이메일(카카오 로그인 시)" 기재
  - 운영용 카카오 앱·Supabase 프로젝트를 만들 때 이 문서 1절을 그대로 반복
