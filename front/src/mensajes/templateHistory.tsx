import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'
import type {
  MediaTemplate,
  MediaType,
  MessageTemplate,
  TabKey,
  TemplateFormMode,
  TextTemplate,
} from './templateTypes'
export type {
  MediaTemplate,
  MediaType,
  MessageTemplate,
  TabKey,
  TemplateFormMode,
  TextTemplate,
} from './templateTypes'

type TemplateBaseShape = {
  id: string
  userId: number | null
  name: string
  description: string
  type: TabKey
  createdAt: string
  updatedAt: string
}

function sortTemplatesByUpdatedAt(list: MessageTemplate[]): MessageTemplate[] {
  return list
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export interface TemplateFormState {
  open: boolean
  mode: TemplateFormMode
  templateId: string | null
  name: string
  description: string
  type: TabKey
}

export interface TemplateStatus {
  type: 'success' | 'error'
  message: string
}

const TEMPLATE_STATUS_TIMEOUT = 4000
const MAX_MEDIA_TEMPLATE_SIZE_KB = 15360 // ~15 MB, considering base64 overhead
const DEFAULT_HISTORY_PLACEHOLDER = '// Los resultados de sus envíos aparecerán aquí'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
const API_TEMPLATES_PATH = '/api/plantillas'
const CSRF_ENDPOINT = `${API_BASE_URL}/sanctum/csrf-cookie`
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
export const TEMPLATE_CHANGED_EVENT = 'crm-nexa:templates:changed'

const getXsrfToken = (): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function isMessageTemplate(value: unknown): value is MessageTemplate {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  const baseValid = typeof candidate.id === 'string'
    && (typeof candidate.userId === 'number' || candidate.userId == null)
    && typeof candidate.name === 'string'
    && typeof candidate.type === 'string'
    && typeof candidate.createdAt === 'string'
    && typeof candidate.updatedAt === 'string'
  if (!baseValid) return false

  if (candidate.type === 'texto') {
    const payload = candidate.payload as Record<string, unknown> | undefined
    if (!payload || typeof payload !== 'object') return false
    return typeof payload.numeros === 'string'
      && typeof payload.mensaje === 'string'
      && typeof payload.isManual === 'boolean'
  }

  if (candidate.type === 'media') {
    const payload = candidate.payload as Record<string, unknown> | undefined
    if (!payload || typeof payload !== 'object') return false
    return typeof payload.numeros === 'string'
      && typeof payload.caption === 'string'
      && typeof payload.fileName === 'string'
      && typeof payload.mediaBase64 === 'string'
      && typeof payload.mediaType === 'string'
      && typeof payload.mimeType === 'string'
      && typeof payload.isManual === 'boolean'
  }

  return false
}

function normalizeTemplate(value: unknown): MessageTemplate | null {
  if (!isMessageTemplate(value)) return null
  const candidate = value as MessageTemplate
  const base: TemplateBaseShape = {
    id: candidate.id,
    userId: typeof candidate.userId === 'number' ? candidate.userId : null,
    name: candidate.name,
    description: typeof candidate.description === 'string' ? candidate.description : '',
    type: candidate.type,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  }

  if (candidate.type === 'texto') {
    return {
      ...base,
      type: 'texto',
      payload: {
        numeros: candidate.payload.numeros,
        mensaje: candidate.payload.mensaje,
        isManual: candidate.payload.isManual,
      },
    }
  }

  return {
    ...base,
    type: 'media',
    payload: {
      numeros: candidate.payload.numeros,
      caption: candidate.payload.caption,
      fileName: candidate.payload.fileName,
      mediaBase64: candidate.payload.mediaBase64,
      mediaType: candidate.payload.mediaType as MediaType,
      mimeType: candidate.payload.mimeType,
      isManual: candidate.payload.isManual,
    },
  }
}

export function countNumbersFromString(value: string): number {
  return value
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .length
}

export function estimateBase64SizeKb(base64: string): number {
  if (!base64) return 0
  const bytes = Math.ceil((base64.length * 3) / 4)
  return Math.ceil(bytes / 1024)
}

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export type TemplateChangedEventDetail = {
  action: 'created' | 'updated' | 'deleted' | 'synced'
  template?: MessageTemplate
}

function dispatchTemplateEvent(detail: TemplateChangedEventDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<TemplateChangedEventDetail>(TEMPLATE_CHANGED_EVENT, { detail }))
}

