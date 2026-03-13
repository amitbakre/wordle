const https = require('https');

const THEME_POOLS = {
  'Space & Cosmos': [
    'ORBIT','COMET','LUNAR','SOLAR','NOVA','ALIEN','TITAN','PROBE','LASER','QUARK',
    'OZONE','LIGHT','PLUTO','VENUS','DWARF','PULSE','FLARE','STORM','ETHER','RINGS',
    'BLACK','GAMMA','RADIO','DARK','STAR','MOON','MARS','DUST','VOID','MASS',
    'BEAM','WAVE','FIELD','FORCE','PHASE','ATLAS','CLOUD','DELTA','EVENT','FOCUS',
    'GIANT','IONIC','MASER','NADIR','OPTIC','POLAR','RADAR','RELAY','SIGMA','TIDAL',
    'UMBRA','ZENITH','APOGEE','BOLIDE','CHORD','DENSE','EPOCH','GEOID','HALO','INERT'
  ],
  'Cricket': [
    'PITCH','STUMP','DRIVE','COVER','GUARD','SWEEP','EXTRA','CATCH','BOWL','SCORE',
    'FIELD','BLOCK','GLANCE','FLICK','SLASH','PULL','HOOK','DUCK','SEAM','SWING',
    'PACE','SPIN','TOSS','MATCH','BAILS','MAIDEN','BOUNCER','GOOGLY','DOOSRA','FLIPPER',
    'POINT','THIRD','FINE','SQUARE','POWER','PLAY','REVIEW','APPEAL','OPENER','LOWER',
    'SNICK','EDGE','GULLY','SLIPS','SHORT','CREASE','WIDE','YORKER','WICKET','TAIL'
  ],
  'Indian Food & Spices': [
    'RAITA','CURRY','SPICE','CUMIN','CLOVE','GHEE','NAAN','KORMA','HALWA','CHAAT',
    'JEERA','KADHI','POORI','KHEER','LASSI','KULFI','PAPAD','TIKKA','KEBAB','DHAL',
    'BAJRA','SATTU','BESAN','SUJI','MAWA','RABRI','SEVAI','UPMA','IDLI','DOSA',
    'SAMBAR','RASAM','PONGAL','AVIAL','THORAN','KOOTU','TADKA','ACHAAR','MODAK','LADDOO',
    'BARFI','PEDHA','JALEBI','GULAB','IMARTI','PAYASAM','SEVIYA','KHICHDI','PULAO','ROGAN'
  ],
  'Bollywood & Cinema': [
    'FILMI','DANCE','DRAMA','SCENE','STORY','ACTOR','MUSIC','AWARD','SHOOT','FRAME',
    'REEL','ROLES','STARS','HERO','PLOT','SETS','PROP','CAST','DEBUT','GENRE',
    'SCORE','LYRIC','REMIX','STAGE','LIGHT','CROWD','LAUGH','TEARS','CHEER','STYLE',
    'EXTRA','ENTRY','GRAND','SHOWS','NAACH','GAANA','DHOL','TUNES','BEATS','GLAM',
    'POSES','LOOKS','VAMPS','MASALA','MASTI','TAPORI','SONGS','ALBUM','CHART','RECORD'
  ],
  'Indian Festivals': [
    'GULAL','HENNA','FEAST','LIGHT','FLAME','DIYA','PUJA','TILAK','AARTI','MITHAI',
    'GARBA','PRAYER','RITUAL','BLESSING','DHOL','BEATS','INCENSE','CAMPHOR','SINDOOR','TURMERIC',
    'MARIGOLD','JASMINE','LOTUS','MANGO','COCONUT','WHEAT','RICE','LENTIL','JAGGERY','HONEY',
    'SUGAR','SWEETS','LAMPS','CANDLE','SPARK','GLOW','BLAZE','CHEER','COLOR','WATER',
    'RANGOLI','KITE','CRACKER','BONFIRE','LANTERN','CONCH','BELLS','CAMPFIRE','FIREWORK','OFFERING'
  ],
  'Indian Mythology & Epics': [
    'KARMA','VEDAS','ATMAN','DEITY','LOTUS','AVATAR','DHARMA','MOKSHA','MANTRA','CHAKRA',
    'SHAKTI','DEVA','ASURA','RISHI','MUNI','YOGI','TAPAS','MAYA','ARJUN','BHIMA',
    'NAKUL','RAMA','SITA','HANUMAN','LAXMAN','INDRA','VAYU','AGNI','GANGA','SHIVA',
    'BRAHMA','VISHNU','SURYA','CHANDRA','KUBERA','YAMA','VARUNA','MARUTI','KARNA','DRONA',
    'KUNTI','RADHA','DEVAKI','NANDA','YUVA','YAKSHA','NAGA','GANDHARVA','KINNARA','SIDDHA'
  ],
  'Indian Geography & Cities': [
    'RIVER','PLAIN','DELTA','RIDGE','COAST','FIELD','VALLEY','GHATS','JUNGLE','DESERT',
    'BEACH','HILLS','DUNES','GORGE','FALLS','MARSH','CLIFF','BASIN','LAGOON','ISLAND',
    'FOREST','STEPPE','CANYON','RAVINE','STREAM','CREEK','TIDAL','FLOOD','CORAL','WETLAND',
    'MONSOON','DROUGHT','NORTH','SOUTH','EAST','WEST','BORDER','REGION','URBAN','RURAL',
    'TRIBAL','COASTAL','INLAND','HILLY','ROCKY','SANDY','MUDDY','GRASSY','WOODY','SWAMPY'
  ],
  'Indian Music & Dance': [
    'TABLA','SITAR','RAGA','TAAL','VEENA','BEATS','NOTES','SAROD','DHOL','SHEHNAI',
    'MUDRA','BHAVA','THUMRI','DADRA','BHAJAN','KIRTAN','GHAZAL','TARANA','ALAP','JHOR',
    'JHALA','TODA','MUKHRA','ANTARA','SANCHARI','VILAMBIT','MADHYA','DRUT','KATHAK','ODISSI',
    'LAVANI','GARBA','DANDIYA','CHHAU','BIHU','LASYA','TANDAVA','NATYA','NRITTA','NRITYA',
    'KHYAL','DHRUPAD','TAPPA','CHAITI','KAJRI','SOHAR','LACHARI','HORI','SAWAN','BARAMASA'
  ],
  'Yoga & Ayurveda': [
    'TULSI','NEEM','ASANA','PRANA','DOSHA','HERBS','DETOX','VATA','PITTA','KAPHA',
    'OJAS','TEJAS','AGNI','DHATU','MALA','SURYA','MUDRA','BANDHA','DRISHTI','CHAKRA',
    'NADI','APANA','SAMANA','UDANA','VYANA','BRAHMI','AMALAKI','HARITAKI','GUDUCHI','PUNARNAVA',
    'GOKSHURA','SHILAJIT','GUGGULU','TURMERIC','GINGER','GARLIC','CUMIN','CORIANDER','FENNEL','FENUGREEK',
    'SHATAVARI','ASHWAGANDHA','TRIPHALA','LICORICE','NIRGUNDI','BILVA','ARJUNA','KARELA','KUTKI','PIPPALI'
  ],
  'Science & Technology': [
    'LASER','PIXEL','SOLAR','PROBE','WATTS','LOGIC','ARRAY','BYTES','WIRED','CODED',
    'OHMS','VOLTS','HERTZ','JOULE','TESLA','KELVIN','NEWTON','PASCAL','FARAD','HENRY',
    'QUBIT','NEURAL','BINARY','CIPHER','MATRIX','VECTOR','SCALAR','TENSOR','ROBOT','DRONE',
    'RADAR','LIDAR','SONAR','ATOM','NUCLEUS','PROTON','PHOTON','QUARK','GLUON','BOSON',
    'GENE','PROTEIN','ENZYME','HORMONE','NEURON','SYNAPSE','CORTEX','GENOME','ALLELE','CODON'
  ],
  'Animals & Wildlife': [
    'TIGER','BISON','COBRA','EAGLE','CRANE','OTTER','SLOTH','TAPIR','RHINO','HYENA',
    'CIVET','GAUR','DHOLE','PANDA','JACKAL','LANGUR','BONNET','HORNBILL','FLAMINGO','PELICAN',
    'SUNBIRD','PEACOCK','VULTURE','KITE','HARRIER','OSPREY','MUGGER','GHARIAL','PYTHON','VIPER',
    'KRAIT','GECKO','SKINK','TORTOISE','DOLPHIN','DUGONG','WHALE','SHARK','ROHU','PRAWN',
    'FIREFLY','DRAGONFLY','BUTTERFLY','BEETLE','MANTIS','SCORPION','MONITOR','CHAMELEON','TERMITE','LEECH'
  ],
  'History & Ancient Civilizations': [
    'SWORD','REIGN','ROYAL','TRADE','FORGE','RULER','SIEGE','ALTAR','RELIC','RUINS',
    'SCROLL','TABLET','THRONE','ARMOUR','SHIELD','SPEAR','ARROW','CAVALRY','INFANTRY','LEGION',
    'MOAT','TOWER','VAULT','CRYPT','TOMB','COINS','BARTER','GOODS','TAXES','EDICT',
    'GUILD','CRAFT','SMITH','MASON','WEAVER','POTTER','FARMER','TRADER','SAILOR','SOLDIER',
    'FLEET','MARCH','BATTLE','TREATY','TRUCE','EMPIRE','COLONY','VASSAL','FEUDAL','SERF'
  ],
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

  // Get valid 5-letter pool for this theme, excluding recently used words
  const fullPool  = (THEME_POOLS[theme] || []).filter(w => w.length === 5);
  const freshPool = fullPool.filter(w => !usedWords.includes(w));

  if (freshPool.length === 0) {
    res.status(500).json({ error: 'Pool exhausted for theme', theme });
    return;
  }

  const avoidLine = usedWords.length > 0
    ? `\n- Recently used words to AVOID: ${usedWords.join(', ')}`
    : '';

  const payload = JSON.stringify({
    model: 'command-r-plus-08-2024',
    messages: [
      {
        role: 'system',
        content: `You are a word puzzle master for Indian players. Pick ONE word from the provided pool and write 3 creative hints. Respond ONLY with valid JSON, no markdown:
{"word":"XXXXX","hints":["hint1","hint2","hint3"]}

Rules:
- word: MUST be exactly as spelled in the pool — do not modify, truncate or invent
- hints: exactly 3 clues, progressively easier (cryptic → contextual → direct)
- For Indian themes write hints in fun Hinglish; for global themes use clever English
- NEVER use the word or its synonyms in any hint
- Use the seed to vary your selection each day${avoidLine}`
      },
      {
        role: 'user',
        content: `Theme: "${theme}". Seed: ${seed}.\nWord pool: ${freshPool.join(', ')}\n\nPick one word from this pool and write 3 hints.`
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

    // Hard reject — must be from our curated pool
    if (!fullPool.includes(word)) {
      console.warn(`Rejected "${word}" — not in pool for "${theme}"`);
      res.status(500).json({ error: 'Word not in theme pool', got: word });
      return;
    }

    // Reject recently used words
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
