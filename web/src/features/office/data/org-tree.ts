// 조직도(팀관리) 트리 — teams 백엔드 도메인이 아직 없어 클라이언트 공용 상수로 둔다.
// teams.tsx(팀관리 화면)와 구성원 폼의 소속 드롭다운이 같은 출처를 공유한다.
// (teams 백엔드 API가 생기면 이 상수를 그 응답으로 교체)

export type TreeNode = { id: string; name: string; parentId: string | null };

export const INITIAL_NODES: TreeNode[] = [
  { id: 't01', name: '대표이사', parentId: null },
  { id: 't02', name: '전무', parentId: 't01' },
  { id: 't03', name: '경영지원실', parentId: 't02' },
  { id: 't04', name: '연구실', parentId: 't02' },
  { id: 't05', name: '전략컨설팅실', parentId: 't02' },
  { id: 't06', name: 'CTO', parentId: 't02' },
  { id: 't07', name: '개발1팀', parentId: 't06' },
  { id: 't08', name: '개발2팀', parentId: 't06' },
  { id: 't09', name: '개발3팀', parentId: 't06' },
  { id: 't10', name: 'PM전략실', parentId: 't02' },
  { id: 't11', name: '기획팀', parentId: 't02' },
  { id: 't12', name: '기획1Part', parentId: 't11' },
  { id: 't13', name: '기획2Part', parentId: 't11' },
  { id: 't14', name: '디자인실', parentId: 't02' },
];

// 소속 드롭다운 옵션 — 조직도 전체 노드 이름(트리 순서).
export const DEPARTMENT_OPTIONS: string[] = INITIAL_NODES.map((n) => n.name);
