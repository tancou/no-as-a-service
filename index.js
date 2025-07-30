const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3000;

// Load reasons from JSON
const reasons = JSON.parse(fs.readFileSync('./reasons.json', 'utf-8'));
const titles = JSON.parse(fs.readFileSync('./titles.json', 'utf-8'));

// Rate limiter: 120 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  keyGenerator: (req, res) => {
    return req.headers['cf-connecting-ip'] || req.ip; // Fallback if header missing (or for non-CF)
  },
  message: { error: "Too many requests, please try again later. (120 reqs/min/IP)" }
});

app.use(limiter);

function generateId(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
// Fonction de hachage qui convertit un string en entier
function hashToInt(str) {
  // Utilise SHA-1 pour obtenir un buffer fiable
  const hash = crypto.createHash('sha1').update(str).digest();
  // On prend les 4 premiers octets pour former un entier positif (32 bits)
  return hash.readUInt32BE(0);
}

// Random rejection reason endpoint
app.get('/no', (req, res) => {
  const reason = reasons[Math.floor(Math.random() * reasons.length)];
  res.json({ reason });
});

app.get('/', (req, res) => {

  // Vérifie si "ts" est présent dans la query string
  if (!req.query.u) {
    const url = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
    // Génère un hash de 6 caractères alphanumériques minuscules
    url.searchParams.set('u', generateId(6)); // Ajoute un timestamp

    return res.redirect(302, url.toString());
  }

  const u = req.query.u;
  const hashTitle = hashToInt(u);
  const hashReasons = hashToInt(u + 'beaucoup_de_sel');

  const title = titles[hashTitle % titles.length];
  const description = reasons[hashReasons % reasons.length];
  const imageUrl = req.query.image || 'https://example.com/default-image.jpg';

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta property="og:title" content="${title}" />
      <meta property="og:description" content="${description}" />
<!--      <meta property="og:image" content="${imageUrl}" />-->
      <meta property="og:type" content="website" />
      <meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}" />
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${title}">
      <meta name="twitter:description" content="${description}">
<!--      <meta name="twitter:image" content="${imageUrl}">-->
      <title>${title}</title>
    </head>
    <body>
      <h1>${title}</h1>
      <p>${description}</p>
<!--      <img src="${imageUrl}" alt="Image de preview" style="max-width:100%;">-->
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(html);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`No-as-a-Service is running on port ${PORT}`);
});

// Gestion propre des signaux
process.on('SIGINT', () => {
  console.log('SIGINT reçu. Fermeture du serveur...');
  server.close(() => {
    console.log('Serveur arrêté proprement.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM reçu. Fermeture du serveur...');
  server.close(() => {
    console.log('Serveur arrêté proprement.');
    process.exit(0);
  });
});
