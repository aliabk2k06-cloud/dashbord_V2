import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, Search, ChevronLeft, ChevronRight, Eye, Edit, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { EditClientDialog } from './edit-client-dialog'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import type { Client, ClientUpdate } from '../../types/client'

interface ClientsTableProps {
  clients: Client[]
  loading: boolean
  onUpdateClient: (id: string, updatedData: ClientUpdate) => Promise<{ success: boolean; error?: string }>
  onDeleteClient: (id: string) => Promise<{ success: boolean; error?: string }>
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function ClientsTable({ clients, loading, onUpdateClient, onDeleteClient }: ClientsTableProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Dialog States
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)

  const columns: ColumnDef<Client>[] = [
    {
      id: 'status_dot',
      header: '',
      size: 40,
      cell: ({ row }) => {
        const status = row.original.documents_status
        return (
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              status === 'up_to_date' ? 'bg-status-good' : 'bg-status-pending'
            }`}
            title={status === 'up_to_date' ? 'محدّث' : 'متأخر'}
          />
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'owner_name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="gap-1 px-0 font-medium hover:bg-transparent"
        >
          الاسم واللقب
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      cell: ({ getValue, row }) => (
        <button
          onClick={() => navigate({ to: '/clients/$clientId', params: { clientId: row.original.id } })}
          className="font-medium text-start hover:text-primary hover:underline"
        >
          {getValue<string>()}
        </button>
      ),
    },
    {
      accessorKey: 'business_name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="gap-1 px-0 font-medium hover:bg-transparent"
        >
          اسم المؤسسة
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'رقم الهاتف',
      cell: ({ getValue }) => (
        <span className="font-mono-code text-sm dir-ltr text-start">{getValue<string>() || '—'}</span>
      ),
    },
    {
      accessorKey: 'nif',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="gap-1 px-0 font-medium hover:bg-transparent"
        >
          NIF
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      cell: ({ getValue }) => <span className="font-mono-code text-sm">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'activity_type',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="gap-1 px-0 font-medium hover:bg-transparent"
        >
          نوع النشاط
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="gap-1 px-0 font-medium hover:bg-transparent"
        >
          تاريخ الإضافة
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-sm">{formatDate(getValue<string>())}</span>
      ),
    },
    {
      id: 'actions',
      header: 'إجراءات',
      cell: ({ row }) => {
        const client = row.original
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => navigate({ to: '/clients/$clientId', params: { clientId: client.id } })}
              title="عرض الصفحة الكاملة للتاجر"
            >
              <Eye className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => setEditClient(client)}
              title="تعديل بيانات التاجر"
            >
              <Edit className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteClient(client)}
              title="حذف التاجر"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
      enableSorting: false,
    },
  ]

  const filteredData = useMemo(() => {
    if (!globalFilter) return clients
    const lowerFilter = globalFilter.toLowerCase()
    return clients.filter(
      (c) =>
        c.owner_name.toLowerCase().includes(lowerFilter) ||
        c.nif.includes(globalFilter) ||
        (c.phone && c.phone.includes(globalFilter)) ||
        c.business_name.toLowerCase().includes(lowerFilter)
    )
  }, [clients, globalFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  })

  return (
    <div className="space-y-4">
      {/* Dialogs */}
      <EditClientDialog
        client={editClient}
        open={!!editClient}
        onClose={() => setEditClient(null)}
        onSave={onUpdateClient}
      />

      <DeleteConfirmDialog
        client={deleteClient}
        open={!!deleteClient}
        onClose={() => setDeleteClient(null)}
        onConfirm={onDeleteClient}
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم، NIF، أو رقم الهاتف..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="ps-9"
          id="clients-search"
        />
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden transition-all">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }} className="font-bold text-xs">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-muted-foreground">جاري التحميل...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {globalFilter ? 'لا توجد نتائج مطابقة' : 'لا يوجد تجار حالياً'}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => navigate({ to: '/clients/$clientId', params: { clientId: row.original.id } })}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && filteredData.length > 10 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            عرض {table.getRowModel().rows.length} من {filteredData.length} تاجر
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              id="pagination-prev"
            >
              <ChevronRight className="h-4 w-4" />
              السابق
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              id="pagination-next"
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
