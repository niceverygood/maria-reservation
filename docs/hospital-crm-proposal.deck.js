const pptxgen = require('pptxgenjs')

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE' // 13.333 x 7.5
pres.author = '병원 스마트 AI CRM'
pres.title = '병원 스마트 CRM 제안서'

/* ---------------------------------------------------------------
   PALETTE — carried over from the web proposal so both deliverables
   read as one system, and so neither is mistaken for the 피움 deck.
   --------------------------------------------------------------- */
const C = {
  deep:      '0B2338', // darkest navy — title / divider grounds
  deepCard:  '11314C', // card on dark ground
  navy:      '183C5C', // primary
  navy2:     '3A73A8', // support
  navyTint:  'EAF0F6',
  navyLine:  'C3D5E6',
  coral:     'B23B26', // loss / urgency only
  coralTint: 'FBEDE9',
  ink:       '111820',
  ink2:      '2E3A48',
  muted:     '5A6878',
  faint:     '8B98A6',
  rule:      'DFE3E9',
  paper:     'F5F6F8',
  white:     'FFFFFF',
  onDark:    'A9C4DA',
  onDarkDim: '6E8CA6',
  accentLt:  '7FB6E8',
}

// PowerPoint substitutes silently for fonts the viewer lacks, so this deck
// stays on a face that ships with both Windows and macOS Korean systems.
const F = 'Malgun Gothic'

const W = 13.333
const H = 7.5
const M = 0.62
const CW = W - M * 2

/* ---------------------------------------------------------------
   HELPERS
   --------------------------------------------------------------- */
function lightBg(s) { s.background = { color: C.paper } }
function darkBg(s) { s.background = { color: C.deep } }

function kicker(s, text, opts = {}) {
  s.addText(text, {
    x: M, y: 0.44, w: CW, h: 0.3,
    fontFace: F, fontSize: 11, bold: true,
    color: opts.color || C.navy2, charSpacing: 2.2, margin: 0, valign: 'middle',
  })
}

function heading(s, text, opts = {}) {
  s.addText(text, {
    x: M, y: opts.y || 0.8, w: opts.w || CW, h: opts.h || 0.72,
    fontFace: F, fontSize: opts.fs || 30, bold: true,
    color: opts.color || C.ink, margin: 0, valign: 'middle',
  })
}

function subheading(s, text, opts = {}) {
  s.addText(text, {
    x: M, y: opts.y || 1.54, w: opts.w || 11.0, h: opts.h || 0.54,
    fontFace: F, fontSize: opts.fs || 13, color: opts.color || C.muted,
    margin: 0, valign: 'top', lineSpacing: 19,
  })
}

function pageNum(s, n, onDark) {
  s.addText(String(n).padStart(2, '0'), {
    x: W - M - 0.7, y: H - 0.6, w: 0.7, h: 0.3,
    align: 'right', fontFace: F, fontSize: 10,
    color: onDark ? C.onDarkDim : C.faint, margin: 0, valign: 'middle',
  })
}

// A plain card — tint or outlined, no rounded corners anywhere in this deck.
function card(s, x, y, w, h, tone) {
  const fill = tone === 'navy' ? C.navyTint
    : tone === 'coral' ? C.coralTint
    : tone === 'dark' ? C.deepCard
    : C.white
  s.addShape(pres.ShapeType.rect, {
    x, y, w, h,
    fill: { color: fill },
    line: tone === 'plain' ? { color: C.rule, width: 0.75 } : { type: 'none' },
  })
}

function hairline(s, y, opts = {}) {
  s.addShape(pres.ShapeType.rect, {
    x: opts.x ?? M, y, w: opts.w ?? CW, h: opts.thick || 0.02,
    fill: { color: opts.color || C.ink },
  })
}

function chip(s, x, y, w, text) {
  s.addShape(pres.ShapeType.rect, {
    x, y, w, h: 0.28, fill: { color: C.navyTint },
    line: { color: C.navyLine, width: 0.75 },
  })
  s.addText(text, {
    x, y, w, h: 0.28, align: 'center', valign: 'middle',
    fontFace: F, fontSize: 9, bold: true, color: C.navy2, margin: 0,
  })
}

/* ===============================================================
   01 — TITLE
   =============================================================== */
{
  const s = pres.addSlide()
  darkBg(s)

  s.addText([
    { text: '제품명', options: { color: C.accentLt, bold: true } },
    { text: '   병원 스마트 AI CRM · 진료과 불문', options: { color: C.onDarkDim, bold: false } },
  ], {
    x: M, y: 0.62, w: CW, h: 0.32,
    fontFace: F, fontSize: 12, charSpacing: 1.4, margin: 0, valign: 'middle',
  })

  hairline(s, 1.02, { color: '1E4463', thick: 0.014 })

  s.addText('예약 한 건을 잡는 데,', {
    x: M, y: 2.16, w: 11.4, h: 0.86,
    fontFace: F, fontSize: 42, bold: true, color: C.white, margin: 0, valign: 'middle',
  })
  s.addText([
    { text: '병원은 아직 ', options: { color: C.white } },
    { text: '전화', options: { color: C.accentLt } },
    { text: '를 씁니다.', options: { color: C.white } },
  ], {
    x: M, y: 3.0, w: 11.4, h: 0.86,
    fontFace: F, fontSize: 42, bold: true, margin: 0, valign: 'middle',
  })

  s.addText('진료과가 달라도 병목은 같습니다 — 전화, 노쇼, 끊긴 재방문.\n국내에서 예약 규칙이 가장 까다로운 난임 분야에서 점유율 1위 마리아병원의 예약 CRM을 구축해 운영에 올렸습니다.', {
    x: M, y: 4.12, w: 9.6, h: 0.9,
    fontFace: F, fontSize: 13.5, color: C.onDark, margin: 0, valign: 'top', lineSpacing: 22,
  })

  hairline(s, 5.6, { color: '1E4463', thick: 0.014 })

  s.addText('사업 소개서 · 2026 · Rev. 1.0', {
    x: M, y: 5.86, w: CW, h: 0.3,
    fontFace: F, fontSize: 11, color: C.onDarkDim, charSpacing: 1.4, margin: 0, valign: 'middle',
  })

  s.addNotes('첫 문장이 이 제안의 전부입니다. 병원이 아직 전화로 예약을 받고 있다는 사실과, 그 비용이 장부에 잡히지 않는다는 점을 먼저 인정하게 만드는 것이 목적입니다.')
}

