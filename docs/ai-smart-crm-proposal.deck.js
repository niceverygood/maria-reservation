const pptxgen = require('pptxgenjs')

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE' // 13.333 x 7.5
pres.author = 'AI Smart CRM'
pres.title = '난임 전문병원을 위한 AI 스마트 CRM 소개서'

/* ---------------------------------------------------------------
   PALETTE — carried over from the web proposal so all deliverables
   read as one system.
   --------------------------------------------------------------- */
const C = {
  deep:      '083539', // darkest teal — title / divider grounds
  teal:      '0D5257', // primary
  teal2:     '2E8F87', // support
  tealTint:  'EDF3F1',
  tealLine:  'BBD3CE',
  brass:     '8F6716', // accent — AI layer
  brass2:    'B8873A',
  brassTint: 'F7F1E2',
  ink:       '12191A',
  ink2:      '354445',
  muted:     '5F6F70',
  faint:     '8C9A99',
  rule:      'E1E4DE',
  paper:     'FBFAF7',
  white:     'FFFFFF',
}

const F = 'Malgun Gothic'

const W = 13.333
const H = 7.5
const M = 0.62
const CW = W - M * 2

/* ---------------------------------------------------------------
   HELPERS
   --------------------------------------------------------------- */

// Repeated motif: a filled circle carrying a short code.
function codeDot(slide, x, y, code, opts = {}) {
  const d = opts.d || 0.42
  slide.addShape(pres.ShapeType.ellipse, {
    x, y, w: d, h: d,
    fill: { color: opts.fill || C.teal },
  })
  slide.addText(code, {
    x, y, w: d, h: d,
    align: 'center', valign: 'middle',
    fontFace: F, fontSize: opts.fs || 10, bold: true,
    color: opts.color || C.white, margin: 0,
  })
}

function kicker(slide, text, color) {
  slide.addText(text, {
    x: M, y: 0.46, w: CW, h: 0.3,
    fontFace: F, fontSize: 11.5, bold: true,
    color: color || C.teal2, charSpacing: 2, margin: 0, valign: 'middle',
  })
}

function heading(slide, text, opts = {}) {
  slide.addText(text, {
    x: M, y: opts.y || 0.8, w: opts.w || CW, h: opts.h || 0.72,
    fontFace: F, fontSize: opts.fs || 31, bold: true,
    color: opts.color || C.ink, margin: 0, valign: 'middle',
  })
}

function subheading(slide, text, opts = {}) {
  slide.addText(text, {
    x: M, y: opts.y || 1.56, w: opts.w || 11.2, h: opts.h || 0.52,
    fontFace: F, fontSize: opts.fs || 13.5,
    color: C.muted, margin: 0, valign: 'top', lineSpacing: 20,
  })
}

function pageNum(slide, n) {
  slide.addText(String(n).padStart(2, '0'), {
    x: W - M - 0.7, y: H - 0.62, w: 0.7, h: 0.3,
    align: 'right', fontFace: F, fontSize: 10,
    color: C.faint, margin: 0, valign: 'middle',
  })
}

function chip(slide, x, y, w, text, tone) {
  const t = tone === 'brass'
    ? { fill: C.brassTint, color: C.brass }
    : { fill: C.tealTint, color: C.teal }
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h: 0.3, rectRadius: 0.14, fill: { color: t.fill },
  })
  slide.addText(text, {
    x, y, w, h: 0.3, align: 'center', valign: 'middle',
    fontFace: F, fontSize: 9.5, bold: true, color: t.color, margin: 0,
  })
}

// Light content card — background tint only, no edge stripes.
function card(slide, x, y, w, h, tone) {
  slide.addShape(pres.ShapeType.rect, {
    x, y, w, h,
    fill: { color: tone === 'brass' ? C.brassTint : (tone === 'plain' ? C.white : C.tealTint) },
    line: tone === 'plain' ? { color: C.rule, width: 0.75 } : { type: 'none' },
  })
}

function lightBg(slide) {
  slide.background = { color: C.paper }
}

/* ===============================================================
   01 — TITLE
   =============================================================== */
{
  const s = pres.addSlide()
  s.background = { color: C.deep }

  s.addText('마리아병원 예약 CRM 구축 · 납품 기반', {
    x: M, y: 1.72, w: CW, h: 0.34,
    fontFace: F, fontSize: 13, bold: true, color: C.teal2,
    charSpacing: 2, margin: 0, valign: 'middle',
  })

  s.addText([
    { text: '난임 전문병원을 위한', options: { breakLine: true } },
    { text: 'AI 스마트 CRM', options: { color: '7FD8C9' } },
  ], {
    x: M, y: 2.25, w: 10.4, h: 2.1,
    fontFace: F, fontSize: 47, bold: true, color: C.white,
    margin: 0, valign: 'top', lineSpacing: 62,
  })

  s.addText('난임 진료는 날짜가 아니라 주기로 움직입니다.\n국내 난임 분야 1위 병원에서 검증된 예약 · CRM 코어 위에 AI 레이어를 얹어 제공합니다.', {
    x: M, y: 4.62, w: 9.6, h: 0.9,
    fontFace: F, fontSize: 14, color: 'AFC7C4', margin: 0,
    valign: 'top', lineSpacing: 24,
  })

  // metric row
  const mets = [
    ['API 엔드포인트', '56'],
    ['운영 화면', '25'],
    ['알림톡 시나리오', '7'],
    ['데이터 모델', '13'],
  ]
  const mw = 2.2
  mets.forEach((m, i) => {
    const x = M + i * (mw + 0.42)
    s.addText(m[1], {
      x, y: 5.95, w: mw, h: 0.55,
      fontFace: F, fontSize: 30, bold: true, color: C.white, margin: 0, valign: 'middle',
    })
    s.addText(m[0], {
      x, y: 6.5, w: mw, h: 0.28,
      fontFace: F, fontSize: 10.5, color: '8FB0AC', margin: 0, valign: 'middle',
    })
  })

  s.addText('사업 소개서 · Rev. 1.0', {
    x: W - M - 3.2, y: 6.5, w: 3.2, h: 0.28,
    align: 'right', fontFace: F, fontSize: 10.5, color: '6E918D', margin: 0, valign: 'middle',
  })

  s.addNotes('오프닝: 난임 진료 예약은 다른 진료과와 구조가 다르다는 점을 먼저 짚고, 마리아병원 납품 실적을 근거로 제시합니다.')
}

