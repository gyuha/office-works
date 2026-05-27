import type { Table } from '@tanstack/react-table';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DataTableFacetedFilter,
  type DataTableFacetedFilterOption,
} from '@/sample/tasks/components/data-table/data-table-faceted-filter';
import { DataTableViewOptions } from '@/sample/tasks/components/data-table/data-table-view-options';

export interface DataTableToolbarFacetedFilter {
  /** 필터를 적용할 컬럼 id (column.id 와 일치). */
  columnId: string;
  /** 트리거 버튼 라벨. */
  title: string;
  /** 선택 가능한 옵션 목록. */
  options: DataTableFacetedFilterOption[];
}

export interface DataTableToolbarProps<TData> {
  /** TanStack Table 인스턴스. */
  table: Table<TData>;
  /** 텍스트 검색 컬럼 id. 지정하지 않으면 검색 input 미노출. */
  searchColumnId?: string;
  /** 검색 input placeholder. */
  searchPlaceholder?: string;
  /** Faceted 필터 정의 배열. 각 항목은 `columnId` 와 `options` 를 가진다. */
  facetedFilters?: DataTableToolbarFacetedFilter[];
  resetLabel?: string;
  viewLabel?: string;
  toggleColumnsLabel?: string;
  facetedEmptyLabel?: string;
  facetedSelectedLabel?: (count: number) => string;
  facetedClearLabel?: string;
}

/**
 * 데이터 테이블 상단 툴바.
 *
 * - 텍스트 검색 input (특정 컬럼 대상)
 * - faceted filter 들 (status, priority 등)
 * - 필터가 하나라도 적용된 경우 "Reset" 버튼 노출
 * - 우측에 컬럼 가시성 제어 DropdownMenu (DataTableViewOptions)
 */
export function DataTableToolbar<TData>({
  table,
  searchColumnId,
  searchPlaceholder = 'Filter...',
  facetedFilters = [],
  resetLabel = 'Reset',
  viewLabel = 'View',
  toggleColumnsLabel = 'Toggle columns',
  facetedEmptyLabel = 'No results found.',
  facetedSelectedLabel = (count) => `${count} selected`,
  facetedClearLabel = 'Clear filters',
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const searchColumn = searchColumnId ? table.getColumn(searchColumnId) : undefined;
  const searchValue = (searchColumn?.getFilterValue() as string | undefined) ?? '';

  return (
    <div className="flex items-center justify-between gap-2" data-slot="data-table-toolbar">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {searchColumn ? (
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => searchColumn.setFilterValue(event.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
          />
        ) : null}
        {facetedFilters.map((filter) => {
          const column = table.getColumn(filter.columnId);
          if (!column) return null;
          return (
            <DataTableFacetedFilter
              key={filter.columnId}
              column={column}
              title={filter.title}
              options={filter.options}
              emptyLabel={facetedEmptyLabel}
              selectedLabel={facetedSelectedLabel}
              clearLabel={facetedClearLabel}
            />
          );
        })}
        {isFiltered ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            {resetLabel}
            <X />
          </Button>
        ) : null}
      </div>
      <DataTableViewOptions
        table={table}
        viewLabel={viewLabel}
        toggleColumnsLabel={toggleColumnsLabel}
      />
    </div>
  );
}
