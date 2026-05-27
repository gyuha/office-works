import type { Column } from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, EyeOffIcon } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  /** tanstack-table 의 column 인스턴스. 정렬·숨김 등 메서드 호출에 사용한다. */
  column: Column<TData, TValue>;
  /** 헤더에 표시할 라벨. */
  title: string;
}

/**
 * 정렬 가능한 데이터 테이블 헤더.
 *
 * - 정렬 가능 컬럼은 trigger Button + 드롭다운(asc/desc/hide) 으로 렌더된다.
 * - 정렬 불가 컬럼(`enableSorting === false`) 은 단순 텍스트로 렌더된다.
 *
 * 헤더 텍스트는 `title` 으로 전달받은 문자열을 그대로 사용한다.
 * i18n 이 필요한 경우 호출 측에서 번역된 문자열을 넘긴다.
 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn('text-sm font-medium', className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  return (
    <div className={cn('flex items-center', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={buttonVariants({
                variant: 'ghost',
                size: 'sm',
                className: '-ml-2 h-8 data-[state=open]:bg-accent',
              })}
            />
          }
        >
          <span>{title}</span>
          {sorted === 'desc' ? (
            <ArrowDownIcon className="ml-2 size-4" aria-hidden />
          ) : sorted === 'asc' ? (
            <ArrowUpIcon className="ml-2 size-4" aria-hidden />
          ) : (
            <ChevronsUpDownIcon className="ml-2 size-4 text-muted-foreground/70" aria-hidden />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUpIcon className="size-3.5 text-muted-foreground/70" aria-hidden />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDownIcon className="size-3.5 text-muted-foreground/70" aria-hidden />
            Desc
          </DropdownMenuItem>
          {column.getCanHide() ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                <EyeOffIcon className="size-3.5 text-muted-foreground/70" aria-hidden />
                Hide
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
