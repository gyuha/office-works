import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type IApi,
  type IColumnConfig,
  type IScaleConfig,
  type ITask,
  Gantt,
  Willow,
} from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/all.css';
import { createContext, useContext, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import {
  createProjectApiV1ProjectsPostMutation,
  getScheduleVersionApiV1ProjectsProjectIdScheduleVersionsVersionIdGetOptions,
  listProjectsApiV1ProjectsGetOptions,
  listProjectsApiV1ProjectsGetQueryKey,
  listScheduleVersionsApiV1ProjectsProjectIdScheduleVersionsGetOptions,
  listScheduleVersionsApiV1ProjectsProjectIdScheduleVersionsGetQueryKey,
  saveScheduleApiV1ProjectsProjectIdScheduleVersionsPostMutation,
} from '@/client/@tanstack/react-query.gen';
import type { ProjectResponse } from '@/client/types.gen';
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
type Task = { id: string; name: string; start: string; end: string; done: number; dept: string };
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
export type Project = {
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

/* member pool (members.js) — 인력 추가 picker */
const MEMBERS_DATA = [
  { id: 'EMP-001', name: '김지훈', team: '개발팀', rank: '대리', grade: '고급' },
  { id: 'EMP-002', name: '이수연', team: '기획팀', rank: '과장', grade: '특급' },
  { id: 'EMP-003', name: '박민준', team: '영업팀', rank: '사원', grade: '중급' },
  { id: 'EMP-004', name: '최유진', team: '인사팀', rank: '차장', grade: '고급' },
  { id: 'EMP-005', name: '정다은', team: '개발팀', rank: '과장', grade: '특급' },
  { id: 'EMP-006', name: '강태양', team: '디자인팀', rank: '대리', grade: '중급' },
  { id: 'EMP-007', name: '윤서준', team: '개발팀', rank: '부장', grade: '특급' },
  { id: 'EMP-008', name: '임나영', team: '마케팅팀', rank: '사원', grade: '초급' },
  { id: 'EMP-009', name: '홍준서', team: '기획팀', rank: '주임', grade: '중급' },
  { id: 'EMP-010', name: '오지은', team: '인사팀', rank: '팀장', grade: '고급' },
  { id: 'EMP-011', name: '신현우', team: '영업팀', rank: '과장', grade: '고급' },
  { id: 'EMP-012', name: '장미래', team: '디자인팀', rank: '팀장', grade: '특급' },
  { id: 'EMP-013', name: '노지훈', team: '개발팀', rank: '사원', grade: '초급' },
  { id: 'EMP-014', name: '허수아', team: '마케팅팀', rank: '대리', grade: '고급' },
  { id: 'EMP-015', name: '조하늘', team: '기획팀', rank: '차장', grade: '중급' },
  { id: 'EMP-016', name: '권태오', team: '영업팀', rank: '부장', grade: '특급' },
  { id: 'EMP-017', name: '서보람', team: '개발팀', rank: '대리', grade: '중급' },
  { id: 'EMP-018', name: '문가영', team: '인사팀', rank: '주임', grade: '고급' },
  { id: 'EMP-019', name: '배성준', team: '마케팅팀', rank: '팀장', grade: '고급' },
  { id: 'EMP-020', name: '유은서', team: '디자인팀', rank: '사원', grade: '중급' },
  { id: 'EMP-021', name: '황도윤', team: '개발팀', rank: '주임', grade: '고급' },
  { id: 'EMP-022', name: '송채원', team: '기획팀', rank: '사원', grade: '중급' },
  { id: 'EMP-023', name: '한지민', team: '영업팀', rank: '대리', grade: '고급' },
  { id: 'EMP-024', name: '전현서', team: '디자인팀', rank: '과장', grade: '특급' },
  { id: 'EMP-025', name: '류아인', team: '마케팅팀', rank: '주임', grade: '초급' },
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
const GRADE_COLORS: Record<string, string> = {
  특급: '#0066ff',
  고급: '#00bf40',
  중급: '#ff9200',
  초급: '#94a3b8',
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

export const DETAIL_TABS = [
  { id: 'info', label: '프로젝트 정보' },
  { id: 'gantt', label: '업무 일정' },
  { id: 'members', label: '투입 인력' },
  { id: 'contracts', label: '계약서 관리' },
  { id: 'issues', label: '이슈/리스크' },
  { id: 'cost', label: '비용 관리' },
] as const;
export type TabId = (typeof DETAIL_TABS)[number]['id'];

/* ---- helpers ---- */
const fmt = (n: number) => Number(n).toLocaleString('ko-KR');
const fmtDate = (d?: string) => (d ? d.replace(/-/g, '.') : '-');
const fmtDateTime = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
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

export function StatusBadge({ s }: { s: string }) {
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
function ListView({
  projects,
  onOpen,
  onAdd,
}: {
  projects: Project[];
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const counts = useMemo(() => {
    const c = { 진행중: 0, 완료: 0, 대기: 0, 보류: 0 } as Record<ProjectStatus, number>;
    projects.forEach((p) => (c[p.status] += 1));
    return c;
  }, [projects]);

  const years = useMemo(
    () =>
      [...new Set(projects.map((p) => p.startDate.slice(0, 4)).filter(Boolean))].sort().reverse(),
    [projects]
  );

  const filtered = useMemo(() => {
    let list = projects.slice();
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
          <Button className="h-[34px] gap-1.5" onClick={onAdd}>
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
   DETAIL — 라우트 공유 컨텍스트
   레이아웃 라우트(app.proj.$projectId)가 draft·persist를 제공하고
   자식 탭 라우트(app.proj.$projectId.$tab)가 useProjectDetail로 소비한다.
   ============================================================ */
export type ProjectDetailCtx = { project: Project; bump: () => void };
export const ProjectDetailContext = createContext<ProjectDetailCtx | null>(null);
export function useProjectDetail(): ProjectDetailCtx {
  const ctx = useContext(ProjectDetailContext);
  if (!ctx) {
    throw new Error('useProjectDetail은 프로젝트 상세 라우트 내부에서만 사용할 수 있습니다');
  }
  return ctx;
}

export function ChevL() {
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
export function InfoTab({ p }: { p: Project }) {
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
export function MembersTab({ p, bump }: { p: Project; bump: () => void }) {
  const [modalIdx, setModalIdx] = useState<number | null>(null); // null=closed, -1=add, >=0 edit
  const [view, setView] = useState<'table' | 'gantt'>('table');

  const TH = 'px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground';

  return (
    <>
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">총 {p.members.length}명</span>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-border">
            {(['table', 'gantt'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                  view === v
                    ? 'bg-om-blue-bg text-primary'
                    : 'bg-white text-foreground/70 hover:bg-muted/40'
                )}
              >
                {v === 'table' ? '테이블' : '간트'}
              </button>
            ))}
          </div>
          <Button size="sm" className="h-8" onClick={() => setModalIdx(-1)}>
            + 인력 추가
          </Button>
        </div>
      </div>
      {p.members.length === 0 ? (
        <p className="py-5 text-muted-foreground">투입된 인력이 없습니다.</p>
      ) : view === 'gantt' ? (
        <MembersGanttView p={p} bump={bump} onEdit={(i) => setModalIdx(i)} />
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

/* ---- 투입 인력 간트 뷰 — SVAR 렌더 + 드래그 편집(투입 기간) + 더블클릭→MemberModal ---- */
function MembersGanttView({
  p,
  bump,
  onEdit,
}: {
  p: Project;
  bump: () => void;
  onEdit: (i: number) => void;
}) {
  const apiRef = useRef<IApi | null>(null);
  const [viewMode, setViewMode] = useState<GanttViewMode>('Month');

  const dated = p.members.filter((m) => m.start && m.end);
  const missing = p.members.length - dated.length;

  const scales = useMemo(() => scalesFor(viewMode), [viewMode]);
  const svarMembers = dated.map(memberToSvar);
  // 멤버 집합/날짜/활성 변화 시 Gantt 재마운트 — 드래그 커밋·모달 편집·추가/삭제 모두 반영.
  const sig = dated.map((m) => `${m.id}:${m.start}:${m.end}:${m.active}`).join('|');

  const handleInit = (api: IApi) => {
    apiRef.current = api;
    // 드래그/리사이즈 커밋 → 해당 멤버 투입 기간 in-place 변형 + bump (진행 중 이벤트 무시)
    api.on('update-task', (ev) => {
      if (ev.inProgress) return;
      const st = api.getTask(ev.id);
      if (!st) return;
      const m = p.members.find((x) => x.id === String(ev.id));
      if (!m) return;
      const next = applySvarChangeToMember(m, { start: st.start, end: st.end });
      m.start = next.start;
      m.end = next.end;
      bump();
    });
    // 막대 더블클릭 → SVAR 내장 에디터 차단하고 기존 MemberModal 오픈
    api.intercept('show-editor', (ev) => {
      const i = p.members.findIndex((x) => x.id === String(ev.id));
      if (i >= 0) onEdit(i);
      return false;
    });
  };

  return (
    <div className="min-w-0">
      {/* 툴바: 일/주/월 토글 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex-1" />
        <div className="flex overflow-hidden rounded-md border border-border">
          {GANTT_VIEW_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                viewMode === mode
                  ? 'bg-om-blue-bg text-primary'
                  : 'bg-white text-foreground/70 hover:bg-muted/40'
              )}
            >
              {mode === 'Day' ? '일' : mode === 'Week' ? '주' : '월'}
            </button>
          ))}
        </div>
      </div>

      {/* 등급 범례 */}
      <div className="mb-2 flex flex-wrap gap-3">
        {Object.entries(GRADE_COLORS).map(([grade, color]) => (
          <span key={grade} className="inline-flex items-center gap-1.5 text-xs text-foreground/80">
            <span
              className="inline-block size-2.5 flex-shrink-0 rounded-sm"
              style={{ background: color }}
            />
            {grade}
          </span>
        ))}
      </div>

      {dated.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
          투입일이 지정된 인력이 없습니다. 테이블에서 투입 시작·종료를 입력하면 간트에 표시됩니다.
        </p>
      ) : (
        <div className="om-gantt h-[60vh] min-h-[360px] overflow-hidden rounded-lg border border-border [&_.wx-gantt]:h-full [&_.wx-willow-theme]:h-full">
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 등급 색상용 정적 CSS(멤버 id는 사번) */}
          <style dangerouslySetInnerHTML={{ __html: memberStyleCss(dated) }} />
          <Willow>
            <Gantt
              key={`${viewMode}:${sig}`}
              tasks={svarMembers}
              scales={scales}
              // 좌측 작업 그리드 숨김 — 라이브러리 타입 교차 이슈로 캐스트(GanttTab과 동일).
              columns={false as unknown as IColumnConfig[]}
              cellHeight={38}
              readonly={false}
              init={handleInit}
            />
          </Willow>
        </div>
      )}
      {missing > 0 && (
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          {missing}명 투입일 미지정 — 간트 미표시 (테이블에서 투입 시작·종료를 입력하세요)
        </p>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      <span className="text-[13.5px] font-semibold text-foreground">{value || '—'}</span>
    </div>
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
  const [start, setStart] = useState(editing?.start ?? '');
  const [end, setEnd] = useState(editing?.end ?? '');

  // 선택된 구성원의 마스터 데이터(이름/팀/등급/직급) — 읽기 전용 표시·저장에 사용
  const selectedId = editing ? editing.id : memberId;
  const src = MEMBERS_DATA.find((x) => x.id === selectedId);
  const info = {
    name: editing?.name ?? src?.name ?? '',
    team: src?.team ?? '—',
    grade: editing?.grade ?? src?.grade ?? '',
    rank: editing?.rank ?? src?.rank ?? '',
  };

  const save = () => {
    if (editing) {
      if (role) editing.role = role;
      if (start) editing.start = start;
      if (end) editing.end = end;
    } else {
      if (!src) return;
      p.members.push({
        id: src.id,
        name: src.name,
        rank: src.rank,
        role: role || src.rank,
        grade: src.grade,
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
          {src && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-border bg-muted/30 px-3 py-3">
              <ReadOnlyField label="이름" value={info.name} />
              <ReadOnlyField label="팀" value={info.team} />
              <ReadOnlyField label="등급" value={info.grade} />
              <ReadOnlyField label="직급" value={info.rank} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mm-role">역할</Label>
            <Input
              id="mm-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="예) 백엔드 개발, PM, 디자인"
            />
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
function genTaskId(): string {
  return `tsk_${crypto.randomUUID().slice(0, 8)}`;
}

function fmtYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const GANTT_VIEW_MODES = ['Day', 'Week', 'Month'] as const;
type GanttViewMode = (typeof GANTT_VIEW_MODES)[number];

/* ---- frappe→SVAR 마이그레이션: 순수 매핑 헬퍼 (단위 테스트 대상) ---- */
function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
/** 우리 Task → SVAR ITask. end는 inclusive(우리) → exclusive(SVAR)로 +1일. */
export function taskToSvar(t: Task): ITask {
  const today = fmtYMD(new Date());
  const start = parseYMD(t.start || today);
  const endIncl = parseYMD(t.end || t.start || today);
  return { id: t.id, text: t.name, start, end: addDays(endIncl, 1), progress: t.done, type: 'task' };
}
/** SVAR 편집 결과(start/end/progress/text)를 우리 Task에 반영. end는 exclusive→inclusive로 -1일. */
export function applySvarChange(
  t: Task,
  ch: { start?: Date; end?: Date; progress?: number; text?: string }
): Task {
  return {
    ...t,
    ...(ch.start ? { start: fmtYMD(ch.start) } : {}),
    ...(ch.end ? { end: fmtYMD(addDays(ch.end, -1)) } : {}),
    ...(ch.progress != null ? { done: Math.round(ch.progress) } : {}),
    ...(ch.text ? { name: ch.text } : {}),
  };
}
/** 뷰모드 → SVAR 시간축. */
function scalesFor(mode: GanttViewMode): IScaleConfig[] {
  const monthName = (d: Date) => `${d.getMonth() + 1}월`;
  const yearMonth = (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
  if (mode === 'Day')
    return [
      { unit: 'month', step: 1, format: yearMonth },
      { unit: 'day', step: 1, format: (d) => String(d.getDate()) },
    ];
  if (mode === 'Week')
    return [
      { unit: 'month', step: 1, format: yearMonth },
      { unit: 'week', step: 1, format: (d) => `${d.getMonth() + 1}/${d.getDate()}` },
    ];
  return [
    { unit: 'year', step: 1, format: (d) => `${d.getFullYear()}년` },
    { unit: 'month', step: 1, format: monthName },
  ];
}
/** 부서별 막대 색상을 data-task-id 스코프 CSS 변수로 주입(타입 오염 없이 per-task 색상). */
function deptStyleCss(tasks: Task[]): string {
  return tasks
    .map((t) => {
      const c = DEPT_COLORS[t.dept] ?? '#94A3B8';
      return `.wx-bar[data-task-id="${t.id}"]{--wx-gantt-task-color:${c}b3;--wx-gantt-task-fill-color:${c};--wx-gantt-task-border-color:${c};}`;
    })
    .join('\n');
}

/* ---- 멤버 간트: 멤버 ↔ SVAR 매핑 (GanttTab 미사용 — 순수 헬퍼만 재사용) ---- */
/** 투입 멤버 → SVAR ITask. end는 inclusive(우리) → exclusive(SVAR)로 +1일. 진척 개념 없음. */
function memberToSvar(m: Member): ITask {
  return {
    id: m.id,
    text: m.name,
    start: parseYMD(m.start),
    end: addDays(parseYMD(m.end), 1),
    progress: 0,
    type: 'task',
  };
}
/** SVAR 편집 결과(start/end)를 멤버 투입 기간에 반영. end는 exclusive→inclusive로 -1일. */
function applySvarChangeToMember(m: Member, ch: { start?: Date; end?: Date }): Member {
  return {
    ...m,
    ...(ch.start ? { start: fmtYMD(ch.start) } : {}),
    ...(ch.end ? { end: fmtYMD(addDays(ch.end, -1)) } : {}),
  };
}
/** 등급별 막대 색상 + 비활성 멤버 흐리게를 data-task-id 스코프 CSS로 주입. */
function memberStyleCss(members: Member[]): string {
  return members
    .map((m) => {
      const c = GRADE_COLORS[m.grade] ?? '#94a3b8';
      const dim = m.active === false ? 'opacity:0.45;' : '';
      return `.wx-bar[data-task-id="${m.id}"]{--wx-gantt-task-color:${c}b3;--wx-gantt-task-fill-color:${c};--wx-gantt-task-border-color:${c};${dim}}`;
    })
    .join('\n');
}

/* ---- Tab: 일정 (간트차트) — SVAR React Gantt 기반 마우스 편집 + 저장 히스토리 ---- */
export function GanttTab({ p }: { p: Project }) {
  const queryClient = useQueryClient();
  const apiRef = useRef<IApi | null>(null);

  const [tasks, setTasks] = useState<Task[]>(() =>
    p.tasks.map((t) => ({ ...t, id: t.id || genTaskId() }))
  );
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const [viewMode, setViewMode] = useState<GanttViewMode>('Month');
  const [note, setNote] = useState('');
  const [editIdx, setEditIdx] = useState<number | null>(null); // null=closed, -1=add
  const [viewingVersion, setViewingVersion] = useState<{ id: string; at: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  // 우리 쪽 변경(다이얼로그/히스토리/뷰모드)에만 SVAR 재마운트. SVAR 드래그 편집은 재마운트하지 않는다.
  const [reloadKey, setReloadKey] = useState(0);
  const reloadGantt = () => setReloadKey((k) => k + 1);

  const historyQuery = useQuery(
    listScheduleVersionsApiV1ProjectsProjectIdScheduleVersionsGetOptions({
      path: { project_id: p.id },
    })
  );

  const saveMut = useMutation({
    ...saveScheduleApiV1ProjectsProjectIdScheduleVersionsPostMutation(),
    onSuccess: () => {
      p.tasks = tasksRef.current; // 메모리 프로젝트(다른 탭) 동기화
      setDirty(false);
      setNote('');
      setViewingVersion(null);
      queryClient.invalidateQueries({
        queryKey: listScheduleVersionsApiV1ProjectsProjectIdScheduleVersionsGetQueryKey({
          path: { project_id: p.id },
        }),
      });
      queryClient.invalidateQueries({ queryKey: listProjectsApiV1ProjectsGetQueryKey() });
      toast.success('일정이 저장되었습니다 (히스토리 추가됨)');
    },
    onError: () => toast.error('일정 저장에 실패했습니다'),
  });

  const scales = useMemo(() => scalesFor(viewMode), [viewMode]);
  // reloadKey 시점의 tasks를 스냅샷 → 드래그 편집(setTasks)으로는 prop이 바뀌지 않아 재마운트 없음.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey는 의도적 무효화 트리거(드래그 편집과 우리 변경을 구분해 재마운트)
  const svarTasks = useMemo(() => tasksRef.current.map(taskToSvar), [reloadKey]);

  const handleInit = (api: IApi) => {
    apiRef.current = api;
    // 드래그/리사이즈/진척 커밋 반영 (진행 중 이벤트는 무시)
    api.on('update-task', (ev) => {
      if (ev.inProgress) return;
      const st = api.getTask(ev.id);
      if (!st) return;
      const id = String(ev.id);
      setTasks((prev) =>
        prev.map((x) =>
          x.id === id
            ? applySvarChange(x, {
                start: st.start,
                end: st.end,
                progress: st.progress,
                text: st.text,
              })
            : x
        )
      );
      setDirty(true);
    });
    // 막대 더블클릭 → SVAR 내장 에디터 차단하고 우리 다이얼로그 오픈
    api.intercept('show-editor', (ev) => {
      const i = tasksRef.current.findIndex((t) => t.id === String(ev.id));
      if (i >= 0) setEditIdx(i);
      return false;
    });
  };

  const editing = editIdx !== null && editIdx >= 0 ? tasks[editIdx] : null;

  const applyTaskEdit = (next: Task) => {
    setTasks((prev) => {
      if (editIdx === -1) return [...prev, next];
      return prev.map((t, i) => (i === editIdx ? next : t));
    });
    setDirty(true);
    setEditIdx(null);
    reloadGantt();
  };

  const deleteTask = (idx: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
    setEditIdx(null);
    reloadGantt();
  };

  const loadVersion = async (versionId: string, at: string) => {
    try {
      const v = await queryClient.fetchQuery(
        getScheduleVersionApiV1ProjectsProjectIdScheduleVersionsVersionIdGetOptions({
          path: { project_id: p.id, version_id: versionId },
        })
      );
      setTasks(
        (v.tasks ?? []).map((t) => ({
          id: t.id || genTaskId(),
          name: t.name,
          start: t.start ?? '',
          end: t.end ?? '',
          done: t.done ?? 0,
          dept: t.dept ?? '',
        }))
      );
      setViewingVersion({ id: versionId, at });
      setDirty(false);
      reloadGantt();
      toast.info('히스토리 버전을 불러왔습니다');
    } catch {
      toast.error('버전을 불러오지 못했습니다');
    }
  };

  const restoreCurrent = () => {
    setTasks(p.tasks.map((t) => ({ ...t, id: t.id || genTaskId() })));
    setViewingVersion(null);
    setDirty(false);
    reloadGantt();
  };

  const save = () => {
    saveMut.mutate({
      path: { project_id: p.id },
      body: { note: note.trim(), tasks: tasksRef.current },
    });
  };

  const history = historyQuery.data ?? [];
  const selectValue = viewingVersion?.id ?? 'current';
  const onHistoryChange = (val: string | null) => {
    if (!val || val === 'current') {
      restoreCurrent();
      return;
    }
    const ver = history.find((h) => h.id === val);
    if (ver) loadVersion(val, ver.created_at);
  };

  return (
    <div className="min-w-0">
      {/* 툴바 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-foreground">전체 {tasks.length}개 작업</span>
        <span className="flex-1" />
        <div className="flex overflow-hidden rounded-md border border-border">
          {GANTT_VIEW_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setViewMode(m)}
              className={cn(
                'px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                viewMode === m
                  ? 'bg-om-blue-bg text-primary'
                  : 'bg-white text-foreground/70 hover:bg-muted/40'
              )}
            >
              {m === 'Day' ? '일' : m === 'Week' ? '주' : '월'}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          className="h-[34px] border-border bg-white text-foreground/80"
          onClick={() => setEditIdx(-1)}
        >
          + 작업 추가
        </Button>
        <Select value={selectValue} onValueChange={onHistoryChange}>
          <SelectTrigger className="h-[34px] w-[230px] text-[13px]">
            <SelectValue placeholder="변경 히스토리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">현재 일정 (편집 중)</SelectItem>
            {history.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {fmtDateTime(v.created_at)} · {v.note || '메모 없음'} · {v.task_count}개
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="변경 메모 (선택)"
          className="h-[34px] w-[140px] text-[13px]"
        />
        <Button className="h-[34px]" onClick={save} disabled={saveMut.isPending}>
          {saveMut.isPending ? '저장 중…' : dirty ? '저장 *' : '저장'}
        </Button>
      </div>

      {/* 범례 */}
      <div className="mb-2 flex flex-wrap gap-3">
        {Object.entries(DEPT_COLORS).map(([dept, color]) => (
          <span key={dept} className="inline-flex items-center gap-1.5 text-xs text-foreground/80">
            <span
              className="inline-block size-2.5 flex-shrink-0 rounded-sm"
              style={{ background: color }}
            />
            {dept}
          </span>
        ))}
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
          등록된 일정이 없습니다. “+ 작업 추가”로 시작하세요.
        </p>
      ) : (
        <div className="om-gantt h-[60vh] min-h-[360px] overflow-hidden rounded-lg border border-border [&_.wx-gantt]:h-full [&_.wx-willow-theme]:h-full">
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 부서 색상용 정적 CSS(태스크 id는 내부 생성값) */}
          <style dangerouslySetInnerHTML={{ __html: deptStyleCss(tasks) }} />
          <Willow>
            <Gantt
              key={`${viewMode}:${reloadKey}`}
              tasks={svarTasks}
              scales={scales}
              // 좌측 작업 그리드(표) 숨김 — SVAR 문서상 false. 라이브러리 타입 교차 이슈로 캐스트.
              columns={false as unknown as IColumnConfig[]}
              cellHeight={38}
              readonly={false}
              init={handleInit}
            />
          </Willow>
        </div>
      )}
      <p className="mt-2 text-[11.5px] text-muted-foreground">
        막대를 드래그하면 일정이, 좌우 끝을 끌면 기간이, 막대 우측 끝(진행) 핸들로 진척도가 바뀝니다.
        막대를 더블클릭하면 상세 편집이 열립니다.
      </p>

      {editIdx !== null && (
        <TaskEditDialog
          task={editing}
          onClose={() => setEditIdx(null)}
          onSave={applyTaskEdit}
          onDelete={editIdx >= 0 ? () => deleteTask(editIdx) : undefined}
        />
      )}
    </div>
  );
}

function TaskEditDialog({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task | null;
  onClose: () => void;
  onSave: (t: Task) => void;
  onDelete?: () => void;
}) {
  const today = fmtYMD(new Date());
  const [name, setName] = useState(task?.name ?? '');
  const [dept, setDept] = useState(task?.dept ?? Object.keys(DEPT_COLORS)[0]);
  const [start, setStart] = useState(task?.start || today);
  const [end, setEnd] = useState(task?.end || today);
  const [done, setDone] = useState(task?.done ?? 0);

  const save = () => {
    if (!name.trim()) {
      toast.error('작업명을 입력해주세요');
      return;
    }
    if (end < start) {
      toast.error('종료일이 시작일보다 빠를 수 없습니다');
      return;
    }
    onSave({ id: task?.id ?? genTaskId(), name: name.trim(), dept, start, end, done });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{task ? '작업 편집' : '작업 추가'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <Fld label="작업명">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Fld>
          <Fld label="부서">
            <SelectField value={dept} onChange={setDept} opts={Object.keys(DEPT_COLORS)} />
          </Fld>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="시작일">
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Fld>
            <Fld label="종료일">
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Fld>
          </div>
          <Fld label={`진척도 ${done}%`}>
            <input
              type="range"
              min={0}
              max={100}
              value={done}
              onChange={(e) => setDone(+e.target.value)}
              className="h-1.5 w-full accent-primary"
            />
          </Fld>
        </div>
        <DialogFooter className="sm:justify-between">
          {onDelete ? (
            <Button
              variant="outline"
              onClick={onDelete}
              className="border-om-red/40 bg-white text-om-red"
            >
              삭제
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-border bg-white text-foreground/80"
            >
              취소
            </Button>
            <Button onClick={save}>확인</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Tab: 계약서 관리 (inline accordion edit) ---- */
export function ContractsTab({ p, bump }: { p: Project; bump: () => void }) {
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
export function IssuesTab({ p, bump }: { p: Project; bump: () => void }) {
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

export function CostTab({ p, bump }: { p: Project; bump: () => void }) {
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
export function EditView({
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

/* ---- API <-> UI mapping ---- */
export function toUiProject(r: ProjectResponse): Project {
  return {
    id: r.id,
    name: r.name,
    client: r.client ?? '',
    status: (r.status ?? '대기') as ProjectStatus,
    progress: r.progress ?? 0,
    pm: r.pm ?? '',
    startDate: r.startDate ?? '',
    endDate: r.endDate ?? '',
    budget: r.budget ?? 0,
    spent: r.spent ?? 0,
    desc: r.desc ?? '',
    members: (r.members ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      rank: m.rank ?? '',
      role: m.role ?? '',
      grade: m.grade ?? '',
      start: m.start ?? '',
      end: m.end ?? '',
      active: m.active,
    })),
    tasks: (r.tasks ?? []).map((t) => ({
      id: t.id || genTaskId(),
      name: t.name,
      start: t.start ?? '',
      end: t.end ?? '',
      done: t.done ?? 0,
      dept: t.dept ?? '',
    })),
    contracts: (r.contracts ?? []).map((c) => ({
      name: c.name,
      date: c.date ?? '',
      amount: c.amount ?? 0,
      type: c.type ?? '',
      status: c.status ?? '',
      fileName: c.fileName,
    })),
    issues: (r.issues ?? []).map((i) => ({
      no: i.no,
      title: i.title,
      type: i.type ?? '',
      priority: i.priority ?? '',
      status: i.status ?? '',
      date: i.date ?? '',
      assignee: i.assignee ?? '',
      desc: i.desc,
    })),
    costs: (r.costs ?? []).map((c) => ({
      category: c.category,
      budgeted: c.budgeted ?? 0,
      actual: c.actual ?? 0,
      date: c.date,
    })),
  };
}

/* ---- 프로젝트 추가 다이얼로그 ---- */
function CreateProjectDialog({
  onClose,
  onCreate,
  pending,
}: {
  onClose: () => void;
  onCreate: (body: {
    name: string;
    client: string;
    pm: string;
    status: ProjectStatus;
    startDate: string;
    endDate: string;
    budget: number;
  }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [pm, setPm] = useState(MEMBERS_DATA[0]?.name ?? '');
  const [status, setStatus] = useState<string>('대기');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');

  const submit = () => {
    if (!name.trim()) {
      toast.error('프로젝트명을 입력해주세요');
      return;
    }
    onCreate({
      name: name.trim(),
      client: client.trim(),
      pm,
      status: status as ProjectStatus,
      startDate,
      endDate,
      budget: +budget || 0,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>프로젝트 추가</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 py-1">
          <Fld label="프로젝트명">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Fld>
          <Fld label="고객사">
            <Input value={client} onChange={(e) => setClient(e.target.value)} />
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
          <Fld label="상태">
            <SelectField
              value={status}
              onChange={setStatus}
              opts={['진행중', '완료', '대기', '보류']}
            />
          </Fld>
          <Fld label="시작일">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Fld>
          <Fld label="종료일">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Fld>
          <Fld label="총 예산 (원)">
            <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </Fld>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-border bg-white text-foreground/80"
          >
            취소
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? '생성 중…' : '생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   ROOT — list <-> detail <-> edit
   ============================================================ */
function ProjectsScreen() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const projectsQuery = useQuery(listProjectsApiV1ProjectsGetOptions());
  const projects = useMemo(() => (projectsQuery.data ?? []).map(toUiProject), [projectsQuery.data]);

  const openDetail = (id: string) =>
    navigate({ to: '/app/proj/$projectId', params: { projectId: id } });

  const createMut = useMutation({
    ...createProjectApiV1ProjectsPostMutation(),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: listProjectsApiV1ProjectsGetQueryKey() });
      setCreateOpen(false);
      toast.success('프로젝트가 생성되었습니다');
      openDetail(toUiProject(created).id);
    },
    onError: () => toast.error('프로젝트 생성에 실패했습니다'),
  });

  if (projectsQuery.isLoading) {
    return <div className="px-1 py-10 text-sm text-muted-foreground">프로젝트를 불러오는 중…</div>;
  }
  if (projectsQuery.isError) {
    return (
      <div className="px-1 py-10 text-sm text-om-red">프로젝트 목록을 불러오지 못했습니다.</div>
    );
  }

  return (
    <>
      <ListView projects={projects} onOpen={openDetail} onAdd={() => setCreateOpen(true)} />
      {createOpen && (
        <CreateProjectDialog
          onClose={() => setCreateOpen(false)}
          onCreate={(body) => createMut.mutate({ body })}
          pending={createMut.isPending}
        />
      )}
    </>
  );
}

export const projectsScreens: ScreenModule = {
  'proj-list': {
    title: '프로젝트 관리',
    sub: '프로젝트 현황 및 상세 정보를 관리합니다',
    Component: ProjectsScreen,
  },
};