async function apiRequest<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()

  if (MUTATING_METHODS.has(method)) {
    try {
      await fetch(CSRF_ENDPOINT, { credentials: 'include' })
    } catch (error) {
      console.error('No se pudo sincronizar la cookie CSRF', error)
    }
  }

  const headers = new Headers(init.headers ?? {})
  headers.set('Accept', 'application/json')
  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const xsrfToken = getXsrfToken()
  if (xsrfToken) {
    headers.set('X-XSRF-TOKEN', xsrfToken)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    method,
    headers,
    credentials: 'include',
  })

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'message' in (payload as Record<string, unknown>)
      ? String((payload as Record<string, unknown>).message)
      : `Error ${response.status}`
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

type TemplatePayloadRequest =
  | {
    type: 'texto'
    payload: {
      numeros: string
      mensaje: string
      isManual: boolean
    }
  }
  | {
    type: 'media'
    payload: {
      numeros: string
      caption: string
      fileName: string
      mediaBase64: string
      mediaType: MediaType
      mimeType: string
      isManual: boolean
    }
  }

export type TemplateCreateRequest = TemplatePayloadRequest & {
  name: string
  description?: string
}

export type TemplateUpdateRequest = Partial<TemplatePayloadRequest> & {
  name?: string
  description?: string
}

type ApiListResponse = { data?: unknown }
type ApiItemResponse = { data?: unknown }
type ApiMessageResponse = { message?: string }

function ensureMessageTemplates(value: unknown): MessageTemplate[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeTemplate(item))
    .filter((tpl): tpl is MessageTemplate => tpl !== null)
}

function ensureMessageTemplate(value: unknown): MessageTemplate {
  const normalized = normalizeTemplate(value)
  if (!normalized) {
    throw new ApiError('La respuesta del servidor no contiene una plantilla válida.', 500, value)
  }
  return normalized
}

export async function fetchTemplatesFromApi(): Promise<MessageTemplate[]> {
  const response = await apiRequest<ApiListResponse>(`${API_TEMPLATES_PATH}`, { method: 'GET' })
  return ensureMessageTemplates(response.data)
}

export async function createTemplateInApi(
  body: TemplateCreateRequest,
): Promise<MessageTemplate> {
  const response = await apiRequest<ApiItemResponse & ApiMessageResponse>(
    `${API_TEMPLATES_PATH}`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: body.name,
        description: body.description ?? '',
        type: body.type,
        payload: body.payload,
      }),
    },
  )

  const template = ensureMessageTemplate(response.data)
  dispatchTemplateEvent({ action: 'created', template })
  return template
}

export async function updateTemplateInApi(
  id: string,
  body: TemplateUpdateRequest,
): Promise<MessageTemplate> {
  const response = await apiRequest<ApiItemResponse & ApiMessageResponse>(
    `${API_TEMPLATES_PATH}/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        name: body.name,
        description: body.description ?? undefined,
        type: body.type,
        payload: body.payload,
      }),
    },
  )

  const template = ensureMessageTemplate(response.data)
  dispatchTemplateEvent({ action: 'updated', template })
  return template
}

export async function deleteTemplateInApi(id: string): Promise<void> {
  await apiRequest<ApiMessageResponse>(
    `${API_TEMPLATES_PATH}/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )

  dispatchTemplateEvent({ action: 'deleted' })
}

export interface TemplateManagerTextState {
  numeros: string
  setNumeros: Dispatch<SetStateAction<string>>
  mensaje: string
  setMensaje: Dispatch<SetStateAction<string>>
  isManual: boolean
  setIsManual: Dispatch<SetStateAction<boolean>>
  setCsvCount: Dispatch<SetStateAction<number>>
}

export interface TemplateManagerMediaState {
  numeros: string
  setNumeros: Dispatch<SetStateAction<string>>
  caption: string
  setCaption: Dispatch<SetStateAction<string>>
  fileName: string
  setFileName: Dispatch<SetStateAction<string>>
  mediaBase64: string
  setMediaBase64: Dispatch<SetStateAction<string>>
  mediaType: MediaType
  setMediaType: Dispatch<SetStateAction<MediaType>>
  mimeType: string
  setMimeType: Dispatch<SetStateAction<string>>
  isManual: boolean
  setIsManual: Dispatch<SetStateAction<boolean>>
  setCsvCount: Dispatch<SetStateAction<number>>
}

