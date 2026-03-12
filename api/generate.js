module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Safely parse body — Vercel auto-parses JSON but guard anyway
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) { return res.status(400).json({ error: 'Invalid JSON body' }); }
  }
  if (!body) return res.status(400).json({ error: 'Empty body' });

  const { theme, seed } = body;
  if (!theme || !seed) return res.status(400).json({ error: 'Missing theme or seed', got: JSON.stringify(body) });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in environment' });

  // Log what we received so we can see it in Vercel logs
  console.log('Request received — theme:', theme, '| seed:', seed, '| key starts:', apiKey.slice(0, 10));

  let anthropicResponse;
  try {
    anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: `You are a word puzzle master for Indian players. Respond ONLY with valid JSON — no markdown, no extra text:
{"word":"XXXXX","hints":["hint1","hint2","hint3"]}
Rules: word must be exactly 5 uppercase English letters. For Indian themes use culturally relevant words. hints must be 3 clues getting progressively easier. Never use the word itself in hints.`,
        messages: [{ role: 'user', content: `Theme: "${theme}". Seed: ${seed}.` }]
      })
    });
  } catch (fetchErr) {
    console.error('fetch() threw:', fetchErr.message);
    return res.status(500).json({ error: 'fetch failed: ' + fetchErr.message });
  }

  if (!anthropicResponse.ok) {
    const errBody = await anthropicResponse.text();
    console.error('Anthropic HTTP error:', anthropicResponse.status, errBody);
    return res.status(500).json({ error: `Anthropic returned ${anthropicResponse.status}`, detail: errBody });
  }

  let data;
  try {
    data = await anthropicResponse.json();
  } catch(e) {
    return res.status(500).json({ error: 'Failed to parse Anthropic response' });
  }

  console.log('Claude raw response:', JSON.stringify(data.content));

  const text = data.content?.[0]?.text?.trim() || '';
  if (!text) return res.status(500).json({ error: 'Empty text from Claude', full: data });

  let parsed;
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch(e) {
    return res.status(500).json({ error: 'JSON parse failed', raw: text });
  }

  if (!parsed.word || !/^[A-Z]{5}$/.test(parsed.word)) {
    return res.status(500).json({ error: 'Bad word format', got: parsed.word });
  }

  const hints = Array.isArray(parsed.hints) ? parsed.hints : [parsed.hint || 'Think carefully...'];
  console.log('Returning word:', parsed.word);
  return res.status(200).json({ word: parsed.word, hints, theme });
}
