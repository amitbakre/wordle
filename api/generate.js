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
        system: `You are a word puzzle master creating puzzles for Indian players. Given a theme, respond ONLY with a JSON object — no markdown, no extra text — in this exact format: {"word":"XXXXX","hints":["hint1","hint2","hint3"]}

Rules:
- Word: exactly 5 uppercase English letters, real word Indians would recognize
- For Indian themes use culturally relevant words (RAITA, KURTA, TABLA, RAJMA, RUPEE, VEDAS, KARMA, TULSI, SITAR, SPICE, MANGO, TIGER, CHESS, SUGAR, DHOTI, SAREE, MEHTA etc.)
- hints: array of exactly 3 clues, progressively easier:
  * hints[0]: hardest — very cryptic, no synonyms, indirect reference (shown from start)
  * hints[1]: medium — a bit more direct, cultural/contextual clue (shown after 2 wrong guesses)  
  * hints[2]: easiest — most direct without giving away the word (shown after 4 wrong guesses)
- For Indian themes, write hints in a fun Hinglish style (mix Hindi words + English)
- For global themes, write hints in clever English
- Never use the word itself or direct synonyms in any hint`,
        messages: [{ role: 'user', content: `Theme: ${theme}. Seed: ${seed}.` }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim() || '';
    const parsed = JSON.parse(text.replace(/```[a-z]*|```/g, '').trim());

    if (!parsed.word || parsed.word.length !== 5 || !/^[A-Z]+$/.test(parsed.word)) {
      throw new Error('Invalid word from AI');
    }
    // Normalise: support both hints array and legacy hint string
    const hints = Array.isArray(parsed.hints) ? parsed.hints : [parsed.hint || ''];
    return res.status(200).json({ word: parsed.word, hints, theme });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