export interface TemplateManagerConfig {
  getUserId: () => number | null
  setActiveTab: Dispatch<SetStateAction<TabKey>>
  text: TemplateManagerTextState
  media: TemplateManagerMediaState
}

export interface UseTemplateManagerResult {
  templateStatus: TemplateStatus | null
  templateForm: TemplateFormState
  setTemplateForm: Dispatch<SetStateAction<TemplateFormState>>
  templateFilter: 'all' | TabKey
  setTemplateFilter: Dispatch<SetStateAction<'all' | TabKey>>
  templateCounts: { all: number; texto: number; media: number }
  visibleTemplates: MessageTemplate[]
  selectedTemplateId: string | null
  openNewTemplateForm: (type: TabKey) => void
  closeTemplateForm: () => void
  handleApplyTemplate: (template: MessageTemplate) => void
  handleEditTemplate: (template: MessageTemplate) => void
  handleDeleteTemplate: (template: MessageTemplate) => Promise<void>
  handleTemplateFormSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  buildDefaultTemplateName: (type: TabKey) => string
  formatTimestamp: (value: string) => string
  templateNumbersSample: { list: string[]; hasMore: boolean }
  templateMediaSizeKb: number
  currentTemplateNumbersCount: number
  isEditingTemplate: boolean
  showModalError: boolean
}

