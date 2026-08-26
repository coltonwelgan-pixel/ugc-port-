const { Resend } = require('resend');
const { serviceClient, requireAdmin, withErrorHandling } = require('./_supabase');

module.exports = withErrorHandling(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not set in Vercel — see BACKEND_SETUP.md' });

  const db = serviceClient();
  const admin = await requireAdmin(req, db);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  const { jobId } = req.body || {};
  if (!jobId) return res.status(400).json({ error: 'jobId is required' });

  const { data: job, error: jobError } = await db
    .from('editing_jobs')
    .select('title, drive_link, asset_links, notes, editor_id')
    .eq('id', jobId)
    .single();
  if (jobError || !job) return res.status(404).json({ error: 'Job not found' });

  const { data: editor, error: editorError } = await db
    .from('profiles')
    .select('email, full_name')
    .eq('id', job.editor_id)
    .single();
  if (editorError || !editor) return res.status(404).json({ error: 'Editor not found' });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const assetLines = (job.asset_links || '')
    .split('\n')
    .filter(Boolean)
    .map((l) => `<li><a href="${l}">${l}</a></li>`)
    .join('');

  const { error: emailError } = await resend.emails.send({
    from: 'Creator HQ <onboarding@resend.dev>',
    to: editor.email,
    subject: `New editing job: ${job.title}`,
    html: `
      <p>Hey ${editor.full_name || ''},</p>
      <p>A new editing job is ready for you: <strong>${job.title}</strong></p>
      ${job.drive_link ? `<p>Google Drive: <a href="${job.drive_link}">${job.drive_link}</a></p>` : ''}
      ${assetLines ? `<p>Assets / references:</p><ul>${assetLines}</ul>` : ''}
      ${job.notes ? `<p>Notes: ${job.notes}</p>` : ''}
      <p>Log in at your editor portal to update the status as you work.</p>
    `,
  });
  if (emailError) return res.status(500).json({ error: `Resend error: ${emailError.message}` });

  res.status(200).json({ ok: true });
});
