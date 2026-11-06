// 하율이의 옷장 서버: /api 요청을 처리해요 (Cloudflare Workers + D1)
// - 접속 제한은 Cloudflare Access가 하고, 여기서도 ALLOWED_EMAILS(쉼표로 구분) 에 있는 사람만 통과시켜요.
// - 옷·사진 정보는 docs 표에, 사진 파일은 blobs 표에 base64로 저장해요.
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const COLS = ['items', 'photos', 'adj'];
const BLOB_KEYS = ['blobKey', 'fullKey', 'faceKey', 'faceCutKey'];
const okId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id);
const MAX_BLOB = 1400000;   // D1 한 줄 최대 2MB 안에 base64로 들어가는 크기
const MAX_DOC = 100000;

let ready = false;
async function ensureSchema(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS docs (col TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (col, id))'),
    db.prepare('CREATE TABLE IF NOT EXISTS blobs (id TEXT PRIMARY KEY, type TEXT NOT NULL, b64 TEXT NOT NULL)'),
  ]);
  ready = true;
}
function toB64(buf) {
  const u = new Uint8Array(buf); let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b64) {
  const s = atob(b64); const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}

export async function handleApi(request, env, path) {
  const email = (request.headers.get('cf-access-authenticated-user-email') || '').trim().toLowerCase();
  const allowed = (env.ALLOWED_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  if (!email || !allowed.includes(email)) return json({ error: 'forbidden' }, 403);
  if (!env.DB) return json({ error: 'no_database' }, 500);
  await ensureSchema(env.DB);

  const [col, id] = path;
  const m = request.method;

  if (col === 'state' && m === 'GET') {
    const { results } = await env.DB.prepare('SELECT col, id, data FROM docs').all();
    const out = { email, items: [], photos: [], adj: {} };
    for (const r of results) {
      const v = JSON.parse(r.data);
      if (r.col === 'adj') out.adj[r.id] = v; else if (out[r.col]) out[r.col].push({ ...v, id: r.id });
    }
    return json(out);
  }

  if (col === 'blob' && okId(id)) {
    if (m === 'GET') {
      const r = await env.DB.prepare('SELECT type, b64 FROM blobs WHERE id = ?').bind(id).first();
      if (!r) return new Response('not found', { status: 404 });
      return new Response(fromB64(r.b64), { headers: { 'content-type': r.type, 'cache-control': 'private, max-age=31536000, immutable' } });
    }
    if (m === 'PUT') {
      const type = (request.headers.get('content-type') || '').split(';')[0].trim();
      if (!/^image\/(png|jpeg|webp)$/.test(type)) return json({ error: 'unsupported_type' }, 415);
      const buf = await request.arrayBuffer();
      if (buf.byteLength > MAX_BLOB) return json({ error: 'too_large' }, 413);
      await env.DB.prepare('INSERT OR REPLACE INTO blobs (id, type, b64) VALUES (?, ?, ?)').bind(id, type, toB64(buf)).run();
      return json({ ok: true, src: '/api/blob/' + id });
    }
  }

  if (COLS.includes(col) && okId(id)) {
    if (m === 'PUT') {
      const text = await request.text();
      if (text.length > MAX_DOC) return json({ error: 'too_large' }, 413);
      let data; try { data = JSON.parse(text); } catch { return json({ error: 'bad_json' }, 400); }
      if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'bad_json' }, 400);
      delete data.id;
      await env.DB.prepare('INSERT OR REPLACE INTO docs (col, id, data, updated) VALUES (?, ?, ?, ?)').bind(col, id, JSON.stringify(data), Date.now()).run();
      return json({ ok: true });
    }
    if (m === 'DELETE') {
      const r = await env.DB.prepare('SELECT data FROM docs WHERE col = ? AND id = ?').bind(col, id).first();
      const stmts = [env.DB.prepare('DELETE FROM docs WHERE col = ? AND id = ?').bind(col, id)];
      if (r) {
        const v = JSON.parse(r.data);
        BLOB_KEYS.map(k => v[k]).filter(okId).forEach(k => stmts.push(env.DB.prepare('DELETE FROM blobs WHERE id = ?').bind(k)));
      }
      await env.DB.batch(stmts);
      return json({ ok: true });
    }
  }
  return json({ error: 'not_found' }, 404);
}