/* ===============================================================
   02 — 왜 지금, 왜 우리인가
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '요약')
  heading(s, '세 가지만 기억해 주십시오')

  const items = [
    {
      code: '01',
      t: '난임은 예약 구조가 다릅니다',
      b: '환자의 생리주기가 일정을 정합니다. 주기 시작 후 2~3일 내 내원, 배란 모니터링은 1~2일 간격 반복. 일반 예약 시스템이 다루지 못하는 구조입니다.',
    },
    {
      code: '02',
      t: '제안이 아니라 운영 중인 시스템입니다',
      b: '마리아병원의 예약·CRM을 설계·구축해 실제 운영에 올렸습니다. 환자·데스크·의료진이 매일 쓰는 화면과 API로 이미 검증되어 있습니다.',
    },
    {
      code: '03',
      t: 'AI는 병목에만 붙입니다',
      b: '기능을 늘리는 것이 아니라 전화 폭주·노쇼·이탈이라는 실제 비용 지점에 직접 연결합니다. 기존 데이터를 근거로 도입 즉시 동작합니다.',
    },
  ]

  const cw = (CW - 0.5 * 2) / 3
  items.forEach((it, i) => {
    const x = M + i * (cw + 0.5)
    card(s, x, 2.05, cw, 3.55, i === 1 ? 'teal' : 'plain')
    codeDot(s, x + 0.42, 2.45, it.code, { d: 0.46, fs: 11 })
    s.addText(it.t, {
      x: x + 0.42, y: 3.12, w: cw - 0.84, h: 0.8,
      fontFace: F, fontSize: 17, bold: true, color: C.ink, margin: 0, valign: 'top', lineSpacing: 25,
    })
    s.addText(it.b, {
      x: x + 0.42, y: 4.02, w: cw - 0.84, h: 1.4,
      fontFace: F, fontSize: 12, color: C.muted, margin: 0, valign: 'top', lineSpacing: 20,
    })
  })

  s.addText('다음 단계는 계약이 아니라 무상 진단입니다. 귀 병원의 최근 3개월 예약 데이터로 노쇼율·전화 인입량·슬롯 공실률을 실제 숫자로 산출해 드립니다.', {
    x: M, y: 5.98, w: CW, h: 0.5,
    fontFace: F, fontSize: 12.5, color: C.teal, bold: true, margin: 0, valign: 'middle',
  })

  pageNum(s, 2)
  s.addNotes('전체 제안의 요약. 이 세 문장이 핵심이며 나머지는 근거입니다.')
}

/* ===============================================================
   03 — 주기 다이어그램
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '배경 · 진료 구조')
  heading(s, '난임 진료 한 주기, 그리고 병원이 개입해야 하는 지점')
  subheading(s, '한 주기에 환자는 평균 5~8회 내원합니다. 일반 예약 시스템은 이를 "새 예약 6건"으로 처리하지만, 난임 CRM은 하나의 주기로 다뤄야 합니다.')

  const stages = [
    ['D1 – D2',   '주기 시작',        '당일 아침 전화가\n몰리는 지점',        'AI 리콜 예측'],
    ['D3 – D5',   '기초검사·과배란',  '검사·주사 일정이\n한 번에 다건 발생', '자동 일괄 예약'],
    ['D6 – D12',  '배란 모니터링',    '1~2일 간격 반복,\n예약 변경 최다',    '동적 슬롯 재배치'],
    ['D13 – D15', '채취 · 시술',      '의료진·시술실이\n묶이는 고단가 슬롯', '노쇼 예측 우선'],
    ['D16 – D19', '이식',             '변동 시 주기 전체가\n영향을 받음',     '변경 승인 워크플로'],
    ['D25 – D28', '판정',             '재진입과 이탈이\n갈리는 분기점',       '이탈 예측 · 리텐션'],
  ]

  const cellW = CW / 6
  const centers = stages.map((_, i) => M + cellW * i + cellW / 2)

  // sequence connector (encodes the actual progression, not decoration)
  s.addShape(pres.ShapeType.line, {
    x: centers[0], y: 3.28, w: centers[5] - centers[0], h: 0,
    line: { color: C.tealLine, width: 1.5 },
  })

  stages.forEach((st, i) => {
    const cx = centers[i]
    const x = cx - cellW / 2

    s.addText(st[0], {
      x, y: 2.72, w: cellW, h: 0.28, align: 'center', valign: 'middle',
      fontFace: F, fontSize: 10.5, bold: true, color: C.teal2, charSpacing: 1, margin: 0,
    })

    const d = 0.24
    s.addShape(pres.ShapeType.ellipse, {
      x: cx - d / 2, y: 3.28 - d / 2, w: d, h: d,
      fill: { color: i === 3 ? C.brass : C.teal },
      line: { color: C.paper, width: 2 },
    })

    s.addText(st[1], {
      x, y: 3.6, w: cellW, h: 0.34, align: 'center', valign: 'middle',
      fontFace: F, fontSize: 13, bold: true, color: C.ink, margin: 0,
    })
    s.addText(st[2], {
      x: x + 0.1, y: 3.98, w: cellW - 0.2, h: 0.62, align: 'center', valign: 'top',
      fontFace: F, fontSize: 10.5, color: C.muted, margin: 0, lineSpacing: 15,
    })
    chip(s, x + 0.08, 4.72, cellW - 0.16, st[3], 'brass')
  })

  s.addText('금색으로 표시한 D13–D15 구간이 의료진과 시술실이 함께 묶이는 고단가 슬롯입니다. 한 건의 노쇼가 그날 스케줄 전체의 공백으로 남습니다.', {
    x: M, y: 5.72, w: CW, h: 0.5,
    fontFace: F, fontSize: 12, color: C.muted, margin: 0, valign: 'middle',
  })

  pageNum(s, 3)
  s.addNotes('이 장이 제안 전체의 논리적 출발점입니다. 주기 구조를 이해시키면 이후 AI 모듈의 필요성이 자연스럽게 따라옵니다.')
}

/* ===============================================================
   04 — 병목 P1~P5
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '배경 · 운영 병목')
  heading(s, '이 구조에서 반복적으로 발생하는 다섯 가지 손실')

  const pains = [
    ['P1', '아침 전화 폭주와 콜 병목', '주기가 시작된 환자들이 같은 시간대에 몰립니다. 데스크 인력은 늘릴 수 없고, 연결되지 않은 환자는 그대로 이탈 위험군이 됩니다.'],
    ['P2', '노쇼로 인한 시술 슬롯 손실', '채취·이식 슬롯은 의료진과 시술실이 함께 묶이는 고단가 자원입니다. 대체 환자를 즉시 채우지 못하면 회복 불가능한 매출입니다.'],
    ['P3', '의료진 스케줄 변동의 파급', '시술·학회로 진료 시간이 자주 바뀝니다. 변경 한 번에 수십 건을 손으로 재배치하고 연락해야 하며, 누락과 중복이 발생합니다.'],
    ['P4', '주기 중단 환자의 조용한 이탈', '실패 판정 후 돌아오지 않는 환자는 아무 신호 없이 사라집니다. 재방문 시점을 놓치면 그대로 타 병원으로 갑니다.'],
    ['P5', 'EMR과 예약의 이중 입력', '예약과 차트를 따로 입력하는 과정에서 누락이 생깁니다. 지표는 실시간이 아니라 월말에 세어본 숫자가 됩니다.'],
  ]

  const cw = (CW - 0.5) / 2
  pains.forEach((p, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = M + col * (cw + 0.5)
    const y = 1.92 + row * 1.62

    codeDot(s, x, y + 0.06, p[0], { d: 0.46, fs: 11 })
    s.addText(p[1], {
      x: x + 0.66, y: y, w: cw - 0.66, h: 0.36,
      fontFace: F, fontSize: 15.5, bold: true, color: C.ink, margin: 0, valign: 'middle',
    })
    s.addText(p[2], {
      x: x + 0.66, y: y + 0.42, w: cw - 0.7, h: 0.92,
      fontFace: F, fontSize: 11.5, color: C.muted, margin: 0, valign: 'top', lineSpacing: 18,
    })
  })

  // fifth item spans left column only; use the free right cell for the takeaway
  const tx = M + (cw + 0.5)
  card(s, tx, 1.92 + 2 * 1.62, cw, 1.34, 'teal')
  s.addText('다섯 가지 모두 "사람을 더 뽑아서" 푸는 문제입니다.\nAI 레이어는 같은 인력으로 처리량과 도달률을 올리는 데 씁니다.', {
    x: tx + 0.36, y: 1.92 + 2 * 1.62 + 0.2, w: cw - 0.72, h: 0.94,
    fontFace: F, fontSize: 12.5, bold: true, color: C.teal, margin: 0, valign: 'middle', lineSpacing: 21,
  })

  pageNum(s, 4)
  s.addNotes('P1~P5는 이후 AI 모듈 슬라이드에서 각각 어떤 모듈이 대응하는지 다시 참조됩니다.')
}

/* ===============================================================
   05 — 레퍼런스 (dark)
   =============================================================== */
{
  const s = pres.addSlide()
  s.background = { color: C.deep }

  s.addText('레퍼런스', {
    x: M, y: 0.46, w: CW, h: 0.3,
    fontFace: F, fontSize: 11.5, bold: true, color: C.teal2, charSpacing: 2, margin: 0, valign: 'middle',
  })
  s.addText('개념 검증이 아니라, 병원에서 매일 돌아가는 시스템입니다', {
    x: M, y: 0.82, w: CW, h: 0.72,
    fontFace: F, fontSize: 31, bold: true, color: C.white, margin: 0, valign: 'middle',
  })
  s.addText('국내 난임 분야 점유율 1위 마리아병원의 예약 · CRM 시스템을 설계하고 구축해 운영에 올렸습니다.\n신규 병원 도입 시 이 코어가 그대로 시작점이 됩니다.', {
    x: M, y: 1.62, w: 10.8, h: 0.76,
    fontFace: F, fontSize: 13.5, color: 'AFC7C4', margin: 0, valign: 'top', lineSpacing: 22,
  })

  const stats = [
    ['56', 'API 엔드포인트'],
    ['25', '운영 화면'],
    ['7', '알림톡 시나리오'],
    ['13', '데이터 모델'],
    ['ICN', '서울 리전 배포'],
  ]
  const sw = (CW - 0.4 * 4) / 5
  stats.forEach((st, i) => {
    const x = M + i * (sw + 0.4)
    s.addShape(pres.ShapeType.rect, {
      x, y: 2.78, w: sw, h: 1.5, fill: { color: '0E4A4E' },
    })
    s.addText(st[0], {
      x, y: 2.96, w: sw, h: 0.7, align: 'center', valign: 'middle',
      fontFace: F, fontSize: 38, bold: true, color: '7FD8C9', margin: 0,
    })
    s.addText(st[1], {
      x, y: 3.68, w: sw, h: 0.3, align: 'center', valign: 'middle',
      fontFace: F, fontSize: 11, color: 'AFC7C4', margin: 0,
    })
  })

  s.addText('위 수치는 실제 구축된 시스템의 구현 범위에서 산출한 값입니다.', {
    x: M, y: 4.44, w: CW, h: 0.3,
    fontFace: F, fontSize: 11, color: '6E918D', margin: 0, valign: 'middle',
  })

  s.addText('기술 구성', {
    x: M, y: 5.12, w: 2.2, h: 0.3,
    fontFace: F, fontSize: 11, bold: true, color: C.teal2, charSpacing: 1.5, margin: 0, valign: 'middle',
  })
  const stack = ['Next.js · TypeScript', 'PostgreSQL · Prisma', '서울(ICN) 리전', '조회 패턴별 인덱스', '슬롯 사전 계산 배치']
  const sgap = 0.22
  const sww = (CW - sgap * (stack.length - 1)) / stack.length
  stack.forEach((t, i) => {
    const x = M + i * (sww + sgap)
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 5.5, w: sww, h: 0.42, rectRadius: 0.2, fill: { color: '0E4A4E' },
    })
    s.addText(t, {
      x, y: 5.5, w: sww, h: 0.42, align: 'center', valign: 'middle',
      fontFace: F, fontSize: 11, color: 'CFE3DF', margin: 0,
    })
  })

  s.addText('진료량이 많은 병원의 조회 부하를 전제로 슬롯 계산을 사전 배치화하여, 예약 화면이 피크 시간에도 즉시 응답하도록 설계했습니다.', {
    x: M, y: 6.24, w: 11.4, h: 0.4,
    fontFace: F, fontSize: 11.5, color: '8FB0AC', margin: 0, valign: 'middle',
  })

  pageNum(s, 5)
  s.addNotes('레퍼런스 슬라이드. 숫자는 모두 실제 구현 범위에서 나온 값이라는 점을 강조합니다.')
}

