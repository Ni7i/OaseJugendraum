// ============================================================
//  OASE JUGENDRAUM – Google Apps Script Backend  v2
//  
//  CORS-Fix: doPost gibt IMMER einen ContentService-Response zurück
//  mit output.setHeaders(). Kein Preflight nötig, da der React-
//  Client keinen Content-Type Header setzt (sendet als text/plain).
// ============================================================

const SHEET_ID        = 'DEINE_GOOGLE_SHEET_ID_HIER';  // ← anpassen
const ADMIN_PASSWORD  = 'DEIN_SICHERES_PASSWORT_HIER'; // ← anpassen
const MAX_DURATION_MS = 90 * 60 * 1000;                // 1.5 Stunden

// ── CORS Headers ─────────────────────────────────────────────
// Apps Script unterstützt keine Custom Response Headers über
// ContentService, aber da der Client kein Content-Type setzt,
// gibt es kein Preflight → kein CORS Problem.

function doGet(e) {
  // Health-Check für Deployment-Tests
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', version: 2 }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respond({ success: false, message: 'Kein Request-Body gefunden.' });
    }

    const data   = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'register')     return respond(registerMember(data));
    if (action === 'checkin')      return respond(checkIn(data));
    if (action === 'lookup')       return respond(lookupMember(data));
    if (action === 'getAdminData') return respond(getAdminData(data));

    return respond({ success: false, message: `Unbekannte Aktion: ${action}` });

  } catch (err) {
    console.error('doPost Error:', err.message, err.stack);
    return respond({ success: false, message: 'Serverfehler: ' + err.message });
  }
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Sheet-Zugriff ────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === 'members') {
      sheet.appendRow(['ID','Name','Nachname','Alter','Adresse','VaterName','Telefon','RegistriertAm']);
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    if (name === 'checkins') {
      sheet.appendRow(['ID','MemberID','Name','Nachname','CheckinZeit','CheckoutZeit','DauerMinuten']);
      sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

// ── Registrierung ────────────────────────────────────────────
function registerMember(data) {
  const required = ['name','nachname','alter','adresse','vaterName','telefon'];
  for (const f of required) {
    if (!data[f] || String(data[f]).trim() === '') {
      return { success: false, message: `Pflichtfeld fehlt: "${f}".` };
    }
  }

  const alter = Number(data.alter);
  if (isNaN(alter) || alter < 8 || alter > 99) {
    return { success: false, message: 'Bitte ein gültiges Alter eingeben.' };
  }

  const tel   = normalizePhone(data.telefon);
  const sheet = getSheet('members');
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (normalizePhone(String(rows[i][6])) === tel) {
      return { success: false, message: 'Diese Telefonnummer ist bereits registriert. Bitte direkt einchecken.' };
    }
  }

  const id  = Utilities.getUuid();
  const now = new Date();
  sheet.appendRow([id, data.name.trim(), data.nachname.trim(), alter,
                   data.adresse.trim(), data.vaterName.trim(), tel, now]);

  const ci = checkInById(id, data.name.trim(), data.nachname.trim());
  return { success: true, message: 'Registrierung erfolgreich!', checkinId: ci.checkinId, memberId: id };
}

// ── Mitglied suchen ───────────────────────────────────────────
function lookupMember(data) {
  const tel   = normalizePhone(String(data.telefon || ''));
  if (!tel) return { success: false, message: 'Keine Telefonnummer angegeben.' };

  const sheet = getSheet('members');
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (normalizePhone(String(rows[i][6])) === tel) {
      return {
        success: true,
        member:  { id: rows[i][0], name: rows[i][1], nachname: rows[i][2] }
      };
    }
  }
  return { success: false, message: 'Nicht gefunden. Bitte zuerst registrieren.' };
}

