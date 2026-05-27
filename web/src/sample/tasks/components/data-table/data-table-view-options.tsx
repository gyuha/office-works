import type { Table } from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface DataTableViewOptionsProps<TData> {
  /** TanStack Table 인스턴스. */
  table: Table<TData>;
  viewLabel?: string;
  toggleColumnsLabel?: string;
}

/**
 * 데이터 테이블 컬럼 가시성(view) 옵션 드롭다운.
 *
 * - 토글 가능한 컬럼만 노출 (`column.getCanHide()`)
 * - DropdownMenuCheckboxItem 으로 가시성 상태 표시
 * - 컬럼 헤더 라벨이 문자열이면 그대로 사용, 아니면 컬럼 id 사용
 */
export function DataTableViewOptions<TData>({
  table,
  viewLabel = 'View',
  toggleColumnsLabel = 'Toggle columns',
}: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
            <Settings2 />
            {viewLabel}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>{toggleColumnsLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
          .map((column) => {
            const headerDef = column.columnDef.header;
            const label = typeof headerDef === 'string' ? headerDef : column.id;
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
              >
                {label}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