export function useTemplateManager({
  getUserId,
  setActiveTab,
  text,
  media,
}: TemplateManagerConfig): UseTemplateManagerResult {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templateFilter, setTemplateFilter] = useState<'all' | TabKey>('all')
  const [templateStatus, setTemplateStatus] = useState<TemplateStatus | null>(null)
  const [templateForm, setTemplateForm] = useState<TemplateFormState>({
    open: false,
    mode: 'create',
    templateId: null,
    name: '',
    description: '',
    type: 'texto',
  })
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  const {
    numeros: numerosTexto,
    setNumeros: setNumerosTexto,
    mensaje,
    setMensaje,
    isManual: isManualTexto,
    setIsManual: setIsManualTexto,
    setCsvCount: setCsvCountTexto,
  } = text

  const {
    numeros: numerosMedia,
    setNumeros: setNumerosMedia,
    caption,
    setCaption,
    fileName,
    setFileName,
    mediaBase64,
    setMediaBase64,
    mediaType,
    setMediaType,
    mimeType,
    setMimeType,
    isManual: isManualMedia,
    setIsManual: setIsManualMedia,
    setCsvCount: setCsvCountMedia,
  } = media

  useEffect(() => {
    setCurrentUserId(getUserId())
  }, [getUserId])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const current = await fetchTemplatesFromApi()
        if (active) {
          setTemplates(sortTemplatesByUpdatedAt(current))
        }
      } catch (error) {
        if (!active) return
        const message = error instanceof ApiError
          ? error.status === 401
            ? 'Tu sesión expiró. Inicia sesión nuevamente.'
            : error.message
          : 'No se pudieron cargar las plantillas.'
        setTemplateStatus({ type: 'error', message })
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!templateStatus) return
    if (typeof window === 'undefined') return
    const timeout = window.setTimeout(() => setTemplateStatus(null), TEMPLATE_STATUS_TIMEOUT)
    return () => window.clearTimeout(timeout)
  }, [templateStatus])

  const templatesForCurrentUser = useMemo(() => {
    return templates.filter((tpl) => {
      if (tpl.userId == null) return true
      return currentUserId != null && tpl.userId === currentUserId
    })
  }, [templates, currentUserId])

  const templateCounts = useMemo(() => {
    const textoCount = templatesForCurrentUser.filter((tpl) => tpl.type === 'texto').length
    const mediaCount = templatesForCurrentUser.filter((tpl) => tpl.type === 'media').length
    return {
      all: templatesForCurrentUser.length,
      texto: textoCount,
      media: mediaCount,
    }
  }, [templatesForCurrentUser])

  const visibleTemplates = useMemo(() => {
    const filtered = templateFilter === 'all'
      ? templatesForCurrentUser
      : templatesForCurrentUser.filter((tpl) => tpl.type === templateFilter)
    return filtered
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [templatesForCurrentUser, templateFilter])

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }),
    [],
  )
  const shortNameFormatter = useMemo(
    () => new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
    [],
  )

  const buildDefaultTemplateName = useCallback((type: TabKey) => {
    const now = new Date()
    const prefix = type === 'texto' ? 'Mensaje de texto' : 'Mensaje multimedia'
    try {
      return `${prefix} · ${shortNameFormatter.format(now)}`
    } catch {
      return `${prefix} · ${now.toLocaleString()}`
    }
  }, [shortNameFormatter])

  const formatTimestamp = useCallback((value: string) => {
    try {
      return dateFormatter.format(new Date(value))
    } catch {
      return value
    }
  }, [dateFormatter])

  const templateNumbersSource = templateForm.type === 'texto' ? numerosTexto : numerosMedia

  const templateNumbersSample = useMemo(() => {
    const values = templateNumbersSource
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
    return {
      list: values.slice(0, 3),
      hasMore: values.length > 3,
    }
  }, [templateNumbersSource])

  const currentTemplateNumbersCount = useMemo(() => {
    return countNumbersFromString(templateNumbersSource)
  }, [templateNumbersSource])

  const templateMediaSizeKb = useMemo(() => {
    if (templateForm.type !== 'media') return 0
    return estimateBase64SizeKb(mediaBase64)
  }, [templateForm.type, mediaBase64])

  const isEditingTemplate = templateForm.mode === 'edit'
  const showModalError = templateStatus?.type === 'error'

  const resetTemplateForm = useCallback(() => {
    setTemplateForm({
      open: false,
      mode: 'create',
      templateId: null,
      name: '',
      description: '',
      type: 'texto',
    })
  }, [])

  const openNewTemplateForm = useCallback((type: TabKey) => {
    setTemplateForm({
      open: true,
      mode: 'create',
      templateId: null,
      name: buildDefaultTemplateName(type),
      description: '',
      type,
    })
    setTemplateStatus(null)
    setSelectedTemplateId(null)
    setActiveTab(type)
  }, [buildDefaultTemplateName, setActiveTab, setSelectedTemplateId, setTemplateStatus])

  const closeTemplateForm = useCallback(() => {
    resetTemplateForm()
  }, [resetTemplateForm])

  const applyTemplate = useCallback((template: MessageTemplate, options: { silent?: boolean } = {}) => {
    setActiveTab(template.type)
    setSelectedTemplateId(template.id)
    if (template.type === 'texto') {
      setNumerosTexto(template.payload.numeros)
      setMensaje(template.payload.mensaje)
      setIsManualTexto(template.payload.isManual)
      setCsvCountTexto(template.payload.isManual ? 0 : countNumbersFromString(template.payload.numeros))
    } else {
      setNumerosMedia(template.payload.numeros)
      setCaption(template.payload.caption)
      setFileName(template.payload.fileName)
      setMediaBase64(template.payload.mediaBase64)
      setMediaType(template.payload.mediaType)
      setMimeType(template.payload.mimeType)
      setIsManualMedia(template.payload.isManual)
      setCsvCountMedia(template.payload.isManual ? 0 : countNumbersFromString(template.payload.numeros))
    }
    if (!options.silent) {
      setTemplateStatus({ type: 'success', message: `Plantilla "${template.name}" aplicada.` })
    }
  }, [
    setActiveTab,
    setSelectedTemplateId,
    setNumerosTexto,
    setMensaje,
    setIsManualTexto,
    setCsvCountTexto,
    setNumerosMedia,
    setCaption,
    setFileName,
    setMediaBase64,
    setMediaType,
    setMimeType,
    setIsManualMedia,
    setCsvCountMedia,
    setTemplateStatus,
  ])

  const handleApplyTemplate = useCallback((template: MessageTemplate) => {
    applyTemplate(template)
  }, [applyTemplate])

  const handleEditTemplate = useCallback((template: MessageTemplate) => {
    applyTemplate(template, { silent: true })
    setTemplateForm({
      open: true,
      mode: 'edit',
      templateId: template.id,
      name: template.name,
      description: template.description ?? '',
      type: template.type,
    })
    setTemplateStatus(null)
  }, [applyTemplate, setTemplateForm, setTemplateStatus])

  const handleDeleteTemplate = useCallback(async (template: MessageTemplate) => {
    let confirmed = true
    if (typeof window !== 'undefined') {
      confirmed = window.confirm(`¿Eliminar la plantilla "${template.name}"?`)
    }
    if (!confirmed) return

    try {
      await deleteTemplateInApi(template.id)
      setTemplates((prev) => prev.filter((tpl) => tpl.id !== template.id))

      if (selectedTemplateId === template.id) {
        setSelectedTemplateId(null)
      }
      if (templateForm.open && templateForm.templateId === template.id) {
        resetTemplateForm()
      }

      setTemplateStatus({ type: 'success', message: 'Plantilla eliminada correctamente.' })
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'No se pudo eliminar la plantilla.'
      setTemplateStatus({ type: 'error', message })
    }
  }, [
    selectedTemplateId,
    templateForm.open,
    templateForm.templateId,
    resetTemplateForm,
    setSelectedTemplateId,
    setTemplateStatus,
  ])

  const handleTemplateFormSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = templateForm.name.trim()
    if (!trimmedName) {
      setTemplateStatus({ type: 'error', message: 'Asigne un nombre a la plantilla.' })
      return
    }

    const numbersRaw = templateForm.type === 'texto' ? numerosTexto : numerosMedia
    const sanitizedNumbers = numbersRaw
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .join(',')
    if (!sanitizedNumbers) {
      setTemplateStatus({ type: 'error', message: 'Capture al menos un número válido antes de guardar la plantilla.' })
      return
    }

    const duplicate = templates.some((tpl) => tpl.id !== templateForm.templateId
      && tpl.type === templateForm.type
      && (tpl.userId == null || tpl.userId === currentUserId)
      && tpl.name.trim().toLowerCase() === trimmedName.toLowerCase())
    if (duplicate) {
      setTemplateStatus({ type: 'error', message: 'Ya existe una plantilla con ese nombre para este tipo de envío.' })
      return
    }

    const description = templateForm.description.trim()
    const isEditing = templateForm.mode === 'edit' && !!templateForm.templateId

    try {
      let savedTemplate: MessageTemplate

      if (templateForm.type === 'texto') {
        const messageBody = mensaje.trim()
        if (!messageBody) {
          setTemplateStatus({ type: 'error', message: 'El mensaje de texto no puede estar vacío.' })
          return
        }

        const payload: TextTemplate['payload'] = {
          numeros: sanitizedNumbers,
          mensaje: messageBody,
          isManual: isManualTexto,
        }

        if (isEditing && templateForm.templateId) {
          savedTemplate = await updateTemplateInApi(templateForm.templateId, {
            name: trimmedName,
            description,
            type: 'texto',
            payload,
          })
        } else {
          savedTemplate = await createTemplateInApi({
            name: trimmedName,
            description,
            type: 'texto',
            payload,
          })
        }
      } else {
        if (!fileName.trim()) {
          setTemplateStatus({ type: 'error', message: 'Asigne un nombre al archivo antes de guardar la plantilla multimedia.' })
          return
        }
        if (!mediaBase64.trim()) {
          setTemplateStatus({ type: 'error', message: 'Seleccione un archivo para adjuntar a la plantilla multimedia.' })
          return
        }
        if (templateMediaSizeKb > MAX_MEDIA_TEMPLATE_SIZE_KB) {
          setTemplateStatus({
            type: 'error',
      message: `El archivo adjunto es muy pesado (${templateMediaSizeKb} KB). Usa un archivo menor a 15 MB o gestiona la plantilla desde el backend.`,
          })
          return
        }

        const payload: MediaTemplate['payload'] = {
          numeros: sanitizedNumbers,
          caption: caption.trim(),
          fileName: fileName.trim(),
          mediaBase64,
          mediaType,
          mimeType: mimeType || 'application/octet-stream',
          isManual: isManualMedia,
        }

        if (isEditing && templateForm.templateId) {
          savedTemplate = await updateTemplateInApi(templateForm.templateId, {
            name: trimmedName,
            description,
            type: 'media',
            payload,
          })
        } else {
          savedTemplate = await createTemplateInApi({
            name: trimmedName,
            description,
            type: 'media',
            payload,
          })
        }
      }

      setTemplates((prev) => sortTemplatesByUpdatedAt([
        ...prev.filter((tpl) => tpl.id !== savedTemplate.id),
        savedTemplate,
      ]))

      const successMessage = templateForm.type === 'texto'
        ? isEditing
          ? 'Plantilla actualizada correctamente.'
          : 'Plantilla guardada correctamente.'
        : isEditing
          ? 'Plantilla multimedia actualizada correctamente.'
          : 'Plantilla multimedia guardada correctamente.'

      setTemplateStatus({ type: 'success', message: successMessage })
      setSelectedTemplateId(savedTemplate.id)
      setTemplateFilter(savedTemplate.type)
      resetTemplateForm()
    } catch (error) {
      const message = error instanceof ApiError
        ? error.status === 401
          ? 'Tu sesión expiró. Inicia sesión nuevamente.'
          : error.message
        : 'No se pudo guardar la plantilla.'
      setTemplateStatus({ type: 'error', message })
    }
  }, [
    templateForm,
    numerosTexto,
    numerosMedia,
    templates,
    currentUserId,
    mensaje,
    isManualTexto,
    setTemplateFilter,
    resetTemplateForm,
    fileName,
    mediaBase64,
    mediaType,
    mimeType,
    caption,
    isManualMedia,
    templateMediaSizeKb,
    setTemplateStatus,
    setSelectedTemplateId,
  ])

  return {
    templateStatus,
    templateForm,
    setTemplateForm,
    templateFilter,
    setTemplateFilter,
    templateCounts,
    visibleTemplates,
    selectedTemplateId,
    openNewTemplateForm,
    closeTemplateForm,
    handleApplyTemplate,
    handleEditTemplate,
    handleDeleteTemplate,
    handleTemplateFormSubmit,
    buildDefaultTemplateName,
    formatTimestamp,
    templateNumbersSample,
    templateMediaSizeKb,
    currentTemplateNumbersCount,
    isEditingTemplate,
    showModalError,
  }
}

