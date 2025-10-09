import { useCallback, useMemo, useState } from 'react'
import QRCode from 'react-qr-code'

const LOGIN_ENDPOINT = 'http://127.0.0.1:8000/api/login'
const FALLBACK_EMAIL = 'maria@example.com'
const FALLBACK_PASSWORD = 'secret123'
const FALLBACK_LINK_CODE =
	'2@kZ8tsZ7IBg8DcwfSNiyi1MQNc9CH5tbpxp9gM1jPHWa6rPPUqp1fE4QYIWX2sVXHOCN0rzgbvFdPH6XGvQDm9pwPeptvgC+007I=,gzehhoAZgq2X8D98jjE2H9JENUruLorPudBjacikjgQ=,hgttyylDRrjn89+gvA4Bk5g85VPmpF8TIlWLrowu2ys=,kWEVhY2BUzNqoAYS9Exe63cq012JgUwlBNStAJwwhC8='

const FALLBACK_QR_PLACEHOLDER = `data:image/png;base64,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`

function coerceDataUrl(raw: unknown): string | null {
	if (typeof raw !== 'string' || raw.trim().length === 0) {
		return null
	}

	const trimmed = raw.trim()
	if (trimmed.startsWith('data:')) {
		return trimmed
	}
	return `data:image/png;base64,${trimmed}`
}

