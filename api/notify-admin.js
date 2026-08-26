const { Resend } = require('resend');
const { serviceClient, requireUser, withErrorHandling } = require('./_supabase');

module.exports = withErrorHandling(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not set in Vercel — see BACKEND_SETUP.md' });

  const db = serviceClient();
  const user = await requireUser(req, db);
  if (!user) return res.status(403).json({ error: 'Login required' });

  const { jobId } = req.body || {};
  if (!jobId) return res.status(400).json({ error: 'jobId is required' });

  const { data: job, error: jobError } = await db
    .from('editing_jobs')
    .select('title, editor_id')
    .eq('id', jobId)
    .single();
  if (jobError || !job) return res.status(404).json({ error: 'Job not found' });
  if (job.editor_id !== user.id) return res.status(403).json({ error: 'Not your job' });

  const { data: editor } = await db.from('profiles').select('full_name').eq('id', user.id).single();
  const { data: admins } = await db.from('profiles').select('email').eq('role', 'admin');
  const adminEmails = (admins || []).map((a) => a.email).filter(Boolean);
  if (!adminEmails.length) return res.status(200).json({ ok: true, warning: 'No admin email on file' });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailError } = await resend.emails.send({
    from: 'Creator HQ <onboarding@resend.dev>',
    to: adminEmails,
    subject: `Job submitted for review: ${job.title}`,
    html: `<p>${editor?.full_name || 'An editor'} just submitted <strong>${job.title}</strong> for your review.</p>
           <p>Log in to the Editing Jobs page to approve it or send it back.</p>`,
  });
  if (emailError) return res.status(500).json({ error: `Resend error: ${emailError.message}` });

  res.status(200).json({ ok: true });
});
