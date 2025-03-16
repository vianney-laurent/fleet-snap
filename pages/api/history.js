export default async function handler(req, res) {
    const { collaborateur, page = 1, limit = 20, startDate, endDate } = req.query;
  
    if (!collaborateur) {
      return res.status(400).json({ error: 'Le collaborateur est requis' });
    }
  
    const currentPage = parseInt(page, 10);
    const recordsPerPage = parseInt(limit, 10);
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
  
    let filterFormula = `Collaborateur="${collaborateur}"`;
  
    // Ajout du filtrage par date si startDate et endDate sont fournis
    if (startDate && endDate) {
      filterFormula = `AND(${filterFormula}, IS_AFTER({Date}, "${startDate}"), IS_BEFORE({Date}, "${endDate}"))`;
    }
  
    const encodedFormula = encodeURIComponent(filterFormula);
    const airtableUrl = `https://api.airtable.com/v0/appJc8wEVopX9HoCj/Inventaire%202024?filterByFormula=${encodedFormula}&view=Vue%20globale`;
  
    try {
      let allRecords = [];
      let offset;
  
      do {
        const url = offset ? `${airtableUrl}&offset=${offset}` : airtableUrl;
  
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          },
        });
  
        if (!response.ok)
          return res.status(response.status).json({ error: 'Erreur lors de la récupération des données' });
  
        const data = await response.json();
        allRecords = allRecords.concat(data.records);
        offset = data.offset;
      } while (offset);
  
      // Tri global : du plus récent au plus ancien
      allRecords.sort((a, b) => new Date(b.fields.Date) - new Date(a.fields.Date));
  
      const paginatedRecords = allRecords.slice(start, end);
      const totalPages = Math.ceil(allRecords.length / recordsPerPage);
  
      return res.status(200).json({
        records: paginatedRecords,
        total: allRecords.length,
        totalPages,
        currentPage,
      });
    } catch (err) {
      console.error('Erreur API Airtable:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }