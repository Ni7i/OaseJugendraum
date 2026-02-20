# 🏠 Oase Jugendraum – Setup Guide v2

## Übersicht

```
React App (Vercel)  ──POST──►  Google Apps Script  ──read/write──►  Google Sheets
     ↑ QR Code                      (Backend)                       (Datenbank)
```

---

## Teil A – Backend (Google Apps Script + Sheets)

### 1. Google Sheet erstellen
1. [sheets.google.com](https://sheets.google.com) → Neue Tabelle → Name: `Oase Jugendraum`
2. URL aufmachen: `https://docs.google.com/spreadsheets/d/`**`DIESE_ID`**`/edit`
3. Diese ID kopieren – du brauchst sie gleich.

### 2. Apps Script Projekt
1. [script.google.com](https://script.google.com) → **Neues Projekt** → Name: `Oase Backend`
2. `Code.gs` Inhalt komplett ersetzen mit dem mitgelieferten `Code.gs`
3. Oben anpassen:
```javascript
const SHEET_ID       = 'DEINE_SHEET_ID';         // aus Schritt 1
const ADMIN_PASSWORD = 'DEIN_PASSWORT';           // beliebig
```

### 3. Als Web-App deployen
1. **Bereitstellen → Neue Bereitstellung**
2. Zahnrad → **Web-App**
3. Ausführen als: **Ich**  /  Zugriff: **Alle**
4. **Bereitstellen** → Google-Konto bestätigen
5. URL kopieren (sieht aus wie `https://script.google.com/macros/s/AKfycb.../exec`)

### 4. Auto-Checkout Trigger einrichten
1. Im Editor: Funktion `setupTrigger` auswählen → ▶ Ausführen
2. Berechtigungen bestätigen

---

## Teil B – Frontend (React App)

### 1. Voraussetzungen
- [Node.js](https://nodejs.org) installiert (v18+)

### 2. Projekt einrichten
```bash
# Im Projektordner
npm install

# .env Datei erstellen
cp .env.example .env
```

`.env` öffnen und URL eintragen:
```
VITE_SCRIPT_URL=https://script.google.com/macros/s/DEINE_ID/exec
```

### 3. Lokal testen
```bash
npm run dev
# → http://localhost:5173
```

### 4. Auf Vercel deployen (kostenlos, dauert 2 Minuten)
```bash
npm install -g vercel
vercel
```
Oder: GitHub Repo pushen → auf [vercel.com](https://vercel.com) importieren.

**Wichtig:** In Vercel die Environment Variable setzen:
- Name: `VITE_SCRIPT_URL`
- Value: deine Apps Script URL

---

## Teil C – QR Code

1. [qr-code-generator.com](https://www.qr-code-generator.com)
2. URL eintragen: `https://DEINE-VERCEL-URL.vercel.app/`
3. QR Code runterladen, drucken, laminieren 🎉

### Admin-Dashboard URL
```
https://DEINE-VERCEL-URL.vercel.app/admin
```

---

## Teil D – Nuki (wenn bereit)

1. [developer.nuki.io](https://developer.nuki.io) → Account + API Token
2. Lock ID in der Nuki App finden
3. In `Code.gs`, Funktion `checkInById` am Ende ergänzen:

```javascript
function checkInById(memberId, name, nachname) {
  const sheet     = getSheet('checkins');
  const checkinId = Utilities.getUuid();
  sheet.appendRow([checkinId, memberId, name, nachname, new Date(), '', '']);
  
  // Nuki öffnen
  try { openNukiLock(); } catch(e) { console.error('Nuki Fehler:', e); }
  
  return { checkinId };
}

function openNukiLock() {
  const TOKEN   = 'DEIN_NUKI_API_TOKEN';
  const LOCK_ID = 'DEINE_LOCK_ID';
  UrlFetchApp.fetch(`https://api.nuki.io/smartlock/${LOCK_ID}/action`, {
    method:  'post',
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    payload: JSON.stringify({ action: 3 }) // 3 = unlock
  });
}
```

Danach: **Bereitstellen → Neue Version** im Apps Script.

---

## Warum kein Netzwerkfehler mehr?

Das Problem war: `fetch` mit `Content-Type: application/json` triggert einen CORS-Preflight (OPTIONS Request). Google Apps Script beantwortet Preflight-Requests nicht korrekt.

**Fix:** Der Client setzt keinen `Content-Type` Header. Der Browser sendet die Daten dann als `text/plain` – das ist ein „Simple Request" ohne Preflight. Apps Script liest `e.postData.contents` trotzdem als JSON.

---

## Rohdaten im Sheet

**Tab `members`:** ID | Name | Nachname | Alter | Adresse | VaterName | Telefon | RegistriertAm

**Tab `checkins`:** ID | MemberID | Name | Nachname | CheckinZeit | CheckoutZeit | DauerMinuten
