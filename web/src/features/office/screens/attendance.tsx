import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ScreenModule } from './types';

/* ============================================================
   OfficeMate — 근무/휴가(근태) 화면
   - att-my       내 근태 현황/신청 (현황 탭 + 신청내역 탭 + 신청 모달)
   - att-work     근무/휴가 (월 캘린더)
   - att-team     팀 출퇴근 현황 (상세 컬럼 테이블)
   - att-weekly   주별 근무시간 (통계)
   - att-monthly  월별 근무시간 (통계)
   ============================================================ */

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const TODAY = new Date(2026, 5, 7); // 시스템 기준일 2026-06-07
const pad = (n: number) => String(n).padStart(2, '0');

function mondayOf(date: Date) {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
}

function weekNum(mon: Date) {
  const first = new Date(mon.getFullYear(), mon.getMonth(), 1);
  const fdow = first.getDay();
  const firstMon = new Date(first);
  if (fdow === 0) firstMon.setDate(2);
  else if (fdow > 1) firstMon.setDate(first.getDate() + (8 - fdow));
  return Math.floor((mon.getDate() - firstMon.getDate()) / 7) + 1;
}

function dateFmt(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${DAYS[d.getDay()]})`;
}

/* 둥근 방향 네비 버튼 */
function NavButton({
  dir,
  onClick,
  size = 32,
}: {
  dir: 'prev' | 'next';
  onClick: () => void;
  size?: number;
}) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center justify-center rounded-full border border-border bg-transparent text-[#69748A] transition-colors hover:bg-om-canvas"
      style={{ width: size, height: size }}
    >
      <Icon className="size-3.5" />
    </button>
  );
}

/* ============================================================
   att-my : 내 근태 현황/신청
   ============================================================ */

type MonthRow = {
  d: number;
  label: string;
  isSun: boolean;
  isWE: boolean;
  isPast: boolean;
  leaveMark: string;
  ci: string;
  co: string;
};

function buildMonthRows(year: number, month: number): MonthRow[] {
  const dim = new Date(year, month, 0).getDate();
  const rows: MonthRow[] = [];
  for (let d = 1; d <= dim; d++) {
    const date = new Date(year, month - 1, d);
    const dow = date.getDay();
    const isWE = dow === 0 || dow === 6;
    const isSun = dow === 0;
    const isPast = date <= TODAY;
    const label = `${pad(month)}-${pad(d)}(${DAYS[dow]})`;
    let leaveMark = '';
    let ci = '';
    let co = '';
    if (isWE) {
      leaveMark = '휴무';
      ci = '-';
      co = '-';
    } else if (isPast) {
      ci = '누락';
      co = '누락';
    }
    if (month === 6 && d === 3) {
      leaveMark = '휴무';
      ci = '-';
      co = '-';
    }
    rows.push({ d, label, isSun, isWE, isPast, leaveMark, ci, co });
  }
  return rows;
}

const LEAVE_TYPES = ['연차', '반차(오전)', '반차(오후)', '특별휴가', '병가', '보상휴가'];
const OT_TYPES = ['연장근무', '야간근무', '휴일근무'];
const REMAIN_DAYS = 9.5;

function AttRequestModal({ onClose }: { onClose: () => void }) {
  const [modalTab, setModalTab] = useState<'leave' | 'work'>('leave');
  const [leaveType, setLeaveType] = useState('연차');

  // 사용 후 잔여 일수 라이브 계산 (반차는 0.5일, 그 외 1일)
  const usedDays = leaveType.startsWith('반차') ? 0.5 : 1;
  const afterDays = REMAIN_DAYS - usedDays;

  const inputCls =
    'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary';
  const labelCls = 'text-[13px] font-bold text-[#3D4A5C]';

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: 배경 클릭으로 닫기
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[min(92vw,480px)] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between border-b border-border px-[22px] py-[18px]">
          <span className="text-[17px] font-extrabold text-[#1B2435]">근태 신청</span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-[#69748A] hover:bg-om-canvas"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        <div className="flex gap-0 border-b border-border px-[22px]">
          {(['leave', 'work'] as const).map((t, i) => {
            const labels = ['연차/반차', '초과근무'];
            const active = modalTab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setModalTab(t)}
                className={cn(
                  '-mb-px border-b-2 px-4 py-2.5 text-[13.5px]',
                  active
                    ? 'border-primary font-extrabold text-primary'
                    : 'border-transparent font-medium text-[#69748A]'
                )}
              >
                {labels[i]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3.5 px-[22px] py-5">
          <div className="text-[13px] text-[#69748A]">이름: 신규하</div>

          {modalTab === 'leave' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <span className={labelCls}>날짜</span>
                <input type="date" defaultValue="2026-06-23" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={labelCls}>종류</span>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className={cn(inputCls, 'cursor-pointer')}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="rounded-md border border-border bg-om-canvas px-3.5 py-3">
                <div className="text-sm font-bold text-primary">잔여: {REMAIN_DAYS}일</div>
                <div className="mt-1 text-[13px] text-[#3D4A5C]">사용 후: {afterDays}일</div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={labelCls}>사유</span>
                <input type="text" placeholder="사유를 입력하세요 (선택)" className={inputCls} />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <span className={labelCls}>초과근무 유형</span>
                <select className={cn(inputCls, 'cursor-pointer')}>
                  {OT_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className={labelCls}>시작 시간</span>
                  <input type="datetime-local" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className={labelCls}>종료 시간</span>
                  <input type="datetime-local" className={inputCls} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={labelCls}>사유</span>
                <input type="text" placeholder="사유를 입력하세요" className={inputCls} />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-om-canvas px-[22px] py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-border px-4 text-[13px] font-semibold text-[#3D4A5C] hover:bg-white"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md bg-primary px-5 text-[13px] font-bold text-white hover:opacity-90"
          >
            신청
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusTab() {
  const [weekOff, setWeekOff] = useState(0);
  const [mYear, setMYear] = useState(2026);
  const [mMonth, setMMonth] = useState(6);

  const mon = useMemo(() => {
    const d = new Date(TODAY);
    d.setDate(d.getDate() + weekOff * 7);
    return mondayOf(d);
  }, [weekOff]);
  const sun = useMemo(() => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + 6);
    return d;
  }, [mon]);
  const rows = useMemo(() => buildMonthRows(mYear, mMonth), [mYear, mMonth]);

  const wn = weekNum(mon);
  const wMonth = mon.getMonth() + 1;
  const workMin = 0;
  const pct = Math.min(100, Math.round((workMin / 1920) * 100));

  const stats: Array<[string, string]> = [
    ['잔여시간 / 잔여일', '32시간/0일'],
    ['필수 근무 시간', '32시간'],
    ['최대 근무 가능 시간', '52시간'],
    ['법정 초과 근무 시간', '0분'],
    ['소정 초과 근무 시간', '0분'],
  ];

  const prevMonth = () => {
    let m = mMonth - 1;
    let y = mYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setMMonth(m);
    setMYear(y);
  };
  const nextMonth = () => {
    let m = mMonth + 1;
    let y = mYear;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setMMonth(m);
    setMYear(y);
  };

  const TH =
    'whitespace-nowrap bg-om-canvas px-3 py-2.5 text-center text-xs font-bold text-[#69748A]';
  const TD = 'border-b border-[#F0F1F3] px-3 py-[11px] text-center text-[13px]';

  return (
    <div className="mt-[18px]">
      {/* 주간 요약 카드 */}
      <div className="mb-[18px] rounded-xl border border-border bg-white px-8 py-7 shadow-sm">
        <div className="mb-1.5 flex items-center justify-center gap-5">
          <NavButton dir="prev" onClick={() => setWeekOff((v) => v - 1)} />
          <div className="text-center">
            <div className="text-[17px] font-extrabold text-[#1B2435]">
              {wMonth}월 {wn}째주
            </div>
            <div className="mt-0.5 text-[13px] text-[#69748A]">
              {dateFmt(mon)} - {dateFmt(sun)}
            </div>
          </div>
          <NavButton dir="next" onClick={() => setWeekOff((v) => v + 1)} />
        </div>

        <div className="my-5 mb-2">
          <span className="text-[22px] font-extrabold text-primary">0분</span>
          <span className="ml-1.5 text-[15px] text-[#3D4A5C]">근무중 입니다.</span>
        </div>

        {/* 근무 현황 progress bar */}
        <div className="relative mb-5 h-[22px] overflow-hidden rounded-full bg-gradient-to-r from-om-blue-bg to-om-red-bg">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11.5px] font-bold text-[#999]">
            {pct}%
          </span>
        </div>

        {/* 통계 */}
        <div className="flex flex-col gap-2.5">
          {stats.map(([label, val]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[13.5px] text-[#3D4A5C]">{label}</span>
              <span className="font-mono text-sm font-bold text-[#1B2435]">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 월별 출퇴근 테이블 */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-center gap-6 p-5">
          <NavButton dir="prev" onClick={prevMonth} />
          <span className="text-[18px] font-extrabold text-[#1B2435]">
            {mYear}년 {pad(mMonth)}월
          </span>
          <NavButton dir="next" onClick={nextMonth} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {[
                  '일자',
                  '기분',
                  '총근무시간',
                  '신청한 근태',
                  '출근시간',
                  '퇴근시간',
                  '근무시간 상세 (시간)',
                  '연장근무시간',
                ].map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.d}>
                  <td
                    className={cn(
                      TD,
                      r.isSun ? 'font-bold text-om-red' : 'font-medium text-[#1B2435]'
                    )}
                  >
                    {r.label}
                  </td>
                  <td className={TD}>-</td>
                  <td className={cn(TD, 'font-mono')}>00:00</td>
                  <td className={TD}>
                    {r.leaveMark && (
                      <span className="inline-flex rounded-full border border-border bg-om-canvas px-2 py-0.5 text-[11.5px] font-bold text-[#69748A]">
                        {r.leaveMark}
                      </span>
                    )}
                  </td>
                  <td className={TD}>
                    {r.ci === '누락' ? (
                      <span className="text-[12.5px] font-bold text-om-red">누락</span>
                    ) : (
                      r.ci
                    )}
                  </td>
                  <td className={TD}>
                    {r.co === '누락' ? (
                      <span className="text-[12.5px] font-bold text-om-red">누락</span>
                    ) : (
                      r.co
                    )}
                  </td>
                  <td className={cn(TD, 'min-w-[160px] px-4')}>
                    <div className="h-3.5 w-full overflow-hidden rounded bg-om-blue-bg">
                      <div className="h-full rounded bg-[#6bb5e8]" style={{ width: '0%' }} />
                    </div>
                  </td>
                  <td className={cn(TD, 'font-mono')}>00:00</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type AnnStat = { label: string; val: string; color: string };
type LeaveHist = { from: string; days: string; type: string; reason: string };

function HistoryTab() {
  const [yearOff, setYearOff] = useState(0);
  const [leaveHistory, setLeaveHistory] = useState<LeaveHist[]>([
    { from: '2026년 4월 2일(목)', days: '1일간', type: '연차 10:00-19:00', reason: '' },
    { from: '2026년 2월 20일(금)', days: '1일간', type: '연차', reason: '' },
    { from: '2026년 2월 9일(월) - 11일(수)', days: '3일간', type: '연차', reason: '' },
    { from: '2026년 1월 9일(금)', days: '0.5일간', type: '반차(오후)', reason: '병원 진료' },
    { from: '2026년 1월 5일(월)', days: '1일간', type: '연차', reason: '' },
  ]);

  const yr = 2026 + yearOff;
  const annStats: AnnStat[] = [
    { label: '근속년수', val: '5년차', color: 'text-[#1B2435]' },
    { label: '총 연차', val: '16일', color: 'text-[#1B2435]' },
    { label: '잔여연차', val: '9.5일', color: 'text-primary' },
    { label: '사용연차', val: '6.5일', color: 'text-om-red' },
    { label: '만료', val: '0일', color: 'text-[#69748A]' },
    { label: '사용 특별휴가', val: '0일', color: 'text-[#69748A]' },
    { label: '사용 대체휴가', val: '0일', color: 'text-[#69748A]' },
    { label: '사용 병가', val: '0일', color: 'text-[#69748A]' },
    { label: '사용 보상휴가', val: '0일', color: 'text-[#69748A]' },
    { label: '사용 기타휴가', val: '0일', color: 'text-[#69748A]' },
  ];

  const removeRow = (idx: number) =>
    setLeaveHistory((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="mt-[18px] overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      {/* 연도 네비 */}
      <div className="border-b border-[#F0F1F3] px-[22px] py-[18px] text-center">
        <div className="mb-1 flex items-center justify-center gap-5">
          <NavButton dir="prev" onClick={() => setYearOff((v) => v - 1)} size={28} />
          <span className="text-[18px] font-extrabold text-[#1B2435]">{yr}년</span>
          <NavButton dir="next" onClick={() => setYearOff((v) => v + 1)} size={28} />
        </div>
        <div className="text-[12.5px] text-[#69748A]">
          ({yr}-01-01 - {yr}-12-31)
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="flex gap-0 overflow-x-auto border-b border-[#F0F1F3] px-[22px] py-5">
        {annStats.map((s) => (
          <div
            key={s.label}
            className="min-w-[80px] flex-1 border-r border-[#F0F1F3] px-2 text-center last:border-r-0"
          >
            <div className="mb-1.5 whitespace-nowrap text-xs text-[#69748A]">{s.label}</div>
            <div className={cn('font-mono text-[18px] font-extrabold', s.color)}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* 휴가 이력 테이블 */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border bg-om-canvas">
            {['일자', '일수', '휴가유형', '사유', '삭제'].map((h) => (
              <th
                key={h}
                className={cn(
                  'px-4 py-2.5 text-left text-xs font-bold text-[#69748A]',
                  h === '삭제' && 'text-center'
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leaveHistory.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-[#69748A]">
                신청 내역이 없습니다.
              </td>
            </tr>
          ) : (
            leaveHistory.map((h, i) => (
              <tr key={h.from + h.type} className="border-b border-[#F0F1F3] last:border-b-0">
                <td className="px-4 py-[13px] text-[13.5px] text-[#1B2435]">{h.from}</td>
                <td className="px-4 py-[13px] font-mono text-[13.5px] text-[#3D4A5C]">{h.days}</td>
                <td className="px-4 py-[13px] text-[13.5px] text-[#1B2435]">{h.type}</td>
                <td className="px-4 py-[13px] text-[13px] text-[#69748A]">{h.reason}</td>
                <td className="px-4 py-[13px] text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="inline-flex size-7 items-center justify-center rounded-md text-[#69748A] hover:bg-om-red-bg hover:text-om-red"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function AttMyScreen() {
  const [tab, setTab] = useState<'status' | 'history'>('status');
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      {/* 헤더 (프로필 헤더 없음) */}
      <div className="mb-[18px] flex items-start justify-between">
        <div>
          <div className="text-[22px] font-extrabold text-[#1B2435]">내 근태 현황/신청</div>
          <div className="mt-0.5 text-[13px] text-[#69748A]">
            신규하님의 근무유형은 선택적 근로시간제(1주)입니다
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="h-[38px] rounded-md bg-primary px-5 text-[13.5px] font-bold text-white hover:opacity-90"
        >
          근태 신청
        </button>
      </div>

      {/* 탭 바 */}
      <div className="flex gap-0 border-b-2 border-[#F0F1F3]">
        {(['status', 'history'] as const).map((t, i) => {
          const labels = ['출퇴근 현황', '근태 신청내역'];
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                '-mb-0.5 border-b-2 px-5 py-3 text-sm',
                active
                  ? 'border-primary font-extrabold text-[#1B2435]'
                  : 'border-transparent font-medium text-[#69748A]'
              )}
            >
              {labels[i]}
            </button>
          );
        })}
      </div>

      {tab === 'status' ? <StatusTab /> : <HistoryTab />}

      {showModal && <AttRequestModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

/* ============================================================
   att-work : 근무/휴가 (월 캘린더)
   ============================================================ */

const SPECIAL_DAYS: Record<number, string> = { 3: '연차', 14: '반차', 21: '공휴일' };

function AttWorkScreen() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(6);

  const weeks = useMemo(() => {
    const dim = new Date(year, month, 0).getDate();
    const firstDow = new Date(year, month - 1, 1).getDay();
    type Cell = { d: number | null; isToday: boolean; isSun: boolean; isSat: boolean; sp: string };
    const cells: Cell[] = [];
    for (let i = 0; i < firstDow; i++)
      cells.push({ d: null, isToday: false, isSun: false, isSat: false, sp: '' });
    for (let d = 1; d <= dim; d++) {
      const dt = new Date(year, month - 1, d);
      const dow = dt.getDay();
      cells.push({
        d,
        isToday: dt.toDateString() === TODAY.toDateString(),
        isSun: dow === 0,
        isSat: dow === 6,
        sp: SPECIAL_DAYS[d] || '',
      });
    }
    const grid: Cell[][] = [];
    let row: Cell[] = [];
    cells.forEach((c, i) => {
      row.push(c);
      if (row.length === 7 || i === cells.length - 1) {
        while (row.length < 7)
          row.push({ d: null, isToday: false, isSun: false, isSat: false, sp: '' });
        grid.push(row);
        row = [];
      }
    });
    return grid;
  }, [year, month]);

  const prev = () => {
    let m = month - 1;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setMonth(m);
    setYear(y);
  };
  const next = () => {
    let m = month + 1;
    let y = year;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <NavButton dir="prev" onClick={prev} />
          <span className="text-[20px] font-extrabold text-[#1B2435]">
            {year}년 {pad(month)}월
          </span>
          <NavButton dir="next" onClick={next} />
        </div>
        <button
          type="button"
          className="h-9 rounded-md bg-primary px-4 text-[13px] font-bold text-white hover:opacity-90"
        >
          + 휴가 신청
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {DAYS.map((d, i) => (
                <th
                  key={d}
                  className={cn(
                    'border-b border-border p-2.5 text-center text-[13px] font-bold',
                    i === 0 ? 'text-om-red' : i === 6 ? 'text-[#6b9bd2]' : 'text-[#3D4A5C]'
                  )}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 고정 캘린더 주 인덱스
              <tr key={wi}>
                {week.map((c, ci) => (
                  <td
                    // biome-ignore lint/suspicious/noArrayIndexKey: 고정 캘린더 셀 인덱스
                    key={ci}
                    className="h-[68px] border border-[#F0F1F3] p-1.5 align-top"
                  >
                    {c.d !== null && (
                      <>
                        <div
                          className={cn(
                            'mb-1 flex size-[26px] items-center justify-center rounded-full text-[13px]',
                            c.isToday
                              ? 'bg-primary font-extrabold text-white'
                              : c.isSun
                                ? 'text-om-red'
                                : c.isSat
                                  ? 'text-[#6b9bd2]'
                                  : 'text-[#1B2435]'
                          )}
                        >
                          {c.d}
                        </div>
                        {c.sp && (
                          <div className="rounded bg-om-blue-bg px-1.5 py-0.5 text-[11px] font-bold text-primary">
                            {c.sp}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   att-team : 팀 출퇴근 현황
   ============================================================ */

type TeamRow = {
  dept: string;
  name: string;
  sched: string;
  work: string;
  ci: string;
  co: string;
  type: string;
  brk: string;
  excl: string;
  eve: string;
  ext: string;
  nReq: string;
  nAct: string;
  memo: string;
  badge: '' | 'warn' | 'leave';
};

const TEAM_DATA: TeamRow[] = [
  { dept: 'CTO', name: '신규하', sched: '10:00-19:00', work: '00:00', ci: '누락', co: '누락', type: '-', brk: '0분', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
  { dept: '개발 1팀', name: '김진범', sched: '10:00-19:00', work: '08:05', ci: '08:28', co: '17:33', type: '-', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
  { dept: '개발 1팀', name: '김학래', sched: '10:00-19:00', work: '07:55', ci: '09:14', co: '18:09', type: '-', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
  { dept: '개발 1팀', name: '서홍석', sched: '10:00-19:00', work: '08:27', ci: '09:29', co: '18:56', type: '-', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
  { dept: '개발 1팀', name: '이광진', sched: '10:00-19:00', work: '09:57', ci: '09:03', co: '20:43', type: '-', brk: '1시간 43분', excl: '0분', eve: '43분', ext: '-', nReq: '-', nAct: '-', memo: '미승인(퇴근)', badge: 'warn' },
  { dept: '개발 1팀', name: '홍윤호', sched: '10:00-19:00', work: '09:43', ci: '07:34', co: '18:17', type: '-', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
  { dept: '개발 2팀', name: '길병열', sched: '10:00-19:00', work: '07:56', ci: '09:45', co: '18:41', type: '-', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
  { dept: '개발 2팀', name: '김대웅', sched: '10:00-19:00', work: '06:00', ci: '08:15', co: '15:15', type: '연차(2시간)', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '연차(2시간)', badge: 'leave' },
  { dept: '개발 2팀', name: '김요한', sched: '10:00-19:00', work: '08:21', ci: '08:49', co: '18:10', type: '-', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
  { dept: '개발 2팀', name: '김우하', sched: '10:00-19:00', work: '08:37', ci: '09:10', co: '18:47', type: '-', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
  { dept: '개발 2팀', name: '김치오', sched: '10:00-19:00', work: '08:09', ci: '07:59', co: '17:08', type: '-', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
  { dept: '개발 2팀', name: '배선호', sched: '10:00-19:00', work: '08:47', ci: '08:38', co: '18:25', type: '-', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
  { dept: '개발 3팀', name: '김소라', sched: '10:00-19:00', work: '07:40', ci: '08:58', co: '17:38', type: '-', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
  { dept: '개발 3팀', name: '김태형', sched: '10:00-19:00', work: '08:07', ci: '08:00', co: '17:07', type: '-', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
  { dept: '개발 3팀', name: '연규환', sched: '10:00-19:00', work: '08:09', ci: '08:40', co: '17:49', type: '-', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
  { dept: '개발 3팀', name: '오승현', sched: '10:00-19:00', work: '07:53', ci: '08:45', co: '17:38', type: '-', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
  { dept: '개발 3팀', name: '오준혁', sched: '10:00-19:00', work: '05:38', ci: '08:56', co: '15:34', type: '연차(2시간)', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '연차(2시간)', badge: 'leave' },
  { dept: '개발 3팀', name: '이수아', sched: '10:00-19:00', work: '07:38', ci: '08:51', co: '17:29', type: '-', brk: '1시간', excl: '0분', eve: '0분', ext: '-', nReq: '-', nAct: '-', memo: '', badge: '' },
];

const DEPTS = ['CTO', '개발 1팀', '개발 2팀', '개발 3팀', '전체'];
const AVATAR_COLORS = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7'];

function Avatar({ name }: { name: string }) {
  const c = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{ background: c }}
    >
      {name[0]}
    </div>
  );
}

function CellBadge({ badge, text }: { badge: TeamRow['badge']; text: string }) {
  if (!badge || !text || text === '-') return <>{text || '-'}</>;
  if (badge === 'warn')
    return (
      <span className="inline-flex rounded bg-[#fde8e8] px-2 py-0.5 text-[11.5px] font-bold text-[#c0392b]">
        {text}
      </span>
    );
  return (
    <span className="inline-flex rounded bg-om-blue-bg px-2 py-0.5 text-[11.5px] font-bold text-primary">
      {text}
    </span>
  );
}

function AttTeamScreen() {
  const [selDept, setSelDept] = useState('CTO');
  const [inclSub, setInclSub] = useState(true);
  const [viewMode, setViewMode] = useState<'일' | '주' | '월'>('일');
  const [curDate, setCurDate] = useState(new Date(2026, 5, 5));

  const filtered = useMemo(
    () => (selDept === '전체' ? TEAM_DATA : TEAM_DATA.filter((m) => m.dept === selDept)),
    [selDept]
  );

  const dateStr = `${curDate.getFullYear()}년 ${curDate.getMonth() + 1}월 ${curDate.getDate()}일(${DAYS[curDate.getDay()]})`;

  const stepDate = (delta: number) => {
    setCurDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + delta);
      return n;
    });
  };

  const TH =
    'whitespace-nowrap border-b border-border bg-om-canvas px-2.5 py-[9px] text-center text-[11.5px] font-bold text-[#69748A]';
  const TD =
    'whitespace-nowrap border-b border-[#F0F1F3] px-2.5 py-2.5 text-center text-[12.5px] text-[#3D4A5C]';

  const cols = [
    '부서', '이름', '예상근무시간', '근무시간', '출근시간', '퇴근시간', '근무형태',
    '휴게시간', '제외시간', '저녁시간', '연장근무시간', '야간근무시간(신청)',
    '야간근무시간(실제)', '비고', '메모',
  ];

  return (
    <div>
      <div className="mb-[18px] text-[22px] font-extrabold text-[#1B2435]">팀 출퇴근 현황</div>

      {/* 날짜 네비 */}
      <div className="mb-4 flex items-center justify-center gap-5">
        <NavButton dir="prev" onClick={() => stepDate(-1)} size={30} />
        <span className="text-[18px] font-extrabold text-[#1B2435]">{dateStr}</span>
        <NavButton dir="next" onClick={() => stepDate(1)} size={30} />
      </div>

      {/* 필터 바 */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={selDept}
          onChange={(e) => setSelDept(e.target.value)}
          className="h-9 cursor-pointer rounded-md border border-border bg-white px-2.5 text-[13px] outline-none"
        >
          {DEPTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-[#3D4A5C]">
          <input
            type="checkbox"
            checked={inclSub}
            onChange={(e) => setInclSub(e.target.checked)}
            className="size-3.5 cursor-pointer accent-primary"
          />
          하위 부서 포함
        </label>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setCurDate(new Date(2026, 5, 7))}
          className="h-[34px] rounded-md border border-border px-3 text-[13px] font-semibold text-[#3D4A5C] hover:bg-om-canvas"
        >
          오늘
        </button>
        {(['일', '주', '월'] as const).map((v) => {
          const active = viewMode === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setViewMode(v)}
              className={cn(
                'h-[34px] rounded-md border px-3 text-[13px]',
                active
                  ? 'border-primary bg-om-blue-bg font-bold text-primary'
                  : 'border-border font-medium text-[#3D4A5C] hover:bg-om-canvas'
              )}
            >
              {v}
            </button>
          );
        })}
      </div>

      {/* 테이블 */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {cols.map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.dept + m.name}>
                  <td className={cn(TD, 'text-left font-semibold')}>{m.dept}</td>
                  <td className={cn(TD, 'text-left')}>
                    <div className="flex items-center gap-[7px]">
                      <Avatar name={m.name} />
                      <span className="text-[13px] font-bold text-[#1B2435]">{m.name}</span>
                    </div>
                  </td>
                  <td className={cn(TD, 'font-mono')}>{m.sched}</td>
                  <td className={cn(TD, 'font-mono')}>{m.work}</td>
                  <td className={TD}>
                    {m.ci === '누락' ? (
                      <span className="font-bold text-om-red">누락</span>
                    ) : (
                      <span className="font-mono">{m.ci}</span>
                    )}
                  </td>
                  <td className={TD}>
                    {m.co === '누락' ? (
                      <span className="font-bold text-om-red">누락</span>
                    ) : (
                      <span className="font-mono">{m.co}</span>
                    )}
                  </td>
                  <td className={TD}>
                    <CellBadge badge={m.badge} text={m.type} />
                  </td>
                  <td className={TD}>{m.brk}</td>
                  <td className={TD}>{m.excl}</td>
                  <td className={TD}>{m.eve}</td>
                  <td className={TD}>{m.ext}</td>
                  <td className={TD}>{m.nReq}</td>
                  <td className={TD}>{m.nAct}</td>
                  <td className={TD}>&nbsp;</td>
                  <td className={TD}>
                    <CellBadge badge={m.badge} text={m.memo || '-'} />
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
   att-weekly / att-monthly : 근무시간 통계 (간단 차트 스텁)
   ============================================================ */

const WEEKLY_BARS = [
  { label: '1주', h: 38 },
  { label: '2주', h: 41 },
  { label: '3주', h: 36 },
  { label: '4주', h: 40 },
];
const MONTHLY_BARS = [
  { label: '1월', h: 168 },
  { label: '2월', h: 152 },
  { label: '3월', h: 176 },
  { label: '4월', h: 160 },
  { label: '5월', h: 172 },
  { label: '6월', h: 84 },
];

function WorkStatScreen({
  title,
  unit,
  bars,
  max,
}: {
  title: string;
  unit: string;
  bars: Array<{ label: string; h: number }>;
  max: number;
}) {
  return (
    <div>
      <div className="mb-[18px] text-[22px] font-extrabold text-[#1B2435]">{title}</div>
      <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
        <div className="mb-6 text-sm text-[#69748A]">근무시간 통계 (단위: {unit})</div>
        <div className="flex h-[220px] items-end gap-6">
          {bars.map((b) => (
            <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="font-mono text-[13px] font-bold text-[#1B2435]">{b.h}</span>
              <div
                className="w-full max-w-[64px] rounded-t-md bg-primary"
                style={{ height: `${(b.h / max) * 160}px` }}
              />
              <span className="text-xs text-[#69748A]">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AttWeeklyScreen() {
  return <WorkStatScreen title="주별 근무시간" unit="시간" bars={WEEKLY_BARS} max={52} />;
}

function AttMonthlyScreen() {
  return <WorkStatScreen title="월별 근무시간" unit="시간" bars={MONTHLY_BARS} max={184} />;
}

/* ============================================================
   registry export
   ============================================================ */

export const attendanceScreens: ScreenModule = {
  'att-my': { title: '내 근태 현황/신청', Component: AttMyScreen },
  'att-work': { title: '근무/휴가', Component: AttWorkScreen },
  'att-team': { title: '팀 출퇴근 현황', Component: AttTeamScreen },
  'att-weekly': { title: '주별 근무시간', Component: AttWeeklyScreen },
  'att-monthly': { title: '월별 근무시간', Component: AttMonthlyScreen },
};
