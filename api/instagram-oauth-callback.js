const { serviceClient, withErrorHandling } = require('./_supabase');

module.exports = withErrorHandling(async function handler(req, res) {
  const { code, state, error } = req.query;
  if (error) return res.status(400).send(`Instagram connection failed: ${error}`);
  if (!code || !state) return res.status(400).send('Missing code or state');

  let accountId;
  try {
    accountId = JSON.parse(Buffer.from(state, 'base64url').toString()).accountId;
  } catch {
    return res.status(400).send('Invalid state');
  }

  const redirectUri = `https://${req.headers.host}/api/instagram-oauth-callback`;

  // Step 1: exchange the code for a short-lived token
  const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });
  const shortLived = await tokenRes.json();
  if (!tokenRes.ok || !shortLived.access_token) {
    return res.status(400).send(`Token exchange failed: ${JSON.stringify(shortLived)}`);
  }

  // Step 2: exchange for a long-lived token (60 days)
  const longRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.META_APP_SECRET}&access_token=${shortLived.access_token}`
  );
  const longLived = await longRes.json();
  if (!longRes.ok || !longLived.access_token) {
    return res.status(400).send(`Long-lived token exchange failed: ${JSON.stringify(longLived)}`);
  }

  const expiresAt = new Date(Date.now() + (longLived.expires_in || 5184000) * 1000).toISOString();

  const db = serviceClient();
  const { error: tokenError } = await db.from('ig_tokens').upsert({
    account_id: accountId,
    access_token: longLived.access_token,
    expires_at: expiresAt,
  });
  if (tokenError) return res.status(500).send(`Failed to store token: ${tokenError.message}`);

  await db
    .from('ig_accounts')
    .update({ connected: true, ig_business_id: String(shortLived.user_id) })
    .eq('id', accountId);

  res.writeHead(302, { Location: '/backend?instagram=connected' });
  res.end();
});
