import { PlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/sample/users/components/data-table/data-table';
import { DataTablePagination } from '@/sample/users/components/data-table/data-table-pagination';
import { DataTableToolbar } from '@/sample/users/components/data-table/data-table-toolbar';
import { createUsersColumns } from '@/sample/users/components/users-columns';
import { userRoles, userStatuses } from '@/sample/users/data/user-types';
import { useUsersStore } from '@/sample/users/store/users-store';
import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export function UsersPage() {
  const { t } = useTranslation('sample');
  const users = useUsersStore((state) => state.users);
  const columns = useMemo(() => createUsersColumns(t), [t]);
  const translatedStatuses = useMemo(
    () => userStatuses.map((option) => ({ ...option, label: t(`users.status.${option.value}`) })),
    [t]
  );
  const translatedRoles = useMemo(
    () => userRoles.map((option) => ({ ...option, label: t(`users.role.${option.value}`) })),
    [t]
  );

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('users.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('users.description')}</p>
        </div>
        <Button nativeButton={false} render={<Link to="/sample/users/new" />}>
          <PlusIcon aria-hidden />
          {t('users.new')}
        </Button>
      </header>

      <section
        aria-label={t('users.tableLabel')}
        className="rounded-lg border bg-card p-4 shadow-sm"
      >
        <DataTable
          columns={columns}
          data={users}
          emptyMessage={t('users.empty')}
          toolbar={(table) => (
            <DataTableToolbar
              table={table}
              searchColumnId="username"
              searchPlaceholder={t('users.search')}
              filters={[
                {
                  columnId: 'status',
                  title: t('users.filters.status'),
                  options: translatedStatuses,
                },
                { columnId: 'role', title: t('users.filters.role'), options: translatedRoles },
              ]}
            />
          )}
        >
          {(table) => <DataTablePagination table={table} />}
        </DataTable>
      </section>
    </div>
  );
}
