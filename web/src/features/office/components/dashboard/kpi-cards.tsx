import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { OfficeIconName } from '../../icons';
import { OfficeIcon } from '../../icons';
import { TINT } from './dashboard-data';

/* ============================================================
   OfficeMate — KPI 카드 5종
   ============================================================ */

function KpiCard({
  label,
  tint,
  icon,
  children,
  meta,
  foot,
}: {
  label: string;
  tint: keyof typeof TINT;
  icon: OfficeIconName;
  children: React.ReactNode;
  meta?: string;
  foot: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[168px] flex-col rounded-xl border border-border bg-white p-[22px] shadow-sm">
      <div className="flex items-start justify-between">
        <div className="text-sm font-bold text-[#3D4A5C]">{label}</div>
        <div
          className={`grid size-[46px] flex-shrink-0 place-items-center rounded-[13px] [&_svg]:size-[23px] ${TINT[tint]}`}
        >
          <OfficeIcon name={icon} />
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-[5px]">{children}</div>
      {meta && <div className="mt-1 text-[13px] text-[#69748A]">{meta}</div>}
      <div className="mt-auto pt-3.5">{foot}</div>
    </div>
  );
}

function KpiNum({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[32px] font-extrabold tracking-[-0.03em] text-[#1B2435]">
      {children}
    </span>
  );
}

function KpiUnit({ children }: { children: React.ReactNode }) {
  return <span className="text-[15px] font-semibold text-[#69748A]">{children}</span>;
}

function KpiLink({ id, text }: { id: string; text: string }) {
  const navigate = useNavigate();
  const go = () => {
    if (id === 'dashboard') navigate({ to: '/' });
    else navigate({ to: '/app/$screenId', params: { screenId: id } });
  };
  return (
    <button
      type="button"
      onClick={go}
      className="inline-flex cursor-pointer items-center gap-1 text-[13.5px] font-bold text-[#8A93A6] transition-colors hover:text-primary [&_svg]:size-3.5"
    >
      {text}
      <OfficeIcon name="chevR" />
    </button>
  );
}

function ClockButton() {
  const [out, setOut] = useState(true); // 출근 상태 → '퇴근하기' 노출
  return (
    <Button
      variant={out ? 'outline' : 'default'}
      size="lg"
      className="w-full"
      onClick={() => setOut((v) => !v)}
    >
      {out ? '퇴근하기' : '출근하기'}
    </Button>
  );
}

export function KpiRow() {
  return (
    <div className="grid grid-cols-3 gap-4 min-[1320px]:grid-cols-5">
      <KpiCard label="출근 상태" tint="green" icon="clock" meta="출근 시간" foot={<ClockButton />}>
        <KpiNum>09:02</KpiNum>
      </KpiCard>

      <KpiCard label="결재 대기" tint="orange" icon="inbox" foot={<KpiLink id="appr-todo" text="바로가기" />}>
        <KpiNum>5</KpiNum>
        <KpiUnit>건</KpiUnit>
      </KpiCard>

      <KpiCard
        label="내 결재 진행"
        tint="blue"
        icon="inprogress"
        foot={<KpiLink id="appr-home" text="바로가기" />}
      >
        <KpiNum>3</KpiNum>
        <KpiUnit>건</KpiUnit>
      </KpiCard>

      <KpiCard
        label="연차 잔여일"
        tint="purple"
        icon="leave"
        foot={<KpiLink id="att-my" text="상세보기" />}
      >
        <KpiNum>15.5</KpiNum>
        <KpiUnit>일</KpiUnit>
      </KpiCard>

      <KpiCard
        label="이번 달 비용"
        tint="indigo"
        icon="wallet"
        foot={<KpiLink id="att-work" text="상세보기" />}
      >
        <KpiNum>1,250,000</KpiNum>
        <KpiUnit>원</KpiUnit>
      </KpiCard>
    </div>
  );
}
