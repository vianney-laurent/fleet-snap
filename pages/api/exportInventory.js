export default async function handler(req, res) {
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/exportInventory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(req.body),
  });

  const data = await response.json();

  if (!response.ok) {
    res.status(500).json({ error: data.error || 'Erreur export' });
  } else {
    res.status(200).json({ success: true });
  }
}