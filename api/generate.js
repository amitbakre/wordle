const https = require('https');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const theme     = req.body && req.body.theme;
  const seed      = req.body && req.body.seed;
  const usedWords = req.body && req.body.usedWords || []; // last 30 days of words
  const key       = process.env.COHERE_API_KEY;

  console.log('theme:', theme, 'seed:', seed, 'usedWords:', usedWords, 'key:', key ? key.slice(0,12)+'...' : 'MISSING');

  if (!key)   { res.status(500).json({ error: 'No COHERE_API_KEY' }); return; }
  if (!theme) { res.status(400).json({ error: 'No theme' }); return; }

  const avoidLine = usedWords.length > 0
    ? `\n- NEVER use any of these recently used words: ${usedWords.join(', ')}`
    : '';

  const payload = JSON.stringify({
    model: 'command-r-plus-08-2024',
    messages: [
      {
        role: 'system',
        content: `You are a word puzzle master for Indian players. Given a theme and a daily seed, pick a DIFFERENT 5-letter word each day. Respond ONLY with valid JSON, no markdown, no extra text:
{"word":"XXXXX","hints":["hint1","hint2","hint3"]}

Rules:
- word: exactly 5 uppercase English letters
- The word MUST be a real, complete, standalone English word that exists in a dictionary
- NEVER use plural forms of words — SARIS, TABLAS, KURTAS, RAGAS are NOT valid, use SARI, TABLA, KURTA, RAGA instead
- NEVER use verb conjugations — DANCES, PLAYED, SINGS are NOT valid
- NEVER truncate, abbreviate or invent words — PERSI, INDIA, GREEC are NOT valid (not real words)
- NEVER use proper nouns, country names, city names or people's names
- The word must be in its BASE/ROOT form only — singular nouns, base verbs, root adjectives
- Good examples: TABLA, RAITA, KARMA, TIGER, CHESS, MANGO, SPICE, BRAVE, SWORD, OCEAN
- Bad examples: PERSI (truncated), INDIA (proper noun), DELHI (city name)
- For Indian themes: use common Indian cultural words that are in the English dictionary
- hints: exactly 3 clues, progressively easier (cryptic → contextual → direct)
- The hints should cleverly lead to the word without using the word or direct synonyms
- For Indian themes write hints in fun Hinglish; for global themes use clever English${avoidLine}`
      },
      {
        role: 'user',
        content: `Theme: "${theme}". Seed: ${seed}. Pick a fresh word not used in the last 30 days.`
      }
    ],
    temperature: 0.9,
    max_tokens: 400
  });

  const options = {
    hostname: 'api.cohere.com',
    path: '/v2/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key,
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  try {
    const result = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve({ status: response.statusCode, body: data }));
      });
      request.on('error', reject);
      request.setTimeout(25000, () => { request.destroy(); reject(new Error('timeout')); });
      request.write(payload);
      request.end();
    });

    console.log('Cohere status:', result.status, 'body:', result.body.slice(0, 300));

    if (result.status !== 200) {
      res.status(500).json({ error: 'Cohere error ' + result.status, detail: result.body });
      return;
    }

    const data = JSON.parse(result.body);
    const text = data.message?.content?.[0]?.text?.trim().replace(/```json|```/g, '').trim();
    console.log('Cohere text:', text);

    if (!text) { res.status(500).json({ error: 'Empty response', full: data }); return; }

    const parsed = JSON.parse(text);

    if (!parsed.word || !/^[A-Z]{5}$/.test(parsed.word)) {
      res.status(500).json({ error: 'Bad word format', got: parsed.word, raw: text });
      return;
    }

    const suspicious = ['PERSI','GREEC','ROMAN','CHINE','TURKI','AFRIC','EUROP','AMERI'];
    if (suspicious.includes(parsed.word)) {
      res.status(500).json({ error: 'Suspicious word rejected', got: parsed.word });
      return;
    }

    // Reject plurals — words ending in S unless they're known valid words
    const word = parsed.word;
    const validEndingInS = ['CHESS','GLASS','GRASS','DRESS','BLESS','CROSS','PRESS','BLISS','BONUS','FOCUS','NEXUS','LOTUS','VIRUS','MINUS','TORUS','KUDOS','ETHOS'];
    if (word.endsWith('S') && !validEndingInS.includes(word)) {
      console.warn('Plural rejected:', word);
      res.status(500).json({ error: 'Plural word rejected', got: word });
      return;
    }

    // Reject if AI repeated a recently used word
    if (usedWords.includes(word)) {
      res.status(500).json({ error: 'AI repeated a recent word', got: word });
      return;
    }

    const hints = Array.isArray(parsed.hints) ? parsed.hints : [parsed.hint || ''];
    console.log('Success! word:', word);
    res.status(200).json({ word, hints, theme });

  } catch(e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
};
