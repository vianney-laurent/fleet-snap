export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { recordId } = req.body;

    if (!recordId) {
        return res.status(400).json({ error: 'recordId manquant' });
    }

    const airtableUrl = `https://api.airtable.com/v0/appJc8wEVopX9HoCj/Inventaire%202024/${recordId}`;

    try {
        const response = await fetch(airtableUrl, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
            },
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Erreur lors de la suppression' });
        }

        return res.status(200).json({ message: 'Enregistrement supprimé' });
    } catch (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
    }
}