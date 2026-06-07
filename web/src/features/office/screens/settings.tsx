import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  createEmploymentTypeApiV1EmploymentTypesPostMutation,
  createGradeApiV1GradesPostMutation,
  createPositionApiV1PositionsPostMutation,
  deleteEmploymentTypeApiV1EmploymentTypesTypeIdDeleteMutation,
  deleteGradeApiV1GradesGradeIdDeleteMutation,
  deletePositionApiV1PositionsPositionIdDeleteMutation,
  listEmploymentTypesApiV1EmploymentTypesGetOptions,
  listEmploymentTypesApiV1EmploymentTypesGetQueryKey,
  listGradesApiV1GradesGetOptions,
  listGradesApiV1GradesGetQueryKey,
  listPositionsApiV1PositionsGetOptions,
  listPositionsApiV1PositionsGetQueryKey,
  renamePositionApiV1PositionsPositionIdPatchMutation,
  reorderGradesApiV1GradesOrderPatchMutation,
  reorderPositionsApiV1PositionsOrderPatchMutation,
  updateGradeApiV1GradesGradeIdPatchMutation,
} from '@/client/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';
import { OfficeIcon, type OfficeIconName } from '../icons';
import type { ScreenModule } from './types';

/* ============================================================
   OfficeMate — 설정 (org) screen
   직급 체계 / 등급 체계 / 고용 형태 / 근무 기본값 / 연차 설정 / 회사 정보
   ============================================================ */

type TabKey = 'ranks' | 'grades' | 'empTypes' | 'work' | 'leave' | 'company';

const TABS: { key: TabKey; icon: OfficeIconName; label: string }[] = [
  { key: 'ranks', icon: 'badge', label: '직급 체계' },
  { key: 'grades', icon: 'skill', label: '등급 체계' },
  { key: 'empTypes', icon: 'account', label: '고용 형태' },
  { key: 'work', icon: 'clock', label: '근무 기본값' },
  { key: 'leave', icon: 'leave', label: '연차 설정' },
  { key: 'company', icon: 'dept', label: '회사 정보' },
];

/* ---------------- 재사용 카드 ---------------- */

function SettingsPanel({ children }: { children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      {children}
    </section>
  );
}

function PanelHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="border-b border-border px-[22px] pb-3.5 pt-[18px]">
      <div className="text-[16px] font-extrabold text-[#1B2435]">{title}</div>
      <div className="mt-[3px] text-[13px] text-[#8A94A6]">{sub}</div>
    </div>
  );
}

const SAVE_BTN =
  'h-[38px] rounded-md border-none bg-primary px-[22px] text-[14px] font-bold text-white shadow-[0_2px_8px_rgba(0,102,255,0.25)] transition-opacity hover:opacity-90';

const TEXT_INPUT =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-[14px] outline-none transition-colors focus:border-primary';

/* ================================================================
   1. 직급 체계
================================================================ */

