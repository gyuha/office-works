import type { Table } from '@tanstack/react-table';
import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  DataTableFacetedFilter,
  type DataTableFacetedFilterOption,
} from '@/sample/users/components/data-table/data-table-faceted-filter';
import { DataTableViewOptions } from '@/sample/users/components/data-table/data-table-view-options';

export interface DataTableToolbarFilter {
  /** 필터를 걸 컬럼 id (`column.id`). 컬럼 정의에 array-includes 호환 `filterFn` 이 필요하다. */
  columnId: string;
  /** 필터 트리거 버튼에 표시할 라벨. */
  title: string;
  /** 다중 선택 옵션 목록. */
  options: DataTableFacetedFilterOption[];
}

export interface DataTableToolbarProps<TData> {
  /** tanstack-table 의 table 인스턴스. */
  table: Table<TData>;
  /**
   * 텍스트 검색을 걸 컬럼 id (`column.id`).
   *
   * 지정하지 않으면 검색 input 자체를 렌더하지 않는다.
   */
  searchColumnId?: string;
  /** 검색 input placeholder. */
  searchPlaceholder?: string;
  /** 다중 선택 카테고리 필터 정의. 좌측에서 우측 순으로 렌더된다. */
  filters?: DataTableToolbarFilter[];
  /** 우측 끝에 추가 렌더할 액션(예: New User 버튼). */
  actions?: React.ReactNode;
  /** view options 드롭다운 노출 여부. 기본값: true. */
  showViewOptions?: boolean;
  /** 추가 컨테이너 className. */
  className?: string;
}

/**
 * 검색 input + 다중 선택 필터 + Reset + ViewOptions 를 합성한 데이터 테이블 툴바.
 *
 * - 모든 필터/검색이 비활성일 때는 Reset 버튼을 숨긴다.
 * - i18n 이 필요하면 호출 측에서 `searchPlaceholder` / `filters[].title` 을 t() 결과로 전달한다.
 */
export function DataTableToolbar<TData>({
  table,
  searchColumnId,
  searchPlaceholder = 'Search...',
  filters,
  actions,
  showViewOptions = true,
  className,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const searchColumn = searchColumnId ? table.getColumn(searchColumnId) : undefined;
  const searchValue = (searchColumn?.getFilterValue() as string | undefined) ?? '';

  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {searchColumn ? (
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => searchColumn.setFilterValue(event.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
            aria-label={searchPlaceholder}
          />
        ) : null}
        {filters?.map((filter) => {
          const column = table.getColumn(filter.columnId);
          if (!column) {
            return null;
          }
          return (
            <DataTableFacetedFilter
              key={filter.columnId}
              column={column}
              title={filter.title}
              options={filter.options}
            />
          );
        })}
        {isFiltered ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <XIcon className="ml-2 size-4" aria-hidden />
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {showViewOptions ? <DataTableViewOptions table={table} /> : null}
      </div>
    </div>
  );
}
