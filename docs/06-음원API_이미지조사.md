# 06. 음원 메타데이터·앨범 커버 API 조사

- 작성일: 2026-10-26
- 목적: 곡 상세·홈 카드에 앨범 커버를 합법적으로 쓸 수 있는지, 어떤 API로 곡 정보를 가져올지 결정 (기능명세서 Q6, 와이어프레임 U-01 "결정 필요")
- 주의: 아래는 공개된 약관·문서를 읽고 정리한 것이며 법률 자문이 아니다. 출시 전에 실제 약관 원문을 다시 확인한다.

---

## 0. 업데이트 (2026-10-26): YouTube 중심으로 방향 전환

**이유**: 한국 사용자에게 Apple Music은 익숙하지 않다. 국내 음원 앱 이용자 순위에서 YouTube Music이 멜론과 1~2위를 다투고 (2023년 4월 YouTube Music 521만 명으로 멜론 역전, 단 YouTube Premium 가입자가 포함돼 과대 집계라는 지적도 있음), K-pop 팬은 MV·안무 영상·챌린지를 YouTube에서 본다. "Apple Music에서 듣기" 링크는 대부분의 사용자에게 쓸모없는 버튼이 된다.

**바뀐 방향**
| 역할 | 이전 안 | 바뀐 안 |
|---|---|---|
| 곡의 대표 비주얼 | Apple 앨범 커버 (정사각형) | **YouTube 안무 연습 영상 썸네일** (16:9) |
| 곡 상세 상단 | 커버 이미지 | **안무 영상 임베드** (자동재생 끔, 탭하면 재생) |
| 사용자가 나가는 링크 | Apple Music에서 듣기 | **YouTube에서 보기** |
| 곡 정보 입력 | Apple 검색 자동 채우기 | 곡명·아티스트는 우리 DB + 운영자 입력, YouTube 영상 ID 연결 |
| 앨범 커버 | 필수 | **MVP에서는 쓰지 않음** (나중에 Apple을 곡 정보 보조 도구로 재검토) |

**YouTube Data API 할당량 — 설계에 영향**
- 기본 하루 10,000 units. `videos.list`는 1 unit
- **`search.list`는 별도로 하루 100회까지만** → 사용자가 검색할 때마다 YouTube를 검색하면 금방 막힌다
- → **곡마다 영상 ID를 한 번 정해서 저장**한다 (운영자가 곡 검수 때 공식 Dance Practice 영상을 고름). 이후에는 `videos.list`로 제목·썸네일만 30일마다 갱신 (정책상 30일 갱신 의무와도 맞음)

**영상 우선순위 (곡 1개당 1개)**
1. 공식 채널의 **Dance Practice / 안무 연습 영상** — 댄스 서비스에 가장 맞음
2. 공식 **퍼포먼스 영상**
3. 공식 **MV**
4. 없으면 영역 숨김, 기본 그라데이션 이미지

**추가 아이디어**: 강사가 클래스 등록 때 **본인 티저 영상 YouTube 링크**(쇼츠 포함)를 붙일 수 있게 하면, 클래스 상세에서 "이 강사가 이렇게 가르친다"를 보여줄 수 있다 (선택 입력, Should 후보).

**정책상 지킬 것** (YouTube API 개발자 정책)
- 공식 임베드 플레이어 그대로 사용, 가리거나 변형하지 않기
- YouTube가 출처라는 표시 (플레이어 자체 로고 + "YouTube에서 보기")
- 오디오만 분리, 백그라운드 재생 금지
- API 데이터 30일마다 갱신 또는 삭제
- 영상 주변에 우리가 광고·스폰서를 붙여 팔려면 승인 필요 (MVP는 해당 없음)

아래 1~5절은 처음 조사한 내용 그대로 남겨둔다. Apple은 "곡 정보 자동 채우기" 보조 도구로 나중에 다시 검토할 수 있다.

---

## 1. 결론부터 (최초 조사 시점)