// ── Check-in ──────────────────────────────────────────────────
function checkIn(data) {
  const lookup = lookupMember(data);
  if (!lookup.success) return lookup;

  const m      = lookup.member;
  const active = getActiveCheckin(m.id);

  if (active) {
    return {
      success: false,
      message: `${m.name}, du bist bereits eingecheckt! Eintritt: ${formatTime(active.zeit)}`
    };
  }

  const ci = checkInById(m.id, m.name, m.nachname);
  return {
    success:   true,
    message:   `Willkommen, ${m.name}! Denk daran: max. 1:30h und den Raum sauber hinterlassen.`,
    checkinId: ci.checkinId
  };
}

function checkInById(memberId, name, nachname) {
  const sheet     = getSheet('checkins');
  const checkinId = Utilities.getUuid();
  sheet.appendRow([checkinId, memberId, name, nachname, new Date(), '', '']);
  return { checkinId };
}

function getActiveCheckin(memberId) {
  const sheet = getSheet('checkins');
  const rows  = sheet.getDataRange().getValues();
  const now   = new Date();

  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][1] === memberId && rows[i][5] === '') {
      const t       = new Date(rows[i][4]);
      const elapsed = now - t;
      if (elapsed < MAX_DURATION_MS) return { row: i + 1, zeit: t };
    }
  }
  return null;
}

// ── Admin ─────────────────────────────────────────────────────
function getAdminData(data) {
  if (data.password !== ADMIN_PASSWORD) {
    return { success: false, message: 'Falsches Passwort.' };
  }

  autoCheckoutExpired();

  const membersSheet  = getSheet('members');
  const checkinsSheet = getSheet('checkins');
  const memberRows    = membersSheet.getDataRange().getValues().slice(1);
  const checkinRows   = checkinsSheet.getDataRange().getValues().slice(1);
  const now           = new Date();

  const activeCheckins = checkinRows
    .filter(r => r[5] === '' && (now - new Date(r[4])) < MAX_DURATION_MS)
    .map(r => ({ name: r[2], nachname: r[3], seit: formatTime(new Date(r[4])) }));

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const visitsByDay   = {};
  checkinRows.forEach(r => {
    const d = new Date(r[4]);
    if (d >= thirtyDaysAgo) {
      const key = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      visitsByDay[key] = (visitsByDay[key] || 0) + 1;
    }
  });

  const recentCheckins = checkinRows.slice(-50).reverse().map(r => ({
    name:     r[2],
    nachname: r[3],
    checkin:  formatDateTime(new Date(r[4])),
    checkout: r[5] ? formatDateTime(new Date(r[5])) : '—',
    dauer:    r[6] ? `${r[6]} Min.` : 'aktiv',
  }));

  return {
    success: true,
    stats: {
      totalMembers:  memberRows.length,
      totalCheckins: checkinRows.length,
      activeNow:     activeCheckins.length,
      todayCheckins: checkinRows.filter(r => {
        const d = new Date(r[4]);
        return d.toDateString() === now.toDateString();
      }).length,
    },
    activeCheckins,
    visitsByDay,
    recentCheckins,
  };
}

// ── Auto-Checkout ─────────────────────────────────────────────
function autoCheckoutExpired() {
  const sheet = getSheet('checkins');
  const rows  = sheet.getDataRange().getValues();
  const now   = new Date();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][5] === '') {
      const t       = new Date(rows[i][4]);
      const elapsed = now - t;
      if (elapsed >= MAX_DURATION_MS) {
        const checkoutTime = new Date(t.getTime() + MAX_DURATION_MS);
        const minutes      = Math.round(MAX_DURATION_MS / 60000);
        sheet.getRange(i + 1, 6).setValue(checkoutTime);
        sheet.getRange(i + 1, 7).setValue(minutes);
      }
    }
  }
}

// ── Hilfsfunktionen ───────────────────────────────────────────
function normalizePhone(tel) {
  return tel.replace(/[\s\-\(\)]/g, '');
}

function formatTime(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'HH:mm');
}

function formatDateTime(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm');
}

// ── Trigger setup (einmalig ausführen) ────────────────────────
function setupTrigger() {
  // Bestehende Trigger löschen
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  // Neuen stündlichen Trigger erstellen
  ScriptApp.newTrigger('autoCheckoutExpired')
    .timeBased()
    .everyHours(1)
    .create();
  console.log('Trigger eingerichtet ✓');
}
