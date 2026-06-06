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
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ScreenModule } from './types';

/* ============================================================
   OfficeMate — 구성원 관리 (members.js 이식)
   ============================================================ */

interface Member {
  no: string;
  name: string;
  dept: string;
  rank: string;
  grade: Grade;
  phone: string;
  email: string;
}

type Grade = '특급' | '고급' | '중급' | '초급';

const MEMBERS_DATA: Member[] = [
  {
    no: 'EMP-001',
    name: '김지훈',
    dept: '개발팀',
    rank: '대리',
    grade: '고급',
    phone: '010-1234-5678',
    email: 'jihun.kim@officemate.co.kr',
  },
  {
    no: 'EMP-002',
    name: '이수연',
    dept: '기획팀',
    rank: '과장',
    grade: '특급',
    phone: '010-2345-6789',
    email: 'suyeon.lee@officemate.co.kr',
  },
  {
    no: 'EMP-003',
    name: '박민준',
    dept: '영업팀',
    rank: '사원',
    grade: '중급',
    phone: '010-3456-7890',
    email: 'minjun.park@officemate.co.kr',
  },
  {
    no: 'EMP-004',
    name: '최유진',
    dept: '인사팀',
    rank: '차장',
    grade: '고급',
    phone: '010-4567-8901',
    email: 'yujin.choi@officemate.co.kr',
  },
  {
    no: 'EMP-005',
    name: '정다은',
    dept: '개발팀',
    rank: '과장',
    grade: '특급',
    phone: '010-5678-9012',
    email: 'daeun.jung@officemate.co.kr',
  },
  {
    no: 'EMP-006',
    name: '강태양',
    dept: '디자인팀',
    rank: '대리',
    grade: '중급',
    phone: '010-6789-0123',
    email: 'taeyang.kang@officemate.co.kr',
  },
  {
    no: 'EMP-007',
    name: '윤서준',
    dept: '개발팀',
    rank: '부장',
    grade: '특급',
    phone: '010-7890-1234',
    email: 'seojun.yoon@officemate.co.kr',
  },
  {
    no: 'EMP-008',
    name: '임나영',
    dept: '마케팅팀',
    rank: '사원',
    grade: '초급',
    phone: '010-8901-2345',
    email: 'nayoung.lim@officemate.co.kr',
  },
  {
    no: 'EMP-009',
    name: '홍준서',
    dept: '기획팀',
    rank: '주임',
    grade: '중급',
    phone: '010-9012-3456',
    email: 'junseo.hong@officemate.co.kr',
  },
  {
    no: 'EMP-010',
    name: '오지은',
    dept: '인사팀',
    rank: '팀장',
    grade: '고급',
    phone: '010-0123-4567',
    email: 'jieun.oh@officemate.co.kr',
  },
  {
    no: 'EMP-011',
    name: '신현우',
    dept: '영업팀',
    rank: '과장',
    grade: '고급',
    phone: '010-1234-5670',
    email: 'hyunwoo.shin@officemate.co.kr',
  },
  {
    no: 'EMP-012',
    name: '장미래',
    dept: '디자인팀',
    rank: '팀장',
    grade: '특급',
    phone: '010-2345-6780',
    email: 'mirae.jang@officemate.co.kr',
  },
  {
    no: 'EMP-013',
    name: '노지훈',
    dept: '개발팀',
    rank: '사원',
    grade: '초급',
    phone: '010-3456-7891',
    email: 'jihun.noh@officemate.co.kr',
  },
  {
    no: 'EMP-014',
    name: '허수아',
    dept: '마케팅팀',
    rank: '대리',
    grade: '고급',
    phone: '010-4567-8902',
    email: 'sua.heo@officemate.co.kr',
  },
  {
    no: 'EMP-015',
    name: '조하늘',
    dept: '기획팀',
    rank: '차장',
    grade: '중급',
    phone: '010-5678-9013',
    email: 'haneul.jo@officemate.co.kr',
  },
  {
    no: 'EMP-016',
    name: '권태오',
    dept: '영업팀',
    rank: '부장',
    grade: '특급',
    phone: '010-6789-0124',
    email: 'taeo.kwon@officemate.co.kr',
  },
  {
    no: 'EMP-017',
    name: '서보람',
    dept: '개발팀',
    rank: '대리',
    grade: '중급',
    phone: '010-7890-1235',
    email: 'boram.seo@officemate.co.kr',
  },
  {
    no: 'EMP-018',
    name: '문가영',
    dept: '인사팀',
    rank: '주임',
    grade: '고급',
    phone: '010-8901-2346',
    email: 'gayoung.moon@officemate.co.kr',
  },
  {
    no: 'EMP-019',
    name: '배성준',
    dept: '마케팅팀',
    rank: '팀장',
    grade: '고급',
    phone: '010-9012-3457',
    email: 'sungjun.bae@officemate.co.kr',
  },
  {
    no: 'EMP-020',
    name: '유은서',
    dept: '디자인팀',
    rank: '사원',
    grade: '중급',
    phone: '010-0123-4568',
    email: 'eunseo.yu@officemate.co.kr',
  },
  {
    no: 'EMP-021',
    name: '황도윤',
    dept: '개발팀',
    rank: '주임',
    grade: '고급',
    phone: '010-1111-2222',
    email: 'doyun.hwang@officemate.co.kr',
  },
  {
    no: 'EMP-022',
    name: '송채원',
    dept: '기획팀',
    rank: '사원',
    grade: '중급',
    phone: '010-3333-4444',
    email: 'chaewon.song@officemate.co.kr',
  },
  {
    no: 'EMP-023',
    name: '한지민',
    dept: '영업팀',
    rank: '대리',
    grade: '고급',
    phone: '010-5555-6666',
    email: 'jimin.han@officemate.co.kr',
  },
  {
    no: 'EMP-024',
    name: '전현서',
    dept: '디자인팀',
    rank: '과장',
    grade: '특급',
    phone: '010-7777-8888',
    email: 'hyunseo.jun@officemate.co.kr',
  },
  {
    no: 'EMP-025',
    name: '류아인',
    dept: '마케팅팀',
    rank: '주임',
    grade: '초급',
    phone: '010-9999-0000',
    email: 'ain.ryu@officemate.co.kr',
  },
];

