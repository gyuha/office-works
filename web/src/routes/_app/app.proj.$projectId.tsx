import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  getProjectApiV1ProjectsProjectIdGetOptions,
  listProjectsApiV1ProjectsGetQueryKey,
  updateProjectApiV1ProjectsProjectIdPutMutation,
} from '@/client/@tanstack/react-query.gen';
import {
  ChevL,
  DETAIL_TABS,
  EditView,
  type Project,
  ProjectDetailContext,
  StatusBadge,
  toUiProject,
} from '@/features/office/screens/projects';

export const Route = createFileRoute('/_app/app/proj/$projectId')({
  component: ProjectDetailLayout,
});

function ProjectDetailLayout() {
  const { projectId } = useParams({ from: '/_app/app/proj/$projectId' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Project | null>(null);
  const [, force] = useState(0);

  const q = useQuery(
    getProjectApiV1ProjectsProjectIdGetOptions({ path: { project_id: projectId } })
  );

  // 서버 데이터가 로드/갱신되면 편집용 draft를 (재)초기화한다.
  useEffect(() => {
    if (q.data) setDraft(structuredClone(toUiProject(q.data)));
  }, [q.data]);

  const updateMut = useMutation({
    ...updateProjectApiV1ProjectsProjectIdPutMutation(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: listProjectsApiV1ProjectsGetQueryKey() }),
    onError: () => toast.error('저장에 실패했습니다'),
  });

  // 탭/편집에서 draft를 메모리 변이한 뒤 호출 — 리렌더 + 전체 프로젝트 PUT 영속화
  const persist = () => {
    if (!draft) return;
    force((n) => n + 1);
    updateMut.mutate({ path: { project_id: draft.id }, body: draft });
  };

  const backToList = () => navigate({ to: '/app/$screenId', params: { screenId: 'proj-list' } });

  if (q.isError) {
    return (
      <div className="px-1 py-10 text-sm text-om-red">
        프로젝트를 찾을 수 없습니다.{' '}
        <button type="button" onClick={backToList} className="cursor-pointer underline">
          목록으로
        </button>
      </div>
    );
  }
  if (q.isLoading || !draft) {
    return <div className="px-1 py-10 text-sm text-muted-foreground">프로젝트를 불러오는 중…</div>;
  }

  if (editing) {
    return (
      <EditView
        project={draft}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          persist();
        }}
      />
    );
  }

  return (
    <ProjectDetailContext.Provider value={{ project: draft, bump: persist }}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-4 flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={backToList}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-white px-3 py-[7px] text-[13px] font-semibold text-foreground/80"
          >
            <ChevL />
            목록으로
          </button>
          <span className="text-xs text-muted-foreground">프로젝트 관리</span>
          <span className="text-sm text-muted-foreground">/</span>
          <span className="text-sm font-bold text-foreground">{draft.name}</span>
          <StatusBadge s={draft.status} />
          <span className="ml-auto" />
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-[34px] cursor-pointer rounded-md border border-border bg-white px-4 text-[13px] font-semibold text-foreground/80"
          >
            편집
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="flex shrink-0 overflow-x-auto border-b border-border">
            {DETAIL_TABS.map((t) => (
              <Link
                key={t.id}
                to="/app/proj/$projectId/$tab"
                params={{ projectId, tab: t.id }}
                className="whitespace-nowrap border-b-[2.5px] px-[18px] py-3 text-[13.5px] transition-colors"
                activeProps={{ className: 'border-primary font-bold text-primary' }}
                inactiveProps={{ className: 'border-transparent font-medium text-foreground/70' }}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-[22px]">
            <Outlet />
          </div>
        </div>
      </div>
    </ProjectDetailContext.Provider>
  );
}
