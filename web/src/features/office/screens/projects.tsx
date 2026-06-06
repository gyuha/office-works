import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ScreenModule } from './types';

/* ============================================================
   OfficeMate — 프로젝트 관리 (proj-list)
   list <-> detail <-> edit 를 내부 state 로 전환
   ============================================================ */

/* ---- types ---- */
type ProjectStatus = '진행중' | '완료' | '대기' | '보류';
type Member = {
  id: string;
  name: string;
  rank: string;
  role: string;
  grade: string;
  start: string;
  end: string;
  active?: boolean;
};
type Task = { name: string; start: string; end: string; done: number; dept: string };
type Contract = {
  name: string;
  date: string;
  amount: number;
  type: string;
  status: string;
  fileName?: string;
};
type Issue = {
  no: number;
  title: string;
  type: string;
  priority: string;
  status: string;
  date: string;
  assignee: string;
  desc?: string;
};
type Cost = { category: string; budgeted: number; actual: number; date?: string };
type Project = {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  progress: number;
  pm: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  desc: string;
  members: Member[];
  tasks: Task[];
  contracts: Contract[];
  issues: Issue[];
  costs: Cost[];
};

/* ---- sample data (projects.js) ---- */
const PROJECTS_DATA: Project[] = [
  {
    id: 'PRJ-2024-001',
    name: '스마트 HR 시스템 구축',
    client: '삼성전자 (주)',
    status: '진행중',
    progress: 62,
    pm: '윤서준',
    startDate: '2024-03-01',
    endDate: '2024-08-31',
    budget: 250000000,
    spent: 148000000,
    desc: '인사관리 시스템 전면 리뉴얼 및 클라우드 전환 프로젝트. AI 기반 채용 추천, 성과 관리, 급여 자동화 기능 포함.',
    members: [
      {
        id: 'EMP-007',
        name: '윤서준',
        rank: '부장',
        role: 'PM',
        grade: '특급',
        start: '2024-03-01',
        end: '2024-08-31',
      },
      {
        id: 'EMP-001',
        name: '김지훈',
        rank: '대리',
        role: '백엔드 개발',
        grade: '고급',
        start: '2024-03-01',
        end: '2024-08-31',
      },
      {
        id: 'EMP-005',
        name: '정다은',
        rank: '과장',
        role: '프론트엔드 개발',
        grade: '특급',
        start: '2024-03-15',
        end: '2024-08-31',
      },
      {
        id: 'EMP-006',
        name: '강태양',
        rank: '대리',
        role: 'UI/UX 디자인',
        grade: '중급',
        start: '2024-03-01',
        end: '2024-06-30',
      },
      {
        id: 'EMP-009',
        name: '홍준서',
        rank: '주임',
        role: '기획',
        grade: '중급',
        start: '2024-03-01',
        end: '2024-05-31',
      },
    ],
    tasks: [
      { name: '요구사항 분석', start: '2024-03-01', end: '2024-03-31', done: 100, dept: '기획' },
      { name: '시스템 설계', start: '2024-03-15', end: '2024-04-30', done: 100, dept: '개발' },
      { name: 'UI/UX 디자인', start: '2024-03-20', end: '2024-05-15', done: 100, dept: '디자인' },
      { name: '백엔드 개발', start: '2024-04-01', end: '2024-07-31', done: 70, dept: '개발' },
      { name: '프론트엔드 개발', start: '2024-04-15', end: '2024-07-31', done: 55, dept: '개발' },
      { name: '통합 테스트', start: '2024-07-01', end: '2024-08-15', done: 0, dept: 'QA' },
      { name: '운영 이관', start: '2024-08-16', end: '2024-08-31', done: 0, dept: '운영' },
    ],
    contracts: [
      { name: '본계약서', date: '2024-02-28', amount: 250000000, type: '용역계약', status: '체결' },
      {
        name: '추가 변경계약',
        date: '2024-05-10',
        amount: 15000000,
        type: '변경계약',
        status: '체결',
      },
    ],
    issues: [
      {
        no: 1,
        title: 'API 응답 지연 이슈',
        type: '기술',
        priority: '높음',
        status: '처리중',
        date: '2024-06-10',
        assignee: '김지훈',
        desc: '<p>특정 시간대(오후 2~4시)에 API 응답 시간이 <strong>5초 이상</strong> 지연되는 현상이 발생하고 있습니다.</p><ul><li>회원 로그인 API</li><li>검색 API</li><li>데이터 조회 API</li></ul><p>원인 분석 진행 중이며 DB 커넥션 풀 부족이 주요 원인으로 추정됩니다.</p>',
      },
      {
        no: 2,
        title: '고객사 요구사항 변경',
        type: '요구사항',
        priority: '보통',
        status: '검토중',
        date: '2024-06-05',
        assignee: '윤서준',
        desc: '<p>고객사 측에서 <strong>기존 계약 범위 외</strong>의 추가 기능 개발을 요청하였습니다.</p><ol><li>모바일 앱 연동 기능</li><li>엑셀 내보내기 기능</li></ol><p>PM과 고객사 간 협의를 통해 범위 및 일정을 조정할 예정입니다.</p>',
      },
    ],
    costs: [
      { category: '인건비', budgeted: 180000000, actual: 110000000 },
      { category: '외주비', budgeted: 30000000, actual: 22000000 },
      { category: '장비/SW', budgeted: 25000000, actual: 12000000 },
      { category: '기타', budgeted: 15000000, actual: 4000000 },
    ],
  },
  {
    id: 'PRJ-2024-002',
    name: '모바일 뱅킹 앱 개발',
    client: '신한은행',
    status: '진행중',
    progress: 35,
    pm: '장미래',
    startDate: '2024-05-01',
    endDate: '2024-11-30',
    budget: 180000000,
    spent: 52000000,
    desc: 'iOS/Android 모바일 뱅킹 앱 신규 개발. 간편 송금, 계좌 관리, 대출 신청, 자산 관리 기능 포함.',
    members: [
      {
        id: 'EMP-012',
        name: '장미래',
        rank: '팀장',
        role: 'PM',
        grade: '특급',
        start: '2024-05-01',
        end: '2024-11-30',
      },
      {
        id: 'EMP-017',
        name: '서보람',
        rank: '대리',
        role: 'iOS 개발',
        grade: '중급',
        start: '2024-05-01',
        end: '2024-11-30',
      },
      {
        id: 'EMP-021',
        name: '황도윤',
        rank: '주임',
        role: 'Android 개발',
        grade: '고급',
        start: '2024-05-01',
        end: '2024-11-30',
      },
      {
        id: 'EMP-020',
        name: '유은서',
        rank: '사원',
        role: 'UI 디자인',
        grade: '중급',
        start: '2024-05-15',
        end: '2024-09-30',
      },
    ],
    tasks: [
      { name: '분석/기획', start: '2024-05-01', end: '2024-05-31', done: 100, dept: '기획' },
      { name: '디자인', start: '2024-05-20', end: '2024-07-15', done: 80, dept: '디자인' },
      { name: 'iOS 개발', start: '2024-06-01', end: '2024-10-31', done: 30, dept: '개발' },
      { name: 'Android 개발', start: '2024-06-01', end: '2024-10-31', done: 25, dept: '개발' },
      { name: 'QA 테스트', start: '2024-10-01', end: '2024-11-15', done: 0, dept: 'QA' },
      { name: '배포/런칭', start: '2024-11-16', end: '2024-11-30', done: 0, dept: '운영' },
    ],
    contracts: [
      {
        name: '개발 용역계약서',
        date: '2024-04-25',
        amount: 180000000,
        type: '용역계약',
        status: '체결',
      },
    ],
    issues: [
      {
        no: 1,
        title: '보안 모듈 연동 오류',
        type: '기술',
        priority: '매우 높음',
        status: '처리중',
        date: '2024-06-20',
        assignee: '서보람',
      },
    ],
    costs: [
      { category: '인건비', budgeted: 130000000, actual: 40000000 },
      { category: '외주비', budgeted: 20000000, actual: 8000000 },
      { category: '장비/SW', budgeted: 20000000, actual: 4000000 },
      { category: '기타', budgeted: 10000000, actual: 0 },
    ],
  },
  {
    id: 'PRJ-2023-015',
    name: 'ERP 고도화 프로젝트',
    client: 'LG화학',
    status: '완료',
    progress: 100,
    pm: '권태오',
    startDate: '2023-09-01',
    endDate: '2024-02-29',
    budget: 320000000,
    spent: 298000000,
    desc: '기존 ERP 시스템 고도화 및 공급망 관리 모듈 추가 구현. SAP 연동 포함.',
    members: [
      {
        id: 'EMP-016',
        name: '권태오',
        rank: '부장',
        role: 'PM',
        grade: '특급',
        start: '2023-09-01',
        end: '2024-02-29',
      },
      {
        id: 'EMP-011',
        name: '신현우',
        rank: '과장',
        role: '백엔드 개발',
        grade: '고급',
        start: '2023-09-01',
        end: '2024-02-29',
      },
      {
        id: 'EMP-023',
        name: '한지민',
        rank: '대리',
        role: '프론트엔드 개발',
        grade: '고급',
        start: '2023-09-01',
        end: '2024-02-29',
      },
    ],
    tasks: [
      { name: '현황 분석', start: '2023-09-01', end: '2023-09-30', done: 100, dept: '기획' },
      { name: '시스템 설계', start: '2023-10-01', end: '2023-11-15', done: 100, dept: '개발' },
      { name: '개발', start: '2023-11-01', end: '2024-01-31', done: 100, dept: '개발' },
      { name: '테스트/이관', start: '2024-02-01', end: '2024-02-29', done: 100, dept: 'QA' },
    ],
    contracts: [
      {
        name: '메인 계약서',
        date: '2023-08-20',
        amount: 320000000,
        type: '용역계약',
        status: '완료',
      },
    ],
    issues: [],
    costs: [
      { category: '인건비', budgeted: 240000000, actual: 225000000 },
      { category: '외주비', budgeted: 40000000, actual: 38000000 },
      { category: '장비/SW', budgeted: 30000000, actual: 28000000 },
      { category: '기타', budgeted: 10000000, actual: 7000000 },
    ],
  },
  {
    id: 'PRJ-2024-003',
    name: 'AI 챗봇 서비스 구축',
    client: '현대자동차',
    status: '대기',
    progress: 0,
    pm: '정다은',
    startDate: '2024-09-01',
    endDate: '2025-02-28',
    budget: 150000000,
    spent: 0,
    desc: '고객 상담 AI 챗봇 시스템 구축. LLM 기반 자연어 처리, 다국어 지원, CRM 연동 포함.',
    members: [
      {
        id: 'EMP-005',
        name: '정다은',
        rank: '과장',
        role: 'PM',
        grade: '특급',
        start: '2024-09-01',
        end: '2025-02-28',
      },
    ],
    tasks: [
      { name: '요구사항 분석', start: '2024-09-01', end: '2024-09-30', done: 0, dept: '기획' },
      { name: 'AI 모델 설계', start: '2024-10-01', end: '2024-11-30', done: 0, dept: '개발' },
      { name: '개발', start: '2024-11-01', end: '2025-01-31', done: 0, dept: '개발' },
      { name: '테스트/배포', start: '2025-02-01', end: '2025-02-28', done: 0, dept: 'QA' },
    ],
    contracts: [
      {
        name: '사업 제안서',
        date: '2024-07-15',
        amount: 150000000,
        type: '제안서',
        status: '검토중',
      },
    ],
    issues: [],
    costs: [
      { category: '인건비', budgeted: 110000000, actual: 0 },
      { category: '외주비', budgeted: 20000000, actual: 0 },
      { category: '장비/SW', budgeted: 15000000, actual: 0 },
      { category: '기타', budgeted: 5000000, actual: 0 },
    ],
  },
  {
    id: 'PRJ-2024-004',
    name: '물류 관리 시스템 개선',
    client: 'CJ대한통운',
    status: '보류',
    progress: 20,
    pm: '오지은',
    startDate: '2024-04-01',
    endDate: '2024-09-30',
    budget: 95000000,
    spent: 18000000,
    desc: '물류 창고 관리 시스템 UI/UX 개선 및 실시간 배송 추적 기능 강화.',
    members: [
      {
        id: 'EMP-010',
        name: '오지은',
        rank: '팀장',
        role: 'PM',
        grade: '고급',
        start: '2024-04-01',
        end: '2024-09-30',
      },
      {
        id: 'EMP-022',
        name: '송채원',
        rank: '사원',
        role: '기획',
        grade: '중급',
        start: '2024-04-01',
        end: '2024-05-31',
      },
    ],
    tasks: [
      { name: '현황 파악', start: '2024-04-01', end: '2024-04-30', done: 100, dept: '기획' },
      { name: 'UI 설계', start: '2024-05-01', end: '2024-05-31', done: 40, dept: '디자인' },
      { name: '개발', start: '2024-06-01', end: '2024-08-31', done: 0, dept: '개발' },
      { name: '테스트', start: '2024-09-01', end: '2024-09-30', done: 0, dept: 'QA' },
    ],
    contracts: [
      {
        name: '용역 계약서',
        date: '2024-03-25',
        amount: 95000000,
        type: '용역계약',
        status: '체결',
      },
    ],
    issues: [
      {
        no: 1,
        title: '고객사 내부 승인 지연',
        type: '행정',
        priority: '높음',
        status: '보류',
        date: '2024-05-20',
        assignee: '오지은',
        desc: '<p>고객사 내부 IT 보안 심의 절차로 인해 프로젝트 착수가 <strong>지연</strong>되고 있습니다.</p><p>예상 처리 기간: 2~3주</p>',
      },
    ],
    costs: [
      { category: '인건비', budgeted: 65000000, actual: 12000000 },
      { category: '외주비', budgeted: 15000000, actual: 4000000 },
      { category: '장비/SW', budgeted: 10000000, actual: 2000000 },
      { category: '기타', budgeted: 5000000, actual: 0 },
    ],
  },
];