const GRADES: Grade[] = ['특급', '고급', '중급', '초급'];

/* 등급 배지 색상 (GRADE_CFG → om-* 토큰 매핑) */
const GRADE_CFG: Record<Grade, { tag: string; chip: string; text: string; bar: string }> = {
  특급: {
    tag: 'bg-om-blue-bg text-primary border border-[#BBD4FF]',
    chip: 'border-primary bg-om-blue-bg text-primary',
    text: 'text-primary',
    bar: 'bg-primary',
  },
  고급: {
    tag: 'bg-om-green-bg text-om-green border border-[#b8eecb]',
    chip: 'border-om-green bg-om-green-bg text-om-green',
    text: 'text-om-green',
    bar: 'bg-om-green',
  },
  중급: {
    tag: 'bg-om-orange-bg text-om-orange border border-[#ffd9a0]',
    chip: 'border-om-orange bg-om-orange-bg text-om-orange',
    text: 'text-om-orange',
    bar: 'bg-om-orange',
  },
  초급: {
    tag: 'bg-[#F4F5F7] text-[#8A93A6] border border-border',
    chip: 'border-[#8A93A6] bg-[#F4F5F7] text-[#69748A]',
    text: 'text-[#69748A]',
    bar: 'bg-[#8A93A6]',
  },
};

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

const PER_PAGE = 10;
type SortKey = 'no' | 'name' | 'dept' | 'rank' | 'grade';

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

