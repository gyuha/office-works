import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  ChevronRight,
  Network,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  listUsersApiV1UsersGetOptions,
  updateUserApiV1UsersUserIdPatchMutation,
} from '@/client/@tanstack/react-query.gen';
import type { DomainsUsersSchemasUserSchemasUserResponse } from '@/client/types.gen';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { INITIAL_NODES, type TreeNode } from '../data/org-tree';
import type { ScreenModule } from './types';

type DirectoryUser = DomainsUsersSchemasUserSchemasUserResponse;

/* ============================================================
   OfficeMate — 팀 관리 (team-list)
   teams.js 의 트리/구성원/조직도 동작을 React state 로 재현
   ============================================================ */

const GRADE_C: Record<string, string> = {
  특급: 'bg-om-blue-bg text-om-blue border-om-blue/25',
  고급: 'bg-om-green-bg text-om-green border-om-green/25',
  중급: 'bg-om-orange-bg text-om-orange border-om-orange/25',
  초급: 'bg-muted text-muted-foreground border-border',
};

const AVA_PALETTE = [
  '#0066FF',
  '#00BF40',
  '#8B5CF6',
  '#FF9200',
  '#4F66D6',
  '#00A3BF',
  '#C45022',
  '#FF3B3B',
];

function avaColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return AVA_PALETTE[h % AVA_PALETTE.length];
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: avaColor(name),
        fontSize: size > 34 ? 13 : 11,
      }}
    >
      {name.charAt(0)}
    </span>
  );
}

function GradeTag({ grade }: { grade: string | null }) {
  if (!grade) return null;
  return (
    <span
      className={cn(
        'inline-flex w-[46px] items-center justify-center rounded-[5px] border py-[3px] text-[11.5px] font-extrabold',
        GRADE_C[grade] ?? 'bg-muted text-muted-foreground border-border'
      )}
    >
      {grade}
    </span>
  );
}

/* ================================================================
   조직도 SVG — 박스 + 커넥터 라인
================================================================ */
function OrgChartSvg({
  nodes,
  memberCount,
}: {
  nodes: TreeNode[];
  memberCount: (id: string) => number;
}) {
  const { width, height, viewBox, lines, boxes } = useMemo(() => {
    const NW = 118;
    const NH = 52;
    const HG = 18;
    const VG = 58;
    const positions: Record<string, { x: number; y: number }> = {};
    let leafX = 0;

    const kidsOf = (id: string) => nodes.filter((n) => n.parentId === id);

    function assignPos(id: string, depth: number) {
      const kids = kidsOf(id);
      if (kids.length === 0) {
        positions[id] = { x: leafX * (NW + HG), y: depth * (NH + VG) };
        leafX++;
        return;
      }
      kids.forEach((k) => assignPos(k.id, depth + 1));
      const xs = kids.map((k) => positions[k.id].x);
      positions[id] = {
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: depth * (NH + VG),
      };
    }

    nodes.filter((n) => n.parentId === null).forEach((r) => assignPos(r.id, 0));

    const allPos = Object.values(positions);
    if (allPos.length === 0) {
      return { width: 0, height: 0, viewBox: '0 0 0 0', lines: [], boxes: [] };
    }

    const minX = Math.min(...allPos.map((p) => p.x));
    const maxX = Math.max(...allPos.map((p) => p.x)) + NW;
    const maxY = Math.max(...allPos.map((p) => p.y)) + NH;
    const pad = 24;
    const w = maxX - minX + pad * 2;
    const h = maxY + pad * 2;
    const ox = minX - pad;

    const lineEls: React.ReactNode[] = [];
    const boxEls: React.ReactNode[] = [];

    nodes.forEach((node) => {
      const pos = positions[node.id];
      if (!pos) return;
      if (node.parentId && positions[node.parentId]) {
        const pp = positions[node.parentId];
        const px = pp.x + NW / 2;
        const py = pp.y + NH;
        const cx = pos.x + NW / 2;
        const cy = pos.y;
        const my = py + (cy - py) * 0.45;
        lineEls.push(
          <path
            key={`l-${node.id}`}
            d={`M${px},${py} V${my} H${cx} V${cy}`}
            fill="none"
            stroke="#C2C4C8"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        );
      }
      const isRoot = !node.parentId;
      const mc = memberCount(node.id);
      boxEls.push(
        <g key={`b-${node.id}`}>
          <rect
            x={pos.x}
            y={pos.y}
            width={NW}
            height={NH}
            rx={10}
            fill={isRoot ? '#0066FF' : '#FFFFFF'}
            stroke={isRoot ? '#003D99' : '#E1E2E4'}
            strokeWidth={1.5}
            filter="url(#org-sh)"
          />
          <text
            x={pos.x + NW / 2}
            y={pos.y + 20}
            textAnchor="middle"
            fontSize={12.5}
            fontWeight={700}
            fill={isRoot ? '#FFFFFF' : '#171719'}
            fontFamily="Pretendard JP, sans-serif"
          >
            {node.name}
          </text>
          <text
            x={pos.x + NW / 2}
            y={pos.y + 37}
            textAnchor="middle"
            fontSize={11}
            fill={isRoot ? 'rgba(255,255,255,.65)' : '#70737C'}
            fontFamily="Pretendard JP Mono, monospace"
          >
            {mc}명
          </text>
        </g>
      );
    });

    return {
      width: w,
      height: h,
      viewBox: `${ox} -${pad} ${w} ${h}`,
      lines: lineEls,
      boxes: boxEls,
    };
  }, [nodes, memberCount]);

  if (width === 0) return null;

  return (
    <svg width={width} height={height} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="org-sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.09)" />
        </filter>
      </defs>
      {lines}
      {boxes}
    </svg>
  );
}