/* member pool (members.js) — 인력 추가 picker */
const MEMBERS_DATA = [
  { id: 'EMP-001', name: '김지훈', rank: '대리', grade: '고급' },
  { id: 'EMP-002', name: '이수연', rank: '과장', grade: '특급' },
  { id: 'EMP-003', name: '박민준', rank: '사원', grade: '중급' },
  { id: 'EMP-004', name: '최유진', rank: '차장', grade: '고급' },
  { id: 'EMP-005', name: '정다은', rank: '과장', grade: '특급' },
  { id: 'EMP-006', name: '강태양', rank: '대리', grade: '중급' },
  { id: 'EMP-007', name: '윤서준', rank: '부장', grade: '특급' },
  { id: 'EMP-008', name: '임나영', rank: '사원', grade: '초급' },
  { id: 'EMP-009', name: '홍준서', rank: '주임', grade: '중급' },
  { id: 'EMP-010', name: '오지은', rank: '팀장', grade: '고급' },
  { id: 'EMP-011', name: '신현우', rank: '과장', grade: '고급' },
  { id: 'EMP-012', name: '장미래', rank: '팀장', grade: '특급' },
  { id: 'EMP-013', name: '노지훈', rank: '사원', grade: '초급' },
  { id: 'EMP-014', name: '허수아', rank: '대리', grade: '고급' },
  { id: 'EMP-015', name: '조하늘', rank: '차장', grade: '중급' },
  { id: 'EMP-016', name: '권태오', rank: '부장', grade: '특급' },
  { id: 'EMP-017', name: '서보람', rank: '대리', grade: '중급' },
  { id: 'EMP-018', name: '문가영', rank: '주임', grade: '고급' },
  { id: 'EMP-019', name: '배성준', rank: '팀장', grade: '고급' },
  { id: 'EMP-020', name: '유은서', rank: '사원', grade: '중급' },
  { id: 'EMP-021', name: '황도윤', rank: '주임', grade: '고급' },
  { id: 'EMP-022', name: '송채원', rank: '사원', grade: '중급' },
  { id: 'EMP-023', name: '한지민', rank: '대리', grade: '고급' },
  { id: 'EMP-024', name: '전현서', rank: '과장', grade: '특급' },
  { id: 'EMP-025', name: '류아인', rank: '주임', grade: '초급' },
];

