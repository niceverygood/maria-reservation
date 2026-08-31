# 코덱스 실행 프롬프트 — 시간대 차단 복수 등록

실행 위치: `~/maria-work` (teemartbottle/maria-reservation 클론)
아래 블록 전체를 코덱스에 붙여넣는다.

---

난임병원 예약 CRM(Next.js 16 + Prisma 5 + PostgreSQL)의 관리자 기능을 고쳐줘.
작업 디렉터리는 이 저장소 루트다. 먼저 코드를 읽고 계획을 보여준 뒤,
내가 승인하면 구현해라. 승인 전에 파일을 고치지 마라.

## 요구사항

관리자의 [예외일 설정] 화면에서 "시간대 차단"을 **같은 날짜에 여러 건** 등록할 수 있게 해줘.
예: 2026-09-15 에 10:00~11:00 과 14:00~15:00 을 둘 다 막기.
지금은 두 번째를 저장하면 첫 번째가 사라진다.

## 원인 (이미 조사 완료 — 다시 조사하지 말고 사실로 받아들여라)

1. `prisma/schema.prisma` 의 `ScheduleException` 에 `@@unique([doctorId, date])` 가 있고,
   `app/api/admin/schedule-exceptions/route.ts` 의 POST 가
   `upsert({ where: { doctorId_date: { doctorId, date } } })` 로 저장한다.
   같은 날짜의 두 번째 저장은 새 행 생성이 아니라 기존 행 갱신이 된다.

2. `ScheduleException` 이 가진 시간 필드는 `customStart` / `customEnd` 한 쌍뿐이라
   구조적으로 구간을 하나만 담는다.

3. 이 시스템이 실제로 시간대를 막는 경로는 `ScheduleTemplate.slotSettings`
   (String? @db.Text) 에 든 JSON 이다:
   `{ "defaultCapacity": 1, "customSlots": { "14:00": { "type": "OFF", "capacity": 0 } } }`
   `lib/reservation/slotCalculator.ts` 가 이걸 파싱해 `configMap` 으로 펼치고
   `type: 'OFF'` 인 슬롯을 막는다. 쓰기는 `app/api/admin/schedule-manager/route.ts`.
   한계는 이게 **요일 단위이고 영구**라서 특정 날짜만 막을 수 없다는 점이다.

4. `DoctorBlockedTime` 모델이 스키마에 있지만 슬롯 계산이 전혀 읽지 않는다. 죽은 테이블이다.

## 설계 (확정됐다. 다른 방식을 제안하지 마라)

`ScheduleException` 에 `slotOverrides` 컬럼을 추가하고, 값의 모양을 이미 쓰고 있는
`customSlots` 와 **동일하게** 맞춘다. `type` 에 `'BLOCK'` 을 추가한다.
`BLOCK` 의 뜻은 "그날은 평소 템플릿대로 하되 `slotOverrides` 에 있는 시간만 뺀다".

```prisma
model ScheduleException {
  // 기존 필드 전부 유지
  slotOverrides String? @db.Text  // { "14:00": { "type": "OFF", "capacity": 0 }, ... }
}
```

병합 우선순위: `defaultCapacity` → 템플릿 `customSlots` → 예외일 `slotOverrides`.
시간이 map 이므로 같은 날짜에 구간이 몇 개든 한 행에 담긴다.

## 금지 사항

- **새 테이블을 만들지 마라.** `DoctorBlockedTime` 을 되살리지도 마라.
  차단 경로가 두 갈래로 갈라지면 안 된다. 차단 개념은 `customSlots` 하나로 유지한다.
- `@@unique([doctorId, date])` 를 제거하지 마라.
- `endDate` 기반 연속 날짜 저장 로직을 건드리지 마라.
- 기존 `OFF` / `CUSTOM` 예외일 동작을 바꾸지 마라.
- 슬롯 간격을 하드코딩하지 마라.

## 변경할 파일

1. `prisma/schema.prisma`
   `ScheduleException` 에 `slotOverrides String? @db.Text` 추가.
   마이그레이션 파일 생성. 기존 행은 NULL 이므로 동작 변화가 없어야 한다.

