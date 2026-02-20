import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRegister } from '../lib/api.js';
import { Alert, Btn, Field, PageCenter, PageHeader } from '../components/ui.jsx';

const RULES = [
  { icon: '🕐', title: 'Max. 1:30 Stunden', desc: 'Danach wirst du automatisch ausgecheckt.' },
  { icon: '🧹', title: 'Raum sauber hinterlassen', desc: 'So aufräumen, wie man ihn vorgefunden hat.' },
  { icon: '🍕', title: 'Kein Essen im Raum', desc: 'Keine Speisen im Jugendraum konsumieren.' },
  { icon: '💧', title: 'Nichts verschütten', desc: 'Getränke nur ausserhalb konsumieren.' },
  { icon: '🚫', title: 'Kein Alkohol, keine Drogen', desc: 'Absolutes Verbot.' },
  { icon: '🤝', title: 'Respektvoller Umgang', desc: 'Gegenüber Personen und Inventar.' },
  { icon: '🔒', title: 'Tür schliessen', desc: 'Beim Verlassen immer die Tür schliessen.' },
];

const EMPTY = { name: '', nachname: '', alter: '', adresse: '', vaterName: '', telefon: '' };

export default function Register() {
  const navigate = useNavigate();
  const [fields,  setFields]  = useState(EMPTY);
  const [agb,     setAgb]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  const set = (key) => (e) => setFields(f => ({ ...f, [key]: e.target.value }));

  const allFilled = Object.values(fields).every(v => v.trim() !== '') && agb;

  async function handleRegister() {
    if (!allFilled) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await apiRegister(fields);
      if (res.success) {
        setResult({ type: 'success', msg: '🎉 Registrierung erfolgreich! Du bist jetzt eingecheckt.' });
        setFields(EMPTY);
        setAgb(false);
      } else {
        setResult({ type: 'error', msg: res.message });
      }
    } catch (err) {
      setResult({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageCenter>
      <PageHeader
        emoji="📋"
        title="Erstregistrierung"
        subtitle="Nur einmalig nötig – danach per Nummer einchecken"
      />

      <div className="card" style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Persönliche Daten */}
        <div className="section-label">👤 Persönliche Daten</div>

        <div className="row-2">
          <Field label="Vorname *">
            <input className="input" type="text" placeholder="Max"
              value={fields.name} onChange={set('name')} autoComplete="given-name" />
          </Field>
          <Field label="Nachname *">
            <input className="input" type="text" placeholder="Muster"
              value={fields.nachname} onChange={set('nachname')} autoComplete="family-name" />
          </Field>
        </div>

        <Field label="Alter *">
          <input className="input" type="number" placeholder="16" min="8" max="25"
            inputMode="numeric" value={fields.alter} onChange={set('alter')} />
        </Field>

        <Field label="Adresse *">
          <input className="input" type="text" placeholder="Musterstrasse 1, 8000 Zürich"
            value={fields.adresse} onChange={set('adresse')} autoComplete="street-address" />
        </Field>

        <div className="section-label" style={{ marginTop: 8 }}>👨 Erziehungsberechtigter</div>

        <Field label="Name des Vaters / Erziehungsberechtigter *">
          <input className="input" type="text" placeholder="Hans Muster"
            value={fields.vaterName} onChange={set('vaterName')} />
        </Field>

        <Field label="Kontakt-Telefonnummer *">
          <input className="input" type="tel" placeholder="+41 79 123 45 67"
            inputMode="tel" autoComplete="tel" value={fields.telefon} onChange={set('telefon')} />
        </Field>

        {/* Hausregeln */}
        <div style={{
          background: 'var(--bg)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '16px',
          marginBottom: 16,
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 14 }}>📜 Hausregeln</div>

          {RULES.map(r => (
            <div key={r.title} style={{
              display: 'flex', gap: 10, marginBottom: 11, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{r.icon}</span>
              <div style={{ fontSize: '0.87rem', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--text)' }}>{r.title}</strong>
                <span style={{ color: 'var(--muted)' }}> – {r.desc}</span>
              </div>
            </div>
          ))}

          <label style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginTop: 14, paddingTop: 14,
            borderTop: '1px solid var(--border)',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={agb}
              onChange={e => setAgb(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: '0.88rem', lineHeight: 1.4 }}>
              Ich habe alle Hausregeln gelesen und akzeptiere sie vollständig.
            </span>
          </label>
        </div>

        <Btn loading={loading} onClick={handleRegister} disabled={!allFilled}>
          Registrieren & Einchecken ✓
        </Btn>

        {result && <div style={{ marginTop: 12 }}><Alert type={result.type}>{result.msg}</Alert></div>}

        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.85rem',
            cursor: 'pointer', marginTop: 14, textAlign: 'center' }}
        >
          ← Zurück zum Einchecken
        </button>
      </div>
    </PageCenter>
  );
}
