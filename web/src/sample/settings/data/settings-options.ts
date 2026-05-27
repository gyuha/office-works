import type { ChoiceItem } from '@/sample/settings/types/settings';

export const languageOptions = [
  { value: 'ko', label: '한국어', description: '기본 locale' },
  { value: 'en', label: 'English', description: 'Fallback locale' },
  { value: 'ja', label: '日本語', description: '데모 옵션' },
] as const satisfies readonly ChoiceItem[];

export const fontOptions = [
  { value: 'inter', label: 'Inter', description: '관리자 화면 기본 폰트' },
  { value: 'system', label: 'System', description: '운영체제 기본 UI 폰트' },
  { value: 'mono', label: 'Mono', description: '개발자 도구형 고정폭 폰트' },
] as const satisfies readonly ChoiceItem[];

export const themeModeOptions = [
  { value: 'light', label: '라이트', description: '밝은 배경과 높은 대비' },
  { value: 'dark', label: '다크', description: '어두운 배경과 낮은 눈부심' },
  { value: 'system', label: '시스템', description: 'OS 설정을 자동으로 따름' },
] as const satisfies readonly ChoiceItem[];

export const themePresetOptions = [
  { value: 'default', label: 'Default', description: 'shadcn-admin 기본 neutral 팔레트' },
  { value: 'blue', label: 'Blue', description: '데이터 중심 화면에 어울리는 파란 포인트' },
  { value: 'green', label: 'Green', description: '상태와 성공 피드백이 많은 운영 화면용' },
  { value: 'orange', label: 'Orange', description: '주의와 실행 CTA 를 강조하는 따뜻한 팔레트' },
  { value: 'red', label: 'Red', description: '보안·감사 중심 화면의 강한 포인트' },
] as const satisfies readonly ChoiceItem[];

export const displayItems = [
  '대시보드',
  '사용자',
  '작업',
  '앱',
  '채팅',
  '설정',
  '도움말 센터',
] as const;
