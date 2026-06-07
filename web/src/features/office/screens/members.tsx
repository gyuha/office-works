import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  createMemberApiV1MembersPostMutation,
  deleteMemberApiV1MembersMemberIdDeleteMutation,
  getMemberApiV1MembersMemberIdGetOptions,
  listGradesApiV1GradesGetOptions,
  listMembersApiV1MembersGetOptions,
  memberStatsApiV1MembersStatsGetOptions,
  updateMemberApiV1MembersMemberIdPatchMutation,
} from '@/client/@tanstack/react-query.gen';
import { exportMembersApiV1MembersExportGet } from '@/client/sdk.gen';
import type { GradeResponse, MemberCreate, MemberResponse } from '@/client/types.gen';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ScreenModule } from './types';

/* ============================================================
   OfficeMate — 구성원 관리 (hey-api 생성 클라이언트 연동, 서버사이드)
   ============================================================ */

type Member = MemberResponse;

const PER_PAGE = 10;
type SortKey = 'no' | 'name' | 'dept' | 'rank' | 'grade';

const GRADE_FALLBACK = { color: '#69748A', bg: '#F4F5F7', border: '#D4D8DF' };

/* 등급 목록(이름·색)을 API에서 동적 로드 — 하드코딩 GRADE_CFG 대체 */
function useGrades(): GradeResponse[] {
  return useQuery(listGradesApiV1GradesGetOptions()).data ?? [];
}

function gradeStyleOf(grades: GradeResponse[], name: string) {
  const g = grades.find((x) => x.name === name);
  return g ? { color: g.color, bg: g.bg, border: g.border } : GRADE_FALLBACK;
}

const AVATAR_PALETTE = [
  '#0066FF',
  '#00BF40',
  '#8B5CF6',
  '#FF9200',
  '#4F66D6',
  '#00A3BF',
  '#C45022',
  '#FF3B3B',
];

function avatarBg(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center justify-center rounded-full font-bold tracking-[-0.02em] text-white"
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: avatarBg(name),
        fontSize: size * 0.38,
      }}
    >
      {name.charAt(0)}
    </span>
  );
}

