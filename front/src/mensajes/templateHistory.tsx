import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'

export type TabKey = 'texto' | 'media'
export type MediaType = 'image' | 'video' | 'audio' | 'document'
export type TemplateFormMode = 'create' | 'edit'

interface TemplateBase {
  id: string
  userId: number | null
  name: string
  description?: string
  type: TabKey
  createdAt: string
  updatedAt: string
}

export interface TextTemplate extends TemplateBase {
  type: 'texto'
  payload: {
    numeros: string
    mensaje: string
    isManual: boolean
  }
}

export interface MediaTemplate extends TemplateBase {
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

export type MessageTemplate = TextTemplate | MediaTemplate

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

const TEMPLATE_STORAGE_KEY = 'crm-nexa:mensajes:templates:v1'
const TEMPLATE_STATUS_TIMEOUT = 4000
const MAX_MEDIA_TEMPLATE_SIZE_KB = 3800
const DEFAULT_HISTORY_PLACEHOLDER = '// Los resultados de sus envíos aparecerán aquí'

export function generateTemplateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
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
  const base: TemplateBase = {
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
  handleDeleteTemplate: (template: MessageTemplate) => void
  handleTemplateFormSubmit: (event: FormEvent<HTMLFormElement>) => void
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
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const normalized = parsed
        .map((value) => normalizeTemplate(value))
        .filter((tpl): tpl is MessageTemplate => tpl !== null)
      setTemplates(normalized)
    } catch {
      // ignore malformed templates persisted earlier
    }
  }, [])

  useEffect(() => {
    if (!templateStatus) return
    if (typeof window === 'undefined') return
    const timeout = window.setTimeout(() => setTemplateStatus(null), TEMPLATE_STATUS_TIMEOUT)
    return () => window.clearTimeout(timeout)
  }, [templateStatus])

  const persistTemplates = useCallback((next: MessageTemplate[]) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next))
    } catch {
      setTemplateStatus({ type: 'error', message: 'No se pudo actualizar el almacenamiento local de plantillas.' })
    }
  }, [setTemplateStatus])

  const updateTemplates = useCallback((updater: (prev: MessageTemplate[]) => MessageTemplate[]) => {
    setTemplates((prev) => {
      const next = updater(prev)
      persistTemplates(next)
      return next
    })
  }, [persistTemplates])

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

  const handleDeleteTemplate = useCallback((template: MessageTemplate) => {
    let confirmed = true
    if (typeof window !== 'undefined') {
      confirmed = window.confirm(`¿Eliminar la plantilla "${template.name}"?`)
    }
    if (!confirmed) return
    updateTemplates((prev) => prev.filter((tpl) => tpl.id !== template.id))
    if (selectedTemplateId === template.id) {
      setSelectedTemplateId(null)
    }
    if (templateForm.open && templateForm.templateId === template.id) {
      resetTemplateForm()
    }
    setTemplateStatus({ type: 'success', message: 'Plantilla eliminada correctamente.' })
  }, [
    selectedTemplateId,
    templateForm.open,
    templateForm.templateId,
    updateTemplates,
    resetTemplateForm,
    setSelectedTemplateId,
    setTemplateStatus,
  ])

  const handleTemplateFormSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
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

    const nowIso = new Date().toISOString()
    const description = templateForm.description.trim()

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
      if (templateForm.mode === 'edit' && templateForm.templateId) {
        updateTemplates((prev) => prev.map((tpl) => {
          if (tpl.id !== templateForm.templateId) return tpl
          if (tpl.type !== 'texto') return tpl
          return { ...tpl, name: trimmedName, description, updatedAt: nowIso, payload }
        }))
        setTemplateStatus({ type: 'success', message: 'Plantilla actualizada correctamente.' })
        setSelectedTemplateId(templateForm.templateId)
      } else {
        const newTemplate: TextTemplate = {
          id: generateTemplateId(),
          userId: currentUserId,
          name: trimmedName,
          description,
          type: 'texto',
          createdAt: nowIso,
          updatedAt: nowIso,
          payload,
        }
        updateTemplates((prev) => [...prev, newTemplate])
        setTemplateStatus({ type: 'success', message: 'Plantilla guardada correctamente.' })
        setSelectedTemplateId(newTemplate.id)
      }
      setTemplateFilter('texto')
      resetTemplateForm()
      return
    }

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
        message: `El archivo adjunto es muy pesado (${templateMediaSizeKb} KB). Use un archivo menor a 4 MB o gestione la plantilla desde el backend.`,
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

    if (templateForm.mode === 'edit' && templateForm.templateId) {
      updateTemplates((prev) => prev.map((tpl) => {
        if (tpl.id !== templateForm.templateId) return tpl
        if (tpl.type !== 'media') return tpl
        return { ...tpl, name: trimmedName, description, updatedAt: nowIso, payload }
      }))
      setTemplateStatus({ type: 'success', message: 'Plantilla multimedia actualizada correctamente.' })
      setSelectedTemplateId(templateForm.templateId)
    } else {
      const newTemplate: MediaTemplate = {
        id: generateTemplateId(),
        userId: currentUserId,
        name: trimmedName,
        description,
        type: 'media',
        createdAt: nowIso,
        updatedAt: nowIso,
        payload,
      }
      updateTemplates((prev) => [...prev, newTemplate])
      setTemplateStatus({ type: 'success', message: 'Plantilla multimedia guardada correctamente.' })
      setSelectedTemplateId(newTemplate.id)
    }
    setTemplateFilter('media')
    resetTemplateForm()
  }, [
    templateForm,
    numerosTexto,
    numerosMedia,
    templates,
    currentUserId,
    mensaje,
    isManualTexto,
    updateTemplates,
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
