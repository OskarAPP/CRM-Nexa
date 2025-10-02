import { useEffect, useMemo, useRef, useState } from 'react'
import './inicio.css'

type TabKey = 'texto' | 'media'
type MediaType = 'image' | 'video' | 'audio' | 'document'

export default function Inicio() {
  return <MessageManager />
}

function MessageManager() {
  // Cargar Font Awesome para los íconos
  useEffect(() => {
    const id = 'fa-css-cdn'
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
      document.head.appendChild(link)
    }
  }, [])

  const [activeTab, setActiveTab] = useState<TabKey>('texto')
  // Texto state
  const [numerosTexto, setNumerosTexto] = useState('5219961122642,5219821295240')
  const [mensaje, setMensaje] = useState('Hola 👋 este es un mensaje de prueba')
  // Media state
  const [numerosMedia, setNumerosMedia] = useState('5219961122642,5219821295240')
  const [mediaBase64, setMediaBase64] = useState('')
  const [fileName, setFileName] = useState('')
  const [caption, setCaption] = useState('')
  const [mediaType, setMediaType] = useState<MediaType>('document')
  const [mimeType, setMimeType] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Resultados
  const [resultText, setResultText] = useState('// Los resultados de sus envíos aparecerán aquí')

  const autoTypeNode = useMemo(() => {
    if (!mimeType) {
      return <span className="type-placeholder">Seleccione un archivo para detectar automáticamente</span>
    }
    return (
      <div className="type-info">
        <div>
          <span className="type-badge media"><i className={`fas ${mediaIcon(mediaType)}`}></i>{mediaType.toUpperCase()}</span>
          <span className="type-badge mime"><i className="fas fa-code"></i>{mimeType}</span>
        </div>
        <small style={{ marginTop: '.5rem', color: 'var(--secondary)' }}>Detectado automáticamente desde el archivo</small>
      </div>
    )
  }, [mediaType, mimeType])

  function mediaIcon(type: MediaType) {
    switch (type) {
      case 'image':
        return 'fa-image'
      case 'video':
        return 'fa-video'
      case 'audio':
        return 'fa-music'
      default:
        return 'fa-file'
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const mime = file.type || 'application/octet-stream'
    setMimeType(mime)
    let mType: MediaType = 'document'
    if (mime.startsWith('image/')) mType = 'image'
    else if (mime.startsWith('video/')) mType = 'video'
    else if (mime.startsWith('audio/')) mType = 'audio'
    setMediaType(mType)
    const reader = new FileReader()
    reader.onload = () => {
      const res = reader.result as string
      const base64 = res.includes(',') ? res.split(',')[1] : res
      setMediaBase64(base64)
      setFileName(file.name)
    }
    reader.readAsDataURL(file)
  }

  async function enviarMensajes() {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
    const numeros = numerosTexto.split(',').map((n) => n.trim()).filter(Boolean)
    if (!numeros.length) {
      setResultText('Error: Debe ingresar al menos un número válido')
      return
    }
    if (!mensaje.trim()) {
      setResultText('Error: El mensaje no puede estar vacío')
      return
    }
    setResultText('Enviando mensajes...')
    try {
      const resp = await fetch(`${API_BASE}/api/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeros, mensaje }),
      })
      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        setResultText(`HTTP ${resp.status} ${resp.statusText}\n${text}`)
        return
      }
      const data = await resp.json().catch(() => ({}))
      setResultText(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setResultText('Error: ' + (err?.message || String(err)))
    }
  }

  async function enviarMedios() {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
    const numeros = numerosMedia.split(',').map((n) => n.trim()).filter(Boolean)
    if (!numeros.length) {
      setResultText('Error: Debe ingresar al menos un número válido')
      return
    }
    if (!mediaBase64.trim()) {
      setResultText('Error: Debe seleccionar un archivo para enviar')
      return
    }
    if (!fileName.trim()) {
      setResultText('Error: Debe proporcionar un nombre de archivo')
      return
    }
    setResultText('Enviando medios...')
    try {
      const resp = await fetch(`${API_BASE}/api/send-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeros,
          mediatype: mediaType,
          mimetype: mimeType || 'application/octet-stream',
          media: mediaBase64,
          fileName,
          caption,
          delay: 1000,
          linkPreview: false,
        }),
      })
      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        setResultText(`HTTP ${resp.status} ${resp.statusText}\n${text}`)
        return
      }
      const data = await resp.json().catch(() => ({}))
      setResultText(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setResultText('Error: ' + (err?.message || String(err)))
    }
  }

  function clearResults() {
    setResultText('')
  }

  return (
    <section className="mensajes">
      <div className="container">
        <header>
          <div className="logo"><i className="fas fa-comment-dots"></i></div>
          <h1>Business Message Manager</h1>
          <p className="subtitle">Envíe mensajes y medios a sus contactos de WhatsApp de forma profesional</p>
        </header>

        <div className="message-container">
          <div className="tabs">
            <div className={`tab ${activeTab === 'texto' ? 'active' : ''}`} onClick={() => setActiveTab('texto')}>
              <i className="fas fa-font"></i> Mensaje de Texto
            </div>
            <div className={`tab ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')}>
              <i className="fas fa-photo-video"></i> Medios
            </div>
          </div>

          {/* Texto Tab */}
          <div className={`tab-content ${activeTab === 'texto' ? 'active' : ''}`}>
            <div className="form-group">
              <label htmlFor="numeros-texto"><i className="fas fa-phone"></i> Números de destino</label>
              <input id="numeros-texto" className="input-field" value={numerosTexto} onChange={(e) => setNumerosTexto(e.target.value)} placeholder="Ingrese números separados por comas" />
              <p className="input-hint">Separe los números con comas. Incluya el código de país (ej. 521234567890)</p>
            </div>

            <div className="form-group">
              <label htmlFor="mensaje"><i className="fas fa-envelope"></i> Mensaje</label>
              <textarea id="mensaje" className="textarea-field" value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Escriba su mensaje aquí" />
            </div>

            <div className="actions">
              <button id="send-btn" className="btn" onClick={enviarMensajes}>
                <i className="fas fa-paper-plane"></i> Enviar Mensajes
              </button>
            </div>
          </div>

          {/* Media Tab */}
          <div className={`tab-content ${activeTab === 'media' ? 'active' : ''}`}>
            <div className="form-group">
              <label htmlFor="media-numeros"><i className="fas fa-phone"></i> Números de destino</label>
              <input id="media-numeros" className="input-field" value={numerosMedia} onChange={(e) => setNumerosMedia(e.target.value)} placeholder="Ingrese números separados por comas" />
              <p className="input-hint">Separe los números con comas. Incluya el código de país</p>
            </div>

            <div className="form-group">
              <label><i className="fas fa-info-circle"></i> Tipo detectado</label>
              <div className="type-display">{autoTypeNode}</div>
            </div>

            <div className="form-group">
              <label htmlFor="mediaFile"><i className="fas fa-upload"></i> Seleccionar archivo</label>
              <input ref={fileInputRef} type="file" id="mediaFile" className="input-field" onChange={handleFileChange} />
              <p className="input-hint">Seleccione el archivo que desea enviar</p>
            </div>

            <div className="hidden">
              <input type="text" readOnly value={mediaBase64} aria-hidden />
            </div>

            <div className="form-group">
              <label htmlFor="fileName"><i className="fas fa-file-signature"></i> Nombre del Archivo</label>
              <input id="fileName" className="input-field" value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="mi_archivo.jpg" />
            </div>

            <div className="form-group">
              <label htmlFor="caption"><i className="fas fa-comment"></i> Leyenda (opcional)</label>
              <textarea id="caption" className="textarea-field" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Escriba una descripción para el medio" />
            </div>

            <div className="media-preview">
              <p><i className="fas fa-eye"></i> Vista previa del archivo:</p>
              <div id="preview-content">
                {renderPreview(mediaType, mediaBase64, mimeType)}
              </div>
            </div>

            <div className="actions">
              <button id="send-media-btn" className="btn btn-secondary" onClick={enviarMedios}>
                <i className="fas fa-photo-video"></i> Enviar Medios
              </button>
            </div>
          </div>
        </div>

        <div className="results-container">
          <div className="results-header">
            <h2 className="results-title"><i className="fas fa-list-alt"></i> Resultados del Envío</h2>
            <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '.9rem' }} onClick={clearResults}>
              <i className="fas fa-trash"></i> Limpiar
            </button>
          </div>
          <pre className="results-content">{resultText}</pre>
        </div>
      </div>
    </section>
  )
}

function renderPreview(type: MediaType, base64: string, mime: string) {
  if (!base64) return null
  const src = `data:${mime};base64,${base64}`
  if (type === 'image') return <img src={src} alt="Vista previa" />
  if (type === 'video') return <video src={src} controls />
  if (type === 'audio') return <audio src={src} controls />
  return (
    <p>
      <i className="fas fa-file"></i> Archivo seleccionado ({mime})
    </p>
  )
}