/* ===============================================================
   02 — 요약
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '요약')
  heading(s, '세 가지만 기억해 주십시오')

  const items = [
    ['01', '가장 까다로운 예약부터 검증했습니다',
      '난임 진료는 환자의 주기가 일정을 정하고, 이틀 간격으로 반복 내원하며, 시술 슬롯이 의료진과 시술실을 함께 묶습니다. 그 구조를 마리아병원에서 실제 운영에 올렸습니다.',
      '일반 진료과의 예약 규칙은 이 구조의 부분집합입니다.'],
    ['02', '진료과가 달라도 손실이 나는 자리는 같습니다',
      '전화가 예약의 기본 경로이고, 잡힌 예약의 일부는 오지 않으며, 끊긴 재방문은 신호 없이 사라집니다. 다섯 개 병목 모두 장부에 비용으로 잡히지 않습니다.',
      'AI를 새 기능이 아니라 그 다섯 지점에 직접 붙입니다.'],
    ['03', '구축비 부담을 덜어냈습니다',
      '초기 구축비를 최소화하고 월 구독료로 나눠 받습니다. 도입 첫해에 목돈이 나가지 않는 구조입니다.',
      '구축 100만원부터 · 월 59만원부터.'],
  ]

  const cw = (CW - 0.44 * 2) / 3
  items.forEach((it, i) => {
    const x = M + i * (cw + 0.44)
    card(s, x, 2.24, cw, 3.86, 'plain')

    s.addText(it[0], {
      x: x + 0.34, y: 2.5, w: 1.0, h: 0.34,
      fontFace: F, fontSize: 13, bold: true, color: C.navy2, margin: 0, valign: 'middle',
    })
    s.addText(it[1], {
      x: x + 0.34, y: 2.92, w: cw - 0.68, h: 0.82,
      fontFace: F, fontSize: 16, bold: true, color: C.ink, margin: 0, valign: 'top', lineSpacing: 24,
    })
    s.addText(it[2], {
      x: x + 0.34, y: 3.86, w: cw - 0.68, h: 1.32,
      fontFace: F, fontSize: 11.5, color: C.muted, margin: 0, valign: 'top', lineSpacing: 18,
    })
    s.addShape(pres.ShapeType.rect, {
      x: x + 0.34, y: 5.24, w: cw - 0.68, h: 0.012, fill: { color: C.rule },
    })
    s.addText(it[3], {
      x: x + 0.34, y: 5.36, w: cw - 0.68, h: 0.56,
      fontFace: F, fontSize: 11.5, bold: true, color: C.navy, margin: 0, valign: 'top', lineSpacing: 17,
    })
  })

  pageNum(s, 2)
}

/* ===============================================================
   03 — 진단 · 공통 병목
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '진단')
  heading(s, '진료과가 달라도, 손실이 나는 자리는 같습니다')
  subheading(s, '아래 다섯 가지는 정형외과든 피부과든 내과든 거의 예외 없이 발견됩니다. 문제는 이것들이 장부에 비용으로 잡히지 않는다는 점입니다.')

  const rows = [
    ['01', '예약의 기본 경로가 아직 전화입니다', '진료 시작 직후와 점심 직전에 통화가 몰립니다. 연결되지 않은 전화는 어디에도 남지 않습니다.', '보이지 않는 비용', '놓친 통화는 집계되지 않습니다.'],
    ['02', '노쇼와 당일 취소가 빈자리로 남습니다', '대체 환자를 채우려면 누군가 전화를 돌려야 합니다. 바쁜 날일수록 그럴 여유가 없습니다.', '회복 불가 매출', '지나간 시간대는 되팔 수 없습니다.'],
    ['03', '재방문이 조용히 끊깁니다', '치료 회차가 남았는데 오지 않는 환자, 검진 시기가 지난 환자. 항의 없이 그냥 사라집니다.', '생애가치 손실', '신규 유치가 재방문 유도보다 비쌉니다.'],
    ['04', '일정 하나가 바뀌면 수십 건이 흔들립니다', '학회·수술·휴가로 진료 시간이 바뀔 때마다 손으로 옮기고 일일이 연락합니다.', '운영 리스크', '재배치 실수는 현장에서 드러납니다.'],
    ['05', '예약과 차트를 따로 입력합니다', '옮겨 적는 사이에 빠지는 건이 생기고, 통계는 월말에 손으로 셉니다.', '데이터 신뢰도', '지표가 실시간이 아닙니다.'],
  ]

  hairline(s, 2.24)

  let y = 2.4
  rows.forEach((r) => {
    s.addText(r[0], {
      x: M, y, w: 0.5, h: 0.44,
      fontFace: F, fontSize: 11, color: C.navy2, margin: 0, valign: 'middle',
    })
    s.addText(r[1], {
      x: M + 0.56, y, w: 3.9, h: 0.44,
      fontFace: F, fontSize: 13.5, bold: true, color: C.ink, margin: 0, valign: 'middle',
    })
    s.addText(r[2], {
      x: M + 4.62, y, w: 3.9, h: 0.44,
      fontFace: F, fontSize: 10.5, color: C.muted, margin: 0, valign: 'middle', lineSpacing: 14,
    })

    // coral strip: what it costs
    s.addShape(pres.ShapeType.rect, {
      x: M + 8.72, y: y + 0.02, w: 0.035, h: 0.4, fill: { color: C.coral },
    })
    s.addText(r[3], {
      x: M + 8.86, y: y - 0.02, w: 3.2, h: 0.24,
      fontFace: F, fontSize: 8.5, bold: true, color: C.coral, charSpacing: 1, margin: 0, valign: 'middle',
    })
    s.addText(r[4], {
      x: M + 8.86, y: y + 0.18, w: 3.2, h: 0.26,
      fontFace: F, fontSize: 10.5, color: C.ink2, margin: 0, valign: 'middle',
    })

    s.addShape(pres.ShapeType.rect, {
      x: M, y: y + 0.54, w: CW, h: 0.012, fill: { color: C.rule },
    })
    y += 0.72
  })

  pageNum(s, 3)
  s.addNotes('다섯 개 모두 "비용으로 안 잡힌다"는 공통점이 있습니다. 그래서 병원은 손실이 나는 줄 모릅니다. 여기서 원장님이 하나라도 짚어주시면 그 항목으로 대화를 이어가시면 됩니다.')
}

/* ===============================================================
   04 — 레퍼런스 (dark)
   =============================================================== */
{
  const s = pres.addSlide()
  darkBg(s)
  kicker(s, '레퍼런스', { color: C.accentLt })
  heading(s, '가장 까다로운 예약부터 만들었습니다', { color: C.white })
  subheading(s, '난임 진료의 예약 규칙은 국내 진료과 가운데 가장 복잡한 축에 듭니다. 그 시스템을 설계·구축해 실제 운영에 올렸습니다.', { color: C.onDark })

  const cols = [
    ['몸이 날짜를 정합니다', '주기가 시작되면 2~3일 안에 내원해야 합니다. 환자가 “언제 오실 수 있나요”에 답하는 구조가 아닙니다.'],
    ['이틀 간격으로 반복됩니다', '배란 모니터링 구간에는 하루 이틀 간격으로 다시 옵니다. 한 주기에 평균 5~8회 내원합니다.'],
    ['시술 슬롯이 자원을 묶습니다', '채취·이식은 의료진과 시술실이 함께 잡힙니다. 한 건의 노쇼가 그날 전체의 공백이 됩니다.'],
  ]

  const cw = (CW - 0.5 * 2) / 3
  cols.forEach((c, i) => {
    const x = M + i * (cw + 0.5)
    card(s, x, 2.36, cw, 1.86, 'dark')
    s.addText(c[0], {
      x: x + 0.32, y: 2.58, w: cw - 0.64, h: 0.36,
      fontFace: F, fontSize: 15, bold: true, color: C.white, margin: 0, valign: 'middle',
    })
    s.addText(c[1], {
      x: x + 0.32, y: 3.0, w: cw - 0.64, h: 1.0,
      fontFace: F, fontSize: 11.5, color: C.onDark, margin: 0, valign: 'top', lineSpacing: 18,
    })
  })

  s.addText('일반 진료과의 예약 규칙은 이 구조의 부분집합입니다. 어려운 쪽을 먼저 만들었기 때문에, 진료과를 옮길 때 새로 만들 것이 적습니다.', {
    x: M, y: 4.54, w: 10.6, h: 0.44,
    fontFace: F, fontSize: 14, bold: true, color: C.accentLt, margin: 0, valign: 'middle',
  })

  hairline(s, 5.24, { color: '1E4463', thick: 0.014 })

  const facts = [
    ['납품 · 운영', '마리아병원'],
    ['동시 운영 지점', '3곳'],
    ['API 엔드포인트', '56개'],
    ['알림톡 시나리오', '7종'],
    ['배포 리전', '서울 ICN'],
  ]
  const fw = CW / 5
  facts.forEach((f, i) => {
    const x = M + i * fw
    s.addText(f[0], {
      x, y: 5.5, w: fw - 0.2, h: 0.26,
      fontFace: F, fontSize: 9.5, color: C.onDarkDim, charSpacing: 1.2, margin: 0, valign: 'middle',
    })
    s.addText(f[1], {
      x, y: 5.78, w: fw - 0.2, h: 0.38,
      fontFace: F, fontSize: 17, bold: true, color: C.white, margin: 0, valign: 'middle',
    })
  })

  pageNum(s, 4, true)
}

