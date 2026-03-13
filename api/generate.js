const https = require('https');

const THEME_POOLS = {
  'Space & Cosmos':              ['ORBIT','COMET','LUNAR','SOLAR','NOVA','ALIEN','TITAN','PROBE','LASER','QUARK','OZONE','LIGHT','PLUTO','VENUS','DWARF','PULSE','FLARE','STORM','ASTRO','ETHER'],
  'Cricket':                     ['PITCH','STUMP','DRIVE','COVER','GUARD','SWEEP','EXTRA','YORKER','WICKET','CREASE','SPARE'],
  'Indian Food & Spices':        ['RAITA','CURRY','SPICE','CUMIN','CLOVE','GHEE','NAAN','ROGAN','SABZI','KORMA','HALWA','CHAAT'],
  'Bollywood & Cinema':          ['FILMI','DANCE','DRAMA','SCENE','STORY','ACTOR','MUSIC','AWARD','SHOOT','FRAME'],
  'Indian Festivals':            ['GULAL','HENNA','FEAST','LIGHT','FLAME','DIYA','PUJA'],
  'Indian Mythology & Epics':    ['KARMA','VEDAS','ATMAN','DEITY','LOTUS','AVATAR','DHARMA'],
  'Indian Geography & Cities':   ['RIVER','PLAIN','DELTA','RIDGE','COAST','FIELD','VALLEY'],
  'Indian Music & Dance':        ['TABLA','SITAR','RAGA','TAAL','VEENA','BEATS','NOTES'],
  'Yoga & Ayurveda':             ['TULSI','NEEM','ASANA','PRANA','DOSHA','HERBS','DETOX'],
  'Science & Technology':        ['LASER','PIXEL','SOLAR','PROBE','WATTS','LOGIC','ARRAY','BYTES','WIRED','CODED'],
  'Animals & Wildlife':          ['TIGER','BISON','COBRA','EAGLE','CRANE','OTTER','SLOTH','TAPIR','RHINO','HYENA'],
  'History & Ancient Civilizations': ['SWORD','REIGN','ROYAL','TRADE','FORGE','RULER','SIEGE','ALTAR','RELIC'],
};

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const theme     = req.body && req.body.theme;
  const seed      = req.body && req.body.seed;
  const usedWords = (req.body && req.body.usedWords) || [];
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
        content: `You are a word puzzle master for Indian players. Given a theme and a daily seed, pick a 5-letter word STRICTLY related to that theme. Respond ONLY with valid JSON, no markdown, no extra text:
{"word":"XXXXX","hints":["hint1","hint2","hint3"]}

Rules:
- word: exactly 5 uppercase English letters
- The word MUST be directly and obviously related to the theme
- NEVER pick a word just because it has 5 letters — it MUST fit the theme naturally
- The word MUST be a real complete standalone English word in a dictionary
- NEVER use plural forms — SARIS, TABLAS are NOT valid, use SARI, TABLA
- NEVER use verb conjugations — DANCES, PLAYED are NOT valid
- NEVER truncate or invent words — PERSI, GREEC are NOT valid
- NEVER use proper nouns, country names, city names, people's names
- Word must be in BASE/ROOT form only
- Good Space examples: ORBIT, COMET, LUNAR, SOLAR, PROBE, TITAN, DWARF, FLARE
- Good Cricket examples: PITCH, STUMP, DRIVE, COVER, SWEEP, GUARD
- hints: exactly 3 clues, progressively easier (cryptic → contextual → direct)
- For Indian themes write hints in fun Hinglish; for global themes use clever English
- NEVER use the word or its synonyms in any hint${avoidLine}`
      },
      {
        role: 'user',
        content: `Theme: "${theme}". Seed: ${seed}. Pick a fresh word strictly related to this theme.`
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
    const word = parsed.word;

    if (!word || !/^[A-Z]{5}$/.test(word)) {
      res.status(500).json({ error: 'Bad word format', got: word, raw: text });
      return;
    }

    // Reject suspicious truncated words
    const suspicious = ['PERSI','GREEC','ROMAN','CHINE','TURKI','AFRIC','EUROP','AMERI','MERDE'];
    if (suspicious.includes(word)) {
      res.status(500).json({ error: 'Suspicious word rejected', got: word });
      return;
    }

    // Reject plurals — words ending in S unless known valid
    const validEndingInS = ['CHESS','GLASS','GRASS','DRESS','BLESS','CROSS','PRESS','BLISS','BONUS','FOCUS','NEXUS','LOTUS','VIRUS','MINUS','KUDOS','ETHOS'];
    if (word.endsWith('S') && !validEndingInS.includes(word)) {
      res.status(500).json({ error: 'Plural word rejected', got: word });
      return;
    }

    // Reject recently used words
    if (usedWords.includes(word)) {
      res.status(500).json({ error: 'AI repeated a recent word', got: word });
      return;
    }

    // Warn if word seems off-theme
    const pool = THEME_POOLS[theme];
    if (pool && !pool.includes(word)) {
      console.warn(`Word "${word}" not in known pool for theme "${theme}"`);
    }

    const hints = Array.isArray(parsed.hints) ? parsed.hints : [parsed.hint || ''];
    console.log('Success! word:', word);
    res.status(200).json({ word, hints, theme });

  } catch(e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
};
