import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8' },
  });
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function token() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function accessCode() {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const n = ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) % 1000000;
  return String(n).padStart(6, '0');
}

async function verifySignature(publicKeyJwk: JsonWebKey, challenge: string, signatureB64: string) {
  const key = await crypto.subtle.importKey(
    'jwk',
    publicKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
  const sig = Uint8Array.from(atob(signatureB64), (c) => c.charCodeAt(0));
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    sig,
    new TextEncoder().encode(challenge),
  );
}

async function requireSession(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const raw = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!raw) throw new Error('missing_session');
  const tokenHash = await sha256Hex(raw);
  const { data, error } = await supabase
    .from('sessions')
    .select('token_hash, account_id, device_id, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (error || !data) throw new Error('invalid_session');
  if (new Date(data.expires_at).getTime() < Date.now()) throw new Error('expired_session');
  await supabase.from('sessions').update({ last_seen_at: new Date().toISOString() }).eq('token_hash', tokenHash);
  await supabase.from('devices').update({ last_seen_at: new Date().toISOString() }).eq('id', data.device_id);
  return data as { account_id: string; device_id: string };
}

async function createSession(accountId: string, deviceId: string) {
  const raw = token();
  const tokenHash = await sha256Hex(raw);
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  const { error } = await supabase.from('sessions').insert({ token_hash: tokenHash, account_id: accountId, device_id: deviceId, expires_at: expires });
  if (error) throw error;
  return { sessionToken: raw, expiresAt: expires };
}

