import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, Row } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { MoreHorizontalIcon, Trash2Icon } from 'lucide-react';

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
import { DataTableColumnHeader } from '@/sample/users/components/data-table/data-table-column-header';
import { useUserDeleteDialog } from '@/sample/users/components/user-delete-dialog';
import { userRoles, userStatusStyles } from '@/sample/users/data/user-types';
import type { User } from '@/sample/users/types/user';

function arrayIncludesFilter(row: Row<User>, columnId: string, filterValue: unknown): boolean {
  if (!Array.isArray(filterValue) || filterValue.length === 0) {
    return true;
  }

  return filterValue.includes(row.getValue(columnId));
}

interface UserRowActionsProps {
  user: User;
  t: TFunction<'sample'>;
}

function UserRowActions({ user, t }: UserRowActionsProps) {
  const navigate = useNavigate();
  const openDeleteDialog = useUserDeleteDialog();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'size-8 p-0')}
            aria-label={t('users.openActions', { name: user.username })}
          />
        }
      >
        <MoreHorizontalIcon aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => void navigator.clipboard.writeText(user.id)}>
          {t('users.actions.copyId')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            void navigate({ to: '/sample/users/$userId', params: { userId: user.id } })
          }
        >
          {t('users.actions.viewDetails')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            void navigate({ to: '/sample/users/$userId/edit', params: { userId: user.id } })
          }
        >
          {t('users.actions.edit')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => openDeleteDialog(user)}>
          <Trash2Icon aria-hidden />
          {t('users.actions.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function createUsersColumns(t: TFunction<'sample'>): ColumnDef<User>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
          aria-label={t('users.selectAll')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(value === true)}
          aria-label={t('users.selectRow', { name: row.original.username })}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      meta: { className: 'w-10' },
    },
    {
      accessorKey: 'username',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('users.columns.username')} />
      ),
      cell: ({ row }) => (
        <span className="max-w-36 truncate font-medium">{row.getValue<string>('username')}</span>
      ),
      meta: { className: 'min-w-[140px]', label: t('users.columns.username') },
    },
    {
      id: 'fullName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('users.columns.name')} />
      ),
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      cell: ({ row }) => {
        const { firstName, lastName } = row.original;
        return <span className="whitespace-nowrap">{`${firstName} ${lastName}`}</span>;
      },
      meta: { className: 'min-w-[160px]', label: t('users.columns.name') },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('users.columns.email')} />
      ),
      cell: ({ row }) => (
        <span className="truncate text-muted-foreground">{row.getValue<string>('email')}</span>
      ),
      meta: { className: 'min-w-[220px]', label: t('users.columns.email') },
    },
    {
      accessorKey: 'phoneNumber',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('users.columns.phoneNumber')} />
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {row.getValue<string>('phoneNumber')}
        </span>
      ),
      enableSorting: false,
      meta: { className: 'min-w-[160px]', label: t('users.columns.phoneNumber') },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('users.columns.status')} />
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        const badgeClass = userStatusStyles[status];
        return (
          <Badge variant="outline" className={cn('capitalize', badgeClass)}>
            {t(`users.status.${status}`)}
          </Badge>
        );
      },
      filterFn: arrayIncludesFilter,
      meta: { className: 'min-w-[120px]', label: t('users.columns.status') },
    },
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('users.columns.role')} />
      ),
      cell: ({ row }) => {
        const role = row.original.role;
        const meta = userRoles.find((option) => option.value === role);
        if (!meta) {
          return <span className="capitalize">{role}</span>;
        }

        const Icon = meta.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="capitalize">{t(`users.role.${meta.value}`)}</span>
          </div>
        );
      },
      filterFn: arrayIncludesFilter,
      enableSorting: false,
      meta: { className: 'min-w-[140px]', label: t('users.columns.role') },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('users.columns.created')} />
      ),
      cell: ({ row }) => {
        const value = row.getValue<Date>('createdAt');
        return (
          <span className="whitespace-nowrap text-muted-foreground">
            {value.toISOString().slice(0, 10)}
          </span>
        );
      },
      sortingFn: 'datetime',
      meta: { className: 'min-w-[120px]', label: t('users.columns.created') },
    },
    {
      id: 'actions',
      cell: ({ row }) => <UserRowActions user={row.original} t={t} />,
      enableSorting: false,
      enableHiding: false,
      meta: { className: 'w-10' },
    },
  ];
}
