const { serviceClient, requireAdmin, withErrorHandling } = require('./_supabase');

module.exports = withErrorHandling(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const db = serviceClient();
  const admin = await requireAdmin(req, db);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  const { email, fullName } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const redirectTo = `https://${req.headers.host}/backend`;
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName || '' },
    redirectTo,
  });
  if (error) return res.status(400).json({ error: error.message });

  const { error: profileError } = await db
    .from('profiles')
    .insert({ id: data.user.id, email, full_name: fullName || null, role: 'editor' });
  if (profileError) return res.status(400).json({ error: profileError.message });

  res.status(200).json({ ok: true });
});
