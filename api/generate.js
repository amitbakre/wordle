const https = require('https');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const theme = req.body && req.body.theme;
  const seed  = req.body && req.body.seed;
  const key   = process.env.COHERE_API_KEY;

  console.log('theme:', theme, 'seed:', seed, 'key:', key ? key.slice(0,12)+'...' : 'MISSING');

  if (!key)   { res.status(500).json({ error: 'No COHERE_API_KEY' }); return; }
  if (!theme) { res.status(400).json({ error: 'No theme' }); return; }

  // Using Cohere v2 chat API
  const payload = JSON.stringify({
    model: 'command-r-plus-08-2024',
    messages: [
      {
        role: 'system',
        content: `You are a word puzzle master for Indian players. Given a theme and a daily seed, pick a DIFFERENT 5-letter word each day. Respond ONLY with valid JSON, no markdown, no extra text:
{"word":"XXXXX","hints":["hint1","hint2","hint3"]}

Rules:
- word: exactly 5 uppercase English letters, a real recognizable word
- For Indian themes: culturally relevant words (RAITA, KURTA, TABLA, RAJMA, RUPEE, VEDAS, KARMA, TULSI, SITAR, MANGO, TIGER, CHESS, SUGAR, DHOTI, SAREE, NEEM, GULAL, HENNA, PAGRI etc.)
- For global themes: interesting common English words related to the theme
- hints: exactly 3 clues, progressively easier (cryptic → contextual → direct)
- For Indian themes write hints in fun Hinglish; for global themes use clever English
- NEVER use the word or its synonyms in any hint`
      },
      {
        role: 'user',
        content: `Theme: "${theme}". Seed: ${seed}. Pick a fresh word for this exact seed.`
      }
    ],
    temperature: 0.8,
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
    // v2 API response format
    const text = data.message?.content?.[0]?.text?.trim().replace(/```json|```/g, '').trim();
    console.log('Cohere text:', text);

    if (!text) {
      res.status(500).json({ error: 'Empty response', full: data });
      return;
    }

    const parsed = JSON.parse(text);

    if (!parsed.word || !/^[A-Z]{5}$/.test(parsed.word)) {
      res.status(500).json({ error: 'Bad word', got: parsed.word, raw: text });
      return;
    }

    const hints = Array.isArray(parsed.hints) ? parsed.hints : [parsed.hint || ''];
    console.log('Success! word:', parsed.word);
    res.status(200).json({ word: parsed.word, hints, theme });

  } catch(e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
};
