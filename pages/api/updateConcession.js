import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Méthode ${req.method} non autorisée` });
  }
  try {
    const { oldConcession, newConcession } = req.body;
    if (!oldConcession || !newConcession || typeof newConcession !== 'string' || newConcession.trim() === '') {
      return res.status(400).json({ error: "Données invalides." });
    }
    const updatedConcession = newConcession.trim();
    const filePath = path.join(process.cwd(), 'data', 'concessions.json');
    const fileContents = await fs.promises.readFile(filePath, 'utf8');
    let concessions = JSON.parse(fileContents);
    if (!Array.isArray(concessions)) {
      return res.status(500).json({ error: "Structure du fichier invalide." });
    }
    const index = concessions.indexOf(oldConcession);
    if (index === -1) {
      return res.status(404).json({ error: "Concession non trouvée." });
    }
    if (concessions.includes(updatedConcession)) {
      return res.status(400).json({ error: "Une concession avec ce nom existe déjà." });
    }
    concessions[index] = updatedConcession;
    await fs.promises.writeFile(filePath, JSON.stringify(concessions, null, 2));
    return res.status(200).json({ concessions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
}