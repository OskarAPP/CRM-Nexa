import { useMemo, useRef } from 'react'

interface OnboardingModalProps {
  visible: boolean
  onClose: () => void
}

export default function OnboardingModal({ visible, onClose }: OnboardingModalProps) {
  const seedRef = useRef(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)
  const qrUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=NexaCRM-${seedRef.current}`,
    []
  )

  if (!visible) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar aviso">
          <i className="fas fa-times"></i>
        </button>
        <div className="modal-header">
          <h2>Escanea este código QR</h2>
          <p>Escanea este código QR con tu WhatsApp para empezar a usar el CRM.</p>
        </div>
        <div className="modal-body">
          <img src={qrUrl} alt="Código QR de conexión" />
          <span className="modal-caption">Tu sesión quedará vinculada al instante.</span>
        </div>
        <button type="button" className="modal-primary" onClick={onClose}>
          Entendido
        </button>
      </div>
    </div>
  )
}