/* ===============================================================
   05 — 운영 중인 코어 기능
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '레퍼런스 · 구현 범위')
  heading(s, '지금 운영 중인 코어 기능')
  subheading(s, '아래 전부가 신규 병원 도입 시 그대로 제공됩니다. 개념 검증이나 데모가 아니라 환자·데스크·의료진이 매일 쓰는 화면과 API입니다.')

  const none = { type: 'none' }
  const line = (pt, color) => [none, none, { pt, color }, none]

  const head = ['영역', '구현 내용', '상태']
  const body = [
    ['환자 예약 웹', '카카오 로그인 & 본인인증, 의료진별 예약, 가능 날짜 캘린더, 조회·변경·취소, 진료 이력', '운영 중'],
    ['데스크 관리자', '실시간 대시보드, 대리 예약, 환자 관리, 당일 현황, 전날 변경 브리핑, 기간별 통계', '운영 중'],
    ['의료진 스케줄', '요일 템플릿, 휴진·단축·시간대 차단 예외일, 시간대별 예약 정원, 타임라인 뷰', '운영 중'],
    ['변경 승인 흐름', '의료진 변경·휴진 요청을 관리자가 승인·반려 — 사유와 이력이 남는 결재 구조', '운영 중'],
    ['카카오 알림톡', '확정·변경·취소·거절, 1일 전 / 당일 리마인더, 상태 변경 — 7종 및 발송 로그·재발송', '운영 중'],
    ['EMR 등록 관리', '예약 건별 반영 여부·시각·처리자 기록, 미등록 건 필터 — 이중 입력 누락 방지', '운영 중'],
    ['운영 안정성', '야간 배치로 4주치 슬롯 사전 계산, 변경 횟수 제한, 감사 로그, 환자·관리자 도메인 분리', '운영 중'],
  ]

  const rows = [head.map((t, i) => ({
    text: t,
    options: {
      bold: true, fontSize: 9.5, color: C.faint, charSpacing: 1.2,
      align: i === 2 ? 'center' : 'left', border: line(1.4, C.ink), valign: 'bottom',
    },
  }))]
  body.forEach((r) => {
    rows.push(r.map((t, i) => ({
      text: t,
      options: {
        fontSize: i === 0 ? 12 : 11,
        bold: i === 0,
        color: i === 0 ? C.ink : (i === 2 ? C.good : C.ink2),
        align: i === 2 ? 'center' : 'left',
        border: line(0.5, C.rule), valign: 'middle',
      },
    })))
  })

  s.addTable(rows, {
    x: M, y: 2.3, w: CW, colW: [2.4, 8.2, 1.493], rowH: 0.42,
    fontFace: F, margin: [4, 8, 4, 0],
  })

  s.addText('기술 구성: Next.js · TypeScript · PostgreSQL · Prisma, 서울(ICN) 리전 배포. 진료량이 많은 병원의 조회 부하를 전제로 슬롯 계산을 사전 배치화했습니다.', {
    x: M, y: 6.24, w: CW - 0.9, h: 0.36,
    fontFace: F, fontSize: 10.5, color: C.muted, margin: 0, valign: 'middle',
  })

  pageNum(s, 5)
}

/* ===============================================================
   06 — 진료과별 적용 ①
   =============================================================== */
