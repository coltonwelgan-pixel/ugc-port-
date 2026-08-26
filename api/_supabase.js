const { createClient } = require('@supabase/supabase-js');

function serviceClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new ConfigError('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in Vercel — see BACKEND_SETUP.md');
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

class ConfigError extends Error {}

// Wraps a handler so any thrown error (missing env vars, Supabase client
// construction, etc.) becomes a clean JSON response instead of a raw
// Vercel FUNCTION_INVOCATION_FAILED crash.
function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      const status = err instanceof ConfigError ? 500 : 500;
      res.status(status).json({ error: err.message || 'Unexpected server error' });
    }
  };
}

async function requireUser(req, db) {
  const auth = req.headers.authorization || '';
  const token = (auth.startsWith('Bearer ') ? auth.slice(7) : null) || req.query?.token || null;
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function requireAdmin(req, db) {
  const user = await requireUser(req, db);
  if (!user) return null;
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') return null;
  return user;
}

module.exports = { serviceClient, requireUser, requireAdmin, withErrorHandling };
