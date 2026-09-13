export type Client = {
  id: string
  owner_name: string
  business_name: string
  nif: string
  nis: string
  rc: string
  activity_type: string
  location: string
  phone: string
  email: string
  status: 'active' | 'inactive'
  documents_status: 'up_to_date' | 'pending'
  created_at: string
}

export type ClientInsert = Omit<Client, 'id' | 'created_at' | 'status' | 'documents_status'>
export type ClientUpdate = Partial<Omit<Client, 'id' | 'created_at'>>
