import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Méthode ${req.method} non autorisée` });
  }
  try {
    const { concession } = req.body;
    if (!concession || typeof concession !== 'string' || concession.trim() === '') {
      return res.status(400).json({ error: "Le nom de la concession est invalide." });
    }
    const newConcession = concession.trim();
    const filePath = path.join(process.cwd(), 'data', 'concessions.json');
    const fileContents = await fs.promises.readFile(filePath, 'utf8');
    let concessions = JSON.parse(fileContents);
    if (!Array.isArray(concessions)) {
      concessions = [];
    }
    if (concessions.includes(newConcession)) {
      return res.status(400).json({ error: "Cette concession existe déjà." });
    }
    concessions.push(newConcession);
    await fs.promises.writeFile(filePath, JSON.stringify(concessions, null, 2));
    return res.status(200).json({ concessions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
}