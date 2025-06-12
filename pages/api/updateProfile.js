import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { id, name, concession } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Missing user id.' });
  }

  // Update user_metadata by id
  const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { name, concession }
  });

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  // Pour debug (optionnel)
  const { data: updatedUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(id);
  console.log('User après update :', updatedUser, fetchError);

  res.status(200).json({ message: 'Profil mis à jour', user: updatedUser });
}