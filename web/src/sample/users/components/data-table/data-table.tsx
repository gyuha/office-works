import {
  type ColumnDef,
  type ColumnFiltersState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Table as TanstackTable,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * Column meta 확장 — `meta.className` 으로 head/cell 에 추가 클래스를 부여한다.
 *
 * tanstack-table v8 의 ColumnMeta 모듈 보강(declaration merging)이다.
 * 다른 feature 의 컬럼 정의에서도 동일 키를 사용할 수 있다.
 */
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** thead/td 의 추가 className. min-width / 셀 정렬 등 컬럼별 시각 설정을 둔다. */
    className?: string;
    /** 컬럼별 i18n 헤더 라벨 키 (옵션). */
    label?: string;
    /**
     * Module augmentation 시그니처를 유지하기 위한 phantom 필드.
     *
     * `noUnusedParameters` 환경에서 `TData`/`TValue` 가 본문에서 쓰이지 않으면 TS6205 가 발생한다.
     * 두 필드는 절대 채워지지 않으며 phantom 으로만 존재한다.
     */
    __row?: TData;
    __value?: TValue;
  }
}

export interface DataTableProps<TData, TValue> {
  /** 컬럼 정의 배열. `ColumnDef<TData, TValue>` 타입을 따른다. */
  columns: ColumnDef<TData, TValue>[];
  /** 테이블에 표시할 row 데이터. */
  data: TData[];
  /** 데이터가 비었을 때 보여줄 메시지. 기본값: "No results.". */
  emptyMessage?: string;
  /** 추가 컨테이너 className. */
  className?: string;
  /**
   * 툴바·페이지네이션 등을 합성하기 위한 children render prop.
   *
   * `table` 인스턴스를 그대로 전달하므로 외부에서 정렬/필터/페이지/선택 상태를 모두 제어할 수 있다.
   */
  children?: (table: TanstackTable<TData>) => React.ReactNode;
  /**
   * 툴바 영역을 children 바깥에서 직접 제공하고 싶을 때 사용한다.
   *
   * children 보다 위, 테이블 컨테이너 위에 렌더된다.
   */
  toolbar?: (table: TanstackTable<TData>) => React.ReactNode;
}

/**
 * shadcn-admin /users·/tasks 가 공통으로 사용하는 재사용 가능한 DataTable.
 *
 * - TanStack Table v8 기반
 * - core / sorted / filtered / paginated / faceted row models 모두 활성화
 * - 정렬·컬럼 필터·컬럼 가시성·row 선택 상태를 내부에서 관리
 * - `toolbar` prop 또는 `children` render prop 으로 toolbar / pagination 합성 가능
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = 'No results.',
  className,
  children,
  toolbar,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable<TData>({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className={cn('space-y-4', className)}>
      {toolbar?.(table)}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={header.column.columnDef.meta?.className}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {children?.(table)}
    </div>
  );
}
