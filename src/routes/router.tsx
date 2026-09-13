import { createRootRoute, createRoute, createRouter, RouterProvider, Outlet, useNavigate } from '@tanstack/react-router'
import { AppLayout } from '../components/layout/app-layout'
import { StatsCards } from '../components/dashboard/stats-cards'
import { ClientsTable } from '../components/dashboard/clients-table'
import { AddClientForm } from '../components/clients/add-client-form'
import { ClientWorkspacePage } from '../components/dashboard/client-workspace-page'
import { ClientsDataPage } from '../components/clients-data/clients-data-page'
import { useClients } from '../hooks/use-clients'
import { Button } from '../components/ui/button'
import { AlertCircle, UserPlus } from 'lucide-react'
// Root route: Pure Outlet without forced shared wrapper
const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

// Dashboard Home Page Component
function DashboardHome() {
  const { clients, loading, error, stats, updateClient, deleteClient } = useClients()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">لوحة التحكم الرئيسية</h1>
          <p className="text-sm text-muted-foreground">
            متابعة وثائق وتجار المنظومة الجبائية المسجلين
          </p>
        </div>
        <Button
          onClick={() => navigate({ to: '/clients/add' })}
          className="gap-2 self-start sm:self-auto"
          id="btn-add-client"
        >
          <UserPlus className="h-4 w-4" />
          إضافة تاجر جديد
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">تعذر الاتصال بقاعدة البيانات المحلية</p>
            <p className="text-xs opacity-90">{error}. يرجى التأكد من تشغيل الخادم المحلّي.</p>
          </div>
        </div>
      )}

      {/* Stats Section */}
      <StatsCards
        total={stats.total}
        upToDate={stats.upToDate}
        pending={stats.pending}
        loading={loading}
      />

      {/* Clients Data Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">قائمة التجار</h2>
        <ClientsTable
          clients={clients}
          loading={loading}
          onUpdateClient={updateClient}
          onDeleteClient={deleteClient}
        />
      </div>
    </div>
  )
}

// Add Client Page Component
function AddClientPage() {
  const { addClient } = useClients()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">إضافة تاجر جديد</h1>
        <p className="text-sm text-muted-foreground">
          أدخل معلومات التاجر الجبائية والإحصائية لإدراجه في النظام
        </p>
      </div>
      <AddClientForm
        onSubmit={addClient}
        onSuccess={() => navigate({ to: '/' })}
      />
    </div>
  )
}

// Routes definition
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <AppLayout>
      <DashboardHome />
    </AppLayout>
  ),
})

const addClientRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/clients/add',
  component: () => (
    <AppLayout>
      <AddClientPage />
    </AppLayout>
  ),
})

const clientsDataRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/clients-data',
  component: () => (
    <AppLayout>
      <ClientsDataPage />
    </AppLayout>
  ),
})

// COMPLETELY STANDALONE DEDICATED TRADER WORKSPACE (NO AppLayout WRAPPER!)
const clientDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/clients/$clientId',
  component: function ClientDetailsRouteWrapper() {
    const { clientId } = clientDetailsRoute.useParams()
    return <ClientWorkspacePage clientId={clientId} />
  },
})

const routeTree = rootRoute.addChildren([indexRoute, addClientRoute, clientDetailsRoute, clientsDataRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />
}
