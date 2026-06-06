import { useNavigate } from '@tanstack/react-router';
import {
  Bold,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Indent,
  Italic,
  List,
  ListOrdered,
  Outdent,
  Plus,
  RotateCcw,
  Search,
  Strikethrough,
  Trash2,
  Underline,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import type { ScreenModule } from './types';

/* ============================================================
   OfficeMate — 결재 화면
   ============================================================ */

/* ---- 결재 양식 템플릿 ---- */
type Template = { id: string; name: string; cat: string; content: string };

const APPROVAL_TEMPLATES: Template[] = [
  {
    id: 'trip',
    name: '출장보고서',
    cat: '출장',
    content:
      '<h3 style="text-align:center;margin-bottom:20px;font-size:17px;letter-spacing:4px">출 장 보 고 서</h3><p><strong>1. 출장 목적 :</strong>&nbsp;</p><p><strong>2. 출장 기간 :</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;~&nbsp;</p><p><strong>3. 출장지 :</strong>&nbsp;</p><p><strong>4. 출장 내용 :</strong></p><p>&nbsp;</p><p><strong>5. 비용 내역 :</strong></p><table border="1" style="width:100%;border-collapse:collapse;margin-top:8px"><thead><tr style="background:#f0f0f0"><th style="padding:6px 10px;font-size:13px">항목</th><th style="padding:6px 10px;font-size:13px">금액</th><th style="padding:6px 10px;font-size:13px">비고</th></tr></thead><tbody><tr><td style="padding:6px 10px">&nbsp;</td><td style="padding:6px 10px">&nbsp;</td><td style="padding:6px 10px">&nbsp;</td></tr><tr style="background:#f8f8f8"><td style="padding:6px 10px;font-weight:700">합계</td><td style="padding:6px 10px">&nbsp;</td><td style="padding:6px 10px">&nbsp;</td></tr></tbody></table><p style="margin-top:20px;text-align:center">위와 같이 출장 보고드립니다.</p>',
  },
  {
    id: 'overseas',
    name: '해외출장품의서',
    cat: '출장',
    content:
      '<h3 style="text-align:center;margin-bottom:20px;font-size:17px;letter-spacing:2px">해 외 출 장 품 의 서</h3><p><strong>1. 출장 목적 :</strong>&nbsp;</p><p><strong>2. 출장 국가/도시 :</strong>&nbsp;</p><p><strong>3. 출장 기간 :</strong>&nbsp;</p><p><strong>4. 출장자 :</strong>&nbsp;</p><p><strong>5. 소요 예산 :</strong>&nbsp;</p><p style="margin-top:20px;text-align:center">위와 같이 해외 출장을 품의합니다.</p>',
  },
  {
    id: 'edu',
    name: '교육 신청서',
    cat: '-',
    content:
      '<h3 style="text-align:center;margin-bottom:20px;font-size:17px;letter-spacing:2px">교 육 신 청 서</h3><p><strong>1. 교육명 :</strong>&nbsp;</p><p><strong>2. 교육 기관 :</strong>&nbsp;</p><p><strong>3. 교육 일정 :</strong>&nbsp;</p><p><strong>4. 신청자 :</strong>&nbsp;</p><p><strong>5. 교육 목적 :</strong>&nbsp;</p><p><strong>6. 예상 비용 :</strong>&nbsp;</p><p style="margin-top:20px;text-align:center">위와 같이 교육 수강을 신청합니다.</p>',
  },
  {
    id: 'book',
    name: '도서구입 신청서',
    cat: '-',
    content:
      '<h3 style="text-align:center;margin-bottom:20px;font-size:17px;letter-spacing:2px">도 서 구 입 신 청 서</h3><table border="1" style="width:100%;border-collapse:collapse;margin-top:8px"><thead><tr style="background:#f0f0f0"><th style="padding:6px 10px;font-size:13px">NO.</th><th style="padding:6px 10px;font-size:13px">도서명</th><th style="padding:6px 10px;font-size:13px">저자</th><th style="padding:6px 10px;font-size:13px">출판사</th><th style="padding:6px 10px;font-size:13px">금액</th></tr></thead><tbody><tr><td style="padding:6px 10px;text-align:center">1</td><td style="padding:6px 10px">&nbsp;</td><td style="padding:6px 10px">&nbsp;</td><td style="padding:6px 10px">&nbsp;</td><td style="padding:6px 10px">&nbsp;</td></tr></tbody></table><p style="margin-top:16px"><strong>구입 사유 :</strong>&nbsp;</p><p style="margin-top:20px;text-align:center">위와 같이 도서 구입을 신청합니다.</p>',
  },
  {
    id: 'supplies',
    name: '비품구매 요청서',
    cat: '-',
    content:
      '<h3 style="text-align:center;margin-bottom:16px;font-size:17px;letter-spacing:2px">비 품 구 매 요 청 서</h3><p><strong>1. 구매요청부서 :</strong>&nbsp;</p><p><strong>2. 구매사유 :</strong>&nbsp;</p><p><strong>3. 구매요청품목</strong></p><table border="1" style="width:100%;border-collapse:collapse;margin-top:8px"><thead><tr style="background:#f0f0f0"><th style="padding:6px 10px;font-size:13px">NO.</th><th style="padding:6px 10px;font-size:13px">품목명</th><th style="padding:6px 10px;font-size:13px">수량</th><th style="padding:6px 10px;font-size:13px">금액</th><th style="padding:6px 10px;font-size:13px">사용부서</th></tr></thead><tbody><tr><td style="padding:6px 10px;text-align:center">1</td><td style="padding:6px 10px">&nbsp;</td><td style="padding:6px 10px">&nbsp;</td><td style="padding:6px 10px">&nbsp;</td><td style="padding:6px 10px">&nbsp;</td></tr><tr style="background:#f0f0f0"><td colspan="2" style="padding:6px 10px;font-weight:700;text-align:center">합계(부가세 포함)</td><td style="padding:6px 10px">&nbsp;</td><td style="padding:6px 10px">&nbsp;</td><td style="padding:6px 10px">&nbsp;</td></tr></tbody></table><p style="margin-top:14px"><strong>4. 첨부서류</strong><br>&nbsp;&nbsp;관련 구매 링크 :</p><p><strong>5. 결제방법 : </strong>법인카드/계좌이체/기타</p><p style="margin-top:20px;text-align:center">비품 구매를 위하여 결재를 기안하오니 검토 부탁드립니다.</p>',
  },
  {
    id: 'dinner',
    name: '회식 결재',
    cat: '-',
    content:
      '<h3 style="text-align:center;margin-bottom:20px;font-size:17px;letter-spacing:2px">회 식 결 재</h3><p><strong>1. 일시 :</strong>&nbsp;</p><p><strong>2. 장소 :</strong>&nbsp;</p><p><strong>3. 참석 인원 :</strong>&nbsp;&nbsp;&nbsp;&nbsp;명</p><p><strong>4. 예상 금액 :</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;원</p><p><strong>5. 결제 방법 :</strong>&nbsp;</p><p style="margin-top:20px;text-align:center">위와 같이 회식 결재를 요청합니다.</p>',
  },
  {
    id: 'leave',
    name: '장기휴가 신청서',
    cat: '휴가',
    content:
      '<h3 style="text-align:center;margin-bottom:20px;font-size:17px;letter-spacing:2px">장 기 휴 가 신 청 서</h3><p><strong>1. 신청자 :</strong>&nbsp;</p><p><strong>2. 부서 :</strong>&nbsp;</p><p><strong>3. 휴가 종류 :</strong>&nbsp;</p><p><strong>4. 휴가 기간 :</strong>&nbsp;&nbsp;&nbsp;&nbsp;~&nbsp;&nbsp;&nbsp;&nbsp;( 총 &nbsp;&nbsp;일 )</p><p><strong>5. 사유 :</strong>&nbsp;</p><p><strong>6. 업무 인수인계자 :</strong>&nbsp;</p><p style="margin-top:20px;text-align:center">위와 같이 장기 휴가를 신청합니다.</p>',
  },
];

/* ---- 결재 라인 타입 ---- */
type Person = { name: string; dept: string };
type Approver = Person & { role: string; step: number; status: string };

type ApprovalStatus = '진행' | '완료' | '반려' | '임시저장';

type ApprovalDoc = {
  id: string;
  no: string;
  title: string;
  category: string;
  author: string;
  authorDept: string;
  status: ApprovalStatus;
  attach: number;
  opinions: number;
  comments: number;
  createdAt: string;
  bookmarked: boolean;
  templateId: string;
  approvers: Approver[];
  notifiers: Person[];
  refs: Person[];
};

/* ---- 결재 문서 데이터 ---- */
const APPROVAL_DATA: ApprovalDoc[] = [
  {
    id: 'DOC-001',
    no: '2026-06-04-6876702',
    title: '비품구매 요청서',
    category: '-',
    author: '신규하',
    authorDept: '경영지원실',
    status: '진행',
    attach: 0,
    opinions: 0,
    comments: 0,
    createdAt: '2026-06-04',
    bookmarked: false,
    templateId: 'supplies',
    approvers: [
      { name: '전세원', dept: 'Business Development', role: '결재', step: 1, status: '대기' },
    ],
    notifiers: [],
    refs: [
      { name: '박소연', dept: '경영지원실' },
      { name: '전세용', dept: 'Anchors' },
      { name: '최문봉', dept: '경영지원실' },
    ],
  },
  {
    id: 'DOC-002',
    no: '2026-05-28-3214501',
    title: '5월 교육 신청',
    category: '-',
    author: '김지훈',
    authorDept: '개발팀',
    status: '완료',
    attach: 1,
    opinions: 2,
    comments: 1,
    createdAt: '2026-05-28',
    bookmarked: true,
    templateId: 'edu',
    approvers: [{ name: '윤서준', dept: '개발팀', role: '결재', step: 1, status: '승인' }],
    notifiers: [],
    refs: [],
  },
  {
    id: 'DOC-003',
    no: '2026-05-20-7760091',
    title: '출장보고서 (부산)',
    category: '출장',
    author: '정다은',
    authorDept: '기획팀',
    status: '완료',
    attach: 2,
    opinions: 1,
    comments: 0,
    createdAt: '2026-05-20',
    bookmarked: false,
    templateId: 'trip',
    approvers: [{ name: '장미래', dept: '기획팀', role: '결재', step: 1, status: '승인' }],
    notifiers: [],
    refs: [],
  },
  {
    id: 'DOC-004',
    no: '2026-05-15-1123456',
    title: '도서구입 신청서',
    category: '-',
    author: '강태양',
    authorDept: '디자인실',
    status: '반려',
    attach: 0,
    opinions: 1,
    comments: 2,
    createdAt: '2026-05-15',
    bookmarked: false,
    templateId: 'book',
    approvers: [{ name: '윤서준', dept: '개발팀', role: '결재', step: 1, status: '반려' }],
    notifiers: [],
    refs: [],
  },
  {
    id: 'DOC-005',
    no: '2026-06-01-9988001',
    title: '6월 팀 회식 결재',
    category: '-',
    author: '신규하',
    authorDept: '경영지원실',
    status: '임시저장',
    attach: 0,
    opinions: 0,
    comments: 0,
    createdAt: '2026-06-01',
    bookmarked: false,
    templateId: 'dinner',
    approvers: [],
    notifiers: [],
    refs: [],
  },
];

/* ---- 수신함별 샘플 문서 ---- */
type InboxDoc = {
  id: string;
  no: string;
  title: string;
  category: string;
  author: string;
  status: ApprovalStatus;
  attach: number;
  opinions: number;
  comments: number;
  createdAt: string;
  bookmarked: boolean;
};

const INBOX_DATA: Record<string, InboxDoc[]> = {
  'appr-todo': [
    {
      id: 'I-001',
      no: '2026-06-05-1122334',
      title: '해외출장 품의서 (싱가포르)',
      category: '출장',
      author: '정다은',
      status: '진행',
      attach: 1,
      opinions: 0,
      comments: 0,
      createdAt: '2026-06-05',
      bookmarked: false,
    },
    {
      id: 'I-002',
      no: '2026-06-03-7788990',
      title: '5월 회식 결재 요청',
      category: '-',
      author: '강태양',
      status: '진행',
      attach: 0,
      opinions: 0,
      comments: 1,
      createdAt: '2026-06-03',
      bookmarked: false,
    },
    {
      id: 'I-003',
      no: '2026-05-30-3344556',
      title: '교육 신청서 (AWS 클라우드)',
      category: '-',
      author: '홍준서',
      status: '진행',
      attach: 2,
      opinions: 0,
      comments: 0,
      createdAt: '2026-05-30',
      bookmarked: true,
    },
  ],
  'appr-notif': [
    {
      id: 'N-001',
      no: '2026-06-04-6876702',
      title: '비품구매 요청서',
      category: '-',
      author: '신규하',
      status: '완료',
      attach: 0,
      opinions: 1,
      comments: 0,
      createdAt: '2026-06-04',
      bookmarked: false,
    },
    {
      id: 'N-002',
      no: '2026-05-28-3214501',
      title: '5월 교육 신청',
      category: '-',
      author: '김지훈',
      status: '완료',
      attach: 1,
      opinions: 2,
      comments: 1,
      createdAt: '2026-05-28',
      bookmarked: false,
    },
  ],
  'appr-ref': [
    {
      id: 'R-001',
      no: '2026-06-01-9988001',
      title: '6월 팀 회식 결재',
      category: '-',
      author: '신규하',
      status: '진행',
      attach: 0,
      opinions: 0,
      comments: 0,
      createdAt: '2026-06-01',
      bookmarked: false,
    },
    {
      id: 'R-002',
      no: '2026-05-20-7760091',
      title: '출장보고서 (부산)',
      category: '출장',
      author: '정다은',
      status: '완료',
      attach: 2,
      opinions: 1,
      comments: 0,
      createdAt: '2026-05-20',
      bookmarked: true,
    },
    {
      id: 'R-003',
      no: '2026-05-15-1123456',
      title: '도서구입 신청서',
      category: '-',
      author: '강태양',
      status: '반려',
      attach: 0,
      opinions: 1,
      comments: 2,
      createdAt: '2026-05-15',
      bookmarked: false,
    },
  ],
  'appr-sched': [
    {
      id: 'S-001',
      no: '2026-06-10-2233445',
      title: '7월 팀빌딩 행사 품의',
      category: '-',
      author: '윤서준',
      status: '진행',
      attach: 0,
      opinions: 0,
      comments: 0,
      createdAt: '2026-06-07',
      bookmarked: false,
    },
    {
      id: 'S-002',
      no: '2026-06-08-5566778',
      title: '장기휴가 신청서 (2주)',
      category: '휴가',
      author: '장미래',
      status: '진행',
      attach: 1,
      opinions: 0,
      comments: 0,
      createdAt: '2026-06-06',
      bookmarked: false,
    },
  ],
};

/* ---- 유틸 ---- */
const fmt8 = (d: string) => (d ? d.replace(/-/g, '.') : '-');

/* ============================================================
   StatusBadge
   ============================================================ */
const STATUS_STYLE: Record<string, string> = {
  진행: 'bg-om-green-bg text-om-green border-om-green/25',
  완료: 'bg-om-blue-bg text-om-blue border-om-blue/25',
  반려: 'bg-om-red-bg text-om-red border-om-red/25',
  임시저장: 'bg-[#F0F1F3] text-[#69748A] border-border',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-[9px] py-[3px] text-xs font-bold',
        STATUS_STYLE[status] ?? STATUS_STYLE.임시저장
      )}
    >
      {status}
    </span>
  );
}