function deptSlide(s, kick, title, sub, items, page, note) {
  lightBg(s)
  kicker(s, kick)
  heading(s, title)
  if (sub) subheading(s, sub)

  const cw = (CW - 0.5 * 2) / 3
  items.forEach((d, i) => {
    const x = M + i * (cw + 0.5)
    card(s, x, 2.34, cw, 3.5, 'plain')

    s.addText(d[0], {
      x: x + 0.32, y: 2.54, w: cw - 0.64, h: 0.34,
      fontFace: F, fontSize: 15.5, bold: true, color: C.ink, margin: 0, valign: 'middle',
    })
    s.addText(d[1], {
      x: x + 0.32, y: 2.88, w: cw - 0.64, h: 0.28,
      fontFace: F, fontSize: 10.5, bold: true, color: C.navy2, margin: 0, valign: 'middle',
    })
    s.addText(d[2], {
      x: x + 0.32, y: 3.24, w: cw - 0.64, h: 1.0,
      fontFace: F, fontSize: 11, color: C.muted, margin: 0, valign: 'top', lineSpacing: 17,
    })
    s.addShape(pres.ShapeType.rect, {
      x: x + 0.32, y: 4.32, w: cw - 0.64, h: 0.012, fill: { color: C.rule },
    })
    s.addText('대응', {
      x: x + 0.32, y: 4.42, w: 1.0, h: 0.24,
      fontFace: F, fontSize: 8.5, bold: true, color: C.faint, charSpacing: 1.2, margin: 0, valign: 'middle',
    })
    s.addText(d[3], {
      x: x + 0.32, y: 4.66, w: cw - 0.64, h: 1.0,
      fontFace: F, fontSize: 11, color: C.ink2, margin: 0, valign: 'top', lineSpacing: 17,
    })
  })

  if (note) {
    card(s, M, 6.06, CW - 0.9, 0.62, 'navy')
    s.addText(note, {
      x: M + 0.3, y: 6.06, w: CW - 1.5, h: 0.62,
      fontFace: F, fontSize: 10.5, color: C.navy, margin: 0, valign: 'middle', lineSpacing: 15,
    })
  }
  pageNum(s, page)
}

{
  const s = pres.addSlide()
  deptSlide(s, '적용',
    '진료과마다 다른 것은 예약의 ‘모양’입니다',
    '예약 엔진·스케줄·알림·통계는 공통입니다. 달라지는 것은 한 번의 진료가 몇 회에 걸쳐 이어지는가, 무엇이 자원을 묶는가입니다.',
    [
      ['정형외과 · 재활의학과', '반복 예약이 기본 단위',
        '도수치료·물리치료는 주 2~3회를 몇 주간 같은 시간대로 잡습니다. 한 건씩 예약하면 데스크도 환자도 지칩니다.',
        '회차 예약을 한 번에 생성하고 치료사별로 자원을 분리해 배정합니다. 회차가 끝나갈 때 연장 안내를 자동 발송합니다.'],
      ['피부과 · 성형외과', '상담과 시술이 분리된 흐름',
        '상담과 시술의 소요 시간이 다르고, 시술 후 경과 관찰 시점을 놓치면 재방문이 끊깁니다.',
        '예약 종류별로 슬롯 길이를 다르게 잡고, 시술일 기준으로 경과 관찰 리콜을 자동 예약합니다. 패키지 잔여 회차를 표시합니다.'],
      ['내과 · 검진센터', '항목에 따라 시간이 다름',
        '기본 검진과 내시경 포함 검진은 소요 시간과 준비사항이 전혀 다릅니다. 준비를 안 하고 오면 그날 검사가 무산됩니다.',
        '항목 조합에 따라 슬롯 길이를 자동 산출하고, 금식·복약 중단 안내를 시점에 맞춰 발송합니다. 사전 문진을 예약 단계에서 받습니다.'],
    ], 6)
}

/* ===============================================================
   07 — 진료과별 적용 ②
   =============================================================== */
{
  const s = pres.addSlide()
  deptSlide(s, '적용 · 계속',
    '치과 · 산부인과 · 소아청소년과',
    null,
    [
      ['치과', '치료 계획이 곧 예약 계획',
        '임플란트·교정은 몇 달에 걸친 회차 진료입니다. 중간에 한 번 끊기면 계획 전체가 늘어집니다.',
        '치료 계획 단계별로 다음 예약을 제안하고, 정기 스케일링 대상자를 주기적으로 추출해 리콜합니다.'],
      ['산부인과 · 난임', '몸이 날짜를 정함',
        '주기 시작 시점이 예약을 결정하고, 모니터링은 하루 이틀 간격으로 반복됩니다. 마리아병원에서 검증된 영역입니다.',
        '주기 단계별 예약 규칙, 다음 내원 시점 예측 리콜, 시술 슬롯 우선 배정을 그대로 제공합니다.'],
      ['소아청소년과', '보호자가 예약하고 아이가 옴',
        '예방접종은 백신별로 다음 접종일이 정해져 있는데, 그 관리가 대부분 보호자 기억에 맡겨져 있습니다.',
        '접종 이력 기준으로 다음 접종 시기를 산출해 안내하고, 형제 자매를 한 계정에서 함께 관리합니다.'],
    ], 7,
    '위 항목은 설정과 템플릿으로 대응하는 범위입니다. 진료과 고유의 별도 개발이 필요한 요건은 사전 진단에서 구분해 드리고, 개발 범위와 비용을 따로 명시합니다 — 되는 것과 안 되는 것을 계약 전에 문서로 나누는 것이 저희 방식입니다.')
}