function RanksTab() {
  const queryClient = useQueryClient();
  const positionsQuery = useQuery(listPositionsApiV1PositionsGetOptions());
  const positions = positionsQuery.data ?? [];

  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [newVal, setNewVal] = useState('');

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: listPositionsApiV1PositionsGetQueryKey() });

  const createMut = useMutation({
    ...createPositionApiV1PositionsPostMutation(),
    onSuccess: () => {
      setNewVal('');
      invalidate();
    },
    onError: () => toast.error('직급 추가에 실패했습니다.'),
  });
  const renameMut = useMutation({
    ...renamePositionApiV1PositionsPositionIdPatchMutation(),
    onSuccess: () => {
      setEditId(null);
      invalidate();
    },
    onError: () => toast.error('직급 수정에 실패했습니다.'),
  });
  const deleteMut = useMutation({
    ...deletePositionApiV1PositionsPositionIdDeleteMutation(),
    onSuccess: invalidate,
    onError: () => toast.error('직급 삭제에 실패했습니다.'),
  });
  const reorderMut = useMutation({
    ...reorderPositionsApiV1PositionsOrderPatchMutation(),
    onSuccess: invalidate,
    onError: () => toast.error('순서 변경에 실패했습니다.'),
  });

  const busy =
    createMut.isPending || renameMut.isPending || deleteMut.isPending || reorderMut.isPending;

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= positions.length) return;
    const ids = positions.map((p) => p.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderMut.mutate({ body: { ordered_ids: ids } });
  };

  const remove = (id: string) => {
    if (positions.length <= 1) return;
    deleteMut.mutate({ path: { position_id: id } });
  };

  const startEdit = (id: string, name: string) => {
    setEditId(id);
    setEditVal(name);
  };

  const saveEdit = () => {
    const v = editVal.trim();
    if (v && editId) renameMut.mutate({ path: { position_id: editId }, body: { name: v } });
    else setEditId(null);
  };

  const addRank = () => {
    const v = newVal.trim();
    if (v && !positions.some((p) => p.name === v)) createMut.mutate({ body: { name: v } });
  };

  return (
    <SettingsPanel>
      <PanelHead
        title="직급 체계"
        sub="낮은 직급 → 높은 직급 순으로 정렬합니다. 호버하여 편집하세요."
      />
      <div className="px-3.5 py-2.5">
        {positionsQuery.isPending ? (
          <div className="py-10 text-center text-[13.5px] text-[#8A94A6]">불러오는 중…</div>
        ) : positionsQuery.isError ? (
          <div className="py-10 text-center text-[13.5px] text-om-red">
            직급 목록을 불러오지 못했습니다.
          </div>
        ) : (
          positions.map((p, i) =>
            editId === p.id ? (
              <div
                key={p.id}
                className="mb-[3px] flex items-center gap-2 rounded-[9px] bg-[#E8F0FF] px-2 py-[7px]"
              >
                <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-[7px] bg-om-blue-bg font-mono text-[11px] font-extrabold text-primary">
                  {i + 1}
                </span>
                <input
                  ref={(node) => node?.focus()}
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') setEditId(null);
                  }}
                  className="h-8 flex-1 rounded-[7px] border-[1.5px] border-primary bg-white px-2.5 text-[14px] outline-none"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={saveEdit}
                  className="h-8 rounded-[7px] border-none bg-primary px-3.5 text-[13px] font-bold text-white disabled:opacity-50"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="h-8 rounded-[7px] border border-border bg-white px-2.5 text-[13px] font-semibold text-[#4A5468]"
                >
                  취소
                </button>
              </div>
            ) : (
              <div
                key={p.id}
                className="group/rank mb-[3px] flex items-center gap-2.5 rounded-[9px] px-2 py-[9px] transition-colors hover:bg-[#F5F6F8]"
              >
                <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-[7px] bg-[#F0F1F3] font-mono text-[11px] font-extrabold text-[#8A94A6]">
                  {i + 1}
                </span>
                <span className="flex-1 text-[14px] font-semibold text-[#1B2435]">{p.name}</span>
                <span className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/rank:opacity-100">
                  <button
                    type="button"
                    disabled={i === 0 || busy}
                    onClick={() => move(i, -1)}
                    className="flex size-[26px] items-center justify-center rounded-md text-[#8A94A6] transition-colors hover:bg-[#E9EBEF] disabled:opacity-30 [&_svg]:size-4 [&_svg]:rotate-180"
                  >
                    <OfficeIcon name="chevDown" />
                  </button>
                  <button
                    type="button"
                    disabled={i === positions.length - 1 || busy}
                    onClick={() => move(i, 1)}
                    className="flex size-[26px] items-center justify-center rounded-md text-[#8A94A6] transition-colors hover:bg-[#E9EBEF] disabled:opacity-30 [&_svg]:size-4"
                  >
                    <OfficeIcon name="chevDown" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(p.id, p.name)}
                    className="flex size-[26px] items-center justify-center rounded-md text-[#8A94A6] transition-colors hover:bg-[#E9EBEF] [&_svg]:size-4"
                  >
                    <OfficeIcon name="write" />
                  </button>
                  {positions.length > 1 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(p.id)}
                      className="flex size-[26px] items-center justify-center rounded-md text-[14px] font-bold text-om-red transition-colors hover:bg-om-red-bg disabled:opacity-30"
                    >
                      ✕
                    </button>
                  )}
                </span>
              </div>
            )
          )
        )}
        <div className="mt-1.5 flex gap-2 border-t border-[#EEF0F3] px-2 pb-1 pt-2.5">
          <input
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRank()}
            placeholder="새 직급 이름 입력..."
            className="h-[34px] flex-1 rounded-md border border-border bg-[#F8F9FA] px-3 text-[13.5px] outline-none focus:border-primary"
          />
          <button
            type="button"
            disabled={busy}
            onClick={addRank}
            className="h-[34px] rounded-md border-none bg-primary px-4 text-[13px] font-bold text-white disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </div>
    </SettingsPanel>
  );
}