2. `lib/reservation/slotCalculator.ts`
   `customSlots` 를 `configMap` 에 적용한 직후, 그 날짜 예외일의 `slotOverrides` 를
   파싱해 같은 `configMap` 에 덮어쓴다. JSON 파싱 실패는 기존 코드와 같이
   `console.error` 로 삼키고 차단 없이 진행한다.

3. `lib/slots/precompute.ts`
   `DailySlotSummary` 사전 계산에도 동일한 병합을 적용한다.
   빠지면 달력의 잔여 건수가 실제 슬롯과 어긋난다.

4. `app/api/patient/slots/count-by-date/route.ts`
   이 파일도 `customSlots` 를 자체적으로 반영하고 있다. 여기도 동일 병합이 필요하다.
   빠지면 달력 숫자와 상세 화면이 불일치한다.

5. `app/api/admin/schedule-exceptions/route.ts`
   POST 에서 `type === 'BLOCK'` 이면 요청 본문의 구간 배열
   `blocks: [{ startTime, endTime }, ...]` 을 받아, 그날 적용되는 `ScheduleTemplate` 의
   `slotIntervalMinutes` 로 시각 목록을 펼쳐 `slotOverrides` JSON 을 만든다.
   기존 `invalidateSlotCache` / `updateSlotSummary` 호출 경로를 그대로 탄다.
   구간이 비었거나 `startTime >= endTime` 이면 400 을 반환한다.

6. `app/(admin)/admin/schedule-exceptions/page.tsx`
   유형 선택에 "시간대 차단"을 추가한다.
   시작/종료 한 쌍을 여러 개 넣을 수 있는 입력을 만든다
   (구간 추가 버튼 + 각 행 삭제 버튼).
   목록에서는 차단된 구간들을 한 줄로 요약해 보여준다 (예: `10:00~11:00, 14:00~15:00`).
   기존 화면의 코드 스타일, 토스트, 로딩 처리 방식을 그대로 따라라.

## 반드시 처리할 경계 조건

- **이미 잡힌 예약**: 차단해도 기존 예약은 사라지지 않는다. 저장 시 해당 구간의
  활성 예약(status 가 PENDING 또는 BOOKED)을 세어, 있으면 응답에 건수를 담고
  화면에서 "이 구간에 예약 N건이 있습니다" 경고를 보여줘라. 저장 자체는 막지 마라.
- **경계**: `[시작, 종료)` 반개구간으로 통일한다. 14:00~15:00 을 막으면 15:00 은 살아 있다.
- **슬롯 간격**: 구간을 펼칠 때 반드시 그날 템플릿의 `slotIntervalMinutes` 를 쓴다.
- **연속 날짜**: `BLOCK` 은 단일 날짜만 지원한다. `endDate` 가 함께 오면 400 으로 거절하라.
- **타임존**: 날짜 문자열은 기존 코드처럼 `YYYY-MM-DD` 로 다루고
  `new Date().toISOString()` 로 오늘 날짜를 만드는 기존 방식을 그대로 따라라.

## 검증

구현 후 아래를 확인하고 결과를 보고해라.

1. `npm run build` 가 통과한다.
2. `npx tsc --noEmit` 에 새 오류가 없다.
3. 같은 날짜에 두 구간을 등록하면 둘 다 남고, 둘 다 예약 화면에서 사라진다.
4. 차단 구간의 종료 시각은 예약 가능하다 (반개구간).
5. 달력 잔여 건수, `count-by-date` 응답, 예약 상세 슬롯이 서로 일치한다.
6. 차단을 삭제하면 슬롯이 되살아난다.
7. 기존 `OFF` / `CUSTOM` 예외일 동작에 변화가 없다.

DB 에 연결할 수 없으면 3~7 은 코드 경로를 따라가며 논리적으로 검증하고,
직접 실행하지 못했다고 명확히 밝혀라. 통과했다고 지어내지 마라.

## 커밋

`feat/blocked-times-multi` 브랜치를 새로 만들어 작업해라.
`main` 에 직접 커밋하지 마라. 커밋 메시지는 한국어로, 무엇을 왜 바꿨는지 쓴다.
내가 확인하기 전에는 push 하지 마라.
