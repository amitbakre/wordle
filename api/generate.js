const https = require('https');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const theme = req.body && req.body.theme;
  const seed  = req.body && req.body.seed;
  const key   = process.env.ANTHROPIC_API_KEY;

  console.log('theme:', theme, 'seed:', seed, 'key:', key ? key.slice(0,12)+'...' : 'MISSING');

  if (!key)   { res.status(500).json({ error: 'No API key' }); return; }
  if (!theme) { res.status(400).json({ error: 'No theme'  }); return; }

  const payload = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: 'Respond ONLY with valid JSON, no markdown: {"word":"XXXXX","hints":["h1","h2","h3"]}. Word must be exactly 5 uppercase letters related to the theme. Hints get progressively easier.',
    messages: [{ role: 'user', content: 'Theme: "' + theme + '". Seed: ' + seed }]
  });

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
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

    console.log('Anthropic status:', result.status, 'body:', result.body.slice(0, 200));

    if (result.status !== 200) {
      res.status(500).json({ error: 'Anthropic error ' + result.status, detail: result.body });
      return;
    }

    const data = JSON.parse(result.body);
    const text = data.content[0].text.trim().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);

    if (!parsed.word || !/^[A-Z]{5}$/.test(parsed.word)) {
      res.status(500).json({ error: 'Bad word', got: parsed.word });
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