export default function Pruebas() {
	const [email, setEmail] = useState(FALLBACK_EMAIL)
	const [password, setPassword] = useState(FALLBACK_PASSWORD)
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(FALLBACK_QR_PLACEHOLDER)
	const [linkCode, setLinkCode] = useState<string>(FALLBACK_LINK_CODE)
	const [responsePayload, setResponsePayload] = useState<unknown>(null)
	const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleFetchQr = useCallback(async () => {
		setLoading(true)
		setError(null)

		try {
			const response = await fetch(LOGIN_ENDPOINT, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify({ email, password }),
			})

			if (!response.ok) {
				throw new Error(`Falló la autenticación (${response.status})`)
			}

			const payload = await response.json()
			const whatsappResponse =
				(payload as Record<string, unknown>)?.whatsapp_api_response ?? null

			const resolvedQr = coerceDataUrl(
				whatsappResponse &&
				typeof whatsappResponse === 'object'
					? (whatsappResponse as Record<string, unknown>).base64 ??
					  (whatsappResponse as Record<string, unknown>).qr
					: null
			)

			const resolvedCode =
				(whatsappResponse &&
				typeof whatsappResponse === 'object'
					? (whatsappResponse as Record<string, unknown>).code
					: null) ??
				(payload as Record<string, unknown>).code ??
				FALLBACK_LINK_CODE

			if (!resolvedQr) {
				throw new Error('La respuesta no contiene un QR en formato base64')
			}

			setQrDataUrl(resolvedQr)
			setLinkCode(typeof resolvedCode === 'string' ? resolvedCode : FALLBACK_LINK_CODE)
			setResponsePayload(payload)
			setLastUpdatedAt(new Date())
		} catch (fetchError) {
			setError(
				fetchError instanceof Error
					? fetchError.message
					: 'Error desconocido al obtener el QR'
			)
		} finally {
			setLoading(false)
		}
	}, [email, password])

	const handleDownload = useCallback(() => {
		if (!qrDataUrl) return
		const link = document.createElement('a')
		link.href = qrDataUrl
		link.download = 'qr_code.png'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
	}, [qrDataUrl])

	const handleOpenPreview = useCallback(() => {
		if (!qrDataUrl) return
		const win = window.open()
		if (win) {
			win.document.write(
				`<html><head><title>QR Preview</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;background:#0f172a;"><img src="${qrDataUrl}" alt="QR" style="max-width:90vw;max-height:90vh" /></body></html>`
			)
			win.document.close()
		}
	}, [qrDataUrl])

	const handleCopyCode = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(linkCode)
			setError(null)
		} catch (clipboardError) {
			setError('No se pudo copiar el código al portapapeles')
		}
	}, [linkCode])

	const formattedResponse = useMemo(() => {
		if (!responsePayload) return ''
		try {
			return JSON.stringify(responsePayload, null, 2)
		} catch (stringifyError) {
			return 'No fue posible formatear la respuesta.'
		}
	}, [responsePayload])

	return (
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				background:
					'radial-gradient(circle at top, rgba(56,189,248,0.12), transparent 45%), #0f172a',
				color: '#f8fafc',
				fontFamily: 'Inter, system-ui, sans-serif',
				padding: '32px',
			}}
		>
			<div
				style={{
					position: 'relative',
					width: 'min(520px, 100%)',
					borderRadius: '28px',
					background: 'rgba(15, 23, 42, 0.85)',
					border: '1px solid rgba(148, 163, 184, 0.25)',
					boxShadow: '0 48px 90px rgba(15, 23, 42, 0.55)',
					backdropFilter: 'blur(18px)',
					padding: '36px 32px 32px',
					display: 'flex',
					flexDirection: 'column',
					gap: '22px',
					textAlign: 'center',
				}}
			>
				<span
					style={{
						fontSize: '12px',
						letterSpacing: '0.3em',
						textTransform: 'uppercase',
						color: 'rgba(148, 163, 184, 0.8)',
					}}
				>
					Vinculación de sesión
				</span>
				<h1 style={{ margin: 0, fontSize: '1.9rem', lineHeight: 1.2 }}>
					Escanea este código QR
				</h1>
				<p
					style={{
						margin: 0,
						color: 'rgba(148, 163, 184, 0.82)',
					}}
				>
					Usa la aplicación de WhatsApp para enlazar tu sesión y generar el QR
					directamente desde la API.
				</p>

				<div
					style={{
						width: '280px',
						height: '280px',
						margin: '0 auto',
						borderRadius: '24px',
						background: '#fff',
						padding: '18px',
						boxShadow: '0 30px 50px rgba(56, 189, 248, 0.35)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					{qrDataUrl ? (
						<img
							src={qrDataUrl}
							alt='Código QR dinámico'
							style={{ width: '100%', height: '100%' }}
						/>
					) : (
						<QRCode
							value={linkCode || FALLBACK_LINK_CODE}
							size={220}
							bgColor='transparent'
							fgColor='#020617'
							style={{ width: '100%', height: '100%' }}
						/>
					)}
				</div>

				<div
					style={{
						width: '100%',
						background: 'rgba(15, 23, 42, 0.6)',
						borderRadius: '16px',
						border: '1px solid rgba(148, 163, 184, 0.2)',
						padding: '16px 18px',
						textAlign: 'left',
						fontSize: '12px',
						fontFamily: 'JetBrains Mono, Fira Code, monospace',
						color: 'rgba(226, 232, 240, 0.8)',
						wordBreak: 'break-all',
					}}
				>
					{linkCode}
				</div>

				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: '14px',
						width: '100%',
					}}
				>
					<label style={{ textAlign: 'left', fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.8)' }}>
						Correo electrónico
						<input
							type='email'
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							style={{
								marginTop: '6px',
								width: '100%',
								padding: '10px 12px',
								borderRadius: '12px',
								border: '1px solid rgba(148, 163, 184, 0.25)',
								background: 'rgba(15, 23, 42, 0.65)',
								color: '#f8fafc',
								fontSize: '0.85rem',
							}}
						/>
					</label>
					<label style={{ textAlign: 'left', fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.8)' }}>
						Contraseña
						<input
							type='password'
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							style={{
								marginTop: '6px',
								width: '100%',
								padding: '10px 12px',
								borderRadius: '12px',
								border: '1px solid rgba(148, 163, 184, 0.25)',
								background: 'rgba(15, 23, 42, 0.65)',
								color: '#f8fafc',
								fontSize: '0.85rem',
							}}
						/>
					</label>
				</div>

				<div
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: '12px',
						justifyContent: 'center',
					}}
				>
					<button
						type='button'
						onClick={handleFetchQr}
						disabled={loading}
						style={{
							border: 'none',
							borderRadius: '14px',
							padding: '12px 22px',
							background: 'linear-gradient(135deg, #38bdf8, #2563eb)',
							color: '#fff',
							fontWeight: 600,
							letterSpacing: '0.02em',
							cursor: loading ? 'progress' : 'pointer',
							boxShadow: '0 22px 40px rgba(37, 99, 235, 0.32)',
							transition: 'transform 0.2s ease',
						}}
					>
						{loading ? 'Generando QR…' : 'Generar QR desde API'}
					</button>
					<button
						type='button'
						onClick={handleDownload}
						disabled={!qrDataUrl}
						style={{
							border: '1px solid rgba(148, 163, 184, 0.3)',
							borderRadius: '14px',
							padding: '12px 22px',
							background: 'rgba(15, 23, 42, 0.6)',
							color: '#e2e8f0',
							fontWeight: 500,
							letterSpacing: '0.01em',
							cursor: qrDataUrl ? 'pointer' : 'not-allowed',
						}}
					>
						Descargar PNG
					</button>
					<button
						type='button'
						onClick={handleOpenPreview}
						disabled={!qrDataUrl}
						style={{
							border: '1px solid rgba(148, 163, 184, 0.3)',
							borderRadius: '14px',
							padding: '12px 22px',
							background: 'rgba(15, 23, 42, 0.6)',
							color: '#e2e8f0',
							fontWeight: 500,
							letterSpacing: '0.01em',
							cursor: qrDataUrl ? 'pointer' : 'not-allowed',
						}}
					>
						Abrir en ventana
					</button>
					<button
						type='button'
						onClick={handleCopyCode}
						style={{
							border: '1px solid rgba(148, 163, 184, 0.3)',
							borderRadius: '14px',
							padding: '12px 22px',
							background: 'rgba(15, 23, 42, 0.6)',
							color: '#e2e8f0',
							fontWeight: 500,
							letterSpacing: '0.01em',
							cursor: 'pointer',
						}}
					>
						Copiar código
					</button>
				</div>

				{error && (
					<div
						style={{
							padding: '12px 16px',
							borderRadius: '14px',
							background: 'rgba(248, 113, 113, 0.12)',
							border: '1px solid rgba(248, 113, 113, 0.4)',
							color: '#fecaca',
							fontSize: '0.85rem',
						}}
					>
						{error}
					</div>
				)}

				{lastUpdatedAt && (
					<div
						style={{
							fontSize: '0.75rem',
							color: 'rgba(148, 163, 184, 0.7)',
						}}
					>
						Última actualización: {lastUpdatedAt.toLocaleTimeString()}
					</div>
				)}

				{formattedResponse && (
					<details
						style={{
							background: 'rgba(15, 23, 42, 0.65)',
							borderRadius: '18px',
							border: '1px solid rgba(148, 163, 184, 0.24)',
							padding: '18px',
							textAlign: 'left',
							color: 'rgba(203, 213, 225, 0.9)',
							fontSize: '0.8rem',
						}}
					>
						<summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
							Ver respuesta completa de la API
						</summary>
						<pre
							style={{
								margin: 0,
								whiteSpace: 'pre-wrap',
								wordBreak: 'break-word',
								maxHeight: '220px',
								overflowY: 'auto',
							}}
						>
							{formattedResponse}
						</pre>
					</details>
				)}
			</div>
		</div>
	)
}
