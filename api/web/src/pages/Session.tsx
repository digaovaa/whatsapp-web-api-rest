import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

export default function Session() {
  const { sessionId } = useParams()
  const [qr, setQr] = useState<string>('')
  const [info, setInfo] = useState<any>(null)

  async function fetchJSON<T>(url: string): Promise<T> {
    const res = await fetch(url, { headers: { 'Authorization': localStorage.getItem('admin_token') || '' } })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  async function load() {
    if (!sessionId) return
    try {
      const s = await fetchJSON<{ success: boolean, data: any }>(`/api/sessions/${encodeURIComponent(sessionId)}`)
      setInfo(s.data)
    } catch {}
    try {
      const r = await fetchJSON<{ success: boolean, data: { qrCode: string } }>(`/api/sessions/${encodeURIComponent(sessionId)}/qr`)
      setQr(r.data.qrCode)
    } catch {}
  }

  useEffect(() => { void load() }, [sessionId])

  return (
    <div className="wrap">
      <p><Link to="/admin">← Voltar</Link></p>
      <h2>Conexão: {sessionId}</h2>
      {qr && <img src={qr} alt="QR Code" style={{ maxWidth: 240 }} />}
      <pre>{JSON.stringify(info, null, 2)}</pre>
    </div>
  )
}


