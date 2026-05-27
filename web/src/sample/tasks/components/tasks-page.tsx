import { DataTable } from '@/sample/tasks/components/data-table';
import { DataTablePagination } from '@/sample/tasks/components/data-table/data-table-pagination';
import { DataTableToolbar } from '@/sample/tasks/components/data-table/data-table-toolbar';
import { createTasksColumns } from '@/sample/tasks/components/tasks-columns';
import { taskPriorities, taskStatuses } from '@/sample/tasks/data/task-options';
import { tasks } from '@/sample/tasks/data/tasks';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export function TasksPage() {
  const { t } = useTranslation('sample');
  const columns = useMemo(() => createTasksColumns(t), [t]);
  const translatedStatuses = useMemo(
    () => taskStatuses.map((option) => ({ ...option, label: t(`tasks.status.${option.value}`) })),
    [t]
  );
  const translatedPriorities = useMemo(
    () =>
      taskPriorities.map((option) => ({ ...option, label: t(`tasks.priority.${option.value}`) })),
    [t]
  );

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('tasks.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('tasks.description')}</p>
      </header>

      <section
        aria-label={t('tasks.tableLabel')}
        className="rounded-lg border bg-card p-4 shadow-sm"
      >
        <DataTable
          columns={columns}
          data={tasks}
          emptyMessage={t('tasks.empty')}
          toolbar={(table) => (
            <DataTableToolbar
              table={table}
              searchColumnId="title"
              searchPlaceholder={t('tasks.search')}
              resetLabel={t('dataTable.reset')}
              viewLabel={t('dataTable.view')}
              toggleColumnsLabel={t('dataTable.toggleColumns')}
              facetedEmptyLabel={t('command.empty')}
              facetedSelectedLabel={(count) => t('dataTable.selectedCount', { count })}
              facetedClearLabel={t('dataTable.clearFilters')}
              facetedFilters={[
                {
                  columnId: 'status',
                  title: t('tasks.filters.status'),
                  options: translatedStatuses,
                },
                {
                  columnId: 'priority',
                  title: t('tasks.filters.priority'),
                  options: translatedPriorities,
                },
              ]}
            />
          )}
        >
          {(table) => (
            <DataTablePagination
              table={table}
              labels={{
                selectedRows: (selected, total) => t('dataTable.selectedRows', { selected, total }),
                rowsPerPage: t('dataTable.rowsPerPage'),
                pageOf: (page, pageCount) => t('dataTable.pageOf', { page, pageCount }),
                goFirst: t('dataTable.goFirst'),
                goPrevious: t('dataTable.goPrevious'),
                goNext: t('dataTable.goNext'),
                goLast: t('dataTable.goLast'),
              }}
            />
          )}
        </DataTable>
      </section>
    </main>
  );
}