async function route(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  const action = url.pathname.split('/').filter(Boolean).pop();
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

  if (action === 'create-account') {
    const username = String(body.username || '').trim();
    const deviceName = String(body.deviceName || 'First device').trim().slice(0, 80);
    const publicKey = body.publicKey;
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) return json({ error: 'Username must be 3-32 letters, numbers, _ or -.' }, 400);
    if (!publicKey) return json({ error: 'Missing device public key.' }, 400);
    const { data: account, error: accountError } = await supabase.from('accounts').insert({ username }).select('id, username').single();
    if (accountError) return json({ error: 'Username already exists or could not be created.' }, 409);
    const { data: device, error: deviceError } = await supabase.from('devices').insert({ account_id: account.id, name: deviceName, public_key: publicKey, approved: true, owner: true, approved_at: new Date().toISOString() }).select('id, name').single();
    if (deviceError) return json({ error: deviceError.message }, 500);
    await supabase.from('baby_profiles').insert({ account_id: account.id });
    const session = await createSession(account.id, device.id);
    return json({ account, device, ...session });
  }

  if (action === 'request-device') {
    const username = String(body.username || '').trim();
    const deviceName = String(body.deviceName || 'New device').trim().slice(0, 80);
    const publicKey = body.publicKey;
    const { data: account } = await supabase.from('accounts').select('id, username').eq('username', username).maybeSingle();
    if (!account) return json({ error: 'Account not found.' }, 404);
    const { data: request, error } = await supabase.from('device_requests').insert({ account_id: account.id, device_name: deviceName, public_key: publicKey, code: accessCode() }).select('id, code, status, created_at').single();
    if (error) return json({ error: error.message }, 500);
    return json({ request });
  }

  if (action === 'pending-requests') {
    const session = await requireSession(req);
    const { data, error } = await supabase.from('device_requests').select('id, device_name, code, created_at, status').eq('account_id', session.account_id).eq('status', 'pending').order('created_at', { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json({ requests: data || [] });
  }

  if (action === 'approve-request') {
    const session = await requireSession(req);
    const requestId = String(body.requestId || '');
    const { data: request, error: reqError } = await supabase.from('device_requests').select('*').eq('id', requestId).eq('account_id', session.account_id).eq('status', 'pending').maybeSingle();
    if (reqError || !request) return json({ error: 'Request not found.' }, 404);
    const { data: device, error: deviceError } = await supabase.from('devices').insert({ account_id: session.account_id, name: request.device_name, public_key: request.public_key, approved: true, owner: false, approved_at: new Date().toISOString() }).select('id, name').single();
    if (deviceError) return json({ error: deviceError.message }, 500);
    await supabase.from('device_requests').update({ status: 'approved', decided_at: new Date().toISOString(), decided_by_device_id: session.device_id }).eq('id', requestId);
    return json({ device });
  }

  if (action === 'login-challenge') {
    const username = String(body.username || '').trim();
    const deviceId = String(body.deviceId || '');
    const challenge = token();
    const { data, error } = await supabase.from('devices').select('id, public_key, account:accounts!inner(id, username)').eq('id', deviceId).eq('approved', true).eq('accounts.username', username).maybeSingle();
    if (error || !data) return json({ error: 'Device is not approved for this username.' }, 401);
    return json({ challenge, deviceId: data.id });
  }

  if (action === 'login-verify') {
    const username = String(body.username || '').trim();
    const deviceId = String(body.deviceId || '');
    const challenge = String(body.challenge || '');
    const signature = String(body.signature || '');
    const { data, error } = await supabase.from('devices').select('id, public_key, account_id, account:accounts!inner(username)').eq('id', deviceId).eq('approved', true).eq('accounts.username', username).maybeSingle();
    if (error || !data) return json({ error: 'Device is not approved.' }, 401);
    const ok = await verifySignature(data.public_key as JsonWebKey, challenge, signature);
    if (!ok) return json({ error: 'Invalid device signature.' }, 401);
    const session = await createSession(data.account_id, data.id);
    return json({ device: { id: data.id }, ...session });
  }

  if (action === 'request-status') {
    const requestId = String(body.requestId || '');
    const { data: request } = await supabase.from('device_requests').select('id, status, account_id').eq('id', requestId).maybeSingle();
    if (!request) return json({ error: 'Request not found.' }, 404);
    if (request.status !== 'approved') return json({ status: request.status });
    const { data: device } = await supabase.from('devices').select('id, name').eq('account_id', request.account_id).order('created_at', { ascending: false }).limit(1).single();
    const session = await createSession(request.account_id, device.id);
    return json({ status: 'approved', device, ...session });
  }

  if (action === 'sync-get') {
    const session = await requireSession(req);
    const { data: profile } = await supabase.from('baby_profiles').select('*').eq('account_id', session.account_id).maybeSingle();
    const { data: measurements } = await supabase.from('measurements').select('id, measured_on, weight_kg, age_weeks').eq('account_id', session.account_id).order('measured_on');
    return json({ profile, measurements: measurements || [] });
  }

  if (action === 'sync-put') {
    const session = await requireSession(req);
    const profile = body.profile || {};
    const measurements = Array.isArray(body.measurements) ? body.measurements : [];
    await supabase.from('baby_profiles').upsert({
      account_id: session.account_id,
      name: String(profile.name || '').slice(0, 120),
      birth_date: profile.birthDate || null,
      gender: profile.gender === 'girl' ? 'girl' : 'boy',
      unit: profile.unit === 'lbs' ? 'lbs' : 'kg',
      range_weeks: Number(profile.rangeWeeks || 13),
      updated_at: new Date().toISOString(),
    });
    const rows = measurements.filter((m: any) => m.date && Number(m.weightKg) > 0).map((m: any) => ({
      account_id: session.account_id,
      measured_on: m.date,
      weight_kg: Math.round(Number(m.weightKg) * 100) / 100,
      age_weeks: Math.round(Number(m.ageWeeks || 0) * 100) / 100,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length) await supabase.from('measurements').upsert(rows, { onConflict: 'account_id,measured_on' });
    return json({ ok: true, saved: rows.length });
  }

  if (action === 'logout') {
    const auth = req.headers.get('authorization') || '';
    const raw = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (raw) await supabase.from('sessions').delete().eq('token_hash', await sha256Hex(raw));
    return json({ ok: true });
  }

  return json({ error: 'Unknown endpoint.' }, 404);
}

Deno.serve(async (req) => {
  try {
    return await route(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = ['missing_session', 'invalid_session', 'expired_session'].includes(message) ? 401 : 500;
    return json({ error: message }, status);
  }
});