/* ================================================================
   2. 등급 체계
================================================================ */

interface GradeForm {
  name: string;
  color: string;
  bg: string;
  border: string;
  description: string;
}

const BLANK_GRADE: GradeForm = {
  name: '',
  color: '#0066FF',
  bg: '#E8F0FF',
  border: '#A9C9FF',
  description: '',
};

function GradesTab() {
  const queryClient = useQueryClient();
  const gradesQuery = useQuery(listGradesApiV1GradesGetOptions());
  const grades = gradesQuery.data ?? [];
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<GradeForm>(BLANK_GRADE);
  const [adding, setAdding] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: listGradesApiV1GradesGetQueryKey() });

  const createMut = useMutation({
    ...createGradeApiV1GradesPostMutation(),
    onSuccess: () => {
      setAdding(false);
      setForm(BLANK_GRADE);
      invalidate();
    },
    onError: () => toast.error('등급 추가에 실패했습니다.'),
  });
  const updateMut = useMutation({
    ...updateGradeApiV1GradesGradeIdPatchMutation(),
    onSuccess: () => {
      setEditId(null);
      invalidate();
    },
    onError: () => toast.error('등급 수정에 실패했습니다.'),
  });
  const deleteMut = useMutation({
    ...deleteGradeApiV1GradesGradeIdDeleteMutation(),
    onSuccess: invalidate,
    onError: () => toast.error('사용 중인 등급은 삭제할 수 없습니다.'),
  });
  const reorderMut = useMutation({
    ...reorderGradesApiV1GradesOrderPatchMutation(),
    onSuccess: invalidate,
    onError: () => toast.error('순서 변경에 실패했습니다.'),
  });
  const busy =
    createMut.isPending || updateMut.isPending || deleteMut.isPending || reorderMut.isPending;

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= grades.length) return;
    const ids = grades.map((g) => g.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderMut.mutate({ body: { ordered_ids: ids } });
  };

  return (
    <SettingsPanel>
      <PanelHead
        title="등급 체계"
        sub="구성원의 역량 등급 기준을 정의합니다. 호버하여 편집하세요."
      />
      <div className="py-2">
        {gradesQuery.isPending ? (
          <div className="px-[22px] py-10 text-center text-[13.5px] text-[#8A94A6]">
            불러오는 중…
          </div>
        ) : gradesQuery.isError ? (
          <div className="px-[22px] py-10 text-center text-[13.5px] text-om-red">
            등급을 불러오지 못했습니다.
          </div>
        ) : (
          grades.map((g, i) =>
            editId === g.id ? (
              <GradeEditRow
                key={g.id}
                form={form}
                setForm={setForm}
                busy={busy}
                onSave={() => updateMut.mutate({ path: { grade_id: g.id }, body: { ...form } })}
                onCancel={() => setEditId(null)}
              />
            ) : (
              <div
                key={g.id}
                className="group/grade flex items-center gap-4 border-b border-[#EEF0F3] px-[22px] py-4 transition-colors last:border-b-0 hover:bg-[#F8F9FA]"
              >
                <span
                  className="flex w-[58px] flex-shrink-0 items-center justify-center rounded-lg border py-1.5 text-[13px] font-extrabold"
                  style={{ background: g.bg, color: g.color, borderColor: g.border }}
                >
                  {g.name}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-[#1B2435]">{g.name}</div>
                  <div className="mt-[3px] text-[13px] text-[#8A94A6]">{g.description}</div>
                </div>
                <span className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/grade:opacity-100">
                  <button
                    type="button"
                    disabled={i === 0 || busy}
                    onClick={() => move(i, -1)}
                    className="flex size-[26px] items-center justify-center rounded-md text-[#8A94A6] hover:bg-[#E9EBEF] disabled:opacity-30 [&_svg]:size-4 [&_svg]:rotate-180"
                  >
                    <OfficeIcon name="chevDown" />
                  </button>
                  <button
                    type="button"
                    disabled={i === grades.length - 1 || busy}
                    onClick={() => move(i, 1)}
                    className="flex size-[26px] items-center justify-center rounded-md text-[#8A94A6] hover:bg-[#E9EBEF] disabled:opacity-30 [&_svg]:size-4"
                  >
                    <OfficeIcon name="chevDown" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(g.id);
                      setForm({
                        name: g.name,
                        color: g.color,
                        bg: g.bg,
                        border: g.border,
                        description: g.description,
                      });
                    }}
                    className="flex size-[26px] items-center justify-center rounded-md text-[#8A94A6] hover:bg-[#E9EBEF] [&_svg]:size-4"
                  >
                    <OfficeIcon name="write" />
                  </button>
                  {grades.length > 1 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteMut.mutate({ path: { grade_id: g.id } })}
                      className="flex size-[26px] items-center justify-center rounded-md text-[14px] font-bold text-om-red hover:bg-om-red-bg disabled:opacity-30"
                    >
                      ✕
                    </button>
                  )}
                </span>
              </div>
            )
          )
        )}
        {adding ? (
          <div className="px-[22px] py-3">
            <GradeEditRow
              form={form}
              setForm={setForm}
              busy={busy}
              onSave={() => createMut.mutate({ body: { ...form } })}
              onCancel={() => {
                setAdding(false);
                setForm(BLANK_GRADE);
              }}
            />
          </div>
        ) : (
          <div className="px-[22px] pb-1 pt-3">
            <button
              type="button"
              onClick={() => {
                setForm(BLANK_GRADE);
                setAdding(true);
              }}
              className="h-[34px] rounded-md border-none bg-primary px-4 text-[13px] font-bold text-white"
            >
              + 등급 추가
            </button>
          </div>
        )}
      </div>
    </SettingsPanel>
  );
}

