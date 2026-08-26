const { serviceClient, requireAdmin, withErrorHandling } = require('./_supabase');

const SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_insights',
].join(',');

module.exports = withErrorHandling(async function handler(req, res) {
  if (!process.env.META_APP_ID) {
    return res.status(500).send('META_APP_ID not set in Vercel yet — create the Meta Developer App first, then add its App ID (and App Secret) as environment variables. See BACKEND_SETUP.md.');
  }

  const db = serviceClient();
  const admin = await requireAdmin(req, db);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  const accountId = req.query.accountId;
  if (!accountId) return res.status(400).json({ error: 'accountId is required' });

  const redirectUri = `https://${req.headers.host}/api/instagram-oauth-callback`;
  const state = Buffer.from(JSON.stringify({ accountId })).toString('base64url');

  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.searchParams.set('client_id', process.env.META_APP_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', state);

  res.writeHead(302, { Location: url.toString() });
  res.end();
});
