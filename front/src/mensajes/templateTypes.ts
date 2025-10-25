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