function GradeEditRow({
  form,
  setForm,
  busy,
  onSave,
  onCancel,
}: {
  form: GradeForm;
  setForm: React.Dispatch<React.SetStateAction<GradeForm>>;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const upd = <K extends keyof GradeForm>(k: K, v: GradeForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[9px] bg-[#E8F0FF] px-3 py-2.5">
      <input
        value={form.name}
        onChange={(e) => upd('name', e.target.value)}
        placeholder="등급명"
        className="h-8 w-[110px] rounded-[7px] border-[1.5px] border-primary bg-white px-2.5 text-[14px] outline-none"
      />
      <label className="flex items-center gap-1 text-[12px] text-[#4A5468]">
        글자
        <input
          type="color"
          value={form.color}
          onChange={(e) => upd('color', e.target.value)}
          className="size-7 cursor-pointer rounded border-none bg-transparent"
        />
      </label>
      <label className="flex items-center gap-1 text-[12px] text-[#4A5468]">
        배경
        <input
          type="color"
          value={form.bg}
          onChange={(e) => upd('bg', e.target.value)}
          className="size-7 cursor-pointer rounded border-none bg-transparent"
        />
      </label>
      <label className="flex items-center gap-1 text-[12px] text-[#4A5468]">
        테두리
        <input
          type="color"
          value={form.border}
          onChange={(e) => upd('border', e.target.value)}
          className="size-7 cursor-pointer rounded border-none bg-transparent"
        />
      </label>
      <input
        value={form.description}
        onChange={(e) => upd('description', e.target.value)}
        placeholder="설명"
        className="h-8 min-w-[140px] flex-1 rounded-[7px] border border-border bg-white px-2.5 text-[13.5px] outline-none"
      />
      <button
        type="button"
        disabled={busy}
        onClick={onSave}
        className="h-8 rounded-[7px] border-none bg-primary px-3.5 text-[13px] font-bold text-white disabled:opacity-50"
      >
        저장
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="h-8 rounded-[7px] border border-border bg-white px-2.5 text-[13px] font-semibold text-[#4A5468]"
      >
        취소
      </button>
    </div>
  );
}

/* ================================================================
   3. 고용 형태
================================================================ */

function EmpTypesTab() {
  const queryClient = useQueryClient();
  const typesQuery = useQuery(listEmploymentTypesApiV1EmploymentTypesGetOptions());
  const types = typesQuery.data ?? [];
  const [newVal, setNewVal] = useState('');

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: listEmploymentTypesApiV1EmploymentTypesGetQueryKey(),
    });

  const createMut = useMutation({
    ...createEmploymentTypeApiV1EmploymentTypesPostMutation(),
    onSuccess: () => {
      setNewVal('');
      invalidate();
    },
    onError: () => toast.error('고용 형태 추가에 실패했습니다.'),
  });
  const deleteMut = useMutation({
    ...deleteEmploymentTypeApiV1EmploymentTypesTypeIdDeleteMutation(),
    onSuccess: invalidate,
    onError: () => toast.error('고용 형태 삭제에 실패했습니다.'),
  });
  const busy = createMut.isPending || deleteMut.isPending;

  const add = () => {
    const v = newVal.trim();
    if (v && !types.some((t) => t.name === v)) createMut.mutate({ body: { name: v } });
  };

  return (
    <SettingsPanel>
      <PanelHead title="고용 형태" sub="구성원 등록 시 선택 가능한 고용 형태 유형을 관리합니다" />
      <div className="px-[22px] py-5">
        <div className="mb-[18px] flex min-h-10 flex-wrap gap-2">
          {typesQuery.isPending ? (
            <span className="text-[13.5px] text-[#8A94A6]">불러오는 중…</span>
          ) : typesQuery.isError ? (
            <span className="text-[13.5px] text-om-red">고용 형태를 불러오지 못했습니다.</span>
          ) : (
            types.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-[#F8F9FA] px-3.5 py-[7px] text-[13.5px] font-semibold text-[#4A5468]"
              >
                {t.name}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => deleteMut.mutate({ path: { type_id: t.id } })}
                  className="flex size-4 items-center justify-center rounded-full text-[13px] leading-none text-[#8A94A6] transition-colors hover:bg-[#E0E2E6] hover:text-om-red disabled:opacity-40"
                >
                  ✕
                </button>
              </span>
            ))
          )}
        </div>
        <div className="flex gap-2 border-t border-[#EEF0F3] pt-3.5">
          <input
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="새 고용 형태 입력..."
            className="h-[34px] flex-1 rounded-md border border-border bg-[#F8F9FA] px-3 text-[13.5px] outline-none focus:border-primary"
          />
          <button
            type="button"
            disabled={busy}
            onClick={add}
            className="h-[34px] rounded-md border-none bg-primary px-4 text-[13px] font-bold text-white disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </div>
    </SettingsPanel>
  );
}

