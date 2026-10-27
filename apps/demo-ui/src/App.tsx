import { FormEvent, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

type ActivationStatus = 'PENDING' | 'IN_PROGRESS' | 'ACTIVE' | 'FAILED';

type ActivationRecord = {
  _id: string;
  customerId: string;
  planId: string;
  status: ActivationStatus;
  simulateFailure?: 'none' | 'billing' | 'provisioning';
  channel?: string;
  steps?: Record<string, { status?: string; at?: string; reason?: string }>;
  history?: Array<{ eventType: string; eventId: string; at: string }>;
  createdAt?: string;
};

const API_BASE = (globalThis as { __VITE_API_URL__?: string }).__VITE_API_URL__ || 'http://localhost:3000';

export default function App() {
  const [customerId, setCustomerId] = useState('C-1001');
  const [planId, setPlanId] = useState('PLAN-PREMIUM');
  const [simulateFailure, setSimulateFailure] = useState<'none' | 'billing' | 'provisioning'>('none');
  const [activations, setActivations] = useState<ActivationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedActivations = useMemo(
    () => [...activations].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [activations],
  );

  const loadActivations = async () => {
    const response = await fetch(`${API_BASE}/activations`);
    if (!response.ok) {
      throw new Error('Error al consultar activaciones');
    }
    const data = (await response.json()) as ActivationRecord[];
    setActivations(data);
  };

  useEffect(() => {
    void loadActivations().catch((err) => setError(err instanceof Error ? err.message : 'Error'));

    const socket = io(API_BASE, { transports: ['websocket'] });
    socket.on('connect', () => {
      console.log('Socket connected');
    });
    socket.on('activation.updated', (activation: ActivationRecord) => {
      setActivations((current) => {
        const existing = current.find((item) => item._id === activation._id);
        if (existing) {
          return current.map((item) => (item._id === activation._id ? activation : item));
        }
        return [activation, ...current];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/activations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, planId, simulateFailure }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'No se pudo crear la activación');
      }

      const created = (await response.json()) as { activationId: string; status: string };
      setCustomerId('');
      setPlanId('');
      setSimulateFailure('none');
      setError(null);
      await loadActivations();
      console.log('Activation created', created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">POC</p>
          <h1>Activación de servicios con Kafka</h1>
        </div>
      </header>

      <main className="layout">
        <section className="panel form-panel">
          <h2>Contratar plan</h2>
          <form onSubmit={submit} className="form-grid">
            <label>
              <span>Customer ID</span>
              <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} required />
            </label>

            <label>
              <span>Plan ID</span>
              <input value={planId} onChange={(e) => setPlanId(e.target.value)} required />
            </label>

            <label>
              <span>Forzar fallo</span>
              <select
                value={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.value as 'none' | 'billing' | 'provisioning')}
              >
                <option value="none">Ninguno</option>
                <option value="billing">Billing</option>
                <option value="provisioning">Provisioning</option>
              </select>
            </label>

            <button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Contratar'}
            </button>
          </form>

          {error && <div className="error-box">{error}</div>}
        </section>

        <section className="panel list-panel">
          <h2>Activaciones</h2>
          <div className="cards">
            {sortedActivations.length === 0 && <p className="empty">Sin activaciones aún.</p>}
            {sortedActivations.map((activation) => (
              <article key={activation._id} className="card">
                <div className="card-header">
                  <strong>{activation._id}</strong>
                  <span className={`badge status-${activation.status.toLowerCase()}`}>{activation.status}</span>
                </div>

                <p>
                  Cliente: <b>{activation.customerId}</b>
                </p>
                <p>
                  Plan: <b>{activation.planId}</b>
                </p>

                <div className="steps">
                  {activation.steps && Object.entries(activation.steps).length > 0 ? (
                    Object.entries(activation.steps).map(([key, step]) => (
                      <div key={key} className="step-row">
                        <span>{key}</span>
                        <span>{step.status || 'PENDING'}</span>
                      </div>
                    ))
                  ) : (
                    <div className="step-row muted">
                      <span>steps</span>
                      <span>awaiting</span>
                    </div>
                  )}
                </div>

                <div className="timeline">
                  {(activation.history || []).slice().reverse().map((event) => (
                    <div key={event.eventId} className="timeline-item">
                      <span className="dot" />
                      <div>
                        <strong>{event.eventType}</strong>
                        <small>{new Date(event.at).toLocaleString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