/* ============================================================
   PageTitle
   ============================================================ */
function PageTitle({
  title,
  onWrite,
}: {
  title: string;
  onWrite: () => void;
}) {
  return (
    <div className="mb-[18px] flex items-center justify-between">
      <span className="text-[22px] font-extrabold tracking-[-0.02em] text-[#1B2435]">{title}</span>
      <button
        type="button"
        onClick={onWrite}
        className="flex h-[38px] cursor-pointer items-center gap-1.5 rounded-md bg-primary px-[18px] text-[13.5px] font-bold text-white [&_svg]:size-3.5"
      >
        <Plus strokeWidth={2.6} />
        결재 작성하기
      </button>
    </div>
  );
}

/* ============================================================
   Cross-screen navigation
   ============================================================ */
function useGo() {
  const navigate = useNavigate();
  return (screenId: string) => {
    if (screenId === 'dashboard') navigate({ to: '/' });
    else navigate({ to: '/app/$screenId', params: { screenId } });
  };
}

/* ============================================================
   결재 홈 (appr-home)
   ============================================================ */
function ApprovalHome() {
  const go = useGo();
  const counts = useMemo(() => {
    const c: Record<string, number> = { 진행: 0, 완료: 0, 반려: 0, 임시저장: 0 };
    for (const d of APPROVAL_DATA) c[d.status]++;
    return c;
  }, []);

  const cards = [
    { label: '진행 중', count: counts.진행, color: 'text-om-green', screen: 'appr-sent' },
    { label: '완료', count: counts.완료, color: 'text-primary', screen: 'appr-sent' },
    { label: '반려', count: counts.반려, color: 'text-om-red', screen: 'appr-sent' },
    { label: '임시저장', count: counts.임시저장, color: 'text-[#69748A]', screen: 'appr-draft' },
  ];

  return (
    <div>
      <div className="mb-[22px] grid grid-cols-4 gap-3.5">
        {cards.map((c) => (
          <button
            type="button"
            key={c.label}
            onClick={() => go(c.screen)}
            className="cursor-pointer rounded-xl border border-border bg-white p-5 text-left transition-shadow hover:shadow-md"
          >
            <div className="mb-2 text-[13px] font-bold text-[#69748A]">{c.label}</div>
            <div className={cn('font-mono text-[32px] font-extrabold', c.color)}>{c.count}</div>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex items-center justify-between border-b border-[#F0F1F3] px-[18px] py-4">
          <span className="text-[15px] font-extrabold text-[#1B2435]">최근 상신 문서</span>
          <button
            type="button"
            onClick={() => go('appr-sent')}
            className="cursor-pointer text-[13px] font-semibold text-primary"
          >
            전체보기 &gt;
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-border bg-[#F8F9FA]">
                {['상태', '문서번호 · 제목', '작성자', '작성일'].map((h) => (
                  <th key={h} className="px-3.5 py-2.5 text-left text-xs font-bold text-[#69748A]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {APPROVAL_DATA.slice(0, 5).map((d) => (
                <tr key={d.id} className="border-b border-[#F0F1F3] last:border-b-0">
                  <td className="px-3.5 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="mb-0.5 font-mono text-xs text-[#69748A]">{d.no}</div>
                    <div className="text-[13.5px] font-semibold text-[#1B2435]">{d.title}</div>
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-[#3D4A5C]">{d.author}</td>
                  <td className="px-3.5 py-3 font-mono text-[13px] text-[#3D4A5C]">
                    {fmt8(d.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   양식 선택 모달
   ============================================================ */
const TPL_CATS = ['전체', '출장', '-', '휴가'];
const TPL_CAT_LABELS: Record<string, string> = {
  전체: '전체',
  출장: '출장',
  '-': '카테고리 없음',
  휴가: '휴가',
};

function TemplateModal({
  onClose,
  onPick,
  onFreeForm,
}: {
  onClose: () => void;
  onPick: (tpl: Template) => void;
  onFreeForm: () => void;
}) {
  const [cat, setCat] = useState('전체');
  const [search, setSearch] = useState('');

  const filtered = APPROVAL_TEMPLATES.filter((t) => {
    const matchCat = cat === '전체' || t.cat === cat;
    const matchS = !search || t.name.includes(search);
    return matchCat && matchS;
  });

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: 모달 오버레이 외부 클릭 닫기(닫기 버튼/ESC 별도 제공)
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-[min(92vw,540px)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#F0F1F3] px-[22px] pb-3.5 pt-5">
          <span className="text-[18px] font-extrabold text-[#1B2435]">결재 작성하기</span>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-[#69748A] hover:bg-[#F0F1F3] [&_svg]:size-5"
          >
            <X />
          </button>
        </div>
        <div className="px-5 pb-2.5 pt-3.5">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-[#F8F9FA] px-3.5 py-2.5 [&_svg]:size-4">
            <Search className="shrink-0 text-[#69748A]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="양식을 검색해주세요."
              className="flex-1 bg-transparent text-sm text-[#1B2435] outline-none"
            />
          </div>
          <div className="mt-3 flex gap-1.5">
            {TPL_CATS.map((c) => {
              const active = cat === c;
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCat(c)}
                  className={cn(
                    'h-[34px] cursor-pointer rounded-xl border px-3.5 text-[13px]',
                    active
                      ? 'border-primary bg-om-blue-bg font-bold text-primary'
                      : 'border-border font-medium text-[#3D4A5C]'
                  )}
                >
                  {TPL_CAT_LABELS[c]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length ? (
            filtered.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => onPick(t)}
                className="flex w-full items-center border-b border-[#F4F5F6] px-5 py-3.5 text-left transition-colors hover:bg-[#F8F9FA] [&_svg]:size-4"
              >
                <span className="flex-1 text-[14.5px] font-medium text-[#1B2435]">{t.name}</span>
                <ChevronRight className="text-[#9AA3B2]" />
              </button>
            ))
          ) : (
            <p className="p-[30px] text-center text-[#9AA3B2]">양식이 없습니다.</p>
          )}
        </div>
        <div className="border-t border-[#F0F1F3] px-5 py-3.5 text-right">
          <button
            type="button"
            onClick={onFreeForm}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-4 text-[13.5px] font-semibold text-[#3D4A5C] [&_svg]:size-3.5"
          >
            양식 없이 결재 작성
            <ChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   리치 텍스트 툴바 (execCommand)
   ============================================================ */
function exec(cmd: string) {
  document.execCommand(cmd, false);
}

function RichToolbar() {
  const btns: { cmd: string; Icon: typeof Bold; title: string }[] = [
    { cmd: 'bold', Icon: Bold, title: '굵게' },
    { cmd: 'italic', Icon: Italic, title: '기울임' },
    { cmd: 'underline', Icon: Underline, title: '밑줄' },
    { cmd: 'strikeThrough', Icon: Strikethrough, title: '취소선' },
    { cmd: 'insertUnorderedList', Icon: List, title: '글머리 기호' },
    { cmd: 'insertOrderedList', Icon: ListOrdered, title: '번호 매기기' },
    { cmd: 'indent', Icon: Indent, title: '들여쓰기' },
    { cmd: 'outdent', Icon: Outdent, title: '내어쓰기' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-[#F8F9FA] px-2.5 py-[7px]">
      {btns.map(({ cmd, Icon, title }) => (
        <button
          type="button"
          key={cmd}
          title={title}
          onMouseDown={(e) => {
            e.preventDefault();
            exec(cmd);
          }}
          className="grid h-7 min-w-7 cursor-pointer place-items-center rounded-md px-1 text-[#3D4A5C] transition-colors hover:bg-[#EDEEF0] [&_svg]:size-4"
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   결재 작성 폼
   ============================================================ */
function WriteForm({
  initialTpl,
  initialTitle,
  onBack,
  onSubmit,
  onDraft,
}: {
  initialTpl: Template | null;
  initialTitle: string;
  onBack: () => void;
  onSubmit: (data: {
    title: string;
    tpl: Template | null;
    approvers: Approver[];
    notifiers: Person[];
    refs: Person[];
  }) => void;
  onDraft: (data: {
    title: string;
    tpl: Template | null;
    approvers: Approver[];
    notifiers: Person[];
    refs: Person[];
  }) => void;
}) {
  const [tpl, setTpl] = useState<Template | null>(initialTpl);
  const [title, setTitle] = useState(initialTitle);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [notifiers, setNotifiers] = useState<Person[]>([]);
  const [refs, setRefs] = useState<Person[]>([]);
  // contenteditable 내용은 비제어로 관리(execCommand). key로 양식 교체 시 강제 리렌더.

  const addPerson = (label: string): Person | null => {
    const name = window.prompt(`${label} 이름을 입력하세요`);
    if (!name) return null;
    const dept = window.prompt('부서명을 입력하세요') || '';
    return { name: name.trim(), dept: dept.trim() };
  };

  const addApprover = () => {
    const p = addPerson('결재자');
    if (!p) return;
    setApprovers((prev) => [
      ...prev,
      { ...p, role: '결재', step: prev.length + 1, status: '대기' },
    ]);
  };
  const delApprover = (i: number) =>
    setApprovers((prev) =>
      prev.filter((_, idx) => idx !== i).map((a, idx) => ({ ...a, step: idx + 1 }))
    );

  const addNotifier = () => {
    const p = addPerson('통보자');
    if (p) setNotifiers((prev) => [...prev, p]);
  };
  const delNotifier = (i: number) => setNotifiers((prev) => prev.filter((_, idx) => idx !== i));

  const addRef = () => {
    const p = addPerson('참조자');
    if (p) setRefs((prev) => [...prev, p]);
  };
  const delRef = (i: number) => setRefs((prev) => prev.filter((_, idx) => idx !== i));

  const collect = () => ({ title: title.trim(), tpl, approvers, notifiers, refs });
  const handleSubmit = () => {
    if (!title.trim()) {
      window.alert('제목을 입력해 주세요.');
      return;
    }
    onSubmit(collect());
  };
  const handleDraft = () => {
    if (!title.trim()) {
      window.alert('제목을 입력해 주세요.');
      return;
    }
    onDraft(collect());
  };

  const inputCls =
    'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary';
  const labelCls = 'text-xs font-bold text-[#3D4A5C]';
  const panelCls = 'mb-3 rounded-lg border border-border bg-white p-4';
  const panelHead = 'mb-0.5 flex items-center justify-between';
  const panelTitle = 'text-sm font-extrabold text-[#1B2435]';
  const addBtnCls =
    'grid size-7 shrink-0 cursor-pointer place-items-center rounded-md border border-border text-[#3D4A5C] hover:bg-[#F0F1F3] [&_svg]:size-4';

  return (
    <div className="flex min-h-0 flex-col">
      {/* header */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-[#F0F1F3] pb-3.5 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-3 py-[7px] text-[13px] font-semibold text-[#3D4A5C] [&_svg]:size-3.5"
        >
          <ChevronLeft />
          목록으로
        </button>
        <span className="text-base font-extrabold text-[#1B2435]">결재 작성하기</span>
      </div>

      {/* body */}
      <div className="flex-1 py-5">
        <div className="grid grid-cols-[1fr_320px] items-start gap-5">
          {/* LEFT: form */}
          <div>
            <div className="mb-1.5 grid grid-cols-[1fr_160px] gap-3">
              <div className="flex flex-col gap-1.5">
                <span className={labelCls}>양식</span>
                <select
                  value={tpl?.id ?? ''}
                  onChange={(e) =>
                    setTpl(APPROVAL_TEMPLATES.find((t) => t.id === e.target.value) ?? null)
                  }
                  className={cn(inputCls, 'cursor-pointer')}
                >
                  <option value="">양식 없음</option>
                  {APPROVAL_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={labelCls}>보존 연한</span>
                <select className={cn(inputCls, 'cursor-pointer')}>
                  <option>영구</option>
                  <option>10년</option>
                  <option>5년</option>
                  <option>3년</option>
                </select>
              </div>
            </div>
            <p className="m-0 mb-3.5 text-[11.5px] text-[#9AA3B2]">
              양식 변경시 작성된 내용은 삭제됩니다.
            </p>

            <div className="mb-3.5 flex flex-col gap-1.5">
              <span className={labelCls}>
                제목 <span className="text-om-red">*</span>
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className={inputCls}
              />
            </div>

            <div className="overflow-hidden rounded-md border border-border bg-white">
              <RichToolbar />
              <div
                key={tpl?.id ?? 'free'}
                contentEditable
                suppressContentEditableWarning
                className="min-h-[400px] px-6 py-5 text-sm leading-[1.8] text-[#1B2435] outline-none [&_h3]:font-bold [&_table]:my-2 [&_table]:w-full [&_td]:border [&_td]:border-[#ddd] [&_td]:p-1.5 [&_th]:border [&_th]:border-[#ddd] [&_th]:bg-[#f0f0f0] [&_th]:p-1.5"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: 정적 결재 양식 템플릿(HTML) 렌더링 — 외부 입력 아님
                dangerouslySetInnerHTML={{ __html: tpl ? tpl.content : '<p><br></p>' }}
              />
            </div>
          </div>

          {/* RIGHT: 결재라인 */}
          <div className="sticky top-0">
            <div className="mb-3.5 text-base font-extrabold text-[#1B2435]">결재라인</div>

            {/* 결재 순서 */}
            <div className={panelCls}>
              <div className={panelHead}>
                <span className={panelTitle}>결재 순서</span>
                <button type="button" onClick={addApprover} className={addBtnCls}>
                  <Plus />
                </button>
              </div>
              {approvers.length ? (
                approvers.map((a, i) => (
                  <div
                    key={`${a.name}-${i}`}
                    className="mt-1.5 flex items-center gap-2 rounded-md border border-[#F0F1F3] bg-[#F8F9FA] px-2.5 py-2"
                  >
                    <span className="min-w-5 text-xs font-bold text-primary">{a.step}.</span>
                    <div className="flex-1">
                      <div className="mb-px text-xs font-semibold text-[#9AA3B2]">{a.role}</div>
                      <div className="text-[13.5px] font-bold text-[#1B2435]">
                        {a.name} / {a.dept}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => delApprover(i)}
                      className="grid size-6 cursor-pointer place-items-center rounded-md text-[#9AA3B2] hover:text-om-red [&_svg]:size-[15px]"
                    >
                      <Trash2 />
                    </button>
                    <span className="cursor-grab text-[#9AA3B2] [&_svg]:size-3.5">
                      <GripVertical />
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-3 text-center text-[13px] text-[#9AA3B2]">결재자가 없습니다.</p>
              )}
            </div>

            {/* 통보 */}
            <div className={panelCls}>
              <div className={panelHead}>
                <span className={panelTitle}>통보</span>
                <button type="button" onClick={addNotifier} className={addBtnCls}>
                  <Plus />
                </button>
              </div>
              {notifiers.length ? (
                notifiers.map((r, i) => (
                  <div
                    key={`${r.name}-${i}`}
                    className="mt-1.5 flex items-center gap-1.5 rounded-md border border-[#F0F1F3] bg-[#F8F9FA] px-2.5 py-[7px]"
                  >
                    <span className="flex-1 text-[13px] font-semibold text-[#1B2435]">
                      {r.name} / {r.dept}
                    </span>
                    <button
                      type="button"
                      onClick={() => delNotifier(i)}
                      className="grid size-[22px] cursor-pointer place-items-center rounded text-[#9AA3B2] hover:text-om-red [&_svg]:size-[13px]"
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))
              ) : (
                <p className="py-3 text-center text-[13px] text-[#9AA3B2]">통보자가 없습니다.</p>
              )}
            </div>

            {/* 참조 */}
            <div className={panelCls}>
              <div className={panelHead}>
                <span className={panelTitle}>참조</span>
                <button type="button" onClick={addRef} className={addBtnCls}>
                  <Plus />
                </button>
              </div>
              {refs.length ? (
                refs.map((r, i) => (
                  <div
                    key={`${r.name}-${i}`}
                    className="mt-1.5 flex items-center gap-1.5 rounded-md border border-[#F0F1F3] bg-[#F8F9FA] px-2.5 py-[7px]"
                  >
                    <span className="flex-1 text-[13px] font-semibold text-[#1B2435]">
                      {r.name} / {r.dept}
                    </span>
                    <button
                      type="button"
                      onClick={() => delRef(i)}
                      className="grid size-[22px] cursor-pointer place-items-center rounded text-[#9AA3B2] hover:text-om-red [&_svg]:size-[13px]"
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))
              ) : (
                <p className="py-3 text-center text-[13px] text-[#9AA3B2]">참조자가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* bottom bar */}
      <div className="flex shrink-0 justify-end gap-2 border-t border-[#F0F1F3] py-3.5">
        <button
          type="button"
          onClick={onBack}
          className="h-10 cursor-pointer rounded-md border border-border px-5 text-sm font-semibold text-[#3D4A5C]"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleDraft}
          className="h-10 cursor-pointer rounded-md border border-border px-5 text-sm font-semibold text-[#3D4A5C]"
        >
          임시저장
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="h-10 cursor-pointer rounded-md bg-primary px-6 text-sm font-bold text-white shadow-[0_2px_8px_rgba(0,102,255,0.22)]"
        >
          기안 상신
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   문서 상세 (조회)
   ============================================================ */
const APPROVER_STATUS_KEY: Record<string, string> = {
  승인: '완료',
  반려: '반려',
  대기: '임시저장',
};

function DocDetail({ doc, onBack }: { doc: ApprovalDoc; onBack: () => void }) {
  const tpl = APPROVAL_TEMPLATES.find((t) => t.id === doc.templateId) ?? null;
  const fields: [string, string][] = [
    ['작성자', doc.author],
    ['소속', doc.authorDept],
    ['작성일', fmt8(doc.createdAt)],
    ['양식', tpl ? tpl.name : '양식 없음'],
    ['첨부파일', `${doc.attach}개`],
  ];

  return (
    <div>
      <div className="mb-[18px] flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-3 py-[7px] text-[13px] font-semibold text-[#3D4A5C] [&_svg]:size-3.5"
        >
          <ChevronLeft />
          목록으로
        </button>
        <div className="flex-1">
          <div className="font-mono text-xs text-[#69748A]">{doc.no}</div>
          <div className="text-[17px] font-extrabold text-[#1B2435]">{doc.title}</div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      <div className="grid grid-cols-[1fr_280px] items-start gap-5">
        <div>
          <div className="mb-4 grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5">
            {fields.map((f) => (
              <div key={f[0]} className="rounded-lg border border-border bg-[#F8F9FA] px-3 py-2.5">
                <div className="mb-0.5 text-[11px] font-bold text-[#9AA3B2]">{f[0]}</div>
                <div className="text-[13.5px] font-bold text-[#1B2435]">{f[1]}</div>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <div
              className="min-h-[300px] px-6 py-5 text-sm leading-[1.8] text-[#1B2435] [&_h3]:font-bold [&_table]:my-2 [&_table]:w-full [&_td]:border [&_td]:border-[#ddd] [&_td]:p-1.5 [&_th]:border [&_th]:border-[#ddd] [&_th]:bg-[#f0f0f0] [&_th]:p-1.5"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: 정적 결재 양식 템플릿(HTML) 렌더링 — 외부 입력 아님
              dangerouslySetInnerHTML={{ __html: tpl ? tpl.content : '<p>내용이 없습니다.</p>' }}
            />
          </div>
        </div>

        <div>
          <div className="mb-3 text-[15px] font-extrabold text-[#1B2435]">결재라인</div>
          <div className="flex flex-col gap-2">
            {doc.approvers.length ? (
              doc.approvers.map((a) => (
                <div
                  key={a.step}
                  className="rounded-lg border border-[#F0F1F3] bg-[#F8F9FA] px-3.5 py-3"
                >
                  <div className="mb-0.5 text-[11.5px] font-bold text-[#9AA3B2]">
                    {a.step}. {a.role}
                  </div>
                  <div className="text-sm font-bold text-[#1B2435]">{a.name}</div>
                  <div className="text-xs text-[#9AA3B2]">{a.dept}</div>
                  <div className="mt-1.5">
                    <StatusBadge status={APPROVER_STATUS_KEY[a.status] ?? '진행'} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[13px] text-[#9AA3B2]">결재자가 없습니다.</p>
            )}
          </div>
          {doc.refs.length > 0 && (
            <div className="mt-3.5">
              <div className="mb-2 text-[13px] font-bold text-[#3D4A5C]">참조</div>
              <div className="flex flex-col gap-1.5">
                {doc.refs.map((r) => (
                  <div key={`${r.name}-${r.dept}`} className="text-[13px] text-[#3D4A5C]">
                    {r.name} / {r.dept}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   필터/검색 바 (상신함·수신함 공용)
   ============================================================ */
type Filters = {
  cat: string;
  status: string;
  no: string;
  author: string;
  title: string;
  from: string;
  to: string;
};

function FilterBar({
  statusOptions,
  defaultStatus,
  onApply,
}: {
  statusOptions: string[];
  defaultStatus: string;
  onApply: (f: Filters) => void;
}) {
  const empty: Filters = {
    cat: '전체',
    status: defaultStatus,
    no: '',
    author: '',
    title: '',
    from: '',
    to: '',
  };
  const [draft, setDraft] = useState<Filters>(empty);

  const selCls =
    'h-[38px] cursor-pointer appearance-none rounded-md border border-border bg-white pl-3 pr-7 text-[13px] outline-none';
  const dateCls =
    'h-[38px] rounded-md border border-border bg-white px-2.5 font-mono text-[13px] outline-none';
  const set = (k: keyof Filters, v: string) => setDraft((p) => ({ ...p, [k]: v }));

  const srch = (field: keyof Filters, ph: string) => (
    <div className="relative flex-1" key={field}>
      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#9AA3B2]" />
      <input
        type="text"
        value={draft[field]}
        onChange={(e) => set(field, e.target.value)}
        placeholder={ph}
        className="h-[38px] w-full rounded-md border border-border bg-white pl-[34px] pr-3 text-[13px] outline-none focus:border-primary"
      />
    </div>
  );

  return (
    <>
      <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-[13px] font-bold text-[#3D4A5C]">카테고리</span>
          <select value={draft.cat} onChange={(e) => set('cat', e.target.value)} className={selCls}>
            {['전체', '출장', '-', '휴가'].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-[13px] font-bold text-[#3D4A5C]">상태</span>
          <select
            value={draft.status}
            onChange={(e) => set('status', e.target.value)}
            className={selCls}
          >
            {statusOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[240px] flex-1 items-center gap-2">
          <input
            type="date"
            value={draft.from}
            onChange={(e) => set('from', e.target.value)}
            className={dateCls}
          />
          <span className="text-sm text-[#9AA3B2]">~</span>
          <input
            type="date"
            value={draft.to}
            onChange={(e) => set('to', e.target.value)}
            className={dateCls}
          />
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {srch('no', '문서 번호를 검색하세요.')}
        {srch('author', '작성자를 검색하세요.')}
        {srch('title', '제목 또는 내용을 검색하세요.')}
        <button
          type="button"
          onClick={() => onApply(draft)}
          className="h-[38px] cursor-pointer rounded-md bg-primary px-[18px] text-[13.5px] font-bold text-white"
        >
          검색
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(empty);
            onApply(empty);
          }}
          className="flex h-[38px] cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 text-[13px] font-semibold text-[#3D4A5C] [&_svg]:size-[13px]"
        >
          <RotateCcw />
          초기화
        </button>
      </div>
    </>
  );
}

/* ============================================================
   문서 테이블 (상신함·수신함 공용)
   ============================================================ */
const DOC_HEADERS = [
  '상태',
  '문서번호 · 제목',
  '카테고리',
  '작성자',
  '첨부파일',
  '결재의견',
  '댓글',
  '작성일',
  '북마크',
];

function DocTable({
  rows,
  emptyText,
  onRowClick,
  onBookmark,
}: {
  rows: (ApprovalDoc | InboxDoc)[];
  emptyText: string;
  onRowClick?: (id: string) => void;
  onBookmark?: (id: string) => void;
}) {
  const th = 'whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold text-[#69748A]';
  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-border bg-[#F8F9FA]">
                <th className={cn(th, 'w-9')}>
                  <input type="checkbox" className="size-[15px]" />
                </th>
                {DOC_HEADERS.map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((d) => {
                  return (
                    <tr
                      key={d.id}
                      onClick={() => onRowClick?.(d.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onRowClick?.(d.id);
                      }}
                      className={cn(
                        'border-b border-[#F0F1F3] last:border-b-0',
                        onRowClick && 'cursor-pointer hover:bg-[#F8F9FA]'
                      )}
                    >
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          className="size-[15px] cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="mb-0.5 font-mono text-xs text-[#69748A]">{d.no}</div>
                        <div className="text-[13.5px] font-semibold text-[#1B2435]">{d.title}</div>
                      </td>
                      <td className="px-3.5 py-3 text-[13px] text-[#3D4A5C]">{d.category}</td>
                      <td className="px-3.5 py-3 text-[13px] text-[#3D4A5C]">{d.author}</td>
                      <td className="px-3.5 py-3 text-center text-[13px] text-[#3D4A5C]">
                        {d.attach}개
                      </td>
                      <td className="px-3.5 py-3 text-center text-[13px] text-[#3D4A5C]">
                        {d.opinions}개
                      </td>
                      <td className="px-3.5 py-3 text-center text-[13px] text-[#3D4A5C]">
                        {d.comments}개
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[13px] text-[#3D4A5C]">
                        {fmt8(d.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookmark?.(d.id);
                          }}
                          className={cn(
                            'grid size-7 cursor-pointer place-items-center rounded-md [&_svg]:size-4',
                            d.bookmarked ? 'text-primary' : 'text-[#9AA3B2]'
                          )}
                        >
                          <Bookmark fill={d.bookmarked ? 'currentColor' : 'none'} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-sm text-[#9AA3B2]">
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-2.5 text-[13px] text-[#9AA3B2]">총 {rows.length}건</div>
    </>
  );
}

function matchFilters(d: ApprovalDoc | InboxDoc, f: Filters): boolean {
  if (f.cat !== '전체' && d.category !== f.cat) return false;
  if (f.status !== '전체' && d.status !== f.status) return false;
  if (f.no && !d.no.includes(f.no)) return false;
  if (f.author && !d.author.includes(f.author)) return false;
  if (f.title && !d.title.includes(f.title)) return false;
  if (f.from && d.createdAt < f.from) return false;
  if (f.to && d.createdAt > f.to) return false;
  return true;
}

/* ============================================================
   상신함 (appr-sent) — list / detail / write 내부 전환
   ============================================================ */
type SentView = 'list' | 'detail' | 'write';

function genDoc(
  status: ApprovalStatus,
  data: {
    title: string;
    tpl: Template | null;
    approvers: Approver[];
    notifiers: Person[];
    refs: Person[];
  }
): ApprovalDoc {
  const today = new Date().toISOString().slice(0, 10);
  const no = `${today}-${1000000 + Math.floor(Math.random() * 9000000)}`;
  return {
    id: `DOC-${Date.now()}`,
    no,
    title: data.title,
    category: '-',
    author: '김지훈',
    authorDept: '개발팀',
    status,
    attach: 0,
    opinions: 0,
    comments: 0,
    createdAt: today,
    bookmarked: false,
    templateId: data.tpl ? data.tpl.id : '',
    approvers: data.approvers,
    notifiers: data.notifiers,
    refs: data.refs,
  };
}

function SentScreen() {
  const [docs, setDocs] = useState<ApprovalDoc[]>(APPROVAL_DATA);
  const [view, setView] = useState<SentView>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [writeTpl, setWriteTpl] = useState<Template | null>(null);
  const [writeTitle, setWriteTitle] = useState('');
  const [filters, setFilters] = useState<Filters>({
    cat: '전체',
    status: '전체',
    no: '',
    author: '',
    title: '',
    from: '',
    to: '',
  });

  const filtered = docs.filter((d) => matchFilters(d, filters));
  const selected = docs.find((d) => d.id === selectedId) ?? null;

  const openWrite = (tpl: Template | null) => {
    setWriteTpl(tpl);
    setWriteTitle(tpl ? tpl.name : '');
    setShowModal(false);
    setView('write');
  };

  const submit =
    (status: ApprovalStatus) =>
    (data: {
      title: string;
      tpl: Template | null;
      approvers: Approver[];
      notifiers: Person[];
      refs: Person[];
    }) => {
      setDocs((prev) => [genDoc(status, data), ...prev]);
      setView('list');
    };

  const toggleBookmark = (id: string) =>
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, bookmarked: !d.bookmarked } : d)));

  if (view === 'write') {
    return (
      <WriteForm
        initialTpl={writeTpl}
        initialTitle={writeTitle}
        onBack={() => setView('list')}
        onSubmit={submit('진행')}
        onDraft={submit('임시저장')}
      />
    );
  }

  if (view === 'detail' && selected) {
    return (
      <DocDetail
        doc={selected}
        onBack={() => {
          setView('list');
          setSelectedId(null);
        }}
      />
    );
  }

  return (
    <div>
      <PageTitle title="상신함" onWrite={() => setShowModal(true)} />
      <FilterBar
        statusOptions={['전체', '진행', '완료', '반려', '임시저장']}
        defaultStatus="전체"
        onApply={setFilters}
      />
      <DocTable
        rows={filtered}
        emptyText="검색 결과가 없습니다."
        onRowClick={(id) => {
          setSelectedId(id);
          setView('detail');
        }}
        onBookmark={toggleBookmark}
      />
      {showModal && (
        <TemplateModal
          onClose={() => setShowModal(false)}
          onPick={openWrite}
          onFreeForm={() => openWrite(null)}
        />
      )}
    </div>
  );
}

/* ============================================================
   결재 작성 (appr-write) — 상신함으로 위임
   ============================================================ */
function WriteScreen() {
  const go = useGo();
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <button
        type="button"
        onClick={() => go('appr-sent')}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-bold text-white [&_svg]:size-4"
      >
        <Plus strokeWidth={2.4} />
        상신함에서 결재 작성하기
      </button>
    </div>
  );
}

/* ============================================================
   임시 저장 (appr-draft)
   ============================================================ */
function DraftScreen() {
  const drafts = APPROVAL_DATA.filter((d) => d.status === '임시저장');
  const th = 'px-3.5 py-2.5 text-left text-xs font-bold text-[#69748A]';
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-[1.5px] border-border bg-[#F8F9FA]">
            {['문서번호 · 제목', '작성자', '작성일', ''].map((h, i) => (
              <th key={h || i} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drafts.length ? (
            drafts.map((d) => (
              <tr key={d.id} className="border-b border-[#F0F1F3] last:border-b-0">
                <td className="px-3.5 py-3">
                  <div className="mb-0.5 font-mono text-xs text-[#69748A]">{d.no}</div>
                  <div className="text-[13.5px] font-semibold text-[#1B2435]">{d.title}</div>
                </td>
                <td className="px-3.5 py-3 text-[13px] text-[#3D4A5C]">{d.author}</td>
                <td className="px-3.5 py-3 font-mono text-[13px] text-[#3D4A5C]">
                  {fmt8(d.createdAt)}
                </td>
                <td className="px-3.5 py-2.5">
                  <button
                    type="button"
                    className="h-[30px] cursor-pointer rounded-md border border-primary bg-om-blue-bg px-3 text-[12.5px] font-bold text-primary"
                  >
                    이어 작성
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="p-10 text-center text-[#9AA3B2]">
                임시 저장된 문서가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   수신함 공통 (appr-inbox/todo/notif/ref/sched)
   ============================================================ */
function makeInboxScreen(dataKey: string, screenTitle: string, defaultStatus: string) {
  return function InboxScreen() {
    const go = useGo();
    const [data, setData] = useState<InboxDoc[]>(() =>
      (INBOX_DATA[dataKey] ?? []).map((d) => ({ ...d }))
    );
    const [filters, setFilters] = useState<Filters>({
      cat: '전체',
      status: defaultStatus,
      no: '',
      author: '',
      title: '',
      from: '',
      to: '',
    });

    const filtered = data.filter((d) => matchFilters(d, filters));
    const toggleBookmark = (id: string) =>
      setData((prev) => prev.map((d) => (d.id === id ? { ...d, bookmarked: !d.bookmarked } : d)));

    return (
      <div>
        <PageTitle title={screenTitle} onWrite={() => go('appr-sent')} />
        <FilterBar
          statusOptions={['전체', '진행', '완료', '반려']}
          defaultStatus={defaultStatus}
          onApply={setFilters}
        />
        <DocTable rows={filtered} emptyText="해당 문서가 없습니다." onBookmark={toggleBookmark} />
      </div>
    );
  };
}

/* ============================================================
   Screen registry
   ============================================================ */
export const approvalScreens: ScreenModule = {
  'appr-home': { title: '결재 홈', sub: '결재 현황을 한눈에 확인합니다', Component: ApprovalHome },
  'appr-write': { title: '결재 작성', sub: '새 결재 문서를 작성합니다', Component: WriteScreen },
  'appr-sent': {
    title: '상신함',
    sub: '내가 상신한 결재 문서를 확인합니다',
    Component: SentScreen,
  },
  'appr-draft': {
    title: '임시 저장',
    sub: '임시 저장된 결재 문서를 확인합니다',
    Component: DraftScreen,
  },
  'appr-inbox': {
    title: '수신함',
    sub: '수신된 결재 문서를 확인합니다',
    Component: makeInboxScreen('appr-todo', '수신함', '진행'),
  },
  'appr-todo': {
    title: '결재할 문서',
    sub: '결재 대기 중인 문서를 확인합니다',
    Component: makeInboxScreen('appr-todo', '결재할 문서', '진행'),
  },
  'appr-notif': {
    title: '결재 통보',
    sub: '결재 통보를 받은 문서를 확인합니다',
    Component: makeInboxScreen('appr-notif', '결재 통보', '전체'),
  },
  'appr-ref': {
    title: '결재 참조',
    sub: '참조로 등록된 문서를 확인합니다',
    Component: makeInboxScreen('appr-ref', '결재 참조', '전체'),
  },
  'appr-sched': {
    title: '결재 예정',
    sub: '결재 예정인 문서를 확인합니다',
    Component: makeInboxScreen('appr-sched', '결재 예정', '진행'),
  },
};