1. **저작권과 무관하게 쓸 수 있는 앨범 커버는 없다.** 앨범 커버는 기획사·레이블의 저작물이다. API들은 "자기 서비스 홍보·연결 목적으로 표시해도 된다"는 **조건부 허락**을 주는 것이고, 조건을 지키는 한에서만 쓸 수 있다.
2. **1순위: Apple iTunes Search API.** 무료, 키·가입 불필요, 600×600 커버, K-pop 신곡 반영이 빠르다 (NEON이 발매 13일 만에 조회됨). 조건은 **곡 화면에 "Apple Music에서 듣기" 링크를 다는 것**. 우리 서비스 성격과 자연스럽게 맞는다.
3. **2순위(보조): Deezer API.** 무료, 키 불필요, 1000×1000 커버 + **아티스트 사진**까지 준다. 다만 상업적 이용 조건이 문서에 명확하지 않아 **약관 확인 전에는 쓰지 않는다.**
4. **추가 제안: YouTube Data API로 안무 영상 연결.** 댄스 서비스에서 가장 강한 비주얼은 앨범 커버보다 **안무 영상**이다. 공식 임베드 플레이어로 보여주는 건 YouTube 정책상 허용된다.
5. **쓰지 않는다: Spotify(개인 개발자는 사실상 서비스 불가), 멜론·지니·벅스(공식 API 없음), Cover Art Archive(저작권 보호 이미지, "본인 책임 사용").**

---

## 2. 후보 비교

| API | 비용·가입 | 커버 크기 | K-pop 신곡 | 이미지 사용 조건 | 판정 |
|---|---|---|---|---|---|
| **Apple iTunes Search API** | 무료, 키 없음 | 600×600 (URL 크기 조절) | ✅ NEON 조회됨 | Apple 스토어 콘텐츠 **홍보 목적**으로만, 스토어 배지·링크 근처에 표시 | **1순위** |
| **Deezer API** | 무료, 검색은 키 없음 | 1000×1000 + 아티스트 사진 | ✅ NEON 조회됨 (아티스트 표기 "A2O") | 가이드라인에 이미지 조건 명시 없음, 이용약관 확인 필요 | **보조 (약관 확인 후)** |
| **YouTube Data API** | 무료 할당량, API 키 필요 | 영상 썸네일 | ✅ (공식 MV·안무 영상) | YouTube가 출처임을 표시, 플레이어 변형 금지, 데이터 30일마다 갱신 | **안무 영상용 추천** |
| Spotify Web API | 무료지만 앱 소유자 Premium 필요 | 640×640 | ✅ | Spotify 로고 필수, 커버 변형 금지, Spotify 링크 필수 | ❌ 서비스 불가 (아래 3.2) |
| MusicBrainz + Cover Art Archive | 무료 | 다양 | ⚠️ 신곡 반영 느림 | 이미지는 각 권리자 소유, "use at your own risk" | ❌ |
| 멜론·지니·벅스 | 공식 공개 API 없음 | - | - | 비공식 엔드포인트 크롤링은 약관 위반 위험 | ❌ |
| Soundcharts·Music Story 등 상용 | 유료 계약 | 제공 | ✅ | 계약 범위 내 | 나중에 규모 커지면 검토 |

---

## 3. API별 상세

### 3.1 Apple iTunes Search API ★ 1순위

**실제 테스트 결과 (2026-10-26)**
| 요청 | 결과 |
|---|---|
| 한국 스토어(KR)에서 아티스트 "A2O LITE" 검색 | ✅ 아티스트 3건 |
| 한국 스토어에서 A2O LITE 곡 조회 (lookup) | ✅ `NEON · A2O & A2O LITE · 2026-10-13`, 600×600 커버 URL |
| 한국 스토어에서 **곡 검색** ("NEON A2O", "IVE", "에스파") | ⚠️ **전부 0건** |
| 미국 스토어(US)에서 "NEON A2O" | ✅ NEON 조회 |
| 미국 스토어에서 **한글** "아이브" | ✅ IVE 곡 3건 |
| 일본 스토어(JP)에서 "NEON A2O" | ✅ |

