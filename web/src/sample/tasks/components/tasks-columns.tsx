import type { ColumnDef, Row } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { MoreHorizontalIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { DataTableColumnHeader } from '@/sample/tasks/components/data-table/data-table-column-header';
import { taskLabels, taskPriorities, taskStatuses } from '@/sample/tasks/data/task-options';
import type { Task } from '@/sample/tasks/types/task';

function arrayIncludesFilter(row: Row<Task>, columnId: string, filterValue: unknown): boolean {
  if (!Array.isArray(filterValue) || filterValue.length === 0) {
    return true;
  }

  return filterValue.includes(row.getValue(columnId));
}

interface TaskRowActionsProps {
  task: Task;
  t: TFunction<'sample'>;
}

function TaskRowActions({ task, t }: TaskRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'size-8 p-0')}
            aria-label={t('tasks.openActions', { id: task.id })}
          />
        }
      >
        <MoreHorizontalIcon aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => void navigator.clipboard.writeText(task.id)}>
          {t('tasks.actions.copyId')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>{t('tasks.actions.edit')}</DropdownMenuItem>
        <DropdownMenuItem disabled>{t('tasks.actions.delete')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function createTasksColumns(t: TFunction<'sample'>): ColumnDef<Task>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
          aria-label={t('tasks.selectAll')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(value === true)}
          aria-label={t('tasks.selectRow', { id: row.original.id })}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      meta: { className: 'w-10' },
    },
    {
      accessorKey: 'id',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('tasks.columns.task')} />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.getValue<string>('id')}
        </span>
      ),
      meta: { className: 'w-[110px]', label: t('tasks.columns.task') },
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('tasks.columns.title')} />
      ),
      cell: ({ row }) => {
        const label = taskLabels.find((option) => option.value === row.original.label);

        return (
          <div className="flex max-w-[520px] items-center gap-2">
            {label ? (
              <Badge variant="outline" className="shrink-0">
                {t(`tasks.label.${label.value}`)}
              </Badge>
            ) : null}
            <span className="truncate font-medium">{row.getValue<string>('title')}</span>
          </div>
        );
      },
      meta: { className: 'min-w-[320px]', label: t('tasks.columns.title') },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('tasks.columns.status')} />
      ),
      cell: ({ row }) => {
        const status = taskStatuses.find((option) => option.value === row.original.status);
        if (!status) {
          return <span className="capitalize">{row.original.status}</span>;
        }

        const Icon = status.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" aria-hidden />
            <span>{t(`tasks.status.${status.value}`)}</span>
          </div>
        );
      },
      filterFn: arrayIncludesFilter,
      meta: { className: 'min-w-[140px]', label: t('tasks.columns.status') },
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('tasks.columns.priority')} />
      ),
      cell: ({ row }) => {
        const priority = taskPriorities.find((option) => option.value === row.original.priority);
        if (!priority) {
          return <span className="capitalize">{row.original.priority}</span>;
        }

        const Icon = priority.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" aria-hidden />
            <span>{t(`tasks.priority.${priority.value}`)}</span>
          </div>
        );
      },
      filterFn: arrayIncludesFilter,
      meta: { className: 'min-w-[130px]', label: t('tasks.columns.priority') },
    },
    {
      id: 'actions',
      cell: ({ row }) => <TaskRowActions task={row.original} t={t} />,
      enableSorting: false,
      enableHiding: false,
      meta: { className: 'w-10' },
    },
  ];
}
