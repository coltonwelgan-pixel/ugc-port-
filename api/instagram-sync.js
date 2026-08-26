const { serviceClient, requireAdmin, withErrorHandling } = require('./_supabase');

const GRAPH = 'https://graph.instagram.com/v21.0';

async function refreshTokenIfNeeded(db, accountId, tokenRow) {
  const daysLeft = (new Date(tokenRow.expires_at) - Date.now()) / 86400000;
  if (daysLeft > 10) return tokenRow.access_token;

  const res = await fetch(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${tokenRow.access_token}`);
  const data = await res.json();
  if (!res.ok || !data.access_token) return tokenRow.access_token; // fall back, try anyway

  const expiresAt = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString();
  await db.from('ig_tokens').update({ access_token: data.access_token, expires_at: expiresAt }).eq('account_id', accountId);
  return data.access_token;
}

module.exports = withErrorHandling(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const db = serviceClient();
  const admin = await requireAdmin(req, db);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  const { accountId } = req.body || {};
  if (!accountId) return res.status(400).json({ error: 'accountId is required' });

  const { data: account } = await db.from('ig_accounts').select('*').eq('id', accountId).single();
  const { data: tokenRow } = await db.from('ig_tokens').select('*').eq('account_id', accountId).single();
  if (!account || !tokenRow) return res.status(400).json({ error: 'Account is not connected yet' });

  const accessToken = await refreshTokenIfNeeded(db, accountId, tokenRow);

  const mediaRes = await fetch(
    `${GRAPH}/${account.ig_business_id}/media?fields=id,caption,timestamp,permalink,media_type&limit=50&access_token=${accessToken}`
  );
  const media = await mediaRes.json();
  if (!mediaRes.ok || !media.data) {
    return res.status(400).json({ error: `Instagram API error: ${JSON.stringify(media)}` });
  }

  let synced = 0;
  for (const item of media.data) {
    let views = 0, likes = 0, comments = 0;
    try {
      const insightsRes = await fetch(`${GRAPH}/${item.id}/insights?metric=views,likes,comments&access_token=${accessToken}`);
      const insights = await insightsRes.json();
      (insights.data || []).forEach((m) => {
        const val = m.values?.[0]?.value ?? m.total_value?.value ?? 0;
        if (m.name === 'views') views = val;
        if (m.name === 'likes') likes = val;
        if (m.name === 'comments') comments = val;
      });
    } catch {
      continue; // skip posts whose insights fail (e.g. too old, or wrong media type) rather than failing the whole sync
    }

    await db.from('ig_posts').upsert(
      {
        account_id: accountId,
        caption: (item.caption || '').slice(0, 500),
        post_date: item.timestamp ? item.timestamp.slice(0, 10) : null,
        views, likes, comments,
        post_url: item.permalink || null,
        source: 'api',
      },
      { onConflict: 'account_id,post_url' }
    );
    synced++;
  }

  res.status(200).json({ ok: true, synced });
});