→ **한국 스토어는 곡 검색이 막혀 있고 조회(lookup)만 된다.** 검색은 US 스토어로 하고(한글 검색어도 동작), 링크는 KR 스토어 주소(`music.apple.com/kr/...`)로 바꿔서 쓴다.

**이용 조건 (Apple 문서 기준)**
- 미리듣기·뮤직비디오·**앨범 아트** 등 프로모션 콘텐츠는 **스토어 콘텐츠를 홍보하는 목적으로만** 사용할 수 있다
- 에셋은 **스토어 배지 가까이** 표시해야 한다 → 곡 상세에 **"Apple Music에서 듣기" 배지/링크**
- 미리듣기(30초 음원)를 쓰면 "provided courtesy of iTunes" 표기 필요 (MVP는 미리듣기 안 씀)
- 요청 제한: 분당 약 20회 수준으로 알려져 있음 → 곡 정보는 우리 DB에 저장해 두고, **커버 이미지는 Apple 주소를 그대로 불러온다 (파일로 복사해 두지 않음)**

**우리 서비스에 맞는 이유**: 올빗은 "이 곡 안무 배우러 가자"는 서비스라, 곡 화면에서 "Apple Music에서 듣기"로 연결하는 건 억지 조건이 아니라 **자연스러운 기능**이다.

**확인 필요**: 현재 유효한 약관 원문 (찾은 문서가 오래된 아카이브 문서). Apple Services Performance Partners(제휴 프로그램) 가입 시 조건이 더 명확해지고 제휴 수수료도 받을 수 있다.

### 3.2 Spotify Web API — 쓰지 않는 이유
- **개발 모드**: 앱 소유자가 Spotify **Premium** 이어야 하고, 로그인 사용자 **최대 5명**
- **확장 모드**(일반 서비스용): 2025-05-15부터 **법인만** 신청 가능, 출시된 서비스, **월간 활성 사용자 25만 명 이상** 등
- 디자인 규칙: 커버 원형 유지(자르기·블러·오버레이 금지), **Spotify 로고 필수**, **Spotify로 링크** 필수
- → 개인 프로젝트로 시작하는 올빗은 확장 모드 자격이 안 된다. 사용자 로그인 없이 카탈로그 검색만 하는 경우의 제한은 문서에 명확하지 않지만, 정식 서비스 근거로 삼기엔 위험하다.

### 3.3 Deezer API — 보조 후보
- 테스트: "A2O LITE NEON" → NEON (아티스트 표기 "A2O"), 1000×1000 커버. 아티스트 검색으로 **A2O LITE 아티스트 사진**도 받을 수 있음
- 한글 검색 "에스파"는 엉뚱한 결과 (에스나, 에스더) → 영문 검색 위주
- 가이드라인 페이지에는 이미지 사용 조건이 없고, 이용약관을 따르라고만 되어 있음
- → **아티스트 사진이 필요해지면** 이용약관 원문을 확인하고 쓴다

### 3.4 YouTube Data API — 안무 영상 (제안)
- 공식 MV, **Dance Practice(안무 연습 영상)**, 챌린지 영상은 거의 모든 K-pop 곡에 있다
- 허용: 공식 임베드 플레이어로 재생, 썸네일 표시 (YouTube가 출처임을 표시)
- 금지: 플레이어 변형·가리기, 오디오만 분리, 백그라운드 재생, 재생 전 다른 행동 강요
- 저장: API로 받은 데이터는 최대 30일 보관 후 갱신하거나 삭제
- 상업: 클라이언트 판매·자체 광고는 가능, YouTube 영상 자체에 붙는 광고·스폰서 판매는 승인 필요
- → 곡 상세에 **"안무 미리보기"** 영상 1개를 붙이면 "이 춤을 배우는구나"가 바로 보인다. 강사도 수강생도 결정이 빨라진다

---