/* ===============================================================
   08 — AI 레이어
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '제안 · AI 레이어')
  heading(s, 'AI는 새 기능이 아니라, 앞의 다섯 병목에 붙입니다')
  subheading(s, '모든 모듈은 예약·진료 데이터가 쌓이는 기존 코어를 근거로 동작합니다. 별도 데이터 구축 없이 도입 즉시 학습을 시작하고, 병원이 필요한 모듈만 켜고 끕니다.')

  const none = { type: 'none' }
  const line = (pt, color) => [none, none, { pt, color }, none]

  const head = ['모듈', '하는 일', '대응 병목']
  const body = [
    ['노쇼 예측', '예약 이력·리드타임·요일·취소 패턴으로 건별 노쇼 확률을 산출하고 고위험 예약에 확인 알림을 발송', '02'],
    ['공실 슬롯 대체 배정', '취소가 나면 대기 명단에서 조건이 맞는 환자를 골라 즉시 제안. 데스크는 승인만 함', '02'],
    ['24시간 예약 상담', '카카오·웹에서 자연어로 예약·변경·조회. 사람이 잡은 예약과 동일한 규칙이 적용됨', '01'],
    ['재방문 리콜', '진료 유형별로 다음 내원 시점을 예측해 그 전에 안내. 환자가 잊기 전에 병원이 먼저 도달', '01, 03'],
    ['이탈 예측', '재방문이 끊긴 환자를 자동 식별하고 위험도로 우선순위를 매겨 데스크에 전달', '03'],
    ['스케줄 자동 재배치', '의료진 일정이 바뀌면 영향받는 예약을 산출하고 대체 슬롯을 제안. 승인 시 알림까지 일괄 발송', '04'],
    ['상담 통화 자동 기록', '데스크 통화를 텍스트로 옮기고 요약해 환자 카드에 첨부. 후속 조치를 담당자에게 배정', '01, 05'],
    ['자연어 경영 대시보드', '“지난달 노쇼율이 가장 높은 시간대는?”처럼 물으면 집계와 차트로 답함', '05'],
  ]

  const rows = [head.map((t, i) => ({
    text: t,
    options: {
      bold: true, fontSize: 9.5, color: C.faint, charSpacing: 1.2,
      align: i === 2 ? 'center' : 'left', border: line(1.4, C.ink), valign: 'bottom',
    },
  }))]
  body.forEach((r) => {
    rows.push(r.map((t, i) => ({
      text: t,
      options: {
        fontSize: i === 0 ? 12 : 11,
        bold: i === 0,
        color: i === 0 ? C.ink : (i === 2 ? C.navy2 : C.ink2),
        align: i === 2 ? 'center' : 'left',
        border: line(0.5, C.rule), valign: 'middle',
      },
    })))
  })

  s.addTable(rows, {
    x: M, y: 2.32, w: CW, colW: [2.6, 8.0, 1.493], rowH: 0.4,
    fontFace: F, margin: [4, 8, 4, 0],
  })

  pageNum(s, 8)
}

/* ===============================================================
   09 — 성과 산출 모델
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '성과')
  heading(s, '산출식을 열어둘 테니, 병원 숫자를 넣어 보십시오')
  subheading(s, '“노쇼 40% 감소” 같은 문구를 앞세우지 않습니다. 병원마다 편차가 너무 큽니다. 대신 계산 방식을 전부 공개합니다. 입력값은 사전 진단에서 귀 병원 실측치로 대체됩니다.')

  const none = { type: 'none' }
  const line = (pt, color) => [none, none, { pt, color }, none]

  const head = ['효과 항목', '산출식', '의원\n2인 · 월 800건', '중형병원\n8인 · 월 3,000건', '종합병원\n20인 · 월 8,000건']
  const body = [
    ['노쇼 감소', '예약수 × 노쇼율 × 감소율 × 건당 진료수익', '144만원', '864만원', '2,304만원'],
    ['공실 슬롯 회복', '월 공실 슬롯 × 대체 배정률 × 슬롯 기여수익', '36만원', '300만원', '720만원'],
    ['데스크 콜 절감', '월 콜수 × 셀프 전환율 × 처리시간 × 인건비', '26만원', '97만원', '264만원'],
    ['재방문 회복', '이탈 위험군 × 리콜 반응률 × 건당 수익', '23만원', '96만원', '240만원'],
  ]
  const tail = [
    ['합계 (이론치)', '4개 항목 단순 합', '229만원', '1,357만원', '3,528만원', 'sum'],
    ['보수 반영', '합계 × 달성률 50%', '115만원', '679만원', '1,764만원', ''],
    ['차감 — 월 비용', '구독료 + 발송 실비', '−62만원', '−261만원', '−482만원', 'cost'],
    ['월 순효과', '보수 반영 − 월 비용', '53만원', '418만원', '1,282만원', 'net'],
  ]

  const rows = [head.map((t, i) => ({
    text: t,
    options: {
      bold: true, fontSize: 9, color: C.faint, charSpacing: 1,
      align: i >= 2 ? 'right' : 'left', border: line(1.4, C.ink), valign: 'bottom',
    },
  }))]
  body.forEach((r) => {
    rows.push(r.map((t, i) => ({
      text: t,
      options: {
        fontSize: i === 1 ? 10 : 11.5,
        bold: i === 0 || i >= 2,
        color: i === 1 ? C.muted : C.ink,
        align: i >= 2 ? 'right' : 'left',
        border: line(0.5, C.rule), valign: 'middle',
      },
    })))
  })
  tail.forEach((r) => {
    const kind = r[5]
    rows.push(r.slice(0, 5).map((t, i) => ({
      text: t,
      options: {
        fontSize: i === 1 ? 10 : 11.5,
        bold: true,
        color: kind === 'net' ? C.navy : (kind === 'cost' && i >= 2 ? C.coral : (i === 1 ? C.muted : C.ink)),
        align: i >= 2 ? 'right' : 'left',
        fill: kind === 'net' ? { color: C.navyTint } : undefined,
        border: line(kind === 'sum' ? 1.2 : 0.5, kind === 'sum' ? C.navyLine : C.rule),
        valign: 'middle',
      },
    })))
  })

  s.addTable(rows, {
    x: M, y: 2.34, w: CW, colW: [2.3, 3.6, 2.06, 2.06, 2.073], rowH: 0.36,
    fontFace: F, margin: [4, 8, 4, 0],
  })

  s.addText('예시 입력값은 가정치이며 특정 병원의 실적이 아닙니다. 노쇼율 12%, 감소율 30%, 셀프 예약 전환 40%를 공통 가정으로 두고 건당 수익만 규모별로 달리했습니다. 마리아병원의 실측 운영 수치는 그 병원의 자산이므로 공개하지 않습니다.', {
    x: M, y: 6.24, w: CW - 0.9, h: 0.44,
    fontFace: F, fontSize: 10.5, color: C.muted, margin: 0, valign: 'middle', lineSpacing: 15,
  })

  pageNum(s, 9)
  s.addNotes('이 표의 핵심은 숫자가 아니라 산출식을 전부 공개한다는 점입니다. 병원이 자기 숫자를 넣어 직접 계산하게 하면, 우리가 제시한 수치를 방어할 필요가 없어집니다. 달성률 50%로 깎아둔 것도 같은 이유입니다.')
}

/* ===============================================================
   10 — 규모별 순효과 + 증명
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '성과 · 회수')
  heading(s, '규모가 클수록 회수가 빠릅니다')
  subheading(s, '구축비를 낮춘 구조라 회수 기간 자체는 짧습니다. 실제로 중요한 것은 매달 반복되는 순효과입니다.')

  const sums = [
    ['의원 · 2인', '53', '구축비 100만원을 약 2개월에 회수', '1년 누적 순증 536만원'],
    ['중형병원 · 8인', '418', '구축비 500만원을 약 2개월에 회수', '1년 누적 순증 4,516만원'],
    ['종합병원 · 20인', '1,282', '구축비 1,000만원을 1개월 이내 회수', '1년 누적 순증 1억 4,384만원'],
  ]
  const cw = (CW - 0.44 * 2) / 3
  sums.forEach((c, i) => {
    const x = M + i * (cw + 0.44)
    card(s, x, 2.3, cw, 1.72, i === 2 ? 'navy' : 'plain')
    s.addText(c[0], {
      x: x + 0.32, y: 2.46, w: cw - 0.64, h: 0.26,
      fontFace: F, fontSize: 10, bold: true, color: C.faint, charSpacing: 1.2, margin: 0, valign: 'middle',
    })
    s.addText([
      { text: c[1], options: { fontSize: 30, bold: true, color: C.navy } },
      { text: ' 만원', options: { fontSize: 14, bold: true, color: C.navy } },
    ], {
      x: x + 0.32, y: 2.74, w: cw - 0.64, h: 0.52, fontFace: F, margin: 0, valign: 'middle',
    })
    s.addText(c[2], {
      x: x + 0.32, y: 3.28, w: cw - 0.64, h: 0.26,
      fontFace: F, fontSize: 10.5, color: C.ink2, margin: 0, valign: 'middle',
    })
    s.addText(c[3], {
      x: x + 0.32, y: 3.54, w: cw - 0.64, h: 0.26,
      fontFace: F, fontSize: 10.5, color: C.muted, margin: 0, valign: 'middle',
    })
  })

  s.addText('도입 후에는 같은 지표를 같은 방식으로 재측정합니다', {
    x: M, y: 4.44, w: CW, h: 0.4,
    fontFace: F, fontSize: 17, bold: true, color: C.ink, margin: 0, valign: 'middle',
  })
  s.addText('도입 첫 달을 기준선으로 고정하고 분기마다 실측값을 리포트로 제출합니다. 측정 방식을 계약서에 함께 적습니다.', {
    x: M, y: 4.82, w: 10.6, h: 0.3,
    fontFace: F, fontSize: 11.5, color: C.muted, margin: 0, valign: 'middle',
  })

  const kpis = [
    ['노쇼율', '예약 대비 미방문 비율'],
    ['셀프 예약 비중', '웹·카카오 경유 비율'],
    ['슬롯 가동률', '개설 대비 실제 진료 건수'],
    ['재방문율', '권장 기간 내 복귀 비율'],
    ['건당 처리 시간', '데스크 1건 처리 소요'],
    ['데이터 정합성', 'EMR 미반영 건수 추이'],
  ]
  const kw = CW / 6
  kpis.forEach((k, i) => {
    const x = M + i * kw
    s.addShape(pres.ShapeType.rect, { x, y: 5.34, w: 0.22, h: 0.035, fill: { color: C.navy2 } })
    s.addText(k[0], {
      x, y: 5.44, w: kw - 0.2, h: 0.3,
      fontFace: F, fontSize: 12, bold: true, color: C.ink, margin: 0, valign: 'middle',
    })
    s.addText(k[1], {
      x, y: 5.74, w: kw - 0.2, h: 0.56,
      fontFace: F, fontSize: 10, color: C.muted, margin: 0, valign: 'top', lineSpacing: 14,
    })
  })

  pageNum(s, 10)
}

/* ===============================================================
   11 — 도입 방안
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '도입')
  heading(s, '표준 10주 — 대부분은 개발이 아니라 설정입니다')
  subheading(s, '코어가 완성되어 있으므로 기간의 대부분은 귀 병원의 진료 규칙을 시스템에 옮기는 작업에 쓰입니다. 병원 총 투입은 약 32시간입니다.')

  const cols = [['주차', M + 0.6, 1.3], ['단계', M + 1.98, 2.5], ['주요 작업', M + 4.58, 4.0], ['병원 측 투입', M + 8.72, 3.37]]
  cols.forEach((c) => {
    s.addText(c[0], {
      x: c[1], y: 2.22, w: c[2], h: 0.26,
      fontFace: F, fontSize: 9.5, bold: true, color: C.faint, charSpacing: 1.2, margin: 0, valign: 'middle',
    })
  })
  hairline(s, 2.5)

  const phases = [
    ['01', '1 – 2주차', '진단 & 요건 확정', '현행 예약·상담 흐름 관찰, 진료과별 예약 유형 정리, EMR 환경 확인, 기준 지표 측정', '원무팀장 주 4시간 · 대표원장 60분'],
    ['02', '3 – 5주차', '구축 & 맞춤 설정', '전용 인스턴스 생성, 의료진·진료 유형·슬롯 규칙 설정, 브랜드 적용, 도메인 연결', '진료 시간표 확정본 · 검수 90분'],
    ['03', '4 – 6주차', '알림톡 & 채널 연동', '카카오 채널 개설, 템플릿 등록·심사, 본인인증 연동, 발송 시나리오 검증', '사업자등록증 · 문구 검수 1회'],
    ['04', '5 – 8주차', 'AI 모듈 적용', '과거 예약 데이터 이관 후 예측 기준선 학습, 우선순위 높은 모듈부터 순차 활성화', '최근 6개월 예약·방문 이력'],
    ['05', '7 – 8주차', '교육 & 병행 운영', '실사용자 교육 후 기존 방식과 2주 병행 운영, 전환 리스크 제거, 피드백 반영', '데스크 전원 2시간 × 2회'],
    ['06', '9 – 10주차', '정식 오픈 & 안정화', '전면 전환, 초기 2주 밀착 대응, 지표 리포트 체계 가동', '오픈 당일 원무팀 입회'],
  ]

  let y = 2.66
  phases.forEach((p) => {
    s.addText(p[0], {
      x: M, y, w: 0.5, h: 0.52,
      fontFace: F, fontSize: 12, bold: true, color: C.navy2, margin: 0, valign: 'middle',
    })
    s.addText(p[1], {
      x: M + 0.6, y, w: 1.3, h: 0.52,
      fontFace: F, fontSize: 10.5, bold: true, color: C.muted, margin: 0, valign: 'middle',
    })
    s.addText(p[2], {
      x: M + 1.98, y, w: 2.5, h: 0.52,
      fontFace: F, fontSize: 13, bold: true, color: C.ink, margin: 0, valign: 'middle',
    })
    s.addText(p[3], {
      x: M + 4.58, y, w: 4.0, h: 0.52,
      fontFace: F, fontSize: 10.5, color: C.muted, margin: 0, valign: 'middle', lineSpacing: 14,
    })
    s.addText(p[4], {
      x: M + 8.72, y, w: 3.37, h: 0.52,
      fontFace: F, fontSize: 10.5, color: C.navy2, margin: 0, valign: 'middle', lineSpacing: 14,
    })
    s.addShape(pres.ShapeType.rect, { x: M, y: y + 0.56, w: CW, h: 0.012, fill: { color: C.rule } })
    y += 0.62
  })

  card(s, M, 6.34, CW - 0.9, 0.6, 'navy')
  s.addText('EMR 연계나 진료과 전용 개발이 포함되면 4주가 추가됩니다   ·   기존 방식과 2주 병행 후 전환하므로 오픈일에 예약이 멈추지 않습니다   ·   5주차 검수에서 요건 불일치 시 위약금 없이 중단할 수 있습니다', {
    x: M + 0.3, y: 6.34, w: CW - 1.5, h: 0.6,
    fontFace: F, fontSize: 10.5, bold: true, color: C.navy, margin: 0, valign: 'middle', lineSpacing: 14,
  })

  pageNum(s, 11)
  s.addNotes('병원장이 가장 먼저 묻는 것은 "우리 직원이 얼마나 붙어야 하느냐"입니다. 32시간이라는 숫자를 먼저 드리면 그 다음 대화가 쉬워집니다. 5주차 무위약 중단 조항은 계약 문턱을 낮추는 장치입니다.')
}

/* ===============================================================
   12 — 보안
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '신뢰')
  heading(s, '보안 및 컴플라이언스')
  subheading(s, '진료 정보는 가장 민감한 개인정보에 속합니다. 기술적 조치와 운영 규칙을 함께 설계하고 계약서에 명시합니다.')

  const secs = [
    ['국내 리전 보관', '데이터베이스와 애플리케이션 모두 국내(서울) 리전에서 운영합니다. 환자 정보는 국외로 이전되지 않습니다.'],
    ['병원별 데이터 분리', '병원마다 독립 데이터베이스·독립 도메인으로 구축합니다. 타 병원과 데이터가 공유되는 구조가 아닙니다.'],
    ['접근 권한 & 감사 로그', '역할 기반 권한 분리, 환자 정보 조회·변경 이력 기록. 누가 언제 무엇을 바꿨는지 추적됩니다.'],
    ['AI 학습 데이터 통제', '환자 데이터는 외부 모델의 학습에 사용되지 않습니다. AI 처리 시 식별정보는 최소화해 전달합니다.'],
    ['본인인증 기반 접근', '환자 예약 조회는 휴대폰 또는 카카오 인증을 거칩니다. 이름·생년월일만으로 타인 예약이 조회되지 않습니다.'],
    ['백업 & 복구', '일일 자동 백업과 시점 복구를 운영하며, 장애 대응 절차와 연락 체계를 계약에 명시합니다.'],
  ]

  const cw = (CW - 0.5 * 2) / 3
  secs.forEach((sc, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = M + col * (cw + 0.5)
    const y = 2.36 + row * 1.94

    s.addShape(pres.ShapeType.rect, { x, y: y + 0.1, w: 0.24, h: 0.035, fill: { color: C.navy2 } })
    s.addText(sc[0], {
      x, y: y + 0.2, w: cw - 0.2, h: 0.36,
      fontFace: F, fontSize: 14.5, bold: true, color: C.ink, margin: 0, valign: 'middle',
    })
    s.addText(sc[1], {
      x, y: y + 0.62, w: cw - 0.2, h: 1.1,
      fontFace: F, fontSize: 11.5, color: C.muted, margin: 0, valign: 'top', lineSpacing: 18,
    })
  })

  pageNum(s, 12)
}

/* ===============================================================
   13 — 요금
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '비용')
  heading(s, '구축비는 최소화하고, 월 구독료로 나눠 받습니다')
  subheading(s, '도입 첫해에 목돈이 나가지 않도록 한 구조이고 그 대신 최소 약정 기간을 둡니다. 구간은 동시 진료 의료진 수로만 나뉘며 월 예약 건수에 따른 추가 과금은 없습니다.')

  const plans = [
    { name: 'Lite', setup: '구축 100만원 · 1회', price: '월 59', who: '의료진 1–2인 · 의원',
      items: ['환자 예약 웹 & 데스크 관리자', '의료진 스케줄 & 예외일', '카카오 알림톡 7종', '기본 통계', '평일 09–18시 지원'], hl: false },
    { name: 'Core', setup: '구축 250만원 · 1회', price: '월 119', who: '의료진 3–5인 · 중소 병원',
      items: ['Lite 전체 포함', '변경·취소 승인 흐름', '진료 유형별 슬롯 설정', '노쇼 예측 & 확인 발송', 'EMR 등록 관리'], hl: false },
    { name: 'Smart', setup: '구축 500만원 · 1회', price: '월 249', who: '의료진 6–15인 · 노쇼와 콜 부하가 큰 병원',
      items: ['Core 전체 포함', '공실 슬롯 대체 배정', '24시간 AI 예약 상담', '재방문 리콜 & 이탈 예측', '스케줄 자동 재배치', '분기 성과 리포트'], hl: true },
    { name: 'Enterprise', setup: '구축 1,000만원~ · 범위별', price: '월 450', suffix: '만원~', who: '의료진 16인 이상 · 다지점 또는 EMR 연계',
      items: ['Smart 전체 포함', 'AI 모듈 전체', 'EMR 연계 개발', '지점 통합 대시보드', '진료과 전용 기능 개발', '전담 매니저 · 24시간 대응'], hl: false },
  ]

  const cw = (CW - 0.4 * 3) / 4
  plans.forEach((p, i) => {
    const x = M + i * (cw + 0.4)
    card(s, x, 2.28, cw, 3.86, p.hl ? 'navy' : 'plain')

    s.addText(p.name, {
      x: x + 0.28, y: 2.46, w: cw - 0.56, h: 0.34,
      fontFace: F, fontSize: 16, bold: true, color: p.hl ? C.navy : C.ink, margin: 0, valign: 'middle',
    })
    if (p.hl) chip(s, x + cw - 1.0, 2.5, 0.7, '권장')

    s.addText(p.setup, {
      x: x + 0.28, y: 2.84, w: cw - 0.56, h: 0.28,
      fontFace: F, fontSize: 10.5, bold: true, color: C.navy2, margin: 0, valign: 'middle',
    })
    s.addText([
      { text: p.price, options: { fontSize: 25, bold: true, color: C.navy } },
      { text: p.suffix || '만원', options: { fontSize: 13, bold: true, color: C.navy } },
    ], {
      x: x + 0.28, y: 3.14, w: cw - 0.56, h: 0.46, fontFace: F, margin: 0, valign: 'middle',
    })
    s.addText(p.who, {
      x: x + 0.28, y: 3.62, w: cw - 0.56, h: 0.44,
      fontFace: F, fontSize: 10, color: C.muted, margin: 0, valign: 'top', lineSpacing: 14,
    })
    s.addShape(pres.ShapeType.rect, { x: x + 0.28, y: 4.12, w: cw - 0.56, h: 0.012, fill: { color: C.rule } })

    s.addText(p.items.map((t, j) => ({
      text: t,
      options: { bullet: true, breakLine: j !== p.items.length - 1 },
    })), {
      x: x + 0.28, y: 4.24, w: cw - 0.56, h: 1.78,
      fontFace: F, fontSize: 10, color: C.ink2, margin: 0, valign: 'top', paraSpaceAfter: 4,
    })
  })

  s.addText('실비 — 카카오 알림톡 건당 9원, 휴대폰 본인인증 건당 55원. 마진 없이 사용량 실비로 청구합니다 (월 예약 3,000건 기준 약 12만원).', {
    x: M, y: 6.3, w: CW - 0.9, h: 0.26,
    fontFace: F, fontSize: 10.5, color: C.ink2, margin: 0, valign: 'middle',
  })
  s.addText('계약 — 최소 약정 24개월(구축비를 낮춘 대신). 구독료는 정식 오픈 다음 달부터 청구되며 구축 기간에는 발생하지 않습니다. 연 선납 10% · 24개월 선납 15% 할인. 부가세 별도.', {
    x: M, y: 6.56, w: CW - 0.9, h: 0.26,
    fontFace: F, fontSize: 10.5, color: C.muted, margin: 0, valign: 'middle',
  })

  pageNum(s, 13)
  s.addNotes('구축비를 낮춘 것과 최소 약정 24개월은 한 쌍입니다. 구축비는 실제로 10주 일한 인건비라, 그것만 깎으면 우리가 먼저 대는 구조가 됩니다. 원장님 입장에서는 500만원과 2,800만원이 결재 라인 자체가 다르므로 문턱을 없애는 값으로 설명하시면 됩니다.')
}

/* ===============================================================
   14 — 다음 단계 (dark)
   =============================================================== */
{
  const s = pres.addSlide()
  darkBg(s)
  kicker(s, '다음 단계', { color: C.accentLt })

  s.addText('계약보다 진단이 먼저입니다', {
    x: M, y: 1.0, w: 10.5, h: 0.8,
    fontFace: F, fontSize: 33, bold: true, color: C.white, margin: 0, valign: 'middle',
  })

  const steps = [
    ['01', '무상 진단 · 60분', '현재 예약·상담 흐름과 최근 3개월 예약 데이터를 함께 확인합니다.'],
    ['02', '현황 리포트', '노쇼율 · 전화 인입량 · 슬롯 공실률 · 재방문율을 실제 숫자로 산출해 드립니다.'],
    ['03', '전용 제안서 · 2주 내', '개선 목표치, 적용 모듈, 확정 견적, 상세 일정을 문서로 제출합니다.'],
  ]
  const cw = (CW - 0.5 * 2) / 3
  steps.forEach((st, i) => {
    const x = M + i * (cw + 0.5)
    card(s, x, 2.3, cw, 1.9, 'dark')
    s.addText(st[0], {
      x: x + 0.34, y: 2.52, w: 1.0, h: 0.3,
      fontFace: F, fontSize: 12, bold: true, color: C.accentLt, margin: 0, valign: 'middle',
    })
    s.addText(st[1], {
      x: x + 0.34, y: 2.88, w: cw - 0.68, h: 0.34,
      fontFace: F, fontSize: 15, bold: true, color: C.white, margin: 0, valign: 'middle',
    })
    s.addText(st[2], {
      x: x + 0.34, y: 3.26, w: cw - 0.68, h: 0.66,
      fontFace: F, fontSize: 11.5, color: C.onDark, margin: 0, valign: 'top', lineSpacing: 18,
    })
  })

  s.addText('이 단계에서 도입이 실익이 없다고 판단되면 그렇게 말씀드립니다. 진단과 제안서 작성에는 비용이 발생하지 않습니다.', {
    x: M, y: 4.44, w: CW, h: 0.34,
    fontFace: F, fontSize: 13, bold: true, color: C.accentLt, margin: 0, valign: 'middle',
  })

  hairline(s, 5.06, { color: '1E4463', thick: 0.014 })

  const contacts = [['회사', '회사명 입력'], ['담당', '담당자 / 직함'], ['연락처', '010-0000-0000'], ['이메일', 'contact@example.com']]
  const kw = (CW - 0.4 * 3) / 4
  contacts.forEach((c, i) => {
    const x = M + i * (kw + 0.4)
    s.addText(c[0], {
      x, y: 5.34, w: kw, h: 0.28,
      fontFace: F, fontSize: 10, bold: true, color: C.onDarkDim, charSpacing: 1.2, margin: 0, valign: 'middle',
    })
    s.addText(c[1], {
      x, y: 5.64, w: kw, h: 0.36,
      fontFace: F, fontSize: 15, bold: true, color: C.white, margin: 0, valign: 'middle',
    })
  })

  s.addText('병원 스마트 AI CRM · 사업 소개서 · Rev. 1.0', {
    x: M, y: 6.62, w: CW, h: 0.3,
    fontFace: F, fontSize: 10, color: '3E6485', margin: 0, valign: 'middle',
  })

  s.addNotes('연락처 4개 항목과 표지의 제품명은 실제 정보로 교체해야 합니다.')
}

pres.writeFile({ fileName: process.argv[2] || 'hospital-crm-deck.pptx' })
  .then((f) => console.log('WROTE', f))
  .catch((e) => { console.error(e); process.exit(1) })
