import type { Column } from '@tanstack/react-table';
import { Check, PlusCircle } from 'lucide-react';
import type { ComponentType } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface DataTableFacetedFilterOption {
  /** 화면에 표시될 라벨. */
  label: string;
  /** 컬럼 필터 값으로 사용될 값. */
  value: string;
  /** 선택지 옆에 표시될 아이콘 컴포넌트(선택). */
  icon?: ComponentType<{ className?: string }>;
}

export interface DataTableFacetedFilterProps<TData, TValue> {
  /** 필터를 적용할 TanStack Table 컬럼 인스턴스. */
  column?: Column<TData, TValue>;
  /** 필터 트리거 버튼에 표시할 제목. */
  title?: string;
  /** 선택 가능한 옵션 목록. */
  options: DataTableFacetedFilterOption[];
  emptyLabel?: string;
  selectedLabel?: (count: number) => string;
  clearLabel?: string;
}

/**
 * 데이터 테이블 다중 선택 필터 (faceted filter).
 *
 * - Popover + Command 조합으로 검색 가능한 다중 선택 UI 제공
 * - 컬럼의 faceted unique values 를 활용해 옵션별 카운트 표시
 * - 선택된 항목 수가 많을 경우 트리거 버튼에 "{N} selected" 형태로 압축 표시
 * - "Clear filters" 액션으로 컬럼 필터 초기화 가능
 */
export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  emptyLabel = 'No results found.',
  selectedLabel = (count) => `${count} selected`,
  clearLabel = 'Clear filters',
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues();
  const filterValue = column?.getFilterValue();
  const selectedValues = new Set(Array.isArray(filterValue) ? (filterValue as string[]) : []);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="h-8 border-dashed">
            <PlusCircle />
            {title}
            {selectedValues.size > 0 && (
              <>
                <Separator orientation="vertical" className="mx-2 h-4" />
                <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                  {selectedValues.size}
                </Badge>
                <div className="hidden gap-1 lg:flex">
                  {selectedValues.size > 2 ? (
                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                      {selectedLabel(selectedValues.size)}
                    </Badge>
                  ) : (
                    options
                      .filter((option) => selectedValues.has(option.value))
                      .map((option) => (
                        <Badge
                          key={option.value}
                          variant="secondary"
                          className="rounded-sm px-1 font-normal"
                        >
                          {option.label}
                        </Badge>
                      ))
                  )}
                </div>
              </>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      const next = Array.from(selectedValues);
                      column?.setFilterValue(next.length ? next : undefined);
                    }}
                  >
                    <div
                      className={cn(
                        'mr-2 flex size-4 items-center justify-center rounded-sm border border-primary',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <Check className="size-4" />
                    </div>
                    {option.icon ? (
                      <option.icon className="mr-2 size-4 text-muted-foreground" />
                    ) : null}
                    <span>{option.label}</span>
                    {facets?.get(option.value) !== undefined ? (
                      <span className="ml-auto flex size-4 items-center justify-center font-mono text-xs">
                        {facets.get(option.value)}
                      </span>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className="justify-center text-center"
                  >
                    {clearLabel}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
