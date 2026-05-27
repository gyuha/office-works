import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DataTablePaginationLabels {
  selectedRows: (selected: number, total: number) => string;
  rowsPerPage: string;
  pageOf: (page: number, pageCount: number) => string;
  goFirst: string;
  goPrevious: string;
  goNext: string;
  goLast: string;
}

export interface DataTablePaginationProps<TData> {
  /** TanStack Table 인스턴스. */
  table: Table<TData>;
  /** 페이지 사이즈 옵션. 기본값 [10, 20, 30, 40, 50]. */
  pageSizeOptions?: number[];
  labels?: DataTablePaginationLabels;
}

const defaultPaginationLabels: DataTablePaginationLabels = {
  selectedRows: (selected, total) => `${selected} of ${total} row(s) selected.`,
  rowsPerPage: 'Rows per page',
  pageOf: (page, pageCount) => `Page ${page} of ${pageCount}`,
  goFirst: 'Go to first page',
  goPrevious: 'Go to previous page',
  goNext: 'Go to next page',
  goLast: 'Go to last page',
};

/**
 * 데이터 테이블 페이지네이션 컨트롤.
 *
 * - 선택된 row 개수 / 전체 row 개수 표시
 * - 페이지 사이즈 선택 (Select)
 * - 현재 페이지 / 전체 페이지 표시
 * - 처음/이전/다음/마지막 페이지 이동 버튼
 */
export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
  labels = defaultPaginationLabels,
}: DataTablePaginationProps<TData>) {
  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;
  const totalRowCount = table.getFilteredRowModel().rows.length;
  const pageSize = table.getState().pagination.pageSize;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  return (
    <div
      className="flex flex-col-reverse items-center gap-4 overflow-auto px-2 sm:flex-row sm:gap-6 lg:gap-8"
      data-slot="data-table-pagination"
    >
      <div className="flex-1 text-sm text-muted-foreground">
        {labels.selectedRows(selectedRowCount, totalRowCount)}
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium whitespace-nowrap">{labels.rowsPerPage}</p>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[4.5rem]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium whitespace-nowrap">
          {labels.pageOf(pageIndex + 1, Math.max(pageCount, 1))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{labels.goFirst}</span>
            <ChevronsLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{labels.goPrevious}</span>
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{labels.goNext}</span>
            <ChevronRight />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden lg:flex"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{labels.goLast}</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