/* ================================================================
   4. 근무 기본값
================================================================ */

function toMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function WorkTab() {
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');
  const [lunchStart, setLunchStart] = useState('12:00');
  const [lunchEnd, setLunchEnd] = useState('13:00');
  const [breakMin, setBreakMin] = useState(10);

  let calc = '-';
  try {
    const total = toMin(end) - toMin(start) - (toMin(lunchEnd) - toMin(lunchStart));
    calc = (total / 60).toFixed(1);
  } catch {
    calc = '-';
  }

  const TimeField = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <label className="flex flex-col gap-[7px]">
      <span className="text-[13px] font-bold text-[#4A5468]">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(TEXT_INPUT, 'w-[140px]')}
      />
    </label>
  );

  return (
    <SettingsPanel>
      <PanelHead title="근무 기본값" sub="표준 근무 시간 및 휴게 시간을 설정합니다" />
      <div className="p-[22px]">
        <div className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-[#8A94A6]">
          근무 시간
        </div>
        <div className="mb-[22px] flex flex-wrap items-end gap-6">
          <TimeField label="출근 시간" value={start} onChange={setStart} />
          <span className="pb-2.5 text-[16px] text-[#8A94A6]">—</span>
          <TimeField label="퇴근 시간" value={end} onChange={setEnd} />
        </div>

        <div className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-[#8A94A6]">
          점심·휴게
        </div>
        <div className="mb-1.5 flex flex-wrap items-end gap-6">
          <TimeField label="점심 시작" value={lunchStart} onChange={setLunchStart} />
          <span className="pb-2.5 text-[16px] text-[#8A94A6]">—</span>
          <TimeField label="점심 종료" value={lunchEnd} onChange={setLunchEnd} />
          <label className="flex flex-col gap-[7px]">
            <span className="text-[13px] font-bold text-[#4A5468]">추가 휴게 (분)</span>
            <input
              type="number"
              min={0}
              max={120}
              value={breakMin}
              onChange={(e) => setBreakMin(Number(e.target.value))}
              className={cn(TEXT_INPUT, 'w-[100px] font-mono font-bold')}
            />
          </label>
        </div>

        <div className="mt-[18px] rounded-lg border border-[#A9C9FF] bg-om-blue-bg px-4 py-3.5">
          <span className="text-[13px] font-bold text-primary">
            일 표준 근무시간: <span className="font-mono">{calc}</span>시간
          </span>
        </div>

        <div className="mt-[18px] flex justify-end">
          <button
            type="button"
            onClick={() => toast.success('근무 기본값이 저장되었습니다')}
            className={SAVE_BTN}
          >
            저장
          </button>
        </div>
      </div>
    </SettingsPanel>
  );
}

/* ================================================================
   5. 연차 설정
================================================================ */

function LeaveTab() {
  const [defaultDays, setDefaultDays] = useState(15);
  const [probDays, setProbDays] = useState(3);
  const [addPerYear, setAddPerYear] = useState(1);
  const [maxAdd, setMaxAdd] = useState(5);
  const [expiryMonths, setExpiryMonths] = useState(24);

  const NumField = ({
    label,
    value,
    onChange,
    unit,
    min,
    max,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    unit: string;
    min: number;
    max: number;
  }) => (
    <label className="flex flex-col gap-[7px]">
      <span className="text-[13px] font-bold text-[#4A5468]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-10 w-[88px] rounded-md border border-border bg-white text-center font-mono text-[18px] font-extrabold outline-none transition-colors focus:border-primary"
        />
        <span className="text-[13.5px] text-[#8A94A6]">{unit}</span>
      </div>
    </label>
  );

  return (
    <SettingsPanel>
      <PanelHead title="연차 설정" sub="연차 발생 기준 및 기본값을 설정합니다" />
      <div className="p-[22px]">
        <div className="mb-[22px] grid max-w-[560px] grid-cols-[repeat(3,auto)] gap-x-9 gap-y-5">
          <NumField
            label="기본 연차"
            value={defaultDays}
            onChange={setDefaultDays}
            unit="일/년"
            min={1}
            max={365}
          />
          <NumField
            label="수습 기간 연차"
            value={probDays}
            onChange={setProbDays}
            unit="일"
            min={0}
            max={30}
          />
          <NumField
            label="근속 추가 (년당)"
            value={addPerYear}
            onChange={setAddPerYear}
            unit="일"
            min={0}
            max={10}
          />
          <NumField
            label="최대 추가 한도"
            value={maxAdd}
            onChange={setMaxAdd}
            unit="일"
            min={0}
            max={30}
          />
          <NumField
            label="연차 소멸 기간"
            value={expiryMonths}
            onChange={setExpiryMonths}
            unit="개월"
            min={1}
            max={60}
          />
        </div>

        <div className="rounded-lg border border-[#FFD9A0] bg-om-orange-bg px-4 py-3.5 text-[12.5px] leading-[1.7] text-[#4A5468]">
          <strong className="mb-1 block text-om-orange">⚠️ 근로기준법 유의사항</strong>
          1년 미만 근로자: 월 1일 발생 (최대 11일) · 1년 이상: 최소 15일 보장 (근로기준법 제60조)
        </div>

        <div className="mt-[18px] flex justify-end">
          <button
            type="button"
            onClick={() => toast.success('연차 설정이 저장되었습니다')}
            className={SAVE_BTN}
          >
            저장
          </button>
        </div>
      </div>
    </SettingsPanel>
  );
}

/* ================================================================
   6. 회사 정보
================================================================ */

function CompanyTab() {
  const [form, setForm] = useState({
    name: '오피스메이트 주식회사',
    bizNo: '123-45-67890',
    ceo: '홍길동',
    founded: '2018-03-15',
    tel: '02-1234-5678',
    email: 'contact@officemate.co.kr',
    addr: '서울특별시 강남구 테헤란로 123 오피스메이트빌딩 7층',
  });

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const Field = ({
    label,
    value,
    onChange,
    type = 'text',
    span,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    span?: boolean;
  }) => {
    const fieldId = `co-${label}`;
    return (
      <div className={cn('flex flex-col gap-[7px]', span && 'col-span-2')}>
        <label htmlFor={fieldId} className="text-[13px] font-bold text-[#4A5468]">
          {label}
        </label>
        {type === 'textarea' ? (
          <textarea
            id={fieldId}
            rows={2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="resize-y rounded-md border border-border bg-white px-3 py-2.5 text-[14px] leading-relaxed outline-none transition-colors focus:border-primary"
          />
        ) : (
          <input
            id={fieldId}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={TEXT_INPUT}
          />
        )}
      </div>
    );
  };

  return (
    <SettingsPanel>
      <PanelHead title="회사 정보" sub="기본 회사 정보를 입력하고 저장합니다" />
      <div className="p-[22px]">
        <div className="grid max-w-[640px] grid-cols-2 gap-x-6 gap-y-[18px]">
          <Field label="회사명" value={form.name} onChange={set('name')} span />
          <Field label="사업자등록번호" value={form.bizNo} onChange={set('bizNo')} />
          <Field label="대표자" value={form.ceo} onChange={set('ceo')} />
          <Field label="설립일" value={form.founded} onChange={set('founded')} type="date" />
          <Field label="대표 전화" value={form.tel} onChange={set('tel')} type="tel" />
          <Field label="대표 이메일" value={form.email} onChange={set('email')} type="email" />
          <Field label="주소" value={form.addr} onChange={set('addr')} type="textarea" span />
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => toast.success('회사 정보가 저장되었습니다')}
            className={SAVE_BTN}
          >
            저장
          </button>
        </div>
      </div>
    </SettingsPanel>
  );
}

/* ================================================================
   MAIN SCREEN
================================================================ */

function SettingsScreen() {
  const [tab, setTab] = useState<TabKey>('ranks');

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[210px_1fr]">
      <nav className="sticky top-[88px] flex flex-col gap-0.5 rounded-xl border border-border bg-white p-2 shadow-sm">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-[9px] border-none px-3 py-2.5 text-left text-[13.5px] transition-colors [&_svg]:size-[18px] [&_svg]:flex-shrink-0',
                active
                  ? 'bg-[#E8F0FF] font-bold text-primary'
                  : 'font-medium text-[#4A5468] hover:bg-[#F5F6F8]'
              )}
            >
              <span className={cn(active ? 'text-primary' : 'text-[#8A94A6]')}>
                <OfficeIcon name={t.icon} />
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>

      <div>
        {tab === 'ranks' && <RanksTab />}
        {tab === 'grades' && <GradesTab />}
        {tab === 'empTypes' && <EmpTypesTab />}
        {tab === 'work' && <WorkTab />}
        {tab === 'leave' && <LeaveTab />}
        {tab === 'company' && <CompanyTab />}
      </div>
    </div>
  );
}

export const settingsScreens: ScreenModule = {
  org: {
    title: '설정',
    sub: '회사 운영에 필요한 기본 설정을 관리합니다',
    Component: SettingsScreen,
  },
};
