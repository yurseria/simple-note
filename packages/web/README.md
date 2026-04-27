# Simple Note — Web (PWA)

Google Drive 기반 오프라인 지원 노트 앱. Next.js 14 App Router.

---

## 1. Google Cloud Console 설정 (최초 1회)

### 1-1. 프로젝트 생성

1. [console.cloud.google.com](https://console.cloud.google.com) → 프로젝트 선택 → **새 프로젝트**

### 1-2. Drive API 활성화 (필수)

1. **API 및 서비스 → 라이브러리**
2. `Google Drive API` 검색 → **사용 설정**

> ⚠️ 이 단계를 건너뛰면 "Drive API has not been used" 403 오류가 납니다.

### 1-3. OAuth 동의 화면

1. **API 및 서비스 → OAuth 동의 화면**
2. 사용자 유형: **외부** → 만들기
3. 앱 이름·이메일 입력 → 저장
4. **테스트 사용자**에 본인 Google 계정 추가 (게시 전까지 필수)

### 1-4. OAuth 클라이언트 ID 생성

1. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
2. 애플리케이션 유형: **웹 애플리케이션**
3. 승인된 리디렉션 URI 추가:
   - 로컬: `http://localhost:3000/auth/callback`
   - 프로덕션: `https://your-domain.com/auth/callback`
4. 만들기 → **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사

---

## 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 편집:

```env
# 필수 — Google Cloud Console에서 복사
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxx

# 선택 — 생략 시 http://localhost:3000/auth/callback 자동 사용
# NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
```

> `GOOGLE_CLIENT_SECRET`은 서버에서만 사용 (NEXT_PUBLIC_ 없음). 클라이언트 번들에 노출되지 않습니다.

---

## 3. 개발 서버 실행

```bash
# packages/web 디렉토리에서
npm run dev

# 또는 monorepo 루트에서
npm run dev:web
```

→ [http://localhost:3000](http://localhost:3000)

---

## 4. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `client_secret is missing` | `.env.local`에 `GOOGLE_CLIENT_SECRET` 없음 | 환경변수 추가 후 서버 재시작 |
| `Drive API has not been used` | Drive API 미활성화 | Cloud Console에서 Drive API 사용 설정 |
| `access_denied` | 테스트 사용자 미등록 | OAuth 동의 화면 → 테스트 사용자에 계정 추가 |
| `redirect_uri_mismatch` | 리디렉션 URI 불일치 | Cloud Console 클라이언트 설정에 URI 추가 |
| 로그인 후 목록 안 뜸 | 토큰 갱신 실패 | 로그아웃 후 재로그인 |

---

## 5. 배포 (Vercel 기준)

1. Vercel 대시보드 → 프로젝트 → **Settings → Environment Variables**
2. `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 추가
3. Cloud Console 리디렉션 URI에 프로덕션 도메인 추가
