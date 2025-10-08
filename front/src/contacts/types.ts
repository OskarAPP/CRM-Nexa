export type FilterType = 'all' | 'contact' | 'group'

export interface Contact {
  remoteJid?: string
  pushName?: string
  profilePicUrl?: string
}

export interface FilterResponse {
  matched_contacts?: Contact[]
  filtered_count?: number
  total_jids_found?: number
  error?: boolean
  message?: string
}

export interface FilterTotals {
  total: number
  filtered: number
}

export type LoadingMode = 'sync' | 'filter' | null
