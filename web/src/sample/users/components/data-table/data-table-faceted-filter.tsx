import type { Column } from '@tanstack/react-table';
import { CheckIcon, PlusCircleIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
  /** 사용자에게 보여지는 라벨. i18n 이 필요하면 호출 측에서 미리 번역해 넘긴다. */
  label: string;
  /** 컬럼 필터에 set 될 실제 값. 컬럼의 `accessor` 결과와 동일 타입이어야 한다. */
  value: string;
  /** 옵션 좌측에 그릴 아이콘 (옵션). */
  icon?: LucideIcon;
}

export interface DataTableFacetedFilterProps<TData, TValue> {
  /** tanstack-table 의 column 인스턴스. */
  column?: Column<TData, TValue>;
  /** 필터 트리거 버튼 라벨. */
  title?: string;
  /** 표시할 옵션 목록. */
  options: DataTableFacetedFilterOption[];
}

/**
 * 다중 선택 카테고리 필터 (shadcn-admin DataTableFacetedFilter 포팅).
 *
 * - Trigger: Button + Badge(선택 카운트 / 선택된 라벨 미리보기)
 * - Popover 내부: Command(검색) + 체크박스 스타일 Item 목록 + Clear filters 버튼
 * - 컬럼 필터값은 `string[]` 으로 set 되며, 컬럼 정의에 array-includes 호환 `filterFn` 이 필요하다.
 */
export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues();
  const filterValue = column?.getFilterValue();
  const selectedValues = new Set(Array.isArray(filterValue) ? (filterValue as string[]) : []);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed"
            aria-label={title ? `Filter by ${title}` : 'Filter'}
          />
        }
      >
        <PlusCircleIcon aria-hidden />
        {title}
        {selectedValues.size > 0 ? (
          <>
            <Separator orientation="vertical" className="mx-2 h-4" />
            <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
              {selectedValues.size}
            </Badge>
            <div className="hidden gap-1 lg:flex">
              {selectedValues.size > 2 ? (
                <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                  {selectedValues.size} selected
                </Badge>
              ) : (
                options
                  .filter((option) => selectedValues.has(option.value))
                  .map((option) => (
                    <Badge
                      variant="secondary"
                      key={option.value}
                      className="rounded-sm px-1 font-normal"
                    >
                      {option.label}
                    </Badge>
                  ))
              )}
            </div>
          </>
        ) : null}
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                const Icon = option.icon;
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
                      <CheckIcon className="size-3" aria-hidden />
                    </div>
                    {Icon ? (
                      <Icon className="mr-2 size-4 text-muted-foreground" aria-hidden />
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
            {selectedValues.size > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