function GradeTag({ grade }: { grade: string }) {
  const grades = useGrades();
  const s = gradeStyleOf(grades, grade);
  return (
    <span
      className="inline-flex min-w-[54px] items-center justify-center rounded-md border px-1.5 py-1 text-xs font-extrabold"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {grade}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 목록 화면                                                           */
/* ------------------------------------------------------------------ */

function MembersScreen() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('no');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterDept, setFilterDept] = useState('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const [view, setView] = useState<'list' | 'detail' | 'edit' | 'add'>('list');
  const [activeId, setActiveId] = useState<string | null>(null);

  const listFilters = {
    q: query.trim() || undefined,
    department: filterDept === 'all' ? undefined : filterDept,
    grade: filterGrade === 'all' ? undefined : filterGrade,
    sort: sortKey,
    order: (sortAsc ? 'asc' : 'desc') as 'asc' | 'desc',
  };

  const listQuery = useQuery(
    listMembersApiV1MembersGetOptions({
      query: { ...listFilters, page, page_size: PER_PAGE },
    })
  );
  const statsQuery = useQuery(memberStatsApiV1MembersStatsGetOptions());

  const grades = useGrades();
  const stats = statsQuery.data;
  const depts = stats?.departments ?? [];
  const rows = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data?.total_pages ?? 1;
  const hasFilter = query !== '' || filterDept !== 'all' || filterGrade !== 'all';

  function refresh() {
    queryClient.invalidateQueries();
  }

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc((v) => !v);
    else {
      setSortKey(k);
      setSortAsc(true);
    }
    setPage(1);
  }

  function openDetail(id: string) {
    setActiveId(id);
    setView('detail');
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { data } = await exportMembersApiV1MembersExportGet({
        query: listFilters,
        parseAs: 'blob',
        throwOnError: true,
      });
      const url = URL.createObjectURL(data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'members.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('내보내기에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  }

  if (view === 'detail' && activeId) {
    return (
      <MemberDetail
        memberId={activeId}
        onBack={() => setView('list')}
        onEdit={() => setView('edit')}
        onDeleted={() => {
          refresh();
          setPage(1);
          setView('list');
        }}
      />
    );
  }

  if (view === 'edit' && activeId) {
    return (
      <MemberEdit
        memberId={activeId}
        depts={depts}
        onCancel={() => setView('detail')}
        onSaved={() => {
          refresh();
          setView('detail');
        }}
      />
    );
  }

  if (view === 'add') {
    return (
      <MemberAdd
        depts={depts}
        onCancel={() => setView('list')}
        onCreated={() => {
          refresh();
          setPage(1);
          setView('list');
        }}
      />
    );
  }

  return (
    <div>
      {/* Summary strip */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_2fr]">
        <SummaryCard>
          <div className="text-[13px] font-bold text-[#8A93A6]">전체 구성원</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="font-mono text-[32px] font-extrabold tracking-[-0.03em] text-[#1B2435]">
              {stats?.total ?? '—'}
            </span>
            <span className="text-[15px] font-semibold text-[#8A93A6]">명</span>
          </div>
          <div className="mt-0.5 text-[13px] text-[#8A93A6]">
            총 {stats?.department_count ?? 0}개 부서
          </div>
        </SummaryCard>

        <SummaryCard>
          <div className="text-[13px] font-bold text-[#8A93A6]">이번 달 신규</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="font-mono text-[32px] font-extrabold tracking-[-0.03em] text-[#1B2435]">
              {stats?.new_this_month ?? '—'}
            </span>
            <span className="text-[15px] font-semibold text-[#8A93A6]">명</span>
          </div>
          <div className="mt-0.5 text-[13px] font-semibold text-[#8A93A6]">최근 등록 기준</div>
        </SummaryCard>

        <SummaryCard>
          <div className="text-[13px] font-bold text-[#8A93A6]">등급 분포</div>
          <div className="mt-2.5 flex items-center gap-5">
            {grades.map((g) => {
              const cnt = stats?.grade_distribution?.[g.name] ?? 0;
              const denom = stats?.total || 1;
              const pct = Math.round((cnt / denom) * 100);
              return (
                <div key={g.id} className="flex flex-col items-center gap-1.5">
                  <span
                    className="font-mono text-2xl font-extrabold leading-none"
                    style={{ color: g.color }}
                  >
                    {cnt}
                  </span>
                  <span
                    className="rounded-[5px] border px-2 py-0.5 text-[11.5px] font-extrabold"
                    style={{ background: g.bg, color: g.color, borderColor: g.border }}
                  >
                    {g.name}
                  </span>
                  <span className="text-[11.5px] font-semibold text-[#8A93A6]">{pct}%</span>
                </div>
              );
            })}
            <div className="ml-2 flex-1">
              {grades.map((g) => {
                const cnt = stats?.grade_distribution?.[g.name] ?? 0;
                const denom = stats?.total || 1;
                const pct = Math.round((cnt / denom) * 100);
                return (
                  <div key={g.id} className="mb-[5px] last:mb-0">
                    <div className="mb-[3px] flex items-center justify-between">
                      <span className="text-[11px] font-bold" style={{ color: g.color }}>
                        {g.name}
                      </span>
                      <span className="font-mono text-[11px] text-[#8A93A6]">{pct}%</span>
                    </div>
                    <div className="h-[5px] overflow-hidden rounded-full bg-[#EEF0F3]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: g.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SummaryCard>
      </div>

      {/* Main table panel */}
      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-[22px] py-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8A93A6]" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="이름, 사번, 소속, 이메일 검색..."
              className="h-[38px] w-full rounded-lg border border-border bg-[#F8F9FB] pl-9 pr-3 text-[13.5px] text-[#1B2435] outline-none transition-colors focus:border-primary focus:bg-white"
            />
          </div>

          <div className="relative flex-shrink-0">
            <select
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setPage(1);
              }}
              className="h-[38px] min-w-[110px] cursor-pointer appearance-none rounded-lg border border-border bg-white pl-3 pr-8 text-[13.5px] text-[#3D4A5C] outline-none"
            >
              <option value="all">전체 소속</option>
              {depts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-[#8A93A6]" />
          </div>

          <div className="flex flex-shrink-0 gap-[5px]">
            {['all', ...grades.map((g) => g.name)].map((g) => {
              const active = filterGrade === g;
              const gs = g === 'all' ? null : gradeStyleOf(grades, g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setFilterGrade(g);
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border px-[13px] text-[13px] font-bold transition-colors data-[plain=true]:border-border data-[plain=true]:bg-white data-[plain=true]:text-[#8A93A6] data-[plain=true]:hover:border-[#D4D8DF]"
                  data-plain={!active}
                  style={
                    active && gs
                      ? { background: gs.bg, color: gs.color, borderColor: gs.border }
                      : active
                        ? {
                            background: 'var(--om-blue-bg, #E8F0FF)',
                            color: '#0066FF',
                            borderColor: '#0066FF',
                          }
                        : undefined
                  }
                >
                  {g === 'all' ? '전체' : g}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex flex-shrink-0 gap-2">
            <Button
              variant="outline"
              className="h-[38px] gap-1.5 text-[13px] [&_svg]:size-[15px]"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download />
              내보내기
            </Button>
            <Button
              className="h-[38px] gap-1.5 text-[13.5px] shadow-[0_2px_10px_rgba(0,102,255,0.28)] [&_svg]:size-[15px]"
              onClick={() => setView('add')}
            >
              <Plus />
              구성원 추가
            </Button>
          </div>
        </div>

        {/* Count row */}
        <div className="flex items-center gap-2 border-b border-[#F0F1F3] px-[22px] py-[9px]">
          <span className="text-[13px] font-semibold text-[#8A93A6]">
            총 <strong className="font-mono text-[#1B2435]">{total}</strong>명
          </span>
          {hasFilter && (
            <span className="rounded-full bg-om-blue-bg px-[9px] py-0.5 text-[11.5px] font-bold text-primary">
              필터 적용 중
            </span>
          )}
          <span className="ml-auto font-mono text-[12.5px] font-semibold text-[#8A93A6]">
            {page} / {totalPages} 페이지
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <SortableTh
                  label="사번"
                  col="no"
                  sortKey={sortKey}
                  sortAsc={sortAsc}
                  onSort={toggleSort}
                />
                <SortableTh
                  label="이름"
                  col="name"
                  sortKey={sortKey}
                  sortAsc={sortAsc}
                  onSort={toggleSort}
                />
                <SortableTh
                  label="소속"
                  col="dept"
                  sortKey={sortKey}
                  sortAsc={sortAsc}
                  onSort={toggleSort}
                />
                <SortableTh
                  label="직급"
                  col="rank"
                  sortKey={sortKey}
                  sortAsc={sortAsc}
                  onSort={toggleSort}
                />
                <SortableTh
                  label="등급"
                  col="grade"
                  sortKey={sortKey}
                  sortAsc={sortAsc}
                  onSort={toggleSort}
                  center
                />
                <th className="whitespace-nowrap border-b border-border px-3 pb-3 pt-2.5 text-left text-[12.5px] font-bold text-[#8A93A6]">
                  연락처
                </th>
                <th className="whitespace-nowrap border-b border-border px-3 pb-3 pt-2.5 text-left text-[12.5px] font-bold text-[#8A93A6]">
                  이메일
                </th>
                <th className="w-12 border-b border-border" />
              </tr>
            </thead>
            <tbody>
              {listQuery.isError ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[14px] text-[#E5484D]">
                    목록을 불러오지 못했습니다.
                  </td>
                </tr>
              ) : listQuery.isPending ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[14px] text-[#8A93A6]">
                    불러오는 중…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3.5 text-[#8A93A6]">
                      <SearchX className="size-10 opacity-30" />
                      <div>
                        <div className="mb-1 text-[15px] font-bold">검색 결과가 없습니다</div>
                        <div className="text-[13px]">검색어나 필터 조건을 변경해 보세요</div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => openDetail(m.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetail(m.id);
                      }
                    }}
                    tabIndex={0}
                    className="cursor-pointer transition-colors hover:bg-[#F8F9FB]"
                  >
                    <td className="whitespace-nowrap border-b border-[#F0F1F3] px-3 py-[13px] font-mono text-[12.5px] text-[#8A93A6]">
                      {m.employee_no}
                    </td>
                    <td className="border-b border-[#F0F1F3] px-3 py-[13px]">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.name} />
                        <span className="whitespace-nowrap text-sm font-bold text-[#1B2435]">
                          {m.name}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap border-b border-[#F0F1F3] px-3 py-[13px] text-sm text-[#3D4A5C]">
                      {m.department}
                    </td>
                    <td className="whitespace-nowrap border-b border-[#F0F1F3] px-3 py-[13px]">
                      <span className="text-[13.5px] font-semibold text-[#3D4A5C]">{m.rank}</span>
                    </td>
                    <td className="border-b border-[#F0F1F3] px-3 py-[13px] text-center">
                      <GradeTag grade={m.grade} />
                    </td>
                    <td className="whitespace-nowrap border-b border-[#F0F1F3] px-3 py-[13px] font-mono text-[13px] text-[#3D4A5C]">
                      {m.phone}
                    </td>
                    <td className="whitespace-nowrap border-b border-[#F0F1F3] px-3 py-[13px] text-[13px] text-[#8A93A6]">
                      {m.email}
                    </td>
                    <td className="border-b border-[#F0F1F3] px-3 py-[13px] text-center">
                      <span className="inline-flex size-[30px] items-center justify-center rounded-lg text-[#8A93A6] [&_svg]:size-4">
                        <ChevronRight />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-[5px] border-t border-[#F0F1F3] px-[22px] py-3.5">
            <PageBtn disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="size-4" />
            </PageBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PageBtn key={p} active={p === page} onClick={() => setPage(p)}>
                {p}
              </PageBtn>
            ))}
            <PageBtn disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="size-4" />
            </PageBtn>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-white px-[22px] py-5 shadow-sm">
      {children}
    </div>
  );
}

function SortableTh({
  label,
  col,
  sortKey,
  sortAsc,
  onSort,
  center,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
  center?: boolean;
}) {
  const active = sortKey === col;
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-border px-3 pb-3 pt-2.5 text-[12.5px] font-bold',
        center ? 'text-center' : 'text-left',
        active ? 'text-[#1B2435]' : 'text-[#8A93A6]'
      )}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          'inline-flex cursor-pointer select-none items-center gap-[5px] font-bold text-inherit',
          center && 'justify-center'
        )}
      >
        {label}
        {active ? (
          sortAsc ? (
            <ChevronDown className="size-[11px] rotate-180 text-primary" />
          ) : (
            <ChevronDown className="size-[11px] text-primary" />
          )
        ) : (
          <ChevronsUpDown className="size-[11px] opacity-25" />
        )}
      </button>
    </th>
  );
}

function PageBtn({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg border text-[13px] font-bold transition-colors',
        active
          ? 'border-primary bg-primary text-white'
          : disabled
            ? 'cursor-default border-border bg-white text-[#C4CAD3] opacity-40'
            : 'border-border bg-white text-[#3D4A5C] hover:bg-[#F8F9FB]'
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 상세 화면                                                           */
/* ------------------------------------------------------------------ */

function MemberDetail({
  memberId,
  onBack,
  onEdit,
  onDeleted,
}: {
  memberId: string;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const detailQuery = useQuery(
    getMemberApiV1MembersMemberIdGetOptions({ path: { member_id: memberId } })
  );
  const deleteMut = useMutation({
    ...deleteMemberApiV1MembersMemberIdDeleteMutation(),
    onSuccess: () => {
      toast.success('구성원이 삭제되었습니다.');
      onDeleted();
    },
    onError: () => toast.error('삭제에 실패했습니다.'),
  });

  const member = detailQuery.data;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Button
          variant="outline"
          className="h-9 gap-1.5 text-[13px] [&_svg]:size-4"
          onClick={onBack}
        >
          <ArrowLeft />
          목록
        </Button>
        <span className="text-[15px] font-bold text-[#1B2435]">구성원 상세</span>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            className="h-9 gap-1.5 text-[13px] text-[#E5484D] [&_svg]:size-4"
            disabled={!member || deleteMut.isPending}
            onClick={() => {
              if (member && window.confirm(`${member.name} 님을 삭제하시겠습니까?`)) {
                deleteMut.mutate({ path: { member_id: memberId } });
              }
            }}
          >
            <Trash2 />
            삭제
          </Button>
          <Button
            className="h-9 gap-1.5 text-[13px] [&_svg]:size-4"
            disabled={!member}
            onClick={onEdit}
          >
            <Pencil />
            편집
          </Button>
        </div>
      </div>

      {detailQuery.isPending ? (
        <div className="rounded-xl border border-border bg-white py-16 text-center text-[14px] text-[#8A93A6] shadow-sm">
          불러오는 중…
        </div>
      ) : !member ? (
        <div className="rounded-xl border border-border bg-white py-16 text-center text-[14px] text-[#E5484D] shadow-sm">
          구성원을 불러오지 못했습니다.
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-[#F0F1F3] px-7 py-6">
            <Avatar name={member.name} size={64} />
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[22px] font-extrabold tracking-[-0.02em] text-[#1B2435]">
                  {member.name}
                </span>
                <GradeTag grade={member.grade} />
              </div>
              <div className="mt-1 text-sm text-[#69748A]">
                {member.department} · {member.rank}
              </div>
              <div className="mt-0.5 font-mono text-[13px] text-[#8A93A6]">
                {member.employee_no}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2">
            <Field label="사번" value={member.employee_no} mono />
            <Field label="이름" value={member.name} />
            <Field label="소속" value={member.department} />
            <Field label="직급" value={member.rank} />
            <Field label="등급" node={<GradeTag grade={member.grade} />} />
            <Field label="연락처" value={member.phone} mono />
            <Field label="이메일" value={member.email} colSpan />
          </dl>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  node,
  mono,
  colSpan,
}: {
  label: string;
  value?: string;
  node?: React.ReactNode;
  mono?: boolean;
  colSpan?: boolean;
}) {
  return (
    <div className={cn('border-b border-[#F0F1F3] px-7 py-[18px]', colSpan && 'sm:col-span-2')}>
      <dt className="mb-1.5 text-[12.5px] font-bold text-[#8A93A6]">{label}</dt>
      <dd className={cn('text-[14.5px] text-[#1B2435]', mono && 'font-mono')}>{node ?? value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 편집 화면                                                           */
/* ------------------------------------------------------------------ */

function MemberEdit({
  memberId,
  depts,
  onCancel,
  onSaved,
}: {
  memberId: string;
  depts: string[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const detailQuery = useQuery(
    getMemberApiV1MembersMemberIdGetOptions({ path: { member_id: memberId } })
  );
  const updateMut = useMutation({
    ...updateMemberApiV1MembersMemberIdPatchMutation(),
    onSuccess: (updated) => {
      toast.success(`${updated.name} 님의 정보가 저장되었습니다.`);
      onSaved();
    },
    onError: () => toast.error('저장에 실패했습니다.'),
  });

  if (detailQuery.isPending || !detailQuery.data) {
    return (
      <div className="rounded-xl border border-border bg-white py-16 text-center text-[14px] text-[#8A93A6] shadow-sm">
        불러오는 중…
      </div>
    );
  }

  return (
    <MemberForm
      title="구성원 편집"
      initial={detailQuery.data}
      depts={depts}
      submitting={updateMut.isPending}
      onCancel={onCancel}
      onSubmit={(body) => updateMut.mutate({ path: { member_id: memberId }, body })}
    />
  );
}

/* ------------------------------------------------------------------ */
/* 추가 화면                                                           */
/* ------------------------------------------------------------------ */

function MemberAdd({
  depts,
  onCancel,
  onCreated,
}: {
  depts: string[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const createMut = useMutation({
    ...createMemberApiV1MembersPostMutation(),
    onSuccess: (created) => {
      toast.success(`${created.name} 님이 추가되었습니다. (사번 ${created.employee_no})`);
      onCreated();
    },
    onError: () => toast.error('구성원 추가에 실패했습니다.'),
  });

  return (
    <MemberForm
      title="구성원 추가"
      depts={depts}
      submitting={createMut.isPending}
      onCancel={onCancel}
      onSubmit={(body) => createMut.mutate({ body })}
    />
  );
}

/* 추가/편집 공용 폼 — 사번은 서버 자동 생성(입력 없음) */
function MemberForm({
  title,
  initial,
  depts,
  submitting,
  onCancel,
  onSubmit,
}: {
  title: string;
  initial?: Member;
  depts: string[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (body: MemberCreate) => void;
}) {
  const grades = useGrades();
  const deptOptions = depts.length > 0 ? depts : initial ? [initial.department] : [];
  const [form, setForm] = useState<MemberCreate>({
    name: initial?.name ?? '',
    department: initial?.department ?? deptOptions[0] ?? '',
    rank: initial?.rank ?? '',
    grade: initial?.grade ?? '중급',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
  });

  function update<K extends keyof MemberCreate>(key: K, val: MemberCreate[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Button
          variant="outline"
          className="h-9 gap-1.5 text-[13px] [&_svg]:size-4"
          onClick={onCancel}
        >
          <ArrowLeft />
          취소
        </Button>
        <span className="text-[15px] font-bold text-[#1B2435]">{title}</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
        className="overflow-hidden rounded-xl border border-border bg-white shadow-sm"
      >
        <div className="flex items-center gap-4 border-b border-[#F0F1F3] px-7 py-6">
          <Avatar name={form.name || '?'} size={64} />
          <div className="font-mono text-[13px] text-[#8A93A6]">
            {initial?.employee_no ?? '사번 자동 생성'}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-7 gap-y-5 px-7 py-6 sm:grid-cols-2">
          <EditField label="이름">
            <input
              value={form.name}
              required
              onChange={(e) => update('name', e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-[#1B2435] outline-none transition-colors focus:border-primary"
            />
          </EditField>
          <EditField label="소속">
            {deptOptions.length > 0 ? (
              <div className="relative">
                <select
                  value={form.department}
                  onChange={(e) => update('department', e.target.value)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-border bg-white px-3 pr-8 text-sm text-[#1B2435] outline-none transition-colors focus:border-primary"
                >
                  {deptOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#8A93A6]" />
              </div>
            ) : (
              <input
                value={form.department}
                required
                placeholder="부서명"
                onChange={(e) => update('department', e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-[#1B2435] outline-none transition-colors focus:border-primary"
              />
            )}
          </EditField>
          <EditField label="직급">
            <input
              value={form.rank}
              required
              onChange={(e) => update('rank', e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-[#1B2435] outline-none transition-colors focus:border-primary"
            />
          </EditField>
          <EditField label="등급">
            <div className="relative">
              <select
                value={form.grade}
                onChange={(e) => update('grade', e.target.value)}
                className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-border bg-white px-3 pr-8 text-sm text-[#1B2435] outline-none transition-colors focus:border-primary"
              >
                {grades.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#8A93A6]" />
            </div>
          </EditField>
          <EditField label="연락처">
            <input
              value={form.phone}
              required
              onChange={(e) => update('phone', e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 font-mono text-sm text-[#1B2435] outline-none transition-colors focus:border-primary"
            />
          </EditField>
          <div className="sm:col-span-2">
            <EditField label="이메일">
              <input
                type="email"
                value={form.email}
                required
                onChange={(e) => update('email', e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-[#1B2435] outline-none transition-colors focus:border-primary"
              />
            </EditField>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#F0F1F3] px-7 py-4">
          <Button type="button" variant="outline" className="h-10" onClick={onCancel}>
            취소
          </Button>
          <Button type="submit" className="h-10" disabled={submitting}>
            저장
          </Button>
        </div>
      </form>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-bold text-[#69748A]">{label}</div>
      {children}
    </div>
  );
}

export const membersScreens: ScreenModule = {
  'members-list': {
    title: '구성원 목록',
    sub: '전체 구성원 현황을 확인하고 관리합니다',
    Component: MembersScreen,
  },
};