export interface UseCampaignHistoryResult {
  resultText: string
  setResultText: Dispatch<SetStateAction<string>>
  clearResults: () => void
}

export function useCampaignHistory(initialMessage: string = DEFAULT_HISTORY_PLACEHOLDER): UseCampaignHistoryResult {
  const [resultText, setResultText] = useState(initialMessage)
  const clearResults = useCallback(() => setResultText(''), [])
  return { resultText, setResultText, clearResults }
}

export function renderSummary(raw: string): ReactNode {
  if (!raw || raw.startsWith('//')) {
    return <p className="results-hint">Los resultados de sus envíos aparecerán aquí.</p>
  }
  let data: any = null
  try {
    data = JSON.parse(raw)
  } catch {
    if (raw.startsWith('HTTP')) {
      return (
        <div className="summary">
          <div className="summary-row warning">
            <span className="label">Estado</span>
            <span className="value">{raw.split('\n')[0]}</span>
          </div>
          <p className="summary-note">No pudimos procesar detalles. Revise los detalles técnicos.</p>
        </div>
      )
    }
    return <p className="results-hint">{raw}</p>
  }

  const success = data.success ?? data.ok ?? data.status === 'ok'
  const sentTo = data.sentTo || data.numeros || data.to || []
  const countSent = data.countSent ?? data.sent?.length ?? (Array.isArray(sentTo) ? sentTo.length : 0)
  const failed = data.failed || data.errors || []
  const message = data.message || data.msg || (success ? 'Envío realizado' : 'Envío con problemas')

  return (
    <div className="summary">
      <div className={`summary-row ${success ? 'ok' : 'warning'}`}>
        <span className="label">Resultado</span>
        <span className="value">{success ? 'Enviado correctamente' : 'Con errores'}</span>
      </div>
      <div className="summary-row">
        <span className="label">Mensaje</span>
        <span className="value">{message}</span>
      </div>
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-title">Destinatarios</div>
          <div className="summary-card-value">{Array.isArray(sentTo) ? sentTo.length : countSent}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-title">Enviados</div>
          <div className="summary-card-value ok">{countSent}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-title">Fallidos</div>
          <div className="summary-card-value warning">{Array.isArray(failed) ? failed.length : 0}</div>
        </div>
      </div>
      {Array.isArray(failed) && failed.length > 0 && (
        <div className="summary-list">
          <div className="summary-list-title">No enviados</div>
          <ul>
            {failed.map((f: any, i: number) => (
              <li key={i}>
                <span className="badge error">{f?.numero || f?.to || 'desconocido'}</span>
                <span className="muted">{f?.reason || f?.error || 'Error no especificado'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
