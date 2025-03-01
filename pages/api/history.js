export default async function handler(req, res) {
    const { collaborateur } = req.query;

    if (!collaborateur) {
        return res.status(400).json({ error: 'Le collaborateur est requis' });
    }

    const filterFormula = `Collaborateur="${collaborateur}"`;
    const encodedFormula = encodeURIComponent(filterFormula);

    const airtableUrl = `https://api.airtable.com/v0/appJc8wEVopX9HoCj/Inventaire%202024?filterByFormula=${encodedFormula}&view=Vue%20globale`;

    try {
        const response = await fetch(airtableUrl, {
            headers: {
                Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,  // ⚠️ Clé privée côté serveur
            },
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Erreur lors de la récupération des données' });
        }

        const data = await response.json();
        return res.status(200).json({ records: data.records || [] });
    } catch (err) {
        console.error('Erreur API Airtable:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
}