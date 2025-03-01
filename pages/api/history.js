export default async function handler(req, res) {
    const { email } = req.query;

    const url = "https://api.airtable.com/v0/appJc8wEVopX9HoCj/Inventaire%202024?maxRecords=10&view=Vue%20globale";
// ?filterByFormula=({Collaborateur}='${email}') // filter by collaborator
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        },
    });

    const data = await response.json();
    res.status(200).json(data.records);
}