// ✅ /pages/api/history.js — version Supabase

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
  const { collaborateur, page = 1, limit = 20, startDate, endDate } = req.query;

  if (!collaborateur) {
    return res.status(400).json({ error: 'Le collaborateur est requis' });
  }

  const currentPage = parseInt(page, 10);
  const recordsPerPage = parseInt(limit, 10);
  const from = (currentPage - 1) * recordsPerPage;
  const to = from + recordsPerPage - 1;

  let query = supabase
    .from('inventaire')
    .select('*', { count: 'exact' })
    .eq('collaborateur', collaborateur)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (startDate && endDate) {
    query = query
      .gte('created_at', `${startDate}T00:00:00`)
      .lt('created_at', `${endDate}T23:59:59`);
  }

  const { data, error, count } = await query;

  if (error) {
    return res.status(500).json({ error: 'Erreur Supabase' });
  }

  return res.status(200).json({
    records: data,
    total: count,
    totalPages: Math.ceil(count / recordsPerPage),
    currentPage,
  });
}

export default handler;