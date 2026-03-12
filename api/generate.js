export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { theme, seed } = req.body;
  if (!theme || !seed) return res.status(400).json({ error: 'Missing theme or seed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        system: `You are a word puzzle master. Given a theme, respond ONLY with a JSON object — no markdown, no extra text — in this exact format: {"word":"XXXXX","hint":"..."} Rules: word must be exactly 5 uppercase letters, a common English word related to the theme. Hint must be a cryptic clue of max 10 words, no synonyms of the word, no direct giveaways.`,
        messages: [{ role: 'user', content: `Theme: ${theme}. Date seed: ${seed}.` }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim() || '';
    const parsed = JSON.parse(text.replace(/```[a-z]*|```/g, '').trim());

    if (!parsed.word || parsed.word.length !== 5 || !/^[A-Z]+$/.test(parsed.word)) {
      throw new Error('Invalid word from AI');
    }

    return res.status(200).json({ word: parsed.word, hint: parsed.hint, theme });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
