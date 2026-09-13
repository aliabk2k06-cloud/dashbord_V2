import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ChevronRight,
  Edit,
  Trash2,
  Phone,
  FileText,
  MapPin,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { EditClientDialog } from './edit-client-dialog'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import { useClients } from '../../hooks/use-clients'

interface ClientDetailsPageProps {
  clientId: string
}

export function ClientDetailsPage({ clientId }: ClientDetailsPageProps) {
  const navigate = useNavigate()
  const { clients, loading, updateClient, deleteClient } = useClients()

  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const client = clients.find((c) => c.id === clientId)

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleToggleStatus = async () => {
    if (!client) return
    const newStatus = client.documents_status === 'up_to_date' ? 'pending' : 'up_to_date'
    setUpdatingStatus(true)
    await updateClient(client.id, {
      ...client,
      documents_status: newStatus,
    })
    setUpdatingStatus(false)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('ar-DZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>جاري تحميل بيانات التاجر...</span>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <p className="text-lg font-bold text-destructive">عذراً، لم يتم العثور على التاجر المطلوب</p>
        <p className="text-sm text-muted-foreground">قد يكون التاجر محذوفاً أو أن الرابط غير صحيح.</p>
        <Button variant="outline" onClick={() => navigate({ to: '/' })}>
          الرجوع للقائمة الرئيسية
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Dialogs */}
      <EditClientDialog
        client={client}
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={updateClient}
      />

      <DeleteConfirmDialog
        client={client}
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={async (id) => {
          const res = await deleteClient(id)
          if (res.success) {
            navigate({ to: '/' })
          }
          return res
        }}
      />

      {/* Top Navigation & Action Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Back Button & Title */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/' })}
            className="gap-1.5 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
            الرجوع إلى قائمة التجار
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{client.owner_name}</h1>
            <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-semibold">
              <span
                className={`h-2 w-2 rounded-full ${
                  client.documents_status === 'up_to_date' ? 'bg-status-good' : 'bg-status-pending'
                }`}
              />
              <span
                className={
                  client.documents_status === 'up_to_date' ? 'text-status-good' : 'text-status-pending'
                }
              >
                {client.documents_status === 'up_to_date' ? 'وثائق محدثة' : 'وثائق متأخرة'}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Building className="h-4 w-4" />
            {client.business_name}
          </p>
        </div>

        {/* Top Prominent Action Buttons */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Button
            variant="outline"
            onClick={() => setIsEditOpen(true)}
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
            id="btn-edit-client-header"
          >
            <Edit className="h-4 w-4" />
            تعديل بيانات التاجر
          </Button>

          <Button
            variant="destructive"
            onClick={() => setIsDeleteOpen(true)}
            className="gap-2"
            id="btn-delete-client-header"
          >
            <Trash2 className="h-4 w-4" />
            حذف التاجر
          </Button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2/3 width on desktop): Main Info Cards */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact Information Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                معلومات الاتصال المباشر
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">رقم الهاتف</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleCopy(client.phone, 'phone')}
                    title="نسخ رقم الهاتف"
                  >
                    {copiedField === 'phone' ? (
                      <Check className="h-3.5 w-3.5 text-status-good" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="font-mono-code font-bold text-lg dir-ltr text-start mt-1">
                  {client.phone || '—'}
                </p>
              </div>

              <div className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">البريد الإلكتروني</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleCopy(client.email, 'email')}
                    title="نسخ البريد الإلكتروني"
                  >
                    {copiedField === 'email' ? (
                      <Check className="h-3.5 w-3.5 text-status-good" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="font-mono-code font-bold text-sm truncate dir-ltr text-start mt-1">
                  {client.email || '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Fiscal & Legal Identifiers Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                البيانات الجبائية والتراخيص الإحصائية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                <div>
                  <p className="text-xs text-muted-foreground">رقم التعريف الجبائي (NIF)</p>
                  <p className="font-mono-code font-bold text-base mt-0.5">{client.nif}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(client.nif, 'nif')}
                  className="gap-1 text-xs"
                >
                  {copiedField === 'nif' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-status-good" />
                      تم النسخ
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      نسخ
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                <div>
                  <p className="text-xs text-muted-foreground">رقم التعريف الإحصائي (NIS)</p>
                  <p className="font-mono-code font-bold text-base mt-0.5">{client.nis}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(client.nis, 'nis')}
                  className="gap-1 text-xs"
                >
                  {copiedField === 'nis' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-status-good" />
                      تم النسخ
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      نسخ
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                <div>
                  <p className="text-xs text-muted-foreground">رقم السجل التجاري (RC)</p>
                  <p className="font-mono-code font-bold text-base mt-0.5">{client.rc}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(client.rc, 'rc')}
                  className="gap-1 text-xs"
                >
                  {copiedField === 'rc' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-status-good" />
                      تم النسخ
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      نسخ
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3 width on desktop): Quick Status & Activity */}
        <div className="space-y-6">
          {/* Document Status Quick Toggle Card */}
          <Card className="border-2 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {client.documents_status === 'up_to_date' ? (
                  <CheckCircle2 className="h-4 w-4 text-status-good" />
                ) : (
                  <Clock className="h-4 w-4 text-status-pending" />
                )}
                متابعة الوثائق الشهرية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">الحالة الحالية للتاجر</p>
                <p
                  className={`text-xl font-bold ${
                    client.documents_status === 'up_to_date' ? 'text-status-good' : 'text-status-pending'
                  }`}
                >
                  {client.documents_status === 'up_to_date' ? 'وثائق محدثة ومكتملة' : 'وثائق متأخرة (بانتظار الإرسال)'}
                </p>
              </div>

              <Button
                onClick={handleToggleStatus}
                disabled={updatingStatus}
                variant="outline"
                className="w-full gap-2"
              >
                {updatingStatus ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {client.documents_status === 'up_to_date'
                  ? 'تغيير الحالة إلى متأخر'
                  : 'تحديد كـ "محدّث ومكتمل"'}
              </Button>
            </CardContent>
          </Card>

          {/* Activity & Location Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                بيانات النشاط والموقع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1 border-b border-border pb-3">
                <span className="text-xs text-muted-foreground">نوع النشاط التجاري</span>
                <p className="font-semibold">{client.activity_type}</p>
              </div>

              <div className="space-y-1 border-b border-border pb-3">
                <span className="text-xs text-muted-foreground">موقع ونشاط المؤسسة</span>
                <p className="font-semibold">{client.location}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  تاريخ التسجيل بالمنظومة
                </span>
                <p className="font-medium text-xs text-muted-foreground">
                  {formatDate(client.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
