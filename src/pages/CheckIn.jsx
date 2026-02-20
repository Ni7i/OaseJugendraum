import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCheckin } from '../lib/api.js';
import { Alert, Btn, Field, PageCenter, PageHeader } from '../components/ui.jsx';

export default function CheckIn() {
  const navigate = useNavigate();
  const [tel,     setTel]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null); // { type: 'success'|'error', msg }

  async function handleCheckin() {
    if (!tel.trim()) {
      setResult({ type: 'error', msg: 'Bitte Handynummer eingeben.' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await apiCheckin(tel.trim());
      if (res.success) {
        setResult({ type: 'success', msg: res.message });
        setTel('');
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
        emoji="🏠"
        title="Oase Jugendraum"
        subtitle="Melde dich an, um einzutreten"
      />

      <div className="card" style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Deine Handynummer">
          <input
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+41 79 123 45 67"
            value={tel}
            onChange={e => setTel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCheckin()}
            disabled={loading}
          />
        </Field>

        <Btn loading={loading} onClick={handleCheckin}>
          Einchecken ✓
        </Btn>

        {result && <Alert type={result.type}>{result.msg}</Alert>}

        <div className="divider">Noch nicht registriert?</div>

        <Btn variant="outline" onClick={() => navigate('/register')}>
          Jetzt registrieren
        </Btn>
      </div>
    </PageCenter>
  );
}