/* ===============================================================
   06 — 운영 중인 코어 기능
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '레퍼런스 · 구현 범위')
  heading(s, '지금 운영 중인 코어 기능')
  subheading(s, '아래 전부가 신규 병원 도입 시 그대로 제공됩니다. 도입 기간의 대부분은 개발이 아니라 귀 병원의 진료 규칙을 반영하는 작업에 쓰입니다.')

  const feats = [
    ['환자용 예약 웹', '카카오 로그인 · 휴대폰 본인인증, 의사별 예약, 가능 날짜 캘린더, 예약 조회 · 변경 · 취소, 진료 이력 — 모바일 우선'],
    ['데스크 관리자', '실시간 대시보드, 예약 대리 등록, 환자 관리, 당일 현황, 전날 변경사항 브리핑, 기간별 통계'],
    ['의료진 스케줄', '요일 템플릿, 휴진 · 특별 스케줄 예외, 시술시간 차단, 시간대별 예약 인원 설정, 타임라인 뷰'],
    ['변경 요청 워크플로', '의료진이 일정 변경 · 취소 · 휴진을 요청하면 관리자가 승인 또는 반려 — 처리 이력과 사유가 남는 결재 구조'],
    ['카카오 알림톡', '예약 확정 · 취소 · 거절 · 변경, 1일 전 및 당일 리마인더, 상태 변경 — 7종 시나리오와 발송 로그'],
    ['EMR 등록 관리', '예약 건별 반영 여부 · 시각 · 처리자 기록, 미등록 건 필터 — 이중 입력 누락 방지'],
  ]

  const cw = (CW - 0.46 * 2) / 3
  feats.forEach((f, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = M + col * (cw + 0.46)
    const y = 2.28 + row * 1.86

    card(s, x, y, cw, 1.56, 'plain')
    s.addText(f[0], {
      x: x + 0.34, y: y + 0.22, w: cw - 0.68, h: 0.34,
      fontFace: F, fontSize: 15, bold: true, color: C.teal, margin: 0, valign: 'middle',
    })
    s.addText(f[1], {
      x: x + 0.34, y: y + 0.62, w: cw - 0.68, h: 0.8,
      fontFace: F, fontSize: 11, color: C.muted, margin: 0, valign: 'top', lineSpacing: 17,
    })
  })

  s.addText('추가로 향후 4주치 예약 슬롯 야간 사전 계산, 실시간 동기화, 예약 변경 횟수 제한, 감사 로그, 환자 · 관리자 도메인 분리가 포함됩니다.', {
    x: M, y: 6.14, w: CW, h: 0.4,
    fontFace: F, fontSize: 11.5, color: C.muted, margin: 0, valign: 'middle',
  })

  pageNum(s, 6)
}

/* ===============================================================
   07 — AI 레이어 8종 개요
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '제안 · AI 레이어', C.brass2)
  heading(s, '검증된 코어 위에 올리는 AI 모듈 8종')
  subheading(s, 'AI를 새 기능으로 얹는 것이 아니라, 앞서 정리한 P1~P5의 병목 지점에 직접 붙입니다. 별도 데이터 구축 없이 기존 예약 데이터를 근거로 동작합니다.')

  const mods = [
    ['AI-01', '노쇼 예측 & 오버부킹', 'P2'],
    ['AI-02', '24시간 AI 예약 상담', 'P1'],
    ['AI-03', '주기 기반 자동 리콜', 'P1 · P4'],
    ['AI-04', '이탈 예측 & 리텐션', 'P4'],
    ['AI-05', '스케줄 자동 재배치', 'P3'],
    ['AI-06', '상담 통화 자동 기록', 'P1 · P5'],
    ['AI-07', 'AI 사전 문진', 'P5'],
    ['AI-08', '자연어 경영 대시보드', 'P5'],
  ]

  const cw = (CW - 0.34 * 3) / 4
  mods.forEach((m, i) => {
    const col = i % 4
    const row = Math.floor(i / 4)
    const x = M + col * (cw + 0.34)
    const y = 2.34 + row * 1.94

    card(s, x, y, cw, 1.62, 'brass')
    s.addText(m[0], {
      x: x + 0.3, y: y + 0.22, w: cw - 0.6, h: 0.26,
      fontFace: F, fontSize: 10.5, bold: true, color: C.brass, charSpacing: 1.2, margin: 0, valign: 'middle',
    })
    s.addText(m[1], {
      x: x + 0.3, y: y + 0.56, w: cw - 0.6, h: 0.68,
      fontFace: F, fontSize: 14, bold: true, color: C.ink, margin: 0, valign: 'top', lineSpacing: 21,
    })
    s.addText('대응 ' + m[2], {
      x: x + 0.3, y: y + 1.24, w: cw - 0.6, h: 0.26,
      fontFace: F, fontSize: 10.5, bold: true, color: C.teal, margin: 0, valign: 'middle',
    })
  })

  pageNum(s, 7)
  s.addNotes('여기서 각 모듈이 어느 병목을 푸는지 매핑을 보여주고, 다음 두 장에서 우선순위 높은 모듈을 상세히 설명합니다.')
}

/* ===============================================================
   08 — AI 상세 1 (노쇼 / 상담)
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '제안 · 우선 적용 모듈', C.brass2)
  heading(s, '가장 먼저 효과가 보이는 두 모듈')

  const detail = [
    {
      code: 'AI-01', pain: 'P2',
      t: '노쇼 예측 & 스마트 오버부킹',
      d: '예약 이력, 리드타임, 요일 · 시간대, 이전 취소 패턴, 주기 단계를 근거로 예약 건별 노쇼 확률을 산출합니다.',
      rows: [
        ['동작', '고위험 예약에 추가 확인 알림톡을 자동 발송하고, 확률이 임계치를 넘으면 해당 슬롯에 대기 환자를 제안'],
        ['효과', '고단가 시술 슬롯의 공백 최소화'],
      ],
    },
    {
      code: 'AI-02', pain: 'P1',
      t: '24시간 AI 예약 상담',
      d: '카카오 채널과 웹에서 자연어로 예약 · 변경 · 조회를 처리합니다. "내일 갈 수 있나요" 같은 문장을 실제 슬롯 조회로 연결합니다.',
      rows: [
        ['동작', '기존 예약 API를 그대로 호출하므로 사람이 잡은 예약과 동일한 규칙 · 제한이 적용됨'],
        ['효과', '아침 전화 인입을 채널로 분산, 야간 · 휴일 접수 가능'],
      ],
    },
  ]

  const cw = (CW - 0.56) / 2
  detail.forEach((m, i) => {
    const x = M + i * (cw + 0.56)
    card(s, x, 1.86, cw, 4.3, 'plain')

    codeDot(s, x + 0.42, 2.16, m.pain, { d: 0.44, fs: 11 })
    s.addText(m.code, {
      x: x + 1.0, y: 2.16, w: 2.2, h: 0.44,
      fontFace: F, fontSize: 11, bold: true, color: C.brass, charSpacing: 1.2, margin: 0, valign: 'middle',
    })
    s.addText(m.t, {
      x: x + 0.42, y: 2.76, w: cw - 0.84, h: 0.78,
      fontFace: F, fontSize: 19, bold: true, color: C.ink, margin: 0, valign: 'top', lineSpacing: 27,
    })
    s.addText(m.d, {
      x: x + 0.42, y: 3.56, w: cw - 0.84, h: 0.92,
      fontFace: F, fontSize: 12, color: C.muted, margin: 0, valign: 'top', lineSpacing: 19,
    })

    m.rows.forEach((r, j) => {
      const y = 4.56 + j * 0.78
      s.addText(r[0], {
        x: x + 0.42, y, w: 0.62, h: 0.3,
        fontFace: F, fontSize: 10.5, bold: true, color: C.teal2, margin: 0, valign: 'top',
      })
      s.addText(r[1], {
        x: x + 1.12, y, w: cw - 1.54, h: 0.68,
        fontFace: F, fontSize: 11.5, color: C.ink2, margin: 0, valign: 'top', lineSpacing: 18,
      })
    })
  })

  pageNum(s, 8)
}

/* ===============================================================
   09 — AI 상세 2 (나머지 6종)
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '제안 · 확장 모듈', C.brass2)
  heading(s, '주기 · 이탈 · 운영 데이터로 확장하는 여섯 모듈')

  const rest = [
    ['AI-03', '주기 기반 자동 리콜', '환자별 과거 주기 길이와 진료 단계를 학습해 다음 내원 시점을 예측하고, 그 전날 선제적으로 안내합니다. 환자가 전화로 묻기 전에 병원이 먼저 도달합니다.'],
    ['AI-04', '이탈 예측 & 리텐션', '판정 이후 재방문이 끊긴 환자를 자동 식별해 접촉 우선순위를 매기고, 상담 스크립트와 재방문 캠페인 메시지를 생성합니다.'],
    ['AI-05', '스케줄 자동 재배치', '휴진·시술 일정이 등록되면 영향받는 예약을 산출하고 대체 슬롯 조합을 최적화해 제안합니다. 관리자는 검토·승인만 하면 알림톡까지 일괄 발송됩니다.'],
    ['AI-06', '상담 통화 자동 기록', '데스크 통화를 음성 인식으로 텍스트화하고 요약해 환자 카드에 첨부합니다. 상담 내용이 담당자 기억이 아니라 시스템에 남습니다.'],
    ['AI-07', 'AI 사전 문진', '내원 전 대화형 문진 응답을 진료 준비용 요약 노트로 생성해 EMR 입력 초안으로 전달합니다. 진료 시간의 문진 비중이 줄어듭니다.'],
    ['AI-08', '자연어 경영 대시보드', '"지난달 노쇼율이 가장 높은 시간대는?"처럼 물으면 즉시 집계와 차트로 답합니다. 월말 수기 집계 없이 상시 지표를 확보합니다.'],
  ]

  const cw = (CW - 0.46 * 2) / 3
  rest.forEach((m, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = M + col * (cw + 0.46)
    const y = 1.96 + row * 2.16

    s.addText(m[0], {
      x, y, w: cw, h: 0.28,
      fontFace: F, fontSize: 10.5, bold: true, color: C.brass, charSpacing: 1.2, margin: 0, valign: 'middle',
    })
    s.addText(m[1], {
      x, y: y + 0.32, w: cw, h: 0.34,
      fontFace: F, fontSize: 15, bold: true, color: C.ink, margin: 0, valign: 'middle',
    })
    s.addText(m[2], {
      x, y: y + 0.74, w: cw - 0.16, h: 1.2,
      fontFace: F, fontSize: 11.5, color: C.muted, margin: 0, valign: 'top', lineSpacing: 18,
    })
  })

  pageNum(s, 9)
}

/* ===============================================================
   10 — 시스템 구성
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '구성')
  heading(s, '시스템 구성')
  subheading(s, '병원별 독립 인스턴스로 구축합니다. 데이터베이스와 도메인이 병원마다 분리되므로 타 병원과 데이터가 섞이지 않습니다.')

  const layers = [
    ['접점', ['환자 모바일 웹', '카카오 채널', '데스크 관리자', '의료진 화면', '경영 대시보드'], 'teal'],
    ['AI 레이어', ['노쇼 예측', '상담 에이전트', '주기 리콜', '이탈 예측', '스케줄 최적화', '통화 요약', '자연어 질의'], 'brass'],
    ['코어 · 검증됨', ['예약 엔진', '슬롯 사전계산', '스케줄 관리', '환자 마스터', '승인 워크플로', '감사 로그'], 'teal'],
    ['연동', ['카카오 알림톡', '본인인증', 'EMR 연계', '결제(선택)'], 'plain'],
    ['기반', ['PostgreSQL', 'Next.js · TypeScript', '서울 리전 배포', '일일 백업'], 'plain'],
  ]

  // Even grid per row — guarantees every node stays inside the slide.
  const rowH = 0.66
  const rowGap = 0.14
  const labelW = 2.2
  const availW = CW - labelW - 0.2
  let y = 2.15

  layers.forEach((L) => {
    card(s, M, y, CW, rowH, L[2] === 'brass' ? 'brass' : (L[2] === 'teal' ? 'teal' : 'plain'))
    s.addText(L[0], {
      x: M + 0.32, y, w: labelW - 0.4, h: rowH,
      fontFace: F, fontSize: 12.5, bold: true,
      color: L[2] === 'brass' ? C.brass : C.teal, margin: 0, valign: 'middle',
    })

    const n = L[1].length
    const gap = 0.13
    const nw = (availW - gap * (n - 1)) / n
    L[1].forEach((node, j) => {
      const x = M + labelW + j * (nw + gap)
      s.addShape(pres.ShapeType.roundRect, {
        x, y: y + 0.14, w: nw, h: 0.38, rectRadius: 0.18,
        fill: { color: C.white },
        line: { color: L[2] === 'brass' ? 'E3D3AC' : C.tealLine, width: 0.75 },
      })
      s.addText(node, {
        x, y: y + 0.14, w: nw, h: 0.38, align: 'center', valign: 'middle',
        fontFace: F, fontSize: 10, color: C.ink2, margin: 0,
      })
    })
    y += rowH + rowGap
  })

  s.addText('EMR 연계 범위는 병원이 사용하는 솔루션과 개방된 인터페이스에 따라 달라집니다. 표준 연동이 불가한 환경에서는 예약 건별 EMR 반영 상태 관리 방식으로 누락을 통제합니다.', {
    x: M, y: 6.2, w: CW, h: 0.4,
    fontFace: F, fontSize: 11, color: C.muted, margin: 0, valign: 'middle',
  })

  pageNum(s, 10)
}

/* ===============================================================
   11 — 기대 효과
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '효과')
  heading(s, '무엇을, 어떻게 측정할 것인가')
  subheading(s, '도입 첫 달을 기준선으로 측정하고, 분기마다 실측값을 리포트로 제공합니다.')

  const kpis = [
    ['예약 전화 인입', '감소', '웹 · 카카오 셀프 예약 전환율'],
    ['노쇼율', '감소', '리마인더 + 예측 확인 발송 전후 비교'],
    ['시술 슬롯 가동률', '상승', '공실 슬롯 대체 배정 건수'],
    ['주기 재진입률', '상승', '판정 후 90일 내 재방문 비율'],
    ['예약 처리 시간', '단축', '건당 데스크 처리 소요 시간'],
    ['데이터 정합성', '개선', 'EMR 미반영 예약 건수 추이'],
  ]

  const cw = (CW - 0.44 * 2) / 3
  kpis.forEach((k, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = M + col * (cw + 0.44)
    const y = 2.2 + row * 1.72

    card(s, x, y, cw, 1.42, 'plain')
    s.addText(k[0], {
      x: x + 0.32, y: y + 0.2, w: cw - 0.64, h: 0.3,
      fontFace: F, fontSize: 13, bold: true, color: C.ink, margin: 0, valign: 'middle',
    })
    s.addText(k[1], {
      x: x + 0.32, y: y + 0.52, w: cw - 0.64, h: 0.44,
      fontFace: F, fontSize: 24, bold: true, color: C.teal, margin: 0, valign: 'middle',
    })
    s.addText(k[2], {
      x: x + 0.32, y: y + 0.98, w: cw - 0.64, h: 0.3,
      fontFace: F, fontSize: 10.5, color: C.muted, margin: 0, valign: 'middle',
    })
  })

  card(s, M, 5.72, CW, 1.02, 'teal')
  s.addText('구체적 개선 수치는 병원의 현재 운영 방식 · 환자 구성 · 기존 시스템 유무에 따라 편차가 큽니다. 사전 진단에서 귀 병원의 실제 데이터를 확인한 뒤 숫자로 약속 가능한 목표치를 별도 제안서에 명시합니다.\n검증되지 않은 일반화된 수치를 앞세우지 않는 것이 저희 원칙입니다.', {
    x: M + 0.36, y: 5.86, w: CW - 0.72, h: 0.76,
    fontFace: F, fontSize: 11.5, color: C.teal, margin: 0, valign: 'middle', lineSpacing: 18,
  })

  pageNum(s, 11)
  s.addNotes('여기서 과장된 수치를 제시하지 않는 것이 오히려 신뢰를 얻는 지점입니다.')
}

/* ===============================================================
   12 — 도입 절차
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '일정')
  heading(s, '도입 절차 — 표준 12주')
  subheading(s, '코어가 이미 완성되어 있으므로, 기간의 대부분은 개발이 아니라 귀 병원의 진료 규칙을 시스템에 반영하는 작업에 쓰입니다.')

  const phases = [
    ['01', '1 – 2주차', '진단 & 요건 확정', '현행 예약 · 상담 프로세스 관찰, 스케줄 규칙 정리, EMR 환경 확인, 기준 지표 측정'],
    ['02', '3 – 5주차', '코어 구축 & 맞춤 설정', '전용 인스턴스 생성, 의료진 · 슬롯 규칙 설정, 브랜드 디자인 적용, 도메인 연결'],
    ['03', '5 – 7주차', '알림톡 & 채널 연동', '카카오 채널 개설, 템플릿 등록 · 심사, 본인인증 연동, 발송 시나리오 검증'],
    ['04', '6 – 9주차', 'AI 모듈 적용', '과거 예약 데이터 이관 후 예측 모델 기준선 학습, 우선순위 높은 모듈부터 순차 활성화'],
    ['05', '9 – 10주차', '교육 & 병행 운영', '실사용자 교육, 기존 방식과 2주 병행 운영으로 리스크 제거, 현장 피드백 반영'],
    ['06', '11 – 12주차', '정식 오픈 & 안정화', '전면 전환, 초기 2주 밀착 대응, 지표 리포트 체계 가동'],
  ]

  let y = 2.24
  phases.forEach((p) => {
    codeDot(s, M, y, p[0], { d: 0.44, fs: 11 })
    s.addText(p[1], {
      x: M + 0.66, y, w: 1.5, h: 0.44,
      fontFace: F, fontSize: 11, bold: true, color: C.teal2, margin: 0, valign: 'middle',
    })
    s.addText(p[2], {
      x: M + 2.24, y, w: 3.0, h: 0.44,
      fontFace: F, fontSize: 14, bold: true, color: C.ink, margin: 0, valign: 'middle',
    })
    s.addText(p[3], {
      x: M + 5.4, y, w: CW - 5.4, h: 0.44,
      fontFace: F, fontSize: 11.5, color: C.muted, margin: 0, valign: 'middle',
    })
    y += 0.72
  })

  pageNum(s, 12)
}

/* ===============================================================
   13 — 보안
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '신뢰')
  heading(s, '보안 및 컴플라이언스')
  subheading(s, '난임 진료 정보는 가장 민감한 개인정보에 속합니다. 기술적 조치와 운영 규칙을 함께 설계합니다.')

  const secs = [
    ['국내 리전 보관', '데이터베이스와 애플리케이션 모두 국내(서울) 리전에서 운영합니다. 환자 정보는 국외로 이전되지 않습니다.'],
    ['병원별 데이터 분리', '병원마다 독립 데이터베이스 · 독립 도메인으로 구축합니다. 타 병원과 데이터가 공유되는 구조가 아닙니다.'],
    ['접근 권한 & 감사 로그', '관리자 역할 기반 권한 분리, 환자 정보 조회 · 변경 이력 기록. 누가 언제 무엇을 바꿨는지 추적 가능합니다.'],
    ['AI 학습 데이터 통제', '환자 데이터는 외부 모델의 학습에 사용되지 않습니다. AI 처리 시 식별정보는 최소화하여 전달합니다.'],
    ['본인인증 기반 접근', '환자 예약 조회는 휴대폰 또는 카카오 인증을 거칩니다. 이름 · 생년월일만으로 타인 예약이 조회되지 않습니다.'],
    ['백업 & 복구', '일일 자동 백업과 시점 복구를 운영하며, 장애 대응 절차와 연락 체계를 계약에 명시합니다.'],
  ]

  const cw = (CW - 0.5 * 2) / 3
  secs.forEach((sc, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = M + col * (cw + 0.5)
    const y = 2.24 + row * 2.0

    s.addShape(pres.ShapeType.ellipse, {
      x, y, w: 0.34, h: 0.34, fill: { color: C.tealTint },
    })
    s.addShape(pres.ShapeType.ellipse, {
      x: x + 0.115, y: y + 0.115, w: 0.11, h: 0.11, fill: { color: C.teal },
    })
    s.addText(sc[0], {
      x: x + 0.5, y: y - 0.03, w: cw - 0.5, h: 0.4,
      fontFace: F, fontSize: 14.5, bold: true, color: C.ink, margin: 0, valign: 'middle',
    })
    s.addText(sc[1], {
      x, y: y + 0.52, w: cw - 0.2, h: 1.2,
      fontFace: F, fontSize: 11.5, color: C.muted, margin: 0, valign: 'top', lineSpacing: 18,
    })
  })

  pageNum(s, 13)
}

/* ===============================================================
   14 — 요금
   =============================================================== */
{
  const s = pres.addSlide()
  lightBg(s)
  kicker(s, '비용')
  heading(s, '도입 방식과 비용')
  subheading(s, '초기 구축비와 월 운영비로 구성합니다. 병원 규모(의료진 수 · 월 예약 건수)와 선택 모듈에 따라 조정되며, 아래는 협의 기준안입니다.')

  const plans = [
    {
      name: 'Core', price: '구축비 + 월 운영비 · 협의',
      who: '의료진 3인 이하 / 예약 시스템 첫 도입',
      items: ['환자 예약 웹 & 데스크 관리자', '의료진 스케줄 & 변경 승인', '카카오 알림톡 7종', '기본 통계 대시보드'],
      hl: false,
    },
    {
      name: 'Smart', price: '구축비 + 월 운영비 · 협의',
      who: '의료진 4–10인 / 노쇼와 콜 부하가 실제 비용인 병원',
      items: ['Core 전체 포함', 'AI 노쇼 예측 & 오버부킹', '24시간 AI 예약 상담', '주기 기반 자동 리콜', '이탈 예측 & 리텐션', '분기 지표 리포트'],
      hl: true,
    },
    {
      name: 'Enterprise', price: '전체 별도 협의',
      who: '다지점 운영 / EMR 연계 및 전용 요건',
      items: ['Smart 전체 포함', 'AI 모듈 8종 전체', 'EMR 연계 개발', '지점 통합 대시보드', '전용 기능 개발 & 전담 지원'],
      hl: false,
    },
  ]

  const cw = (CW - 0.5 * 2) / 3
  plans.forEach((p, i) => {
    const x = M + i * (cw + 0.5)
    card(s, x, 2.24, cw, 3.94, p.hl ? 'teal' : 'plain')

    s.addText(p.name, {
      x: x + 0.36, y: 2.46, w: cw - 0.72, h: 0.42,
      fontFace: F, fontSize: 20, bold: true, color: p.hl ? C.teal : C.ink, margin: 0, valign: 'middle',
    })
    if (p.hl) chip(s, x + cw - 1.15, 2.54, 0.8, '권장', 'brass')

    s.addText(p.price, {
      x: x + 0.36, y: 2.92, w: cw - 0.72, h: 0.3,
      fontFace: F, fontSize: 12, bold: true, color: C.brass, margin: 0, valign: 'middle',
    })
    s.addText(p.who, {
      x: x + 0.36, y: 3.24, w: cw - 0.72, h: 0.56,
      fontFace: F, fontSize: 11, color: C.muted, margin: 0, valign: 'top', lineSpacing: 17,
    })

    s.addText(p.items.map((t, j) => ({
      text: t,
      options: { bullet: true, breakLine: j !== p.items.length - 1 },
    })), {
      x: x + 0.36, y: 3.9, w: cw - 0.72, h: 2.1,
      fontFace: F, fontSize: 11.5, color: C.ink2, margin: 0, valign: 'top',
      paraSpaceAfter: 6,
    })
  })

  s.addText('카카오 알림톡 발송 단가와 본인인증 건당 비용 등 외부 서비스 실비는 별도이며 사용량 기준으로 청구됩니다. 협의 항목은 병원 규모 확인 후 확정 견적으로 대체됩니다.', {
    x: M, y: 6.38, w: CW, h: 0.4,
    fontFace: F, fontSize: 11, color: C.muted, margin: 0, valign: 'middle',
  })

  pageNum(s, 14)
}