## 4. 올빗에 적용하는 방법 (제안)

### 4.1 이미지 우선순위
| 위치 | 1순위 | 없을 때 |
|---|---|---|
| 곡 커버 (홈 카드, 곡 상세, 랭킹) | Apple 앨범 커버 | 아티스트 이니셜 + 그라데이션 기본 이미지 |
| 클래스 썸네일 | **강사가 직접 올린 사진** (동의받은 것) | 곡 커버 |
| 곡 상세 안무 미리보기 (제안) | YouTube 공식 임베드 | 영역 숨김 |

### 4.2 화면에 생기는 것
- 곡 상세 하단: **"Apple Music에서 듣기"** 배지 (Apple 배지 가이드라인 그대로)
- 커버 이미지는 **자르기·글자 겹치기 없이** 정사각형 그대로 쓴다 (Spotify 규칙만큼 엄격하지 않아도 원형 유지가 안전)
- 안무 영상을 넣으면 YouTube 출처 표시

### 4.3 곡 등록 흐름 변화 (F-13)
- 지금: 곡명·아티스트를 사람이 입력 → 운영자가 커버를 수동으로 넣음
- 바뀜: 곡 검색 시 **Apple 검색 결과에서 고르면** 곡명·아티스트·발매일·커버가 자동으로 채워진다. Apple에 없는 곡만 수동 등록
- 별칭(네온, 에이투오 라이트)과 한글 검색은 여전히 우리 DB가 담당 (Apple KR 검색이 막혀 있으므로)
- 같은 곡 중복이 Apple 곡 ID 기준으로 줄어든다 → 곡 병합(F-16) 운영 부담 감소

---

## 5. 남은 확인 사항

| # | 확인할 것 | 방법 |
|---|---|---|
| API-1 | Apple 프로모션 콘텐츠 현재 약관 원문 | Apple Services Performance Partners 가입 후 약관 확인 |
| API-2 | Apple 검색 요청 제한 실제 수치 | 개발 시 측정, 캐시 설계 |
| API-3 | Deezer 이용약관의 상업적 이용·이미지 조항 | developers.deezer.com 이용약관 원문 |
| API-4 | 안무 영상 기능을 MVP에 넣을지 | 공동 결정 (기능명세서 F-04 확장) |
| API-5 | 출시 전 법률 검토 | 커버·영상 사용 방식 최종 점검 |

## 출처
- [Spotify Design Guidelines](https://developer.spotify.com/documentation/design), [Spotify Quota Modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes), [Spotify Developer Terms](https://developer.spotify.com/terms), [Spotify 확장 접근 기준 변경 (2025-04-15)](https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access), [TechCrunch: 개발 모드 변경 (2026-02)](https://techcrunch.com/2026/02/06/spotify-changes-developer-mode-api-to-require-premium-accounts-limits-test-users/)
- [iTunes Search API 개요 (Apple 아카이브 문서)](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html), [Apple Services Performance Partners — Search API](https://performance-partners.apple.com/search-api), [Apple 개발자 포럼: 아트워크 사용](https://developer.apple.com/forums/thread/710261)
- [Cover Art Archive](https://coverartarchive.org/), [MusicBrainz: Cover Art Archive](https://musicbrainz.org/doc/Cover_Art_Archive)
- [Deezer 개발자 가이드라인](https://developers.deezer.com/guidelines)
- [YouTube API Services 개발자 정책](https://developers.google.com/youtube/terms/developer-policies), [YouTube Data API 할당량 비용](https://developers.google.com/youtube/v3/determine_quota_cost)
- 국내 음원 앱 이용자: [데일리안 (YouTube Music·멜론 역전, 과대 집계 지적)](https://www.dailian.co.kr/news/view/1122474/), [인사이트 (멜론 2위)](https://www.insight.co.kr/news/418981)
- [Music Story: 서비스용 메타데이터](https://music-story.com/en/for-music-services), [Soundcharts Metadata API](https://soundcharts.com/en/music-metadata-api)