/* ---- config maps (token classes) ---- */
const STATUS_CFG: Record<string, string> = {
  진행중: 'bg-om-blue-bg text-om-blue border-om-blue/25',
  완료: 'bg-om-green-bg text-om-green border-om-green/25',
  대기: 'bg-muted text-muted-foreground border-border',
  보류: 'bg-om-orange-bg text-om-orange border-om-orange/30',
};
const GRADE_CFG: Record<string, string> = {
  특급: 'bg-om-blue-bg text-om-blue border-om-blue/25',
  고급: 'bg-om-green-bg text-om-green border-om-green/25',
  중급: 'bg-om-orange-bg text-om-orange border-om-orange/30',
  초급: 'bg-muted text-muted-foreground border-border',
};
const DEPT_COLORS: Record<string, string> = {
  기획: '#8B5CF6',
  개발: '#0066FF',
  디자인: '#00A3BF',
  QA: '#FF9200',
  운영: '#00BF40',
};
const PRIORITY_CFG: Record<string, string> = {
  '매우 높음': 'bg-om-red-bg text-om-red border-om-red/30',
  높음: 'bg-om-orange-bg text-om-orange border-om-orange/30',
  보통: 'bg-om-blue-bg text-om-blue border-om-blue/25',
  낮음: 'bg-muted text-muted-foreground border-border',
  보류: 'bg-muted text-muted-foreground border-border',
};
const ISSUE_STATUS_CFG: Record<string, string> = {
  처리중: 'bg-om-blue-bg text-om-blue border-om-blue/25',
  검토중: 'bg-om-orange-bg text-om-orange border-om-orange/30',
  완료: 'bg-om-green-bg text-om-green border-om-green/25',
  보류: 'bg-muted text-muted-foreground border-border',
};
const CONTRACT_STATUS_CFG: Record<string, string> = {
  체결: 'bg-om-green-bg text-om-green border-om-green/25',
  검토중: 'bg-om-orange-bg text-om-orange border-om-orange/30',
  완료: 'bg-muted text-muted-foreground border-border',
  해지: 'bg-om-red-bg text-om-red border-om-red/30',
};

const DETAIL_TABS = [
  { id: 'info', label: '프로젝트 정보' },
  { id: 'members', label: '투입 인력' },
  { id: 'gantt', label: '일정 (간트차트)' },
  { id: 'contracts', label: '계약서 관리' },
  { id: 'issues', label: '이슈/리스크' },
  { id: 'cost', label: '비용 관리' },
] as const;
type TabId = (typeof DETAIL_TABS)[number]['id'];

/* ---- helpers ---- */
const fmt = (n: number) => Number(n).toLocaleString('ko-KR');
const fmtDate = (d?: string) => (d ? d.replace(/-/g, '.') : '-');
const fmtW = (n: number) =>
  n >= 100000000
    ? `${(n / 100000000).toFixed(1)}억`
    : `${Math.round(n / 10000).toLocaleString('ko-KR')}만`;

const AP = ['#0066FF', '#00BF40', '#8B5CF6', '#FF9200', '#4F66D6', '#00A3BF', '#C45022'];
function avatarBg(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return AP[h % AP.length];
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center justify-center rounded-full font-extrabold text-white"
      style={{
        width: size,
        height: size,
        background: avatarBg(name),
        fontSize: size * 0.38,
      }}
    >
      {name[0]}
    </span>
  );
}

function StatusBadge({ s }: { s: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-[3px] text-xs font-bold',
        STATUS_CFG[s] ?? STATUS_CFG['대기']
      )}
    >
      {s}
    </span>
  );
}

function GradeBadge({ g }: { g: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-11 items-center justify-center rounded-md border py-[3px] text-[11.5px] font-extrabold',
        GRADE_CFG[g] ?? GRADE_CFG['초급']
      )}
    >
      {g}
    </span>
  );
}

function Pbar({ pct, color }: { pct: number; color?: string }) {
  const autoC =
    pct >= 100
      ? 'var(--color-om-green)'
      : pct >= 50
        ? 'var(--color-om-blue)'
        : 'var(--color-om-orange)';
  const c = color ?? autoC;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 min-w-[60px] flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
      </div>
      <span className="flex-shrink-0 font-mono text-xs font-bold" style={{ color: c }}>
        {pct}%
      </span>
    </div>
  );
}

const FIELD_LABEL = 'mb-1 text-xs font-bold text-muted-foreground';
const CARD_INSET = 'rounded-lg border border-border bg-muted/40 p-[18px]';

/* ============================================================
   LIST VIEW
   ============================================================ */
