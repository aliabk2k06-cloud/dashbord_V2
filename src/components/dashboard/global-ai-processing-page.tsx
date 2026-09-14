import { useState, useEffect } from 'react'
import { useClients } from '../../hooks/use-clients'
import { useInvoices } from '../../hooks/use-invoices'
import { AiProcessingView } from './ai-processing-view'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Building } from 'lucide-react'
import { Card, CardContent } from '../ui/card'

export function GlobalAiProcessingPage() {
  const { clients, loading: loadingClients } = useClients()
  const [selectedClientId, setSelectedClientId] = useState<string>('')

  // Automatically select first client when loaded if none selected
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId && clients[0]?.id) {
      setSelectedClientId(clients[0].id)
    }
  }, [clients, selectedClientId])

  const selectedClient = clients.find((c) => c.id === selectedClientId)
  const { invoices, refetch } = useInvoices(selectedClientId || null)

  return (
    <div className="space-y-6">
      {/* Top Header Client Switcher Bar */}
      <Card className="border-purple-500/30 bg-purple-500/5">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                اختر مساحة التاجر للمعالجة الذكية
              </h2>
              <p className="text-xs text-muted-foreground">
                يمكنك التبديل بين التجار لمعالجة فواتيرهم المأرشفة آلياً
              </p>
            </div>
          </div>

          <div className="w-full sm:w-72">
            <Select
              value={selectedClientId}
              onValueChange={(val) => setSelectedClientId(val)}
              disabled={loadingClients}
            >
              <SelectTrigger className="h-10 text-xs font-bold border-purple-500/40 bg-background">
                <SelectValue placeholder="اختر تاجر..." />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                    {c.owner_name} ({c.business_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main AI Processing Dashboard */}
      {selectedClient ? (
        <AiProcessingView
          client={selectedClient}
          invoices={invoices}
          onRefreshInvoices={refetch}
        />
      ) : (
        <div className="p-12 text-center text-muted-foreground text-sm border border-dashed rounded-xl">
          جاري تحميل بيانات التجار...
        </div>
      )}
    </div>
  )
}
