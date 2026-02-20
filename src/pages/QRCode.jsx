import { QRCodeSVG } from 'qrcode.react';

const URL = window.location.origin;

export default function QRCodePage() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24
    }}>
      <div style={{ fontSize: 40 }}>🏠</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Oase Jugendraum</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Scannen zum Einchecken</p>

      <div style={{
        background: '#fff', padding: 24, borderRadius: 20
      }}>
        <QRCodeSVG value={URL} size={220} />
      </div>

      <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{URL}</p>

      <button
        className="btn btn-primary"
        style={{ width: 'auto', padding: '12px 28px' }}
        onClick={() => window.print()}
      >
        🖨️ Drucken
      </button>
    </div>
  );
}