function ListView({ onOpen }: { onOpen: (id: string) => void }) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const counts = useMemo(() => {
    const c = { 진행중: 0, 완료: 0, 대기: 0, 보류: 0 } as Record<ProjectStatus, number>;
    PROJECTS_DATA.forEach((p) => (c[p.status] += 1));
    return c;
  }, []);

  const years = useMemo(
    () =>
      [...new Set(PROJECTS_DATA.map((p) => p.startDate.slice(0, 4)).filter(Boolean))]
        .sort()
        .reverse(),
    []
  );

  const filtered = useMemo(() => {
    let list = PROJECTS_DATA.slice();
    if (filterStatus !== 'all') list = list.filter((p) => p.status === filterStatus);
    if (filterYear !== 'all') list = list.filter((p) => p.startDate.startsWith(filterYear));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => (p.name + p.client + p.pm).toLowerCase().includes(q));
    }
    return list;
  }, [filterStatus, filterYear, search]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const curPage = Math.min(page, totalPages);
  const startIdx = (curPage - 1) * pageSize;
  const paged = filtered.slice(startIdx, startIdx + pageSize);

  const statCards: [string, number, string][] = [
    ['전체', counts.진행중 + counts.완료 + counts.대기 + counts.보류, 'text-foreground'],
    ['진행중', counts.진행중, 'text-om-blue'],
    ['완료', counts.완료, 'text-om-green'],
    ['대기·보류', counts.대기 + counts.보류, 'text-om-orange'],
  ];

  const chips: { f: string; label: string }[] = [
    { f: 'all', label: '전체' },
    { f: '진행중', label: '진행중' },
    { f: '완료', label: '완료' },
    { f: '대기', label: '대기' },
    { f: '보류', label: '보류' },
  ];

  const TH = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-bold text-muted-foreground';

  /* pager page-number list (up to 5 around current) */
  const pageNums: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= curPage - 2 && i <= curPage + 2)) pageNums.push(i);
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-4 gap-3.5">
        {statCards.map(([label, val, color]) => (
          <div key={label} className="rounded-lg border border-border bg-white px-5 py-4">
            <div className={cn('font-mono text-3xl font-extrabold leading-none', color)}>{val}</div>
            <div className="mt-[5px] text-[12.5px] font-semibold text-muted-foreground">
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {chips.map((c) => {
            const active = c.f === filterStatus;
            return (
              <button
                key={c.f}
                type="button"
                onClick={() => {
                  setFilterStatus(c.f);
                  setPage(1);
                }}
                className={cn(
                  'h-[30px] cursor-pointer rounded-full border px-3.5 text-[13px] transition-colors',
                  active
                    ? 'border-primary bg-om-blue-bg font-bold text-primary'
                    : 'border-border bg-white font-medium text-foreground/70'
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filterYear}
            onValueChange={(v) => {
              setFilterYear(v ?? 'all');
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" className="h-[34px] w-[120px] bg-muted/40 text-[13.5px]">
              <SelectValue placeholder="연도 전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">연도 전체</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute left-2.5 top-1/2 size-[15px] -translate-y-1/2 text-muted-foreground"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="m16.5 16.5 3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="프로젝트명·고객사·PM 검색…"
              className="h-[34px] w-[230px] bg-muted/40 pl-8 text-[13px]"
            />
          </div>
          <Button className="h-[34px] gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" className="size-3.5">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
            프로젝트 추가
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-border bg-muted/40">
                {[
                  '번호',
                  '프로젝트 / 고객사',
                  '상태',
                  'PM',
                  '시작일',
                  '종료일',
                  '예산',
                  '진행률',
                ].map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((p) => {
                const pc =
                  p.progress >= 100
                    ? 'var(--color-om-green)'
                    : p.progress >= 50
                      ? 'var(--color-om-blue)'
                      : 'var(--color-om-orange)';
                return (
                  <tr
                    key={p.id}
                    onClick={() => onOpen(p.id)}
                    className="cursor-pointer border-b border-[#F0F1F3] transition-colors last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                      {p.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-bold text-foreground">{p.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{p.client}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge s={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={p.pm} size={28} />
                        <span className="text-[13.5px] font-semibold text-foreground/80">
                          {p.pm}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[13px] text-foreground/80">
                      {fmtDate(p.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[13px] text-foreground/80">
                      {fmtDate(p.endDate)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-[13.5px] font-bold text-foreground">
                      {fmtW(p.budget)}
                    </td>
                    <td className="min-w-[150px] px-5 py-3">
                      <Pbar pct={p.progress} color={pc} />
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    조건에 맞는 프로젝트가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* pager */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-muted-foreground">
          전체 {totalCount}건 중 {totalCount === 0 ? 0 : startIdx + 1}–{startIdx + paged.length}
        </span>
        <div className="flex items-center gap-1">
          <PagerBtn disabled={curPage <= 1} onClick={() => setPage(curPage - 1)}>
            ◀
          </PagerBtn>
          {pageNums.map((p, idx) => {
            const gap = idx > 0 && p - pageNums[idx - 1] > 1;
            return (
              <span key={p} className="flex items-center">
                {gap && <span className="px-1 text-muted-foreground">…</span>}
                <PagerBtn active={p === curPage} onClick={() => setPage(p)}>
                  {p}
                </PagerBtn>
              </span>
            );
          })}
          <PagerBtn disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)}>
            ▶
          </PagerBtn>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-muted-foreground">페이지당</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(+(v ?? '10'));
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" className="h-8 w-[78px] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}건
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function PagerBtn({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-[13px] font-semibold',
        active
          ? 'cursor-default border-primary bg-primary text-white'
          : 'border-border bg-white text-foreground/80',
        disabled && 'cursor-default opacity-40'
      )}
    >
      {children}
    </button>
  );
}

/* ============================================================
   DETAIL — shell (tabs)
   ============================================================ */
function DetailView({
  project,
  onBack,
  onEdit,
  bump,
}: {
  project: Project;
  onBack: () => void;
  onEdit: () => void;
  bump: () => void;
}) {
  const [tab, setTab] = useState<TabId>('info');

  return (
    <div>
      <div className="mb-4 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-white px-3 py-[7px] text-[13px] font-semibold text-foreground/80"
        >
          <ChevL />
          목록으로
        </button>
        <span className="text-xs text-muted-foreground">프로젝트 관리</span>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm font-bold text-foreground">{project.name}</span>
        <StatusBadge s={project.status} />
        <span className="ml-auto" />
        <button
          type="button"
          onClick={onEdit}
          className="h-[34px] cursor-pointer rounded-md border border-border bg-white px-4 text-[13px] font-semibold text-foreground/80"
        >
          편집
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex overflow-x-auto border-b border-border">
          {DETAIL_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'whitespace-nowrap border-b-[2.5px] px-[18px] py-3 text-[13.5px] transition-colors',
                  active
                    ? 'border-primary font-bold text-primary'
                    : 'border-transparent font-medium text-foreground/70'
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="p-[22px]">
          {tab === 'info' && <InfoTab p={project} />}
          {tab === 'members' && <MembersTab p={project} bump={bump} />}
          {tab === 'gantt' && <GanttTab p={project} />}
          {tab === 'contracts' && <ContractsTab p={project} bump={bump} />}
          {tab === 'issues' && <IssuesTab p={project} bump={bump} />}
          {tab === 'cost' && <CostTab p={project} bump={bump} />}
        </div>
      </div>
    </div>
  );
}

function ChevL() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-[15px]">
      <path
        d="m15 6-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---- Tab: 프로젝트 정보 ---- */
function InfoTab({ p }: { p: Project }) {
  const spentPct = p.budget ? Math.round((p.spent / p.budget) * 100) : 0;
  const spentColor =
    spentPct > 90
      ? 'var(--color-om-red)'
      : spentPct > 70
        ? 'var(--color-om-orange)'
        : 'var(--color-om-blue)';
  const progColor = p.progress === 100 ? 'var(--color-om-green)' : 'var(--color-om-blue)';

  const fields: [string, string][] = [
    ['프로젝트 번호', p.id],
    ['프로젝트명', p.name],
    ['고객사', p.client],
    ['프로젝트 관리자 (PM)', p.pm],
    ['시작일', fmtDate(p.startDate)],
    ['종료일', fmtDate(p.endDate)],
  ];

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="flex flex-col gap-4">
        {fields.map(([l, v]) => (
          <div key={l}>
            <div className={FIELD_LABEL}>{l}</div>
            <div className="text-sm font-semibold text-foreground">{v}</div>
          </div>
        ))}
        <div>
          <div className={FIELD_LABEL}>프로젝트 설명</div>
          <div className="text-[13.5px] leading-[1.75] text-foreground/80">{p.desc}</div>
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        <div className={CARD_INSET}>
          <div className="mb-2.5 text-xs font-bold text-muted-foreground">예산 현황</div>
          <div className="mb-2.5 flex items-end justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground">총 예산</div>
              <div className="font-mono text-[22px] font-extrabold text-foreground">
                {fmt(p.budget)}
                <span className="ml-0.5 text-[13px] font-semibold">원</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground">사용 금액</div>
              <div className="font-mono text-lg font-extrabold" style={{ color: spentColor }}>
                {fmt(p.spent)}
                <span className="ml-0.5 text-xs font-semibold">원</span>
              </div>
            </div>
          </div>
          <Pbar pct={spentPct} color={spentColor} />
          <div className="mt-1.5 text-xs text-muted-foreground">
            잔여 {fmt(p.budget - p.spent)}원 ({Math.max(0, 100 - spentPct)}%)
          </div>
        </div>
        <div className={CARD_INSET}>
          <div className="mb-2 text-xs font-bold text-muted-foreground">전체 진행률</div>
          <div
            className="mb-2.5 font-mono text-4xl font-extrabold leading-none"
            style={{ color: progColor }}
          >
            {p.progress}
            <span className="text-lg font-semibold">%</span>
          </div>
          <Pbar pct={p.progress} color={progColor} />
        </div>
        <div className={CARD_INSET}>
          <div className="mb-2 text-xs font-bold text-muted-foreground">투입 인력</div>
          <div className="mb-2.5 font-mono text-3xl font-extrabold leading-none text-foreground">
            {p.members.length}
            <span className="ml-1 text-[15px] font-semibold">명</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {p.members.slice(0, 6).map((m) => (
              <Avatar key={m.id} name={m.name} size={30} />
            ))}
            {p.members.length > 6 && (
              <span className="inline-flex size-[30px] items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                +{p.members.length - 6}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Tab: 투입 인력 ---- */
function MembersTab({ p, bump }: { p: Project; bump: () => void }) {
  const [modalIdx, setModalIdx] = useState<number | null>(null); // null=closed, -1=add, >=0 edit

  const TH = 'px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground';

  return (
    <>
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">총 {p.members.length}명</span>
        <Button size="sm" className="h-8" onClick={() => setModalIdx(-1)}>
          + 인력 추가
        </Button>
      </div>
      {p.members.length === 0 ? (
        <p className="py-5 text-muted-foreground">투입된 인력이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-border bg-muted/40">
                {['구성원', '직급', '역할', '등급', '투입 시작', '투입 종료', ''].map((h, i) => (
                  <th key={i} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.members.map((m, i) => {
                const isActive = m.active !== false;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-[#F0F1F3]"
                    style={{ opacity: isActive ? 1 : 0.45 }}
                  >
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.name} size={32} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13.5px] font-bold text-foreground">
                              {m.name}
                            </span>
                            {!isActive && (
                              <span className="rounded border border-border bg-muted px-[7px] py-0.5 text-[11px] font-bold text-muted-foreground">
                                비활성
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{m.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-[13.5px] text-foreground/80">{m.rank}</td>
                    <td className="px-3.5 py-3 text-[13.5px] font-semibold text-foreground">
                      {m.role}
                    </td>
                    <td className="px-3.5 py-3">
                      <GradeBadge g={m.grade} />
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[13px] text-foreground/80">
                      {fmtDate(m.start)}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[13px] text-foreground/80">
                      {fmtDate(m.end)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <button
                        type="button"
                        onClick={() => setModalIdx(i)}
                        className="h-7 cursor-pointer rounded-md border border-border px-2.5 text-xs font-semibold text-muted-foreground"
                      >
                        편집
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {modalIdx !== null && (
        <MemberModal p={p} editIdx={modalIdx} onClose={() => setModalIdx(null)} bump={bump} />
      )}
    </>
  );
}

function MemberModal({
  p,
  editIdx,
  onClose,
  bump,
}: {
  p: Project;
  editIdx: number;
  onClose: () => void;
  bump: () => void;
}) {
  const editing = editIdx >= 0 ? p.members[editIdx] : null;
  const existIds = p.members.map((x) => x.id);
  const pool = MEMBERS_DATA.filter((x) => !existIds.includes(x.id));

  const [memberId, setMemberId] = useState(pool[0]?.id ?? '');
  const [role, setRole] = useState(editing?.role ?? '');
  const [grade, setGrade] = useState(editing?.grade ?? '중급');
  const [start, setStart] = useState(editing?.start ?? '');
  const [end, setEnd] = useState(editing?.end ?? '');

  const save = () => {
    if (editing) {
      if (role) editing.role = role;
      editing.grade = grade;
      if (start) editing.start = start;
      if (end) editing.end = end;
    } else {
      const src = MEMBERS_DATA.find((x) => x.id === memberId);
      if (!src) return;
      p.members.push({
        id: src.id,
        name: src.name,
        rank: src.rank,
        role: role || src.rank,
        grade,
        start,
        end,
      });
    }
    bump();
    onClose();
  };

  const toggle = () => {
    if (!editing) return;
    editing.active = editing.active === false ? true : false;
    bump();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{editing ? '투입 인력 편집' : '투입 인력 추가'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <div className="flex flex-col gap-1.5">
            <Label>{editing ? '구성원' : '구성원 선택'}</Label>
            {editing ? (
              <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted/40 px-3 py-2.5">
                <Avatar name={editing.name} size={32} />
                <div>
                  <div className="text-sm font-bold text-foreground">{editing.name}</div>
                  <div className="text-xs text-muted-foreground">{editing.id}</div>
                </div>
              </div>
            ) : pool.length ? (
              <Select value={memberId} onValueChange={(v) => setMemberId(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pool.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.name} ({x.rank})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                추가 가능한 구성원이 없습니다
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mm-role">역할</Label>
            <Input
              id="mm-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="예) 백엔드 개발, PM, 디자인"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>등급</Label>
            <Select value={grade} onValueChange={(v) => setGrade(v ?? '중급')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['초급', '중급', '고급', '특급'].map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mm-start">투입 시작일</Label>
              <Input
                id="mm-start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mm-end">투입 종료일</Label>
              <Input id="mm-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          {editing &&
            (editing.active === false ? (
              <Button variant="outline" onClick={toggle} className="border-om-green text-om-green">
                활성화
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={toggle}
                className="border-om-orange text-om-orange"
              >
                투입 비활성화
              </Button>
            ))}
          <span className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={save}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Tab: 간트차트 ---- */
function GanttTab({ p }: { p: Project }) {
  if (!p.tasks.length) return <p className="py-5 text-muted-foreground">등록된 일정이 없습니다.</p>;

  const ms = p.tasks.flatMap((t) => [+new Date(t.start), +new Date(t.end)]);
  const MIN = Math.min(...ms);
  const MAX = Math.max(...ms);
  const SPAN = MAX - MIN || 1;
  const pct = (d: number) => ((d - MIN) / SPAN) * 100;

  const months: { label: string; p: number }[] = [];
  let cur = new Date(new Date(MIN).getFullYear(), new Date(MIN).getMonth(), 1);
  while (+cur <= MAX) {
    months.push({
      label: `${cur.getFullYear()}.${String(cur.getMonth() + 1).padStart(2, '0')}`,
      p: pct(+cur),
    });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  const LW = 200;
  const ROW = 44;
  const BAR = 24;

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <span className="text-sm font-bold text-foreground">전체 {p.tasks.length}개 작업</span>
        <div className="flex flex-wrap gap-3">
          {Object.entries(DEPT_COLORS).map(([dept, color]) => (
            <span
              key={dept}
              className="inline-flex items-center gap-1.5 text-xs text-foreground/80"
            >
              <span
                className="inline-block size-2.5 flex-shrink-0 rounded-sm"
                style={{ background: color }}
              />
              {dept}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex border-b-2 border-border">
          <div
            className="flex flex-shrink-0 items-center border-r border-[#F0F1F3] bg-muted/40 px-3.5"
            style={{ width: LW, height: 34 }}
          >
            <span className="text-[11.5px] font-bold text-muted-foreground">작업</span>
          </div>
          <div className="relative flex-1 bg-muted/40" style={{ height: 34 }}>
            {months.map((m) => (
              <div
                key={m.label}
                className="absolute flex h-full items-center border-l border-[#F0F1F3] pl-1.5"
                style={{ left: `${m.p}%` }}
              >
                <span className="whitespace-nowrap text-[11px] font-bold text-muted-foreground">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        {p.tasks.map((t, i) => {
          const lp = pct(+new Date(t.start));
          const wp = pct(+new Date(t.end)) - lp;
          const c = DEPT_COLORS[t.dept] ?? '#70737C';
          return (
            <div key={i} className="flex border-b border-[#F0F1F3] last:border-b-0">
              <div
                className="flex flex-shrink-0 items-center border-r border-[#F0F1F3] px-3.5"
                style={{ width: LW, height: ROW }}
              >
                <div>
                  <div className="max-w-[172px] overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-foreground">
                    {t.name}
                  </div>
                  <div className="mt-px text-[11px] font-bold" style={{ color: c }}>
                    {t.dept}
                  </div>
                </div>
              </div>
              <div className="relative flex-1 overflow-hidden" style={{ height: ROW }}>
                {months.map((m) => (
                  <div
                    key={m.label}
                    className="absolute bottom-0 top-0 w-px bg-[#F0F1F3]"
                    style={{ left: `${m.p}%` }}
                  />
                ))}
                <div
                  className="absolute overflow-hidden rounded-[7px]"
                  style={{
                    left: `${lp}%`,
                    width: `max(${wp}%, 4px)`,
                    top: (ROW - BAR) / 2,
                    height: BAR,
                    background: `${c}22`,
                    border: `1.5px solid ${c}66`,
                  }}
                >
                  <div className="h-full" style={{ width: `${t.done}%`, background: `${c}cc` }} />
                  {t.done > 0 && (
                    <span
                      className="absolute left-[7px] top-1/2 -translate-y-1/2 text-[11px] font-extrabold"
                      style={{ color: t.done > 40 ? '#fff' : c }}
                    >
                      {t.done}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Tab: 계약서 관리 (inline accordion edit) ---- */
function ContractsTab({ p, bump }: { p: Project; bump: () => void }) {
  const [editIdx, setEditIdx] = useState<number>(-1);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">총 {p.contracts.length}건</span>
        <Button size="sm" className="h-8" onClick={() => setAddOpen(true)}>
          + 계약서 추가
        </Button>
      </div>
      <div className="flex flex-col gap-2.5">
        {p.contracts.length === 0 ? (
          <p className="py-8 text-center text-[13.5px] text-muted-foreground">
            등록된 계약서가 없습니다.
          </p>
        ) : (
          p.contracts.map((c, i) => (
            <ContractCard
              key={i}
              c={c}
              editing={editIdx === i}
              onToggleEdit={() => setEditIdx(editIdx === i ? -1 : i)}
              onSave={() => {
                setEditIdx(-1);
                bump();
              }}
              onDelete={() => {
                p.contracts.splice(i, 1);
                setEditIdx(-1);
                bump();
              }}
            />
          ))
        )}
      </div>
      {addOpen && (
        <ContractModal
          onClose={() => setAddOpen(false)}
          onSave={(nc) => {
            p.contracts.push(nc);
            setAddOpen(false);
            bump();
          }}
        />
      )}
    </>
  );
}

const CONTRACT_TYPES = ['용역계약', '유지보수', '변경계약', '제안서', '기타'];
const CONTRACT_STATUSES = ['검토중', '체결', '완료', '해지'];

function ContractCard({
  c,
  editing,
  onToggleEdit,
  onSave,
  onDelete,
}: {
  c: Contract;
  editing: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(c.name);
  const [type, setType] = useState(c.type);
  const [status, setStatus] = useState(c.status);
  const [amount, setAmount] = useState(String(c.amount));
  const [date, setDate] = useState(c.date);
  const [fileName, setFileName] = useState(c.fileName ?? '');

  const save = () => {
    if (!name.trim()) return;
    c.name = name.trim();
    c.type = type;
    c.status = status;
    c.amount = +amount || c.amount;
    c.date = date;
    if (fileName.trim()) c.fileName = fileName.trim();
    onSave();
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-[18px]',
        editing ? 'border-primary bg-white' : 'border-border bg-muted/40'
      )}
    >
      <div className="flex items-center gap-3.5">
        <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-[10px] bg-om-blue-bg text-primary">
          <svg viewBox="0 0 24 24" fill="none" className="size-5">
            <path
              d="M6 3.5h12v17l-2.2-1.5L13.5 20l-1.5-1.5L10.5 20l-2.3-1L6 20.5v-17Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M9 8h6M9 11.5h6M9 15h3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-foreground">{c.name}</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            {c.type} · {fmtDate(c.date)}
          </div>
          {c.fileName && (
            <div className="mt-[3px] flex items-center gap-1 text-xs text-primary">
              <svg viewBox="0 0 24 24" fill="none" className="size-3 flex-shrink-0">
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {c.fileName}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="font-mono text-[15px] font-extrabold text-foreground">
            {fmt(c.amount)}원
          </div>
          <span
            className={cn(
              'mt-1 inline-flex rounded-full border px-2 py-[3px] text-xs font-bold',
              CONTRACT_STATUS_CFG[c.status] ?? CONTRACT_STATUS_CFG['검토중']
            )}
          >
            {c.status}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleEdit}
          className={cn(
            'h-8 flex-shrink-0 cursor-pointer rounded-md border px-3 text-[12.5px] font-bold',
            editing
              ? 'border-border bg-muted text-foreground/80'
              : 'border-primary bg-om-blue-bg text-primary'
          )}
        >
          {editing ? '접기' : '편집'}
        </button>
        <button
          type="button"
          className="h-8 flex-shrink-0 cursor-pointer rounded-md border border-border bg-white px-3 text-[12.5px] font-semibold text-foreground/80"
        >
          다운로드
        </button>
      </div>

      {editing && (
        <div className="mt-4 border-t border-[#F0F1F3] pt-4">
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Fld label="계약서명">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-[13px]"
              />
            </Fld>
            <Fld label="계약 유형">
              <SelectField value={type} onChange={setType} opts={CONTRACT_TYPES} />
            </Fld>
            <Fld label="계약 상태">
              <SelectField value={status} onChange={setStatus} opts={CONTRACT_STATUSES} />
            </Fld>
            <Fld label="계약금액 (원)">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 text-[13px]"
              />
            </Fld>
            <Fld label="계약일">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-[13px]"
              />
            </Fld>
            <Fld label="첨부 파일명">
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="파일명 입력"
                className="h-9 text-[13px]"
              />
            </Fld>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-om-red text-om-red"
              onClick={onDelete}
            >
              삭제
            </Button>
            <span className="flex-1" />
            <Button variant="outline" size="sm" className="h-8" onClick={onToggleEdit}>
              취소
            </Button>
            <Button size="sm" className="h-8" onClick={save}>
              저장
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContractModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (c: Contract) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('용역계약');
  const [status, setStatus] = useState('검토중');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), type, status, date, amount: +amount || 0, fileName });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>계약서 추가</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <Fld label="계약서명">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="계약서 이름을 입력하세요"
            />
          </Fld>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="계약 유형">
              <SelectField
                value={type}
                onChange={setType}
                opts={['용역계약', '변경계약', '제안서', '유지보수계약', '기타']}
              />
            </Fld>
            <Fld label="상태">
              <SelectField value={status} onChange={setStatus} opts={['체결', '검토중', '완료']} />
            </Fld>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="계약일">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Fld>
            <Fld label="계약금액 (원)">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </Fld>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>계약서 파일</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.xlsx,.hwp"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) setFileName(f.name);
              }}
              className={cn(
                'cursor-pointer rounded-lg border-2 border-dashed p-[18px] text-center transition-all',
                fileName || dragOver ? 'border-primary bg-om-blue-bg' : 'border-border bg-muted/40'
              )}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="mx-auto mb-1.5 size-[26px] text-muted-foreground"
              >
                <path
                  d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                className={cn(
                  'text-[13px] font-semibold',
                  fileName ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {fileName || '클릭 또는 드래그하여 파일 업로드'}
              </span>
              {!fileName && (
                <div className="mt-[3px] text-[11px] text-muted-foreground">
                  PDF · Word · Excel · HWP
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={save}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Tab: 이슈/리스크 ---- */
function IssuesTab({ p, bump }: { p: Project; bump: () => void }) {
  const [selIdx, setSelIdx] = useState(-1);
  const [editMode, setEditMode] = useState(false);
  const [adding, setAdding] = useState(false);

  if (adding) {
    return (
      <IssueAddForm
        onCancel={() => setAdding(false)}
        onSave={(iss) => {
          const nextNo = p.issues.reduce((m, x) => Math.max(m, x.no || 0), 0) + 1;
          p.issues.push({ ...iss, no: nextNo });
          setAdding(false);
          bump();
        }}
      />
    );
  }

  if (selIdx >= 0 && p.issues[selIdx]) {
    const iss = p.issues[selIdx];
    if (editMode) {
      return (
        <IssueEditForm
          iss={iss}
          onCancel={() => {
            setEditMode(false);
            setSelIdx(-1);
          }}
          onSave={() => {
            setEditMode(false);
            bump();
          }}
        />
      );
    }
    return <IssueDetail iss={iss} onBack={() => setSelIdx(-1)} onEdit={() => setEditMode(true)} />;
  }

  const TH = 'px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground';

  return (
    <>
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">총 {p.issues.length}건</span>
        <Button size="sm" className="h-8" onClick={() => setAdding(true)}>
          + 이슈 등록
        </Button>
      </div>
      {p.issues.length === 0 ? (
        <div className="p-12 text-center">
          <div className="mb-2 text-[28px]">🎉</div>
          <div className="text-sm text-muted-foreground">등록된 이슈가 없습니다</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-border bg-muted/40">
                {['No.', '제목', '유형', '우선순위', '상태', '등록일', '담당자'].map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.issues.map((iss, i) => (
                <tr
                  key={iss.no}
                  onClick={() => {
                    setSelIdx(i);
                    setEditMode(false);
                  }}
                  className="cursor-pointer border-b border-[#F0F1F3] transition-colors hover:bg-muted/40"
                >
                  <td className="px-3.5 py-3 font-mono text-[12.5px] text-muted-foreground">
                    #{iss.no}
                  </td>
                  <td className="px-3.5 py-3 text-[13.5px] font-semibold text-foreground">
                    {iss.title}
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-foreground/80">{iss.type}</td>
                  <td className="px-3.5 py-3">
                    <PillBadge cfg={PRIORITY_CFG[iss.priority] ?? PRIORITY_CFG['보통']}>
                      {iss.priority}
                    </PillBadge>
                  </td>
                  <td className="px-3.5 py-3">
                    <PillBadge cfg={ISSUE_STATUS_CFG[iss.status] ?? ISSUE_STATUS_CFG['검토중']}>
                      {iss.status}
                    </PillBadge>
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-foreground/80">
                    {fmtDate(iss.date)}
                  </td>
                  <td className="px-3.5 py-3 text-[13.5px] text-foreground/80">{iss.assignee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function PillBadge({ cfg, children }: { cfg: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2 py-[3px] text-xs font-bold', cfg)}>
      {children}
    </span>
  );
}

function IssueDetail({
  iss,
  onBack,
  onEdit,
}: {
  iss: Issue;
  onBack: () => void;
  onEdit: () => void;
}) {
  const fields: [string, string][] = [
    ['유형', iss.type],
    ['우선순위', iss.priority],
    ['상태', iss.status],
    ['등록일', fmtDate(iss.date)],
    ['담당자', iss.assignee],
  ];
  return (
    <>
      <div className="mb-4 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-white px-3 py-[7px] text-[13px] font-semibold text-foreground/80"
        >
          <ChevL />
          목록으로
        </button>
        <span className="text-sm font-bold text-foreground">이슈 #{iss.no}</span>
        <PillBadge cfg={PRIORITY_CFG[iss.priority] ?? PRIORITY_CFG['보통']}>
          {iss.priority}
        </PillBadge>
        <PillBadge cfg={ISSUE_STATUS_CFG[iss.status] ?? ISSUE_STATUS_CFG['검토중']}>
          {iss.status}
        </PillBadge>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onEdit}
          className="h-[34px] cursor-pointer rounded-md border border-border bg-white px-4 text-[13px] font-semibold text-foreground/80"
        >
          편집
        </button>
      </div>
      <div className="flex flex-col gap-5 rounded-lg border border-border bg-white p-[22px]">
        <div className="text-lg font-extrabold leading-[1.4] text-foreground">{iss.title}</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
          {fields.map(([l, v]) => (
            <div key={l} className="rounded-lg border border-border bg-muted/40 px-3.5 py-3">
              <div className="mb-1 text-[11.5px] font-bold text-muted-foreground">{l}</div>
              <div className="text-sm font-bold text-foreground">{v}</div>
            </div>
          ))}
        </div>
        <div>
          <div className="mb-2 text-xs font-bold text-muted-foreground">이슈 설명</div>
          {iss.desc ? (
            <div
              className="issue-body text-sm leading-[1.75] text-foreground [&_h2]:my-2 [&_h2]:text-base [&_h2]:font-bold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: prototype 이슈 본문 HTML 렌더
              dangerouslySetInnerHTML={{ __html: iss.desc }}
            />
          ) : (
            <span className="text-sm italic text-muted-foreground">이슈 설명이 없습니다.</span>
          )}
        </div>
      </div>
    </>
  );
}

/* contentEditable rich-text editor + B/I/U/list/H2 toolbar */
function RichTextEditor({
  initialHtml,
  editorRef,
}: { initialHtml: string; editorRef: React.RefObject<HTMLDivElement | null> }) {
  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };
  const TBtn = ({
    cmd,
    val,
    children,
    className,
  }: {
    cmd: string;
    val?: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        exec(cmd, val);
      }}
      className={cn(
        'inline-flex h-7 w-[30px] items-center justify-center rounded-[5px] text-[13px] text-foreground/80 hover:bg-muted',
        className
      )}
    >
      {children}
    </button>
  );
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2.5 py-1.5">
        <TBtn cmd="bold" className="font-extrabold">
          B
        </TBtn>
        <TBtn cmd="italic" className="italic">
          I
        </TBtn>
        <TBtn cmd="underline" className="underline">
          U
        </TBtn>
        <span className="mx-1 h-[18px] w-px flex-shrink-0 bg-border" />
        <TBtn cmd="insertUnorderedList" className="text-[15px]">
          •
        </TBtn>
        <TBtn cmd="insertOrderedList" className="text-xs">
          1.
        </TBtn>
        <span className="mx-1 h-[18px] w-px flex-shrink-0 bg-border" />
        <TBtn cmd="formatBlock" val="h2" className="w-auto px-1.5 text-[11px] font-extrabold">
          H2
        </TBtn>
        <TBtn cmd="formatBlock" val="p" className="w-auto px-1.5 text-[11px]">
          본문
        </TBtn>
        <span className="flex-1" />
        <TBtn cmd="removeFormat" className="w-auto px-2 text-[11px] text-muted-foreground">
          초기화
        </TBtn>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        className="max-h-[300px] min-h-[140px] overflow-y-auto bg-white p-3.5 text-sm leading-[1.75] text-foreground outline-none [&_h2]:my-2 [&_h2]:text-base [&_h2]:font-bold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: 초기 이슈 본문 주입
        dangerouslySetInnerHTML={{ __html: initialHtml }}
      />
    </div>
  );
}

function IssueEditForm({
  iss,
  onCancel,
  onSave,
}: {
  iss: Issue;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [title, setTitle] = useState(iss.title);
  const [type, setType] = useState(iss.type);
  const [priority, setPriority] = useState(iss.priority);
  const [status, setStatus] = useState(iss.status);
  const [date, setDate] = useState(iss.date);
  const [assignee, setAssignee] = useState(iss.assignee);
  const editorRef = useRef<HTMLDivElement>(null);

  const save = () => {
    if (title.trim()) iss.title = title.trim();
    if (type.trim()) iss.type = type.trim();
    iss.priority = priority;
    iss.status = status;
    if (date) iss.date = date;
    if (assignee.trim()) iss.assignee = assignee.trim();
    iss.desc = editorRef.current?.innerHTML.trim() ?? iss.desc ?? '';
    onSave();
  };

  return (
    <>
      <div className="mb-[18px] flex items-center gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-white px-3 py-[7px] text-[13px] font-semibold text-foreground/80"
        >
          <ChevL />
          목록으로
        </button>
        <span className="text-sm font-bold text-foreground">이슈 #{iss.no} 편집</span>
        <Badge className="bg-om-blue-bg text-primary">편집 중</Badge>
        <span className="flex-1" />
        <Button onClick={save}>저장</Button>
      </div>
      <div className="flex flex-col gap-[18px]">
        <Fld label="이슈 제목">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Fld>
        <div className="grid grid-cols-3 gap-4">
          <Fld label="유형">
            <Input value={type} onChange={(e) => setType(e.target.value)} />
          </Fld>
          <Fld label="우선순위">
            <SelectField
              value={priority}
              onChange={setPriority}
              opts={['매우 높음', '높음', '보통', '낮음']}
            />
          </Fld>
          <Fld label="상태">
            <SelectField
              value={status}
              onChange={setStatus}
              opts={['처리중', '검토중', '완료', '보류']}
            />
          </Fld>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Fld label="등록일">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Fld>
          <Fld label="담당자">
            <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          </Fld>
        </div>
        <Fld label="이슈 설명">
          <RichTextEditor initialHtml={iss.desc ?? ''} editorRef={editorRef} />
        </Fld>
      </div>
    </>
  );
}

function IssueAddForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (iss: Omit<Issue, 'no'>) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('기술');
  const [priority, setPriority] = useState('보통');
  const [status, setStatus] = useState('검토중');
  const [date, setDate] = useState(today);
  const [assignee, setAssignee] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  const save = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      type: type.trim() || '기술',
      priority,
      status,
      date: date || today,
      assignee: assignee.trim(),
      desc: editorRef.current?.innerHTML ?? '',
    });
  };

  return (
    <>
      <div className="mb-[18px] flex items-center gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-white px-3 py-[7px] text-[13px] font-semibold text-foreground/80"
        >
          <ChevL />
          목록으로
        </button>
        <span className="text-[15px] font-extrabold text-foreground">이슈 등록</span>
        <span className="flex-1" />
        <Button onClick={save}>등록</Button>
      </div>
      <div className="flex flex-col gap-4">
        <Fld label="이슈 제목 *">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="이슈 제목을 입력하세요"
          />
        </Fld>
        <div className="grid grid-cols-3 gap-4">
          <Fld label="유형">
            <Input value={type} onChange={(e) => setType(e.target.value)} />
          </Fld>
          <Fld label="우선순위">
            <SelectField
              value={priority}
              onChange={setPriority}
              opts={['매우 높음', '높음', '보통', '낮음']}
            />
          </Fld>
          <Fld label="상태">
            <SelectField
              value={status}
              onChange={setStatus}
              opts={['검토중', '처리중', '완료', '보류']}
            />
          </Fld>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Fld label="등록일">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Fld>
          <Fld label="담당자">
            <Input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="담당자 이름"
            />
          </Fld>
        </div>
        <Fld label="이슈 설명">
          <RichTextEditor initialHtml="" editorRef={editorRef} />
        </Fld>
      </div>
    </>
  );
}

/* ---- Tab: 비용 관리 ---- */
const COST_CATS = ['인건비', '외주비', '장비/SW', '교통/출장', '소모품', '기타'];

function CostTab({ p, bump }: { p: Project; bump: () => void }) {
  const [modalIdx, setModalIdx] = useState<number | null>(null); // null=closed -1=add

  const totB = p.costs.reduce((s, c) => s + c.budgeted, 0);
  const totA = p.costs.reduce((s, c) => s + c.actual, 0);
  const rem = totB - totA;

  const summ: [string, string, string][] = [
    ['총 예산', `${fmt(totB)}원`, 'text-foreground'],
    ['지출 합계', `${fmt(totA)}원`, 'text-primary'],
    ['잔여 예산', `${fmt(rem)}원`, rem < 0 ? 'text-om-red' : 'text-om-green'],
  ];

  const TH = 'px-4 py-2.5 text-left text-xs font-bold text-muted-foreground';

  return (
    <>
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">{p.costs.length}개 항목</span>
        <Button size="sm" className="h-8" onClick={() => setModalIdx(-1)}>
          + 비용 추가
        </Button>
      </div>
      <div className="mb-5 grid grid-cols-3 gap-3.5">
        {summ.map(([l, v, color]) => (
          <div key={l} className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="mb-1.5 text-xs font-bold text-muted-foreground">{l}</div>
            <div className={cn('font-mono text-lg font-extrabold', color)}>{v}</div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-[1.5px] border-border bg-muted/40">
              {[
                '비용 분류',
                '계획 예산 (원)',
                '실제 지출 (원)',
                '잔여 (원)',
                '발생일',
                '집행률',
                '',
              ].map((h, i) => (
                <th key={i} className={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.costs.map((c, i) => {
              const pct = c.budgeted ? Math.round((c.actual / c.budgeted) * 100) : 0;
              const bc =
                pct >= 100
                  ? 'var(--color-om-red)'
                  : pct >= 80
                    ? 'var(--color-om-orange)'
                    : 'var(--color-om-blue)';
              const rem2 = c.budgeted - c.actual;
              return (
                <tr key={i} className="border-b border-[#F0F1F3]">
                  <td className="px-4 py-3 text-[13.5px] font-bold text-foreground">
                    {c.category}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-foreground/80">
                    {fmt(c.budgeted)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] font-bold text-primary">
                    {fmt(c.actual)}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-3 font-mono text-[13px]',
                      rem2 < 0 ? 'text-om-red' : 'text-foreground/80'
                    )}
                  >
                    {fmt(rem2)}
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-3 font-mono text-[13px] text-foreground/80">
                    {c.date ? fmtDate(c.date) : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="min-w-[150px] px-4 py-3">
                    <Pbar pct={Math.min(pct, 100)} color={bc} />
                  </td>
                  <td className="px-3.5 py-2">
                    <button
                      type="button"
                      onClick={() => setModalIdx(i)}
                      className="h-7 cursor-pointer rounded-md border border-border px-2.5 text-xs font-semibold text-muted-foreground"
                    >
                      수정
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {modalIdx !== null && (
        <CostModal
          c={modalIdx >= 0 ? p.costs[modalIdx] : null}
          onClose={() => setModalIdx(null)}
          onSave={(nc) => {
            if (modalIdx >= 0) Object.assign(p.costs[modalIdx], nc);
            else p.costs.push(nc);
            setModalIdx(null);
            bump();
          }}
          onDelete={
            modalIdx >= 0
              ? () => {
                  p.costs.splice(modalIdx, 1);
                  setModalIdx(null);
                  bump();
                }
              : undefined
          }
        />
      )}
    </>
  );
}

function CostModal({
  c,
  onClose,
  onSave,
  onDelete,
}: {
  c: Cost | null;
  onClose: () => void;
  onSave: (c: Cost) => void;
  onDelete?: () => void;
}) {
  const presetCat = c && COST_CATS.includes(c.category) ? c.category : c ? '기타' : COST_CATS[0];
  const [catSel, setCatSel] = useState(presetCat);
  const [catTxt, setCatTxt] = useState(c && !COST_CATS.includes(c.category) ? c.category : '');
  const [budgeted, setBudgeted] = useState(c ? String(c.budgeted) : '');
  const [actual, setActual] = useState(c ? String(c.actual) : '');
  const [date, setDate] = useState(c?.date ?? '');

  const save = () => {
    const category = catTxt.trim() || catSel || '기타';
    if (!category) return;
    onSave({ category, budgeted: +budgeted || 0, actual: +actual || 0, date });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{c ? '비용 항목 편집' : '비용 항목 추가'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <Fld label="비용 분류">
            <div className="flex gap-2">
              <div className="flex-1">
                <SelectField value={catSel} onChange={setCatSel} opts={COST_CATS} />
              </div>
              <span className="flex items-center text-[13px] text-muted-foreground">또는</span>
              <Input
                value={catTxt}
                onChange={(e) => setCatTxt(e.target.value)}
                placeholder="직접 입력"
                className="flex-1"
              />
            </div>
          </Fld>
          <Fld label="계획 예산 (원)">
            <Input
              type="number"
              value={budgeted}
              onChange={(e) => setBudgeted(e.target.value)}
              placeholder="0"
            />
          </Fld>
          <Fld label="실제 지출 (원)">
            <Input
              type="number"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder="0"
            />
          </Fld>
          <Fld label="비용 발생일">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Fld>
        </div>
        <DialogFooter className="sm:justify-start">
          {onDelete && (
            <Button variant="outline" onClick={onDelete} className="border-om-red text-om-red">
              삭제
            </Button>
          )}
          <span className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={save}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   EDIT VIEW (프로젝트 편집)
   ============================================================ */
function EditView({
  project,
  onCancel,
  onSaved,
}: {
  project: Project;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [client, setClient] = useState(project.client);
  const [status, setStatus] = useState<string>(project.status);
  const [pm, setPm] = useState(project.pm);
  const [progress, setProgress] = useState(project.progress);
  const [startDate, setStartDate] = useState(project.startDate);
  const [endDate, setEndDate] = useState(project.endDate);
  const [budget, setBudget] = useState(String(project.budget));
  const [spent, setSpent] = useState(String(project.spent));
  const [desc, setDesc] = useState(project.desc);

  const save = () => {
    if (name.trim()) project.name = name.trim();
    if (client.trim()) project.client = client.trim();
    project.status = status as ProjectStatus;
    if (pm) project.pm = pm;
    project.progress = progress;
    if (startDate) project.startDate = startDate;
    if (endDate) project.endDate = endDate;
    project.budget = +budget || project.budget;
    project.spent = +spent || 0;
    if (desc.trim()) project.desc = desc.trim();
    onSaved();
    toast.success('프로젝트 정보가 저장되었습니다');
  };

  const SHDR = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-[18px] border-b border-[#F0F1F3] pb-3 text-[11.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
      {children}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-white px-3 py-[7px] text-[13px] font-semibold text-foreground/80"
        >
          <ChevL />
          취소
        </button>
        <span className="text-xs text-muted-foreground">프로젝트 관리</span>
        <span className="text-[13px] text-muted-foreground">/</span>
        <span className="text-sm font-bold text-foreground">{project.name}</span>
        <Badge className="bg-om-blue-bg text-primary">편집 중</Badge>
        <span className="flex-1" />
        <Button onClick={save}>저장</Button>
      </div>
      <div className="flex flex-col gap-7 rounded-xl border border-border bg-white p-[26px] shadow-sm">
        <div>
          <SHDR>기본 정보</SHDR>
          <div className="grid grid-cols-2 gap-x-6 gap-y-[18px]">
            <Fld label="프로젝트명">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Fld>
            <Fld label="고객사">
              <Input value={client} onChange={(e) => setClient(e.target.value)} />
            </Fld>
            <Fld label="상태">
              <SelectField
                value={status}
                onChange={setStatus}
                opts={['진행중', '완료', '대기', '보류']}
              />
            </Fld>
            <Fld label="PM (프로젝트 관리자)">
              <Select value={pm} onValueChange={(v) => setPm(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMBERS_DATA.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name} ({m.rank})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Fld>
            <div className="col-span-2 flex flex-col gap-2">
              <Label>진행률</Label>
              <div className="flex items-center gap-3.5">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(+e.target.value)}
                  className="h-1.5 flex-1 accent-primary"
                />
                <div className="flex h-10 min-w-[64px] items-center justify-center rounded-md border border-border bg-om-blue-bg font-mono text-[15px] font-extrabold text-primary">
                  {progress}%
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <SHDR>일정 및 예산</SHDR>
          <div className="grid grid-cols-2 gap-x-6 gap-y-[18px]">
            <Fld label="시작일">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Fld>
            <Fld label="종료일">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Fld>
            <Fld label="총 예산 (원)">
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </Fld>
            <Fld label="사용 금액 (원)">
              <Input type="number" value={spent} onChange={(e) => setSpent(e.target.value)} />
            </Fld>
          </div>
        </div>
        <div>
          <SHDR>프로젝트 설명</SHDR>
          <Textarea
            rows={5}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="resize-y leading-[1.65]"
          />
        </div>
      </div>
    </div>
  );
}

/* ---- shared small bits ---- */
function Fld({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label>{label}</Label>}
      {children}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  opts,
}: {
  value: string;
  onChange: (v: string) => void;
  opts: string[];
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? '')}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opts.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ============================================================
   ROOT — list <-> detail <-> edit
   ============================================================ */
function ProjectsScreen() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);

  const project = selectedId ? (PROJECTS_DATA.find((x) => x.id === selectedId) ?? null) : null;

  if (editing && project) {
    return (
      <EditView
        project={project}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          bump();
        }}
      />
    );
  }

  if (project) {
    return (
      <DetailView
        project={project}
        onBack={() => setSelectedId(null)}
        onEdit={() => setEditing(true)}
        bump={bump}
      />
    );
  }

  return <ListView onOpen={(id) => setSelectedId(id)} />;
}

export const projectsScreens: ScreenModule = {
  'proj-list': {
    title: '프로젝트 관리',
    sub: '프로젝트 현황 및 상세 정보를 관리합니다',
    Component: ProjectsScreen,
  },
};
