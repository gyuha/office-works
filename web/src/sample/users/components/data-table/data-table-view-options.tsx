import type { Table } from '@tanstack/react-table';
import { Settings2Icon } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface DataTableViewOptionsProps<TData> {
  /** tanstack-table 의 table 인스턴스. */
  table: Table<TData>;
}

/**
 * 컬럼 가시성 토글 드롭다운.
 *
 * `accessorFn` 으로만 정의된 컬럼이나 hide 가능한 일반 컬럼만 노출한다.
 * 컬럼별 라벨은 `column.columnDef.meta?.label` 이 있으면 우선 사용하고,
 * 없으면 `column.id` 를 fallback 으로 사용한다.
 */
export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'ml-auto hidden h-8 lg:flex',
            })}
            aria-label="Toggle columns"
          />
        }
      >
        <Settings2Icon aria-hidden />
        View
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hideableColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            className="capitalize"
            checked={column.getIsVisible()}
            onCheckedChange={(value) => column.toggleVisibility(value === true)}
          >
            {column.columnDef.meta?.label ?? column.id}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
