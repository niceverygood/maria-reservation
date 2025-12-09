# Firebase 전화번호 인증 설정 가이드

## 📱 개요

Firebase Phone Authentication을 사용하여 환자 전화번호 인증을 구현합니다.
- **무료 한도**: 월 10,000건 무료 (충분!)
- **인증 방식**: SMS 인증번호 6자리

---

## 1단계: Firebase 프로젝트 생성

### 1.1 Firebase Console 접속
1. https://console.firebase.google.com 접속
2. Google 계정으로 로그인
3. **"프로젝트 만들기"** 클릭

### 1.2 프로젝트 설정
1. 프로젝트 이름: `maria-hospital` (원하는 이름)
2. Google Analytics 설정 (선택사항, 꺼도 됨)
3. **"프로젝트 만들기"** 클릭

---

## 2단계: Phone Authentication 활성화

1. 좌측 메뉴에서 **Build > Authentication** 클릭
2. **"Get started"** 버튼 클릭
3. **"Sign-in method"** 탭 클릭
4. **"Phone"** 항목 클릭
5. **"Enable"** 토글 활성화
6. **"Save"** 클릭

---

## 3단계: 웹 앱 등록

### 3.1 앱 추가
1. 프로젝트 개요 페이지로 이동
2. **"</>"** (웹) 아이콘 클릭
3. 앱 닉네임: `maria-web`
4. Firebase Hosting은 체크 해제
5. **"앱 등록"** 클릭

### 3.2 SDK 구성 정보 복사
화면에 표시되는 firebaseConfig 정보를 복사:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "maria-hospital.firebaseapp.com",
  projectId: "maria-hospital",
  storageBucket: "maria-hospital.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## 4단계: 환경변수 설정

### 로컬 개발 (.env)
`.env` 파일에 다음 추가:

```env
# Firebase Phone Auth
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="maria-hospital.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="maria-hospital"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="maria-hospital.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abc123"
```

### Vercel 환경변수
Vercel Dashboard > Settings > Environment Variables에서 동일하게 추가

---

## 5단계: 도메인 승인 (중요!)

Firebase에서 인증이 작동하려면 도메인을 승인해야 합니다.

1. Firebase Console > Authentication > Settings
2. **"Authorized domains"** 섹션
3. 다음 도메인 추가:
   - `localhost` (이미 있음)
   - `maria-reservation.vercel.app` (Vercel 도메인)
   - 추후 커스텀 도메인도 추가

---

## 6단계: 테스트 전화번호 설정 (개발용)

실제 SMS 비용을 절약하기 위해 테스트 번호 설정:

1. Firebase Console > Authentication > Settings
2. **"Phone"** 섹션의 **"Phone numbers for testing"**
3. 테스트 번호 추가:
   - 전화번호: `+82 10-1234-5678`
   - 인증코드: `123456`

이 번호로 인증 시 실제 SMS 없이 테스트 가능!

---

## 컴포넌트 사용 방법

### 기본 사용

```tsx
import PhoneVerification from '@/components/patient/PhoneVerification'

function MyComponent() {
  const [phone, setPhone] = useState('')
  const [isVerified, setIsVerified] = useState(false)

  return (
    <PhoneVerification
      phone={phone}
      onPhoneChange={setPhone}
      onVerified={setIsVerified}
    />
  )
}
```

### 회원가입/로그인 폼에서 사용

```tsx
const handleSubmit = () => {
  if (!isVerified) {
    alert('전화번호 인증을 완료해주세요.')
    return
  }
  // 회원가입/로그인 처리
}
```

---

## 비용 안내

| 구간 | 비용 |
|------|------|
| 월 10,000건 | **무료** |
| 10,001건 ~ | $0.01/건 |

병원 예약 시스템에서는 월 10,000건으로 충분합니다!

---

## 트러블슈팅

### 1. "auth/unauthorized-domain" 에러
→ Firebase Console에서 도메인 승인 필요

### 2. "auth/too-many-requests" 에러
→ 너무 많은 요청. 잠시 후 재시도 또는 테스트 번호 사용

### 3. reCAPTCHA 로드 실패
→ Firebase API Key 확인, 도메인 승인 확인

### 4. 인증번호 미수신
→ 국제 SMS 수신 가능 여부 확인, 스팸함 확인

---

## 추가 보안 설정 (권장)

### reCAPTCHA 강화
Firebase Console > App Check 활성화로 봇 방지 강화

### 비율 제한
Firebase Security Rules로 요청 제한 설정 가능




