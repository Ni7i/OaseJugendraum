export function Alert({ type, children }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${type}`}>
      <span style={{ flexShrink: 0, fontWeight: 700 }}>{type === 'success' ? '✓' : '✗'}</span>
      <span>{children}</span>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="field">
      {label && <label className="label">{label}</label>}
      {children}
    </div>
  );
}

export function Btn({ variant = 'primary', loading, children, ...props }) {
  return (
    <button className={`btn btn-${variant}`} disabled={loading || props.disabled} {...props}>
      {loading ? <><div className="spinner" />{children}</> : children}
    </button>
  );
}

export function PageCenter({ children }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px 16px 40px' }}>
      {children}
    </div>
  );
}

export function PageHeader({ emoji, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 10 }}>{emoji}</div>
      <h1 style={{ fontSize: '1.55rem', fontWeight: 800 }}>{title}</h1>
      {subtitle && <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: 5 }}>{subtitle}</p>}
    </div>
  );
}

export function StatCard({ icon, label, value, color }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: '1.5rem' }}>{icon}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase',
        letterSpacing: '0.07em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, color }}>{value ?? '—'}</div>
    </div>
  );
}
