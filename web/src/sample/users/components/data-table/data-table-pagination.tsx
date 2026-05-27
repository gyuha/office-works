import type { Table } from '@tanstack/react-table';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface DataTablePaginationProps<TData> {
  /** tanstack-table 의 table 인스턴스. */
  table: Table<TData>;
  /** 페이지 사이즈 옵션. 기본값: [10, 20, 30, 40, 50]. */
  pageSizeOptions?: number[];
  /** 추가 컨테이너 className. */
  className?: string;
}

/**
 * shadcn-admin DataTablePagination 포팅.
 *
 * - 좌측: 선택된 row / 전체 row 수
 * - 우측: 페이지 사이즈 select + 현재 페이지 / 총 페이지 + 처음/이전/다음/끝 버튼
 *
 * 텍스트는 영어로 하드코딩되어 있다. i18n 으로 묶을 때는 호출 측에서 wrapper 를 만들거나,
 * 후속 sub-task 에서 `aria-label`/`children` 을 t() 로 치환한다.
 */
export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
  className,
}: DataTablePaginationProps<TData>) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const pageSize = table.getState().pagination.pageSize;
  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;
  const totalRowCount = table.getFilteredRowModel().rows.length;

  return (
    <div
      className={cn(
        'flex items-center justify-between overflow-clip px-2',
        'flex-col-reverse gap-3 sm:flex-row sm:gap-8',
        className
      )}
    >
      <div className="hidden flex-1 text-sm text-muted-foreground sm:block">
        {selectedRowCount} of {totalRowCount} row(s) selected.
      </div>
      <div className="flex items-center gap-x-6 gap-y-3 max-sm:flex-wrap lg:gap-x-8">
        <div className="flex items-center gap-2">
          <p className="hidden text-sm font-medium sm:block">Rows per page</p>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger size="sm" className="h-8 w-[70px]">
              <SelectValue placeholder={String(pageSize)} />
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
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} of {Math.max(pageCount, 1)}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to first page"
          >
            <ChevronsLeftIcon aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to previous page"
          >
            <ChevronLeftIcon aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Go to next page"
          >
            <ChevronRightIcon aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Go to last page"
          >
            <ChevronsRightIcon aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
