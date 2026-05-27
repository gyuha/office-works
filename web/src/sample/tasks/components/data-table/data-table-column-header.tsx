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
  column: Column<TData, TValue>;
  title: string;
}

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