/* ===============================================================
   15 — 다음 단계 (dark)
   =============================================================== */
{
  const s = pres.addSlide()
  s.background = { color: C.deep }

  s.addText('다음 단계', {
    x: M, y: 0.46, w: CW, h: 0.3,
    fontFace: F, fontSize: 11.5, bold: true, color: C.teal2, charSpacing: 2, margin: 0, valign: 'middle',
  })
  s.addText('먼저 병원의 숫자를 보고 이야기하겠습니다', {
    x: M, y: 1.0, w: 10.5, h: 0.8,
    fontFace: F, fontSize: 34, bold: true, color: C.white, margin: 0, valign: 'middle',
  })

  const steps = [
    ['01', '무상 진단 · 60분', '현재 예약 · 상담 프로세스와 최근 3개월 예약 데이터를 함께 확인합니다.'],
    ['02', '현황 리포트', '노쇼율 · 전화 인입량 · 슬롯 공실률을 실제 숫자로 산출해 드립니다.'],
    ['03', '전용 제안서 · 2주 내', '개선 목표치, 적용 모듈, 확정 견적, 상세 일정을 문서로 제출합니다.'],
  ]

  const cw = (CW - 0.5 * 2) / 3
  steps.forEach((st, i) => {
    const x = M + i * (cw + 0.5)
    s.addShape(pres.ShapeType.rect, { x, y: 2.36, w: cw, h: 1.94, fill: { color: '0E4A4E' } })
    codeDot(s, x + 0.36, 2.62, st[0], { d: 0.44, fs: 11, fill: '7FD8C9', color: C.deep })
    s.addText(st[1], {
      x: x + 0.36, y: 3.2, w: cw - 0.72, h: 0.34,
      fontFace: F, fontSize: 15, bold: true, color: C.white, margin: 0, valign: 'middle',
    })
    s.addText(st[2], {
      x: x + 0.36, y: 3.58, w: cw - 0.72, h: 0.6,
      fontFace: F, fontSize: 11.5, color: 'AFC7C4', margin: 0, valign: 'top', lineSpacing: 18,
    })
  })

  s.addText('진단과 제안서 작성에는 비용이 발생하지 않습니다.', {
    x: M, y: 4.5, w: CW, h: 0.34,
    fontFace: F, fontSize: 13, bold: true, color: '7FD8C9', margin: 0, valign: 'middle',
  })

  const contacts = [['회사', '회사명 입력'], ['담당', '담당자 / 직함'], ['연락처', '010-0000-0000'], ['이메일', 'contact@example.com']]
  const kw = (CW - 0.4 * 3) / 4
  contacts.forEach((c, i) => {
    const x = M + i * (kw + 0.4)
    s.addText(c[0], {
      x, y: 5.42, w: kw, h: 0.28,
      fontFace: F, fontSize: 10.5, bold: true, color: '6E918D', charSpacing: 1.2, margin: 0, valign: 'middle',
    })
    s.addText(c[1], {
      x, y: 5.72, w: kw, h: 0.36,
      fontFace: F, fontSize: 15, bold: true, color: C.white, margin: 0, valign: 'middle',
    })
  })

  s.addText('난임 전문병원 AI 스마트 CRM · 사업 소개서 · Rev. 1.0', {
    x: M, y: 6.68, w: CW, h: 0.3,
    fontFace: F, fontSize: 10, color: '4E706D', margin: 0, valign: 'middle',
  })

  s.addNotes('연락처 4개 항목은 실제 정보로 교체해야 합니다.')
}

pres.writeFile({ fileName: process.argv[2] || 'ai-smart-crm-deck.pptx' })
  .then((f) => console.log('WROTE', f))
  .catch((e) => { console.error(e); process.exit(1) })
