export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { recordId, newPlateVin } = req.body;

    if (!recordId || !newPlateVin) {
        return res.status(400).json({ error: 'Données manquantes' });
    }

    const airtableUrl = `https://api.airtable.com/v0/appJc8wEVopX9HoCj/Inventaire%202024/${recordId}`;

    try {
        const response = await fetch(airtableUrl, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fields: {
                    'Plaque / VIN': newPlateVin,
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erreur Airtable:', errorData);
            return res.status(response.status).json({ error: 'Erreur lors de la mise à jour Airtable' });
        }

        return res.status(200).json({ message: 'Mise à jour réussie' });
    } catch (err) {
        console.error('Erreur serveur:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
}