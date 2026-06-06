import type { OfficeIconName } from '../../icons';

/* ============================================================
   OfficeMate — 대시보드 데이터 (dashboard.js 그대로 이식)
   ============================================================ */

export interface ProjectRow {
  name: string;
  role: string;
  pct: number;
  period: string;
}

export interface ScheduleRow {
  time: string;
  title: string;
  loc: string;
  color: string;
}

export interface NoticeRow {
  type: 'n' | 'g';
  title: string;
  date: string;
}

export interface QuickLink {
  id: string;
  label: string;
  icon: OfficeIconName;
  tint: 'green' | 'purple' | 'orange' | 'blue' | 'indigo' | 'red';
}

export const projects: ProjectRow[] = [
  { name: 'ERP 시스템 구축', role: '개발자', pct: 65, period: '2024.01.10 ~ 2024.06.30' },
  { name: '모바일 앱 리뉴얼', role: '개발자', pct: 40, period: '2024.02.01 ~ 2024.07.31' },
  { name: '웹사이트 고도화', role: '개발자', pct: 80, period: '2024.03.15 ~ 2024.08.15' },
  { name: 'AI 챗봇 개발', role: '개발자', pct: 20, period: '2024.04.01 ~ 2024.09.30' },
];

export const schedule: ScheduleRow[] = [
  { time: '09:30', title: '프로젝트 주간 회의', loc: '회의실 A', color: '#0066FF' },
  { time: '11:00', title: 'UI/UX 검토', loc: '회의실 B', color: '#8B5CF6' },
  { time: '14:00', title: '개발 업무', loc: '개발팀', color: '#00BF40' },
  { time: '16:00', title: '1:1 면담', loc: '인사팀', color: '#FF9200' },
];

export const notices: NoticeRow[] = [
  { type: 'n', title: '5월 임시 휴무 안내', date: '05-17' },
  { type: 'n', title: '연차 사용 촉진 기간 안내', date: '05-16' },
  { type: 'n', title: '보안 정책 변경 안내', date: '05-13' },
  { type: 'g', title: '사내 교육 신청 안내', date: '05-10' },
  { type: 'g', title: '건강검진 일정 안내', date: '05-08' },
];

export const quickLinks: QuickLink[] = [
  { id: 'att-my', label: '근태 현황/신청', icon: 'leave', tint: 'green' },
  { id: 'att-work', label: '근무/휴가', icon: 'vacation', tint: 'purple' },
  { id: 'appr-write', label: '결재 작성', icon: 'write', tint: 'orange' },
  { id: 'appr-todo', label: '결재할 문서', icon: 'inbox', tint: 'blue' },
  { id: 'proj-list', label: '프로젝트 목록', icon: 'project', tint: 'indigo' },
  { id: 'org', label: '설정', icon: 'org', tint: 'green' },
  { id: 'appr-home', label: '결재 홈', icon: 'done', tint: 'blue' },
  { id: 'members-list', label: '구성원 목록', icon: 'account', tint: 'purple' },
];

/* tint 클래스 매핑 (om-* 토큰) */
export const TINT: Record<QuickLink['tint'], string> = {
  green: 'bg-om-green-bg text-om-green',
  purple: 'bg-om-purple-bg text-om-purple',
  orange: 'bg-om-orange-bg text-om-orange',
  blue: 'bg-[#E8F0FF] text-primary',
  indigo: 'bg-om-indigo-bg text-om-indigo',
  red: 'bg-om-red-bg text-om-red',
};
