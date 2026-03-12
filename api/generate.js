module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { theme, seed } = req.body;
  if (!theme || !seed) return res.status(400).json({ error: 'Missing theme or seed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

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
        system: `You are a word puzzle master for Indian players. Given a theme and a daily seed, pick a DIFFERENT 5-letter word each day. Respond ONLY with valid JSON, no markdown, no extra text:
{"word":"XXXXX","hints":["hint1","hint2","hint3"]}

Rules:
- word: exactly 5 uppercase English letters, a real recognizable word
- For Indian themes: culturally relevant words (RAITA, KURTA, TABLA, RAJMA, RUPEE, VEDAS, KARMA, TULSI, SITAR, MANGO, TIGER, CHESS, SUGAR, DHOTI, SAREE, NEEM, GULAL, HENNA, PAGRI etc.)
- For global themes: interesting common English words related to the theme
- hints: exactly 3 clues, progressively easier (cryptic → contextual → direct)
- For Indian themes write hints in fun Hinglish; for global themes use clever English
- NEVER use the word or its synonyms in any hint`,
        messages: [{
          role: 'user',
          content: `Theme: "${theme}". Seed: ${seed}. Pick a fresh word for this exact seed.`
        }]
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error('Anthropic error:', response.status, JSON.stringify(errBody));
      return res.status(500).json({
        error: `Anthropic ${response.status}`,
        type: errBody.error?.type,
        message: errBody.error?.message
      });
    }

    const data = await response.json();
    console.log('Claude raw:', JSON.stringify(data.content));

    const text = data.content?.[0]?.text?.trim() || '';
    if (!text) return res.status(500).json({ error: 'Empty response' });

    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

    if (!parsed.word || !/^[A-Z]{5}$/.test(parsed.word)) {
      return res.status(500).json({ error: 'Invalid word', got: parsed.word, raw: text });
    }

    const hints = Array.isArray(parsed.hints) ? parsed.hints : [parsed.hint || 'Think carefully...'];
    return res.status(200).json({ word: parsed.word, hints, theme });

  } catch (e) {
    console.error('Handler crashed:', e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
}
