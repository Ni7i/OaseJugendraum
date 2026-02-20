import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const MAX_DURATION = 90;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizePhone(tel) {
  return String(tel).replace(/[\s\-\(\)]/g, '');
}

export async function apiRegister(fields) {
  const tel = normalizePhone(fields.telefon);
  const { data: existing } = await sb.from('members').select('id').eq('telefon', tel).maybeSingle();
  if (existing) return { success: false, message: 'Diese Telefonnummer ist bereits registriert. Bitte direkt einchecken.' };

  const { data: member, error } = await sb.from('members').insert({
    name: fields.name.trim(), nachname: fields.nachname.trim(),
    alter_jahre: Number(fields.alter), adresse: fields.adresse.trim(),
    vater_name: fields.vaterName.trim(), telefon: tel,
  }).select().single();

  if (error) return { success: false, message: error.message };
  const ci = await _checkInById(member.id, member.name, member.nachname);
  if (!ci.success) return ci;
  return { success: true, message: 'Registrierung erfolgreich!' };
}

export async function apiCheckin(telefon) {
  const tel = normalizePhone(telefon);
  const { data: member } = await sb.from('members').select('id, name, nachname').eq('telefon', tel).maybeSingle();
  if (!member) return { success: false, message: 'Nicht gefunden. Bitte zuerst registrieren.' };

  const cutoff = new Date(Date.now() - MAX_DURATION * 60 * 1000).toISOString();
  const { data: active } = await sb.from('checkins').select('id, checkin_zeit')
    .eq('member_id', member.id).is('checkout_zeit', null).gte('checkin_zeit', cutoff).maybeSingle();

  if (active) {
    const seit = new Date(active.checkin_zeit).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    return { success: false, message: `${member.name}, du bist bereits eingecheckt! Eintritt: ${seit}` };
  }

  const ci = await _checkInById(member.id, member.name, member.nachname);
  if (!ci.success) return ci;
  return { success: true, message: `Willkommen, ${member.name}! Denk daran: max. 1:30h und den Raum sauber hinterlassen.` };
}

async function _checkInById(memberId, name, nachname) {
  const { error } = await sb.from('checkins').insert({
    member_id: memberId, name, nachname, checkin_zeit: new Date().toISOString(),
  });
  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function apiGetAdminData(password) {
  if (password !== import.meta.env.VITE_ADMIN_PASSWORD) {
    return { success: false, message: 'Falsches Passwort.' };
  }

  const expiredCutoff = new Date(Date.now() - MAX_DURATION * 60 * 1000).toISOString();
  const { data: expired } = await sb.from('checkins').select('id, checkin_zeit').is('checkout_zeit', null).lt('checkin_zeit', expiredCutoff);
  if (expired?.length) {
    for (const row of expired) {
      const checkoutZeit = new Date(new Date(row.checkin_zeit).getTime() + MAX_DURATION * 60 * 1000).toISOString();
      await sb.from('checkins').update({ checkout_zeit: checkoutZeit, dauer_minuten: MAX_DURATION }).eq('id', row.id);
    }
  }

  const now = new Date();
  const ago30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date(now.toDateString()).toISOString();
  const activeCutoff = new Date(now - MAX_DURATION * 60 * 1000).toISOString();

  const [
    { count: totalMembers },
    { count: totalCheckins },
    { data: activeRows },
    { count: todayCount },
    { data: recentRows },
    { data: chartRows },
  ] = await Promise.all([
    sb.from('members').select('*', { count: 'exact', head: true }),
    sb.from('checkins').select('*', { count: 'exact', head: true }),
    sb.from('checkins').select('name, nachname, checkin_zeit').is('checkout_zeit', null).gte('checkin_zeit', activeCutoff),
    sb.from('checkins').select('*', { count: 'exact', head: true }).gte('checkin_zeit', todayStart),
    sb.from('checkins').select('name, nachname, checkin_zeit, checkout_zeit, dauer_minuten').order('checkin_zeit', { ascending: false }).limit(50),
    sb.from('checkins').select('checkin_zeit').gte('checkin_zeit', ago30),
  ]);

  const visitsByDay = {};
  (chartRows || []).forEach(r => {
    const key = r.checkin_zeit.slice(0, 10);
    visitsByDay[key] = (visitsByDay[key] || 0) + 1;
  });

  return {
    success: true,
    stats: {
      totalMembers: totalMembers ?? 0,
      totalCheckins: totalCheckins ?? 0,
      activeNow: activeRows?.length ?? 0,
      todayCheckins: todayCount ?? 0,
    },
    activeCheckins: (activeRows || []).map(r => ({
      name: r.name, nachname: r.nachname,
      seit: new Date(r.checkin_zeit).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }),
    })),
    visitsByDay,
    recentCheckins: (recentRows || []).map(r => ({
      name: r.name, nachname: r.nachname,
      checkin: fmtDT(r.checkin_zeit),
      checkout: r.checkout_zeit ? fmtDT(r.checkout_zeit) : '—',
      dauer: r.dauer_minuten ? `${r.dauer_minuten} Min.` : 'aktiv',
    })),
  };
}

function fmtDT(iso) {
  return new Date(iso).toLocaleString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
