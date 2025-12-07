# 🌐 도메인 설정 가이드

마리아병원 예약 시스템의 관리자/환자 도메인 분리 설정 방법입니다.

## 📋 개요

| 용도 | 도메인 예시 | 접근 가능 페이지 |
|------|------------|-----------------|
| 환자용 | `reserve.maria-hospital.com` | `/`, `/login`, `/reserve`, `/mypage` |
| 관리자용 | `admin.maria-hospital.com` | `/admin/*` |

---

## 🚀 설정 방법

### 1단계: Vercel에 도메인 추가

1. [Vercel Dashboard](https://vercel.com) 접속
2. 프로젝트 선택 → **Settings** → **Domains**
3. 도메인 추가:
   - `reserve.maria-hospital.com` (환자용)
   - `admin.maria-hospital.com` (관리자용)

### 2단계: DNS 설정

도메인 등록업체(가비아, 카페24 등)에서 DNS 설정:

```
reserve.maria-hospital.com  CNAME  cname.vercel-dns.com
admin.maria-hospital.com    CNAME  cname.vercel-dns.com
```

### 3단계: 환경변수 설정

Vercel Dashboard → **Settings** → **Environment Variables**:

```bash
# 관리자 도메인
ADMIN_DOMAIN=admin.maria-hospital.com

# 환자 도메인
PATIENT_DOMAIN=reserve.maria-hospital.com

# 환자용 URL (알림톡 링크에 사용)
NEXT_PUBLIC_PATIENT_URL=https://reserve.maria-hospital.com

# 카카오 리다이렉트 URI 업데이트
NEXT_PUBLIC_KAKAO_REDIRECT_URI=https://reserve.maria-hospital.com/api/auth/kakao/callback
```

### 4단계: 카카오 개발자센터 업데이트

1. [카카오 개발자센터](https://developers.kakao.com) 접속
2. 앱 선택 → **카카오 로그인** → **Redirect URI** 추가:
   - `https://reserve.maria-hospital.com/api/auth/kakao/callback`

---

## 🔄 도메인별 동작

### 환자 도메인 (`reserve.maria-hospital.com`)

| URL | 동작 |
|-----|------|
| `/` | 환자 메인 페이지 |
| `/login` | 카카오 로그인 |
| `/reserve` | 예약하기 |
| `/mypage` | 마이페이지 |
| `/admin/*` | ❌ 접근 차단 → `/` 리다이렉트 |

### 관리자 도메인 (`admin.maria-hospital.com`)

| URL | 동작 |
|-----|------|
| `/` | → `/admin/dashboard` 리다이렉트 |
| `/admin/login` | 관리자 로그인 |
| `/admin/dashboard` | 대시보드 |
| `/admin/*` | 관리자 기능들 |
| `/reserve`, `/mypage` 등 | ❌ → `/admin/login` 리다이렉트 |

---

## ⚙️ 미들웨어 로직

`middleware.ts` 파일에서 처리:

```typescript
// 관리자 도메인에서 환자 페이지 접근 시
if (hostname.includes(ADMIN_DOMAIN) && !pathname.startsWith('/admin')) {
  return redirect('/admin/dashboard')
}

// 환자 도메인에서 관리자 페이지 접근 시
if (hostname.includes(PATIENT_DOMAIN) && pathname.startsWith('/admin')) {
  return redirect('/')
}
```

---

## 🧪 로컬 테스트

로컬에서 도메인 분리 테스트하려면:

1. `/etc/hosts` 파일 수정:
```
127.0.0.1  local-admin.test
127.0.0.1  local-patient.test
```

2. 환경변수 설정:
```bash
ADMIN_DOMAIN=local-admin.test
PATIENT_DOMAIN=local-patient.test
```

3. 브라우저에서 테스트:
- `http://local-admin.test:3000/admin/dashboard`
- `http://local-patient.test:3000/reserve`

---

## 🔒 보안 고려사항

1. **HTTPS 필수**: Vercel은 자동으로 SSL 인증서 발급
2. **쿠키 설정**: `sameSite: 'lax'`로 크로스 도메인 쿠키 허용
3. **CORS**: API는 모든 도메인에서 접근 가능 (vercel.json 설정)

---

## ❓ FAQ

### Q: 하나의 도메인만 사용해도 되나요?
A: 네! 환경변수를 비워두면 기존처럼 `/admin/*` 경로로 구분됩니다.

### Q: 서브도메인 대신 다른 도메인을 사용해도 되나요?
A: 네! `maria-admin.com`, `maria-reserve.com` 처럼 완전히 다른 도메인도 가능합니다.

### Q: 모바일 앱에서도 동일하게 동작하나요?
A: 네! API는 동일하게 동작합니다. 앱에서는 각 도메인의 API를 호출하면 됩니다.

