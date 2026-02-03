# 이름 기억하기 (Name Rememberer)

아이들의 이름을 기억할 수 있도록 도와주는 플래시카드 앱입니다.

## 기능

- **퀴즈**: 사진을 보고 한글 이름(3글자)을 입력
- **진도 추적**: 정답률과 개선 추이 확인
- **주간 이메일**: 설정한 요일에 퀴즈 알림 이메일 수신
- **관리자**: 아이 사진 및 이름 등록/관리

## 기술 스택

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Supabase (Database, Storage)
- **Email**: Resend
- **Hosting**: Vercel

## 로컬 개발

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env`를 만들고 값을 채워주세요:

```bash
cp .env.example .env
```

### 3. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. `supabase/schema.sql` 내용을 SQL Editor에서 실행
3. Storage에서 `children-photos` 버킷 생성 (Public으로 설정)
4. `supabase/storage-policies.sql` 실행

### 4. 개발 서버 시작

```bash
npm run dev
```

## 배포

### Vercel 배포

1. GitHub에 저장소 푸시
2. [Vercel](https://vercel.com)에서 Import
3. 환경 변수 설정:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `VITE_APP_URL`
   - `CRON_SECRET` (선택사항)

4. Deploy!

### Resend 이메일 설정

1. [Resend](https://resend.com)에서 계정 생성
2. 도메인 인증 또는 테스트용 이메일 사용
3. API 키 생성 후 환경 변수에 추가

## 관리자 설정

첫 번째 사용자를 관리자로 설정하려면 Supabase Dashboard에서:

```sql
UPDATE profiles SET is_admin = true WHERE email = 'admin@example.com';
```

## 프로젝트 구조

```
src/
├── components/          # UI 컴포넌트
│   ├── Layout.tsx       # 앱 레이아웃
│   ├── QuizCard.tsx     # 퀴즈 카드
│   └── ProgressChart.tsx# 진도 차트
├── context/
│   └── AuthContext.tsx  # 인증 컨텍스트
├── lib/
│   ├── supabase.ts      # Supabase 클라이언트
│   ├── database.types.ts# 타입 정의
│   └── koreanName.ts    # 한글 이름 검증
├── pages/
│   ├── Home.tsx         # 대시보드
│   ├── Quiz.tsx         # 퀴즈 페이지
│   ├── Admin.tsx        # 관리자 페이지
│   ├── Settings.tsx     # 설정 페이지
│   └── Login.tsx        # 로그인 페이지
└── api/
    └── send-quiz-email.ts # 이메일 전송 API

supabase/
├── schema.sql           # 데이터베이스 스키마
└── storage-policies.sql # 스토리지 정책
```

## 라이선스

MIT
# good-morning-name-rememberer
