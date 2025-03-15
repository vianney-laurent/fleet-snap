import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Méthode ${req.method} non autorisée` });
  }
  try {
    const { concession } = req.body;
    if (!concession || typeof concession !== 'string') {
      return res.status(400).json({ error: "Donnée invalide." });
    }
    const filePath = path.join(process.cwd(), 'data', 'concessions.json');
    const fileContents = await fs.promises.readFile(filePath, 'utf8');
    let concessions = JSON.parse(fileContents);
    if (!Array.isArray(concessions)) {
      return res.status(500).json({ error: "Structure du fichier invalide." });
    }
    const index = concessions.indexOf(concession);
    if (index === -1) {
      return res.status(404).json({ error: "Concession non trouvée." });
    }
    concessions.splice(index, 1);
    await fs.promises.writeFile(filePath, JSON.stringify(concessions, null, 2));
    return res.status(200).json({ concessions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
}