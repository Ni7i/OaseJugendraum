import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { apiGetAdminData } from '../lib/api.js';
import { StatCard } from '../components/ui.jsx';

const PIE_COLORS = ['#6C63FF','#38bdf8','#22c55e','#f59e0b','#ef4444','#a855f7','#ec4899'];
const WEEKDAYS   = ['So','Mo','Di','Mi','Do','Fr','Sa'];

// ── Custom Tooltip for BarChart ──────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1a1a28', border: '1px solid #2a2a3d',
      borderRadius: 8, padding: '8px 14px', fontSize: '0.85rem',
    }}>
      <div style={{ color: '#7777a0', marginBottom: 2 }}>{label}</div>
      <div style={{ color: '#6C63FF', fontWeight: 700 }}>{payload[0].value} Besuche</div>
    </div>
  );
}

// ── Login Screen ─────────────────────────────────────────────
function LoginScreen({ onLogin, error }) {
  const [pw, setPw] = useState('');
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: 6 }}>Admin-Zugang</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: 24 }}>Oase Jugendraum Dashboard</p>
        <input
          className="input"
          type="password"
          placeholder="Passwort"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onLogin(pw)}
          style={{ textAlign: 'center', letterSpacing: '0.15em', marginBottom: 14 }}
          autoFocus
        />
        <button className="btn btn-primary" onClick={() => onLogin(pw)}>Anmelden</button>
        {error && (
          <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: 12 }}>{error}</div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function Admin() {
  const [authed,   setAuthed]   = useState(false);
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [search,   setSearch]   = useState('');
  const intervalRef = useRef(null);

  const load = useCallback(async (pw) => {
    setLoading(true);
    try {
      const res = await apiGetAdminData(pw || password);
      if (!res.success) {
        setLoginErr('Falsches Passwort.');
        setAuthed(false);
        return;
      }
      setData(res);
      setLastSync(new Date());
      setAuthed(true);
      setLoginErr('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [password]);

  // Auto-refresh jede Minute
  useEffect(() => {
    if (!authed) return;
    intervalRef.current = setInterval(() => load(), 60_000);
    return () => clearInterval(intervalRef.current);
  }, [authed, load]);

  async function handleLogin(pw) {
    setPassword(pw);
    await load(pw);
  }

  if (!authed) {
    return <LoginScreen onLogin={handleLogin} error={loginErr} />;
  }

  // ── Build chart data ────────────────────────────────────────
  const barData = Array.from({ length: 30 }, (_, i) => {
    const d   = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      name:  d.toLocaleDateString('de-CH', { day: 'numeric', month: 'short' }),
      value: data.visitsByDay?.[key] || 0,
    };
  });

  const wdCount = WEEKDAYS.map((name, idx) => ({ name, value: 0, idx }));
  Object.entries(data.visitsByDay || {}).forEach(([date, count]) => {
    const wd = new Date(date).getDay();
    wdCount[wd].value += count;
  });

  const filtered = (data.recentCheckins || []).filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${c.name} ${c.nachname} ${c.checkin}`.toLowerCase().includes(q);
  });

  const { stats, activeCheckins, recentCheckins } = data;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>

      {/* Topbar */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 20px', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          🏠 Oase Jugendraum
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Live badge */}
          <div style={{
            background: '#052e16', border: '1px solid var(--success)',
            color: 'var(--success)', fontSize: '0.7rem', fontWeight: 700,
            padding: '3px 10px', borderRadius: 20,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <div style={{
              width: 7, height: 7, background: 'var(--success)', borderRadius: '50%',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            LIVE
          </div>
          <button
            className="btn btn-ghost"
            style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem' }}
            onClick={() => load()}
            disabled={loading}
          >
            {loading ? '…' : '↻ Aktualisieren'}
          </button>
          {lastSync && (
            <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
              {lastSync.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
          <StatCard icon="🟢" label="Jetzt anwesend"       value={stats.activeNow}     color="var(--success)" />
          <StatCard icon="📅" label="Besuche heute"        value={stats.todayCheckins} color="var(--primary)" />
          <StatCard icon="📊" label="Besuche total"        value={stats.totalCheckins} color="var(--warning)" />
          <StatCard icon="👥" label="Registrierte Mitglieder" value={stats.totalMembers} color="#38bdf8" />
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 20 }}>
          {/* Bar chart */}
          <div className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 16 }}>
              📈 Besuche letzte 30 Tage
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barSize={12}>
                <XAxis dataKey="name" tick={{ fill: '#7777a0', fontSize: 10 }} tickLine={false}
                  interval={4} axisLine={{ stroke: '#2a2a3d' }} />
                <YAxis tick={{ fill: '#7777a0', fontSize: 10 }} tickLine={false}
                  axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(108,99,255,0.08)' }} />
                <Bar dataKey="value" fill="#6C63FF" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 16 }}>
              🕐 Besuche nach Wochentag
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={wdCount} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {wdCount.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconSize={10} iconType="circle"
                  formatter={(v) => <span style={{ color: '#7777a0', fontSize: '0.78rem' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Currently active */}
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>
          🟢 Aktuell anwesend
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {activeCheckins.length === 0 ? (
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Niemand gerade anwesend.</span>
          ) : activeCheckins.map((c, i) => (
            <div key={i} style={{
              background: '#052e16', border: '1px solid #166534', color: '#86efac',
              borderRadius: 50, padding: '8px 16px', fontSize: '0.87rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              👤 {c.name} {c.nachname}
              <span style={{ color: '#4ade80', fontSize: '0.77rem' }}>seit {c.seit}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              📋 Letzte 50 Check-ins
            </div>
            <input
              className="input"
              placeholder="🔍 Suchen…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 200, padding: '7px 12px', fontSize: '0.87rem' }}
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface)' }}>
                  {['Name','Check-in','Check-out','Dauer','Status'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)',
                      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '11px 16px', fontSize: '0.88rem', fontWeight: 600 }}>
                      {c.name} {c.nachname}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: '0.85rem', color: 'var(--muted)' }}>{c.checkin}</td>
                    <td style={{ padding: '11px 16px', fontSize: '0.85rem', color: 'var(--muted)' }}>{c.checkout}</td>
                    <td style={{ padding: '11px 16px', fontSize: '0.85rem', color: 'var(--muted)' }}>{c.dauer}</td>
                    <td style={{ padding: '11px 16px' }}>
                      {c.dauer === 'aktiv' ? (
                        <span style={{
                          background: '#052e16', color: '#86efac', border: '1px solid #166534',
                          borderRadius: 20, padding: '3px 10px', fontSize: '0.73rem', fontWeight: 700,
                        }}>Aktiv</span>
                      ) : (
                        <span style={{
                          background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)',
                          borderRadius: 20, padding: '3px 10px', fontSize: '0.73rem',
                        }}>Fertig</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
                    Keine Einträge gefunden.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @media (max-width: 640px) {
          .charts-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