export function TeamListScreen({ nodeId }: { nodeId?: string } = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nodes, setNodes] = useState<TreeNode[]>(INITIAL_NODES);
  const [selectedId, setSelectedId] = useState<string | null>(nodeId ?? 't01');

  // 실제 구성원(users) — 팀 소속은 user.department == 노드 이름으로 도출(CONTEXT: 팀 구성원).
  const usersQuery = useQuery(
    listUsersApiV1UsersGetOptions({ query: { page: 1, page_size: 1000 } })
  );
  const users: DirectoryUser[] = usersQuery.data?.items ?? [];

  const updateMut = useMutation({
    ...updateUserApiV1UsersUserIdPatchMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listUsersApiV1UsersGet'] });
      queryClient.invalidateQueries();
    },
    onError: () => toast.error('변경에 실패했습니다. (권한 확인)'),
  });

  // URL의 노드 id(딥링크·뒤로가기)와 선택 상태 동기화 — nodeId(URL) 변경 시에만 반영
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedId는 비교용일 뿐 트리거 아님(URL 단방향 동기화)
  useEffect(() => {
    if (nodeId && nodeId !== selectedId) setSelectedId(nodeId);
  }, [nodeId]);

  // 노드 선택 = 상태 갱신 + URL 반영(/app/team-list/[nodeId])
  const selectNode = (id: string) => {
    setSelectedId(id);
    navigate({ to: '/app/team-list/$nodeId', params: { nodeId: id } });
  };
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(['t01', 't02', 't06', 't11'])
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addVal, setAddVal] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showMemModal, setShowMemModal] = useState(false);
  const [memSearch, setMemSearch] = useState('');
  const [showOrgModal, setShowOrgModal] = useState(false);

  const idSeq = useRef(200);

  const getNode = (id: string | null) => nodes.find((n) => n.id === id) ?? null;
  const childrenOf = (id: string) => nodes.filter((n) => n.parentId === id);

  const descendants = useMemo(() => {
    const fn = (id: string): string[] =>
      childrenOf(id).flatMap((c) => [c.id, ...fn(c.id)]);
    return fn;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // 노드(+하위 트리)의 이름 집합에 속한 user 수 — 소속(department) 문자열 일치 기준.
  const memberCount = (id: string) => {
    const node = getNode(id);
    if (!node) return 0;
    const names = new Set<string>([node.name, ...descendants(id).map((d) => getNode(d)?.name ?? '')]);
    return users.filter((u) => u.department != null && names.has(u.department)).length;
  };

  const breadcrumb = (id: string) => {
    const path: TreeNode[] = [];
    let cur: TreeNode | null = getNode(id);
    while (cur) {
      path.unshift(cur);
      cur = cur.parentId ? getNode(cur.parentId) : null;
    }
    return path;
  };

  // 직속 구성원 = 그 노드 이름을 소속으로 가진 실제 user.
  const directMembers = (id: string): DirectoryUser[] => {
    const node = getNode(id);
    if (!node) return [];
    return users.filter((u) => u.department === node.name);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startAddChild = (parentId: string) => {
    setAddingTo(parentId);
    setAddVal('');
    setExpandedIds((prev) => new Set(prev).add(parentId));
  };

  const confirmAdd = () => {
    const name = addVal.trim();
    if (!name || !addingTo) {
      setAddingTo(null);
      return;
    }
    const newId = `tc${++idSeq.current}`;
    setNodes((prev) => [...prev, { id: newId, name, parentId: addingTo }]);
    setExpandedIds((prev) => new Set(prev).add(addingTo));
    setSelectedId(newId);
    setAddingTo(null);
    setAddVal('');
  };

  const addRoot = () => {
    const name = window.prompt('최상위 팀 이름을 입력하세요');
    if (name?.trim()) {
      const newId = `tc${++idSeq.current}`;
      setNodes((prev) => [...prev, { id: newId, name: name.trim(), parentId: null }]);
      setSelectedId(newId);
    }
  };

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditVal(name);
  };

  const confirmRename = () => {
    if (!editingId) return;
    const name = editVal.trim();
    if (name) {
      setNodes((prev) => prev.map((n) => (n.id === editingId ? { ...n, name } : n)));
    }
    setEditingId(null);
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    const toRemove = [deletingId, ...descendants(deletingId)];
    setNodes((prev) => prev.filter((n) => !toRemove.includes(n.id)));
    if (selectedId && toRemove.includes(selectedId)) {
      const remaining = nodes.filter((n) => !toRemove.includes(n.id));
      setSelectedId(remaining[0]?.id ?? null);
    }
    setDeletingId(null);
  };

  // 팀에 구성원 추가 = 그 user의 소속을 이 노드 이름으로 PATCH(다른 팀이면 이동).
  const addMember = (userId: string) => {
    const node = getNode(selectedId);
    if (!node) return;
    updateMut.mutate({ path: { user_id: userId }, body: { department: node.name } });
  };

  // 팀에서 제외 = 소속 비움(미지정).
  const removeMember = (userId: string) => {
    updateMut.mutate({ path: { user_id: userId }, body: { department: '' } });
  };

  const roots = nodes.filter((n) => n.parentId === null);
  const selNode = getNode(selectedId);
  const deletingNode = getNode(deletingId);
  const deletingDescCount = deletingId ? descendants(deletingId).length : 0;

  /* ---- 트리 노드 (재귀) ---- */
  const renderNode = (id: string, depth: number): React.ReactNode => {
    const node = getNode(id);
    if (!node) return null;
    const kids = childrenOf(id);
    const isSelected = id === selectedId;
    const isExpanded = expandedIds.has(id);
    const isEditing = editingId === id;
    const mc = memberCount(id);

    return (
      <div key={id}>
        <div
          className={cn(
            'tm-row group flex items-center gap-1.5 rounded-[9px] py-[5px] pr-2 hover:bg-accent',
            isSelected && 'bg-om-blue-bg hover:bg-om-blue-bg'
          )}
          style={{ paddingLeft: depth * 18 + 8 }}
        >
          {kids.length > 0 ? (
            <button
              type="button"
              onClick={() => toggleExpand(id)}
              className="flex size-[18px] shrink-0 items-center justify-center text-muted-foreground"
            >
              <ChevronRight
                className="size-[13px] transition-transform"
                style={{ transform: `rotate(${isExpanded ? 90 : 0}deg)` }}
              />
            </button>
          ) : (
            <span className="w-[18px] shrink-0" />
          )}

          <span className={cn('inline-flex', isSelected ? 'text-primary' : 'text-muted-foreground')}>
            {kids.length > 0 ? (
              <Network className="size-[15px]" />
            ) : (
              <User className="size-[15px]" />
            )}
          </span>

          {isEditing ? (
            <input
              autoFocus
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename();
                if (e.key === 'Escape') setEditingId(null);
              }}
              onBlur={confirmRename}
              className="h-6 min-w-0 flex-1 rounded-md border-[1.5px] border-primary bg-white px-1.5 text-[13px] outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => selectNode(id)}
              className={cn(
                'min-w-0 flex-1 truncate text-left text-[13.5px]',
                isSelected ? 'font-bold text-primary' : 'font-medium text-foreground'
              )}
            >
              {node.name}
            </button>
          )}

          {mc > 0 && (
            <span
              className={cn(
                'shrink-0 rounded-full px-1.5 py-px font-mono text-[10.5px] font-bold',
                isSelected ? 'bg-om-blue/10 text-primary' : 'bg-muted text-muted-foreground'
              )}
            >
              {mc}
            </span>
          )}

          <span className="hidden shrink-0 items-center gap-px group-hover:flex">
            <button
              type="button"
              title="하위 팀 추가"
              onClick={() => startAddChild(id)}
              className="flex size-[22px] items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent"
            >
              <Plus className="size-[13px]" />
            </button>
            <button
              type="button"
              title="이름 변경"
              onClick={() => startRename(id, node.name)}
              className="flex size-[22px] items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent"
            >
              <Pencil className="size-[13px]" />
            </button>
            {node.parentId !== null && (
              <button
                type="button"
                title="삭제"
                onClick={() => setDeletingId(id)}
                className="flex size-[22px] items-center justify-center rounded-[5px] text-om-red hover:bg-om-red-bg"
              >
                <Trash2 className="size-[13px]" />
              </button>
            )}
          </span>
        </div>

        {addingTo === id && (
          <div
            className="flex items-center gap-1.5 py-[5px] pr-2"
            style={{ paddingLeft: depth * 18 + 46 }}
          >
            <input
              autoFocus
              value={addVal}
              onChange={(e) => setAddVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAdd();
                if (e.key === 'Escape') setAddingTo(null);
              }}
              placeholder="팀 이름 입력..."
              className="h-[26px] min-w-0 flex-1 rounded-[7px] border-[1.5px] border-primary bg-white px-2 text-[12.5px] outline-none"
            />
            <button
              type="button"
              onClick={confirmAdd}
              className="h-[26px] rounded-[7px] bg-primary px-2.5 text-[12px] font-bold text-white"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => setAddingTo(null)}
              className="h-[26px] rounded-[7px] border border-border bg-white px-2 text-[12px] font-semibold text-muted-foreground"
            >
              취소
            </button>
          </div>
        )}

        {isExpanded && kids.map((c) => renderNode(c.id, depth + 1))}
      </div>
    );
  };

  /* ---- 우측 상세 패널 ---- */
  const renderDetail = () => {
    if (!selNode) {
      return (
        <div className="grid min-h-[300px] place-items-center text-[14px] text-muted-foreground">
          ← 왼쪽 트리에서 팀을 선택하세요
        </div>
      );
    }
    const bc = breadcrumb(selNode.id);
    const mems = directMembers(selNode.id);
    const dc = mems.length;
    const tc = memberCount(selNode.id);
    const par = selNode.parentId ? getNode(selNode.parentId) : null;
    const kidCount = childrenOf(selNode.id).length;

    return (
      <div>
        {/* breadcrumb */}
        <div className="mb-3.5 flex flex-wrap items-center gap-1.5">
          {bc.map((n, i) => (
            <span key={n.id} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-[13px]',
                  i === bc.length - 1
                    ? 'font-bold text-foreground'
                    : 'font-medium text-muted-foreground'
                )}
              >
                {n.name}
              </span>
              {i < bc.length - 1 && <span className="text-[13px] text-muted-foreground/60">/</span>}
            </span>
          ))}
        </div>

        {/* 팀 헤더 카드 */}
        <div className="mb-4 rounded-xl border border-border bg-white px-[22px] py-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3.5">
            <div className="grid size-[50px] shrink-0 place-items-center rounded-[14px] bg-om-blue-bg text-primary">
              {kidCount > 0 ? <Network className="size-6" /> : <User className="size-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[20px] font-extrabold tracking-[-0.02em] text-foreground">
                {selNode.name}
              </div>
              <div className="mt-[3px] flex flex-wrap gap-3.5 text-[13px] text-muted-foreground">
                <span>
                  상위: <strong className="text-foreground/70">{par ? par.name : '최상위'}</strong>
                </span>
                <span>
                  직속 구성원 <strong className="font-mono text-foreground/70">{dc}</strong>명
                </span>
                <span>
                  하위 포함 <strong className="font-mono text-foreground/70">{tc}</strong>명
                </span>
                <span>
                  하위 팀 <strong className="font-mono text-foreground/70">{kidCount}</strong>개
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                onClick={() => startRename(selNode.id, selNode.name)}
                className="h-9 gap-1.5 font-bold"
              >
                <Pencil className="size-4" /> 이름 변경
              </Button>
              <Button
                onClick={() => {
                  setMemSearch('');
                  setShowMemModal(true);
                }}
                className="h-9 gap-1.5 font-bold shadow-[0_2px_8px_rgba(0,102,255,.25)]"
              >
                <UserPlus className="size-4" /> 구성원 추가
              </Button>
            </div>
          </div>
        </div>

        {/* 구성원 테이블 */}
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-[22px] pb-3 pt-[15px]">
            <span className="text-[15px] font-extrabold text-foreground">직속 구성원</span>
            <span className="font-mono text-[13px] font-semibold text-muted-foreground">
              {mems.length}명
            </span>
          </div>
          {mems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mb-3 opacity-30">
                <User className="mx-auto size-9" />
              </div>
              <div className="mb-[5px] text-[14px] font-semibold text-muted-foreground">
                직속 구성원이 없습니다
              </div>
              <div className="text-[13px] text-muted-foreground">
                구성원 추가 버튼으로 팀원을 배정하세요
              </div>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 pb-3 pt-2.5 text-left text-[12.5px] font-bold text-muted-foreground">
                    이름
                  </th>
                  <th className="px-3 pb-3 pt-2.5 text-left text-[12.5px] font-bold text-muted-foreground">
                    사번
                  </th>
                  <th className="px-3 pb-3 pt-2.5 text-left text-[12.5px] font-bold text-muted-foreground">
                    직급
                  </th>
                  <th className="px-3 pb-3 pt-2.5 text-center text-[12.5px] font-bold text-muted-foreground">
                    등급
                  </th>
                  <th className="px-3 pb-3 pt-2.5 text-left text-[12.5px] font-bold text-muted-foreground">
                    연락처
                  </th>
                  <th className="w-11" />
                </tr>
              </thead>
              <tbody>
                {mems.map((m) => (
                  <tr key={m.id} className="hover:bg-accent">
                    <td className="border-b border-border/60 p-3">
                      <div className="flex items-center gap-[9px]">
                        <Avatar name={m.name ?? ''} />
                        <span className="text-[14px] font-bold text-foreground">{m.name}</span>
                      </div>
                    </td>
                    <td className="border-b border-border/60 p-3 font-mono text-[12.5px] text-muted-foreground">
                      {m.employee_no}
                    </td>
                    <td className="border-b border-border/60 p-3 text-[13.5px] text-foreground/70">
                      {m.rank}
                    </td>
                    <td className="border-b border-border/60 p-3 text-center">
                      <GradeTag grade={m.grade} />
                    </td>
                    <td className="border-b border-border/60 p-3 font-mono text-[13px] text-foreground/70">
                      {m.phone}
                    </td>
                    <td className="border-b border-border/60 p-3 text-center">
                      <button
                        type="button"
                        title="팀에서 제외"
                        onClick={() => removeMember(m.id)}
                        className="inline-flex size-7 items-center justify-center rounded-[7px] text-muted-foreground hover:bg-om-red-bg hover:text-om-red"
                      >
                        <X className="size-[13px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  /* ---- 구성원 추가 모달 데이터 — 이 팀에 없는 실제 user 후보 ---- */
  const selName = getNode(selectedId)?.name ?? null;
  const availMembers = selName
    ? users.filter((u) => {
        if (u.department === selName) return false; // 이미 이 팀 소속
        if (!memSearch) return true;
        const q = memSearch.toLowerCase();
        return (
          (u.name ?? '').includes(memSearch) ||
          (u.employee_no ?? '').toLowerCase().includes(q) ||
          (u.department ?? '').includes(memSearch)
        );
      })
    : [];

  return (
    <div>
      <div className="grid items-start gap-5 lg:grid-cols-[268px_1fr]">
        {/* 트리 패널 */}
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm lg:sticky lg:top-[88px]">
          <div className="flex items-center justify-between border-b border-border px-3.5 pb-2.5 pt-[15px]">
            <span className="text-[15px] font-extrabold text-foreground">조직 트리</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setShowOrgModal(true)}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-primary bg-om-blue-bg px-2.5 text-[12px] font-bold text-primary"
              >
                <Network className="size-3" /> 조직도 보기
              </button>
              <button
                type="button"
                onClick={addRoot}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-white px-2.5 text-[12px] font-bold text-foreground/70"
              >
                <Plus className="size-3" /> 팀 추가
              </button>
            </div>
          </div>
          <div className="max-h-[calc(100vh-230px)] overflow-y-auto px-1.5 py-2">
            {roots.map((r) => renderNode(r.id, 0))}
          </div>
        </div>

        {/* 상세 패널 */}
        <div>{renderDetail()}</div>
      </div>

      {/* 삭제 확인 모달 */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingId(null);
          }}
        >
          <div className="w-[380px] rounded-2xl bg-white p-7 shadow-xl">
            <div className="mb-2.5 text-[17px] font-extrabold">팀을 삭제할까요?</div>
            <div className="mb-6 text-[14px] leading-relaxed text-muted-foreground">
              <strong className="text-foreground">{deletingNode?.name ?? ''}</strong> 팀
              {deletingDescCount > 0 && (
                <>
                  {' '}
                  및 하위 팀 <strong className="text-om-red">{deletingDescCount}개</strong> 전체
                </>
              )}
              가 삭제됩니다.
              <br />이 작업은 되돌릴 수 없습니다.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingId(null)} className="h-[38px] font-bold">
                취소
              </Button>
              <Button
                onClick={confirmDelete}
                className="h-[38px] bg-om-red font-bold text-white hover:bg-om-red/90"
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 구성원 추가 모달 */}
      {showMemModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMemModal(false);
          }}
        >
          <div className="flex max-h-[82vh] w-[500px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-[22px] pb-3.5 pt-5">
              <div className="text-[17px] font-extrabold text-foreground">
                구성원 추가 · <span className="text-primary">{selNode?.name ?? ''}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMemModal(false)}
                className="flex size-8 items-center justify-center rounded-[9px] text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="relative shrink-0 border-b border-border/60 px-[22px] py-3">
              <Search className="absolute left-[33px] top-1/2 size-[15px] -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={memSearch}
                onChange={(e) => setMemSearch(e.target.value)}
                placeholder="이름, 사번, 소속으로 검색..."
                className="h-9 w-full rounded-lg border border-border bg-muted/40 pl-[34px] pr-3 text-[13.5px] outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {availMembers.length === 0 ? (
                <div className="p-10 text-center text-[14px] text-muted-foreground">
                  추가할 구성원이 없습니다
                </div>
              ) : (
                availMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 hover:bg-accent"
                  >
                    <Avatar name={m.name ?? ''} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-bold text-foreground">{m.name}</div>
                      <div className="text-[12.5px] text-muted-foreground">
                        {m.department ?? '소속 없음'} · {m.rank}
                      </div>
                    </div>
                    <GradeTag grade={m.grade} />
                    <button
                      type="button"
                      onClick={() => addMember(m.id)}
                      className="h-[30px] rounded-[7px] border border-primary bg-om-blue-bg px-3 text-[12.5px] font-bold text-primary"
                    >
                      추가
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 조직도 모달 */}
      {showOrgModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowOrgModal(false);
          }}
        >
          <div className="flex max-h-[88vh] w-[min(92vw,1280px)] flex-col overflow-hidden rounded-2xl bg-om-canvas shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-white px-[22px] py-[17px]">
              <span className="text-[17px] font-extrabold text-foreground">조직도</span>
              <button
                type="button"
                onClick={() => setShowOrgModal(false)}
                className="flex size-8 items-center justify-center rounded-[9px] text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex flex-1 items-start justify-center overflow-auto p-9">
              <OrgChartSvg nodes={nodes} memberCount={memberCount} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const teamsScreens: ScreenModule = {
  'team-list': {
    title: '팀 관리',
    sub: '조직 트리를 확인하고 팀과 구성원을 관리합니다',
    Component: TeamListScreen,
  },
};

export default teamsScreens;