function GradeTag({ grade }: { grade: Grade }) {
  return (
    <span
      className={cn(
        'inline-flex w-[54px] items-center justify-center rounded-md py-1 text-xs font-extrabold',
        GRADE_CFG[grade].tag
      )}
    >
      {grade}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 목록 화면                                                           */
/* ------------------------------------------------------------------ */

function MembersScreen() {
  const [members, setMembers] = useState<Member[]>(MEMBERS_DATA);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('no');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterDept, setFilterDept] = useState('all');
  const [filterGrade, setFilterGrade] = useState<'all' | Grade>('all');
  const [page, setPage] = useState(1);

  const [view, setView] = useState<'list' | 'detail' | 'edit'>('list');
  const [activeNo, setActiveNo] = useState<string | null>(null);

  const depts = useMemo(
    () => [...new Set(members.map((m) => m.dept))].sort((a, b) => a.localeCompare(b, 'ko')),
    [members]
  );

  const dist = useMemo(() => {
    const cnt: Record<Grade, number> = { 특급: 0, 고급: 0, 중급: 0, 초급: 0 };
    for (const m of members) cnt[m.grade]++;
    return cnt;
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => {
        if (filterDept !== 'all' && m.dept !== filterDept) return false;
        if (filterGrade !== 'all' && m.grade !== filterGrade) return false;
        if (q) {
          return (
            m.name.includes(q) ||
            m.no.toLowerCase().includes(q) ||
            m.dept.includes(q) ||
            m.rank.includes(q) ||
            m.email.toLowerCase().includes(q) ||
            m.phone.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const va = String(a[sortKey] ?? '');
        const vb = String(b[sortKey] ?? '');
        return sortAsc ? va.localeCompare(vb, 'ko') : vb.localeCompare(va, 'ko');
      });
  }, [members, query, filterDept, filterGrade, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const hasFilter = query !== '' || filterDept !== 'all' || filterGrade !== 'all';

  const activeMember = members.find((m) => m.no === activeNo) ?? null;

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc((v) => !v);
    else {
      setSortKey(k);
      setSortAsc(true);
    }
  }

  function openDetail(no: string) {
    setActiveNo(no);
    setView('detail');
  }

  function handleSave(updated: Member) {
    setMembers((prev) => prev.map((m) => (m.no === updated.no ? updated : m)));
    setView('detail');
    toast.success(`${updated.name} 님의 정보가 저장되었습니다.`);
  }

  if (view === 'detail' && activeMember) {
    return (
      <MemberDetail
        member={activeMember}
        onBack={() => setView('list')}
        onEdit={() => setView('edit')}
      />
    );
  }

  if (view === 'edit' && activeMember) {
    return (
      <MemberEdit
        member={activeMember}
        depts={depts}
        onCancel={() => setView('detail')}
        onSave={handleSave}
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
              {members.length}
            </span>
            <span className="text-[15px] font-semibold text-[#8A93A6]">명</span>
          </div>
          <div className="mt-0.5 text-[13px] text-[#8A93A6]">총 {depts.length}개 부서</div>
        </SummaryCard>

        <SummaryCard>
          <div className="text-[13px] font-bold text-[#8A93A6]">이번 달 신규</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="font-mono text-[32px] font-extrabold tracking-[-0.03em] text-[#1B2435]">
              3
            </span>
            <span className="text-[15px] font-semibold text-[#8A93A6]">명</span>
          </div>
          <div className="mt-0.5 text-[13px] font-semibold text-om-green">↑ 지난달 대비 +1명</div>
        </SummaryCard>

        <SummaryCard>
          <div className="text-[13px] font-bold text-[#8A93A6]">등급 분포</div>
          <div className="mt-2.5 flex items-center gap-5">
            {GRADES.map((g) => {
              const cnt = dist[g];
              const pct = Math.round((cnt / members.length) * 100);
              return (
                <div key={g} className="flex flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      'font-mono text-2xl font-extrabold leading-none',
                      GRADE_CFG[g].text
                    )}
                  >
                    {cnt}
                  </span>
                  <span
                    className={cn(
                      'rounded-[5px] px-2 py-0.5 text-[11.5px] font-extrabold',
                      GRADE_CFG[g].tag
                    )}
                  >
                    {g}
                  </span>
                  <span className="text-[11.5px] font-semibold text-[#8A93A6]">{pct}%</span>
                </div>
              );
            })}
            <div className="ml-2 flex-1">
              {GRADES.map((g) => {
                const pct = Math.round((dist[g] / members.length) * 100);
                return (
                  <div key={g} className="mb-[5px] last:mb-0">
                    <div className="mb-[3px] flex items-center justify-between">
                      <span className={cn('text-[11px] font-bold', GRADE_CFG[g].text)}>{g}</span>
                      <span className="font-mono text-[11px] text-[#8A93A6]">{pct}%</span>
                    </div>
                    <div className="h-[5px] overflow-hidden rounded-full bg-[#EEF0F3]">
                      <div
                        className={cn('h-full rounded-full', GRADE_CFG[g].bar)}
                        style={{ width: `${pct}%` }}
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
            {(['all', ...GRADES] as const).map((g) => {
              const active = filterGrade === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setFilterGrade(g);
                    setPage(1);
                  }}
                  className={cn(
                    'h-9 rounded-lg border px-[13px] text-[13px] font-bold transition-colors',
                    g !== 'all' && active
                      ? GRADE_CFG[g].chip
                      : active
                        ? 'border-primary bg-om-blue-bg text-primary'
                        : 'border-border bg-white text-[#8A93A6] hover:border-[#D4D8DF]'
                  )}
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
              onClick={() => toast('내보내기 기능은 준비 중입니다.')}
            >
              <Download />
              내보내기
            </Button>
            <Button
              className="h-[38px] gap-1.5 text-[13.5px] shadow-[0_2px_10px_rgba(0,102,255,0.28)] [&_svg]:size-[15px]"
              onClick={() => toast('구성원 추가 기능은 준비 중입니다.')}
            >
              <Plus />
              구성원 추가
            </Button>
          </div>
        </div>

        {/* Count row */}
        <div className="flex items-center gap-2 border-b border-[#F0F1F3] px-[22px] py-[9px]">
          <span className="text-[13px] font-semibold text-[#8A93A6]">
            총 <strong className="font-mono text-[#1B2435]">{filtered.length}</strong>명
            {filtered.length !== members.length && (
              <span className="text-[12.5px] text-[#8A93A6]"> (전체 {members.length}명)</span>
            )}
          </span>
          {hasFilter && (
            <span className="rounded-full bg-om-blue-bg px-[9px] py-0.5 text-[11.5px] font-bold text-primary">
              필터 적용 중
            </span>
          )}
          <span className="ml-auto font-mono text-[12.5px] font-semibold text-[#8A93A6]">
            {safePage} / {totalPages} 페이지
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
              {rows.length === 0 ? (
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
                    key={m.no}
                    onClick={() => openDetail(m.no)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetail(m.no);
                      }
                    }}
                    tabIndex={0}
                    className="cursor-pointer transition-colors hover:bg-[#F8F9FB]"
                  >
                    <td className="whitespace-nowrap border-b border-[#F0F1F3] px-3 py-[13px] font-mono text-[12.5px] text-[#8A93A6]">
                      {m.no}
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
                      {m.dept}
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
            <PageBtn disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft className="size-4" />
            </PageBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PageBtn key={p} active={p === safePage} onClick={() => setPage(p)}>
                {p}
              </PageBtn>
            ))}
            <PageBtn disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>
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
  member,
  onBack,
  onEdit,
}: {
  member: Member;
  onBack: () => void;
  onEdit: () => void;
}) {
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
        <Button className="ml-auto h-9 gap-1.5 text-[13px] [&_svg]:size-4" onClick={onEdit}>
          <Pencil />
          편집
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        {/* Profile header */}
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
              {member.dept} · {member.rank}
            </div>
            <div className="mt-0.5 font-mono text-[13px] text-[#8A93A6]">{member.no}</div>
          </div>
        </div>

        {/* Fields */}
        <dl className="grid grid-cols-1 sm:grid-cols-2">
          <Field label="사번" value={member.no} mono />
          <Field label="이름" value={member.name} />
          <Field label="소속" value={member.dept} />
          <Field label="직급" value={member.rank} />
          <Field label="등급" node={<GradeTag grade={member.grade} />} />
          <Field label="연락처" value={member.phone} mono />
          <Field label="이메일" value={member.email} colSpan />
        </dl>
      </section>
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
  member,
  depts,
  onCancel,
  onSave,
}: {
  member: Member;
  depts: string[];
  onCancel: () => void;
  onSave: (m: Member) => void;
}) {
  const [form, setForm] = useState<Member>(member);

  function update<K extends keyof Member>(key: K, val: Member[K]) {
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
        <span className="text-[15px] font-bold text-[#1B2435]">구성원 편집</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
        className="overflow-hidden rounded-xl border border-border bg-white shadow-sm"
      >
        <div className="flex items-center gap-4 border-b border-[#F0F1F3] px-7 py-6">
          <Avatar name={form.name} size={64} />
          <div className="font-mono text-[13px] text-[#8A93A6]">{form.no}</div>
        </div>

        <div className="grid grid-cols-1 gap-x-7 gap-y-5 px-7 py-6 sm:grid-cols-2">
          <EditField label="사번">
            <input
              value={form.no}
              disabled
              className="h-10 w-full cursor-not-allowed rounded-lg border border-border bg-[#F4F5F7] px-3 font-mono text-sm text-[#8A93A6] outline-none"
            />
          </EditField>
          <EditField label="이름">
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-[#1B2435] outline-none transition-colors focus:border-primary"
            />
          </EditField>
          <EditField label="소속">
            <div className="relative">
              <select
                value={form.dept}
                onChange={(e) => update('dept', e.target.value)}
                className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-border bg-white px-3 pr-8 text-sm text-[#1B2435] outline-none transition-colors focus:border-primary"
              >
                {depts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#8A93A6]" />
            </div>
          </EditField>
          <EditField label="직급">
            <input
              value={form.rank}
              onChange={(e) => update('rank', e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-[#1B2435] outline-none transition-colors focus:border-primary"
            />
          </EditField>
          <EditField label="등급">
            <div className="relative">
              <select
                value={form.grade}
                onChange={(e) => update('grade', e.target.value as Grade)}
                className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-border bg-white px-3 pr-8 text-sm text-[#1B2435] outline-none transition-colors focus:border-primary"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#8A93A6]" />
            </div>
          </EditField>
          <EditField label="연락처">
            <input
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 font-mono text-sm text-[#1B2435] outline-none transition-colors focus:border-primary"
            />
          </EditField>
          <div className="sm:col-span-2">
            <EditField label="이메일">
              <input
                type="email"
                value={form.email}
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
          <Button type="submit" className="h-10">
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
