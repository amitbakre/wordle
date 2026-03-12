export default async function handler(req, res) {
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
        max_tokens: 400,
        system: `You are a word puzzle master for Indian players. Given a theme and a daily seed number, pick a DIFFERENT 5-letter word each day — the seed ensures variety. Respond ONLY with a valid JSON object, no markdown, no explanation:
{"word":"XXXXX","hints":["hint1","hint2","hint3"]}

Rules:
- word: exactly 5 uppercase English letters, a real word, must be UNIQUE — use the seed to vary your choice each day
- For Indian themes: use culturally relevant words Indians know well (RAITA, KURTA, TABLA, RAJMA, RUPEE, VEDAS, KARMA, TULSI, SITAR, SPICE, MANGO, TIGER, CHESS, SUGAR, DHOTI, SAREE, NEEM, ROGAN, GULAL, HENNA, DIWAS, MEHTA, AKHIL, PAGRI etc.)
- For global themes: use interesting common English words related to the theme
- hints: exactly 3 clues, progressively easier:
  * hints[0]: cryptic indirect reference, no synonyms (revealed after 2nd guess)
  * hints[1]: more contextual/cultural clue (revealed after 4th guess)
  * hints[2]: most direct clue without giving the word away (revealed after 5th guess)
- For Indian themes write hints in fun Hinglish; for global themes use clever English
- NEVER use the word or direct synonyms in any hint`,
        messages: [{
          role: 'user',
          content: `Theme: "${theme}". Today's unique seed: ${seed}. Pick a fresh word for this exact date and theme.`
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Anthropic API error: ${response.status}`, detail: errText });
    }

    const data = await response.json();

    // Log for debugging (visible in Vercel function logs)
    console.log('Claude raw response:', JSON.stringify(data.content));

    const text = data.content?.[0]?.text?.trim() || '';
    if (!text) return res.status(500).json({ error: 'Empty response from Claude', raw: data });

    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.word || parsed.word.length !== 5 || !/^[A-Z]{5}$/.test(parsed.word)) {
      return res.status(500).json({ error: 'Invalid word', got: parsed.word, raw: text });
    }

    const hints = Array.isArray(parsed.hints) && parsed.hints.length >= 1
      ? parsed.hints
      : [parsed.hint || 'Think carefully...'];

    return res.status(200).json({ word: parsed.word, hints, theme, seed });

  } catch (e) {
    console.error('generate error:', e);
    return res.status(500).json({ error: e.message });
  }
}
