import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type SessionInfo = {
  id: string
  userId: string
  status: string
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [userId, setUserId] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [endpoints, setEndpoints] = useState<string>('')
  const [adminToken, setAdminToken] = useState<string>(localStorage.getItem('admin_token') || '')
  const [tokenInput, setTokenInput] = useState<string>('')

  async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('admin_token') || '',
        ...(opts?.headers || {})
      }
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  async function load() {
    try {
      const data = await fetchJSON<{ success: boolean, data: any[] }>('/api/admin/sessions')
      setSessions(data.data)
    } catch (e) { console.error(e) }

    try {
      const data = await fetchJSON<{ success: boolean, data: any[] }>('/admin/endpoints')
      setEndpoints(JSON.stringify(data.data, null, 2))
    } catch (e) { console.error(e) }
  }

  function saveToken() {
    const clean = tokenInput.trim()
    if (!clean) {
      alert('Informe o token do admin')
      return
    }
    const value = clean.startsWith('Bearer ') ? clean : `Bearer ${clean}`
    localStorage.setItem('admin_token', value)
    setAdminToken(value)
    setTokenInput('')
    void load()
  }

  function clearToken() {
    localStorage.removeItem('admin_token')
    setAdminToken('')
    setSessions([])
    setEndpoints('')
  }

  async function createSession() {
    if (!userId || !sessionId) return alert('Preencha userId e sessionId')
    await fetchJSON('/api/sessions', { method: 'POST', body: JSON.stringify({ userId, sessionId }) })
    setSessionId('')
    await load()
  }

  async function removeSession(id: string) {
    await fetchJSON(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
    await load()
  }

  useEffect(() => {
    if (adminToken) {
      void load()
    }
  }, [adminToken])

  if (!adminToken) {
    return (
      <div className="container">
        <header>
          <div className="title">Admin • WhatsApp API</div>
          <nav className="muted">Informe seu admin_token</nav>
        </header>
        <div className="grid">
          <div className="card">
            <h2>Autenticação</h2>
            <div className="section">
              <div className="row" style={{ marginBottom: 12 }}>
                <input
                  placeholder="admin_token"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                />
                <button onClick={saveToken}>Salvar token</button>
              </div>
              <div className="hint">Dica: use Authorization: Bearer &lt;token&gt;</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <header>
        <div className="title">Admin • WhatsApp API</div>
        <nav className="muted">
          Token ativo
          <button style={{ marginLeft: 12 }} className="danger" onClick={clearToken}>Sair</button>
        </nav>
      </header>
      <div className="grid">
        <div className="card">
          <h2>Conexões</h2>
          <div className="section">
            <div className="row" style={{ marginBottom: 12 }}>
              <input placeholder="userId" value={userId} onChange={e => setUserId(e.target.value)} />
              <input placeholder="sessionId" value={sessionId} onChange={e => setSessionId(e.target.value)} />
              <button onClick={() => { void createSession() }}>Adicionar</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>sessionId</th>
                  <th>userId</th>
                  <th>status</th>
                  <th style={{ width: 140 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td><Link to={`/session/${encodeURIComponent(s.id)}`}>{s.id}</Link></td>
                    <td>{s.userId || '-'}</td>
                    <td>{s.status || '-'}</td>
                    <td>
                      <button className="danger" onClick={() => { void removeSession(s.id) }}>Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="hint">Dica: use <a href="/api-docs" target="_blank" rel="noreferrer">Swagger</a> para testar endpoints.</div>
          </div>
        </div>

        <div className="card endpoints">
          <h2>Endpoints</h2>
          <div className="section">
            <pre>{endpoints}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}


