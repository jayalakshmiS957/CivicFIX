/**
 * CivicResolve Voice Assistant Speech & NLP Utilities
 */

/**
 * Detect spoken language choice from speech transcript
 * @param {string} transcript
 * @returns {'en'|'ta'|null}
 */
export function detectSpokenLanguage(transcript) {
  if (!transcript || typeof transcript !== 'string') return null;
  const lower = transcript.toLowerCase().trim();

  // Tamil variants
  if (
    lower.includes('tamil') ||
    lower.includes('தமிழ்') ||
    lower.includes('தமிள்') ||
    lower.includes('thamizh') ||
    lower.includes('thamil') ||
    lower.includes('tamizh')
  ) {
    return 'ta';
  }

  // English variants
  if (
    lower.includes('english') ||
    lower.includes('இங்கிலீஷ்') ||
    lower.includes('ஆங்கிலம்') ||
    lower.includes('inglish') ||
    lower.includes('angilam')
  ) {
    return 'en';
  }

  return null;
}

/**
 * Detect spoken confirmation (Yes / No)
 * @param {string} transcript
 * @param {'en'|'ta'} language
 * @returns {'yes'|'no'|null}
 */
export function detectSpokenConfirmation(transcript, language = 'en') {
  if (!transcript || typeof transcript !== 'string') return null;
  const lower = transcript.toLowerCase().trim();
  const words = lower.split(/[\s,;.!?]+/);

  const noTokensEn = ['no', 'nope', 'cancel', 'stop', 'back', 'restart', 'nevermind', "don't"];
  const noTokensTa = ['இல்லை', 'வேண்டாம்', 'ரத்து', 'illai', 'vendaam', 'venam', 'venda'];

  const yesTokensEn = ['yes', 'yeah', 'yep', 'sure', 'proceed', 'fill', 'ok', 'okay', 'confirm', 'correct', 'do it', 'please'];
  const yesTokensTa = [
    'ஆம்', 'சரி', 'நிரப்பு', 'நிரப்புங்கள்', 'ஓகே', 'சரிதான்', 'ஆமாம்',
    'aam', 'sari', 'nirappu', 'amaam', 'seri', 'podu'
  ];

  // Check negative tokens FIRST
  if (
    noTokensTa.some((t) => lower.includes(t) || words.includes(t)) ||
    noTokensEn.some((t) => words.includes(t))
  ) {
    return 'no';
  }

  // Then check affirmative tokens
  if (
    yesTokensTa.some((t) => (t.length > 3 ? lower.includes(t) : words.includes(t))) ||
    yesTokensEn.some((t) => words.includes(t))
  ) {
    return 'yes';
  }

  return null;
}

/**
 * Check if text contains problem/defect details
 */
export function containsProblemDetails(text = '') {
  const lower = text.toLowerCase();
  const keywords = [
    'pothole', 'garbage', 'trash', 'waste', 'leak', 'water leak', 'pipe burst', 'drain', 'sewage',
    'street light', 'lamp', 'dark street', 'wire', 'cable', 'pole', 'curb broken', 'crack', 'manhole',
    'overflow', 'broken', 'damaged', 'burst', 'stagnant', 'smell', 'stench', 'fallen tree',
    'poor road', 'bad road', 'road damaged', 'crater',
    'பள்ளம்', 'குப்பை', 'குழாய்', 'கசிவு', 'சாக்கடை', 'விளக்கு', 'எரியவில்லை', 'மின்கம்பி',
    'உடைந்துள்ளது', 'நாற்றம்', 'அடைப்பு'
  ];
  return keywords.some((k) => lower.includes(k)) && lower.split(/\s+/).length >= 3;
}

/**
 * Check if text contains duration / since details
 */
export function containsDurationDetails(text = '') {
  const lower = text.toLowerCase();
  const keywords = [
    'day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'yesterday', 'today',
    'morning', 'since', 'hours', 'long time', 'daily',
    'நாள்', 'நாட்களாக', 'வாரம்', 'வாரங்களாக', 'மாதம்', 'நேற்று', 'இன்று', 'காலை',
    'காலமாக', 'நேற்றிலிருந்து'
  ];
  return keywords.some((k) => lower.includes(k));
}

/**
 * Check if text contains hazard / danger details
 */
export function containsDangerDetails(text = '') {
  const lower = text.toLowerCase();
  const keywords = [
    'danger', 'dangerous', 'urgent', 'severe', 'risk', 'hazard', 'accident', 'injury',
    'tripping', 'shock', 'electrocution', 'block', 'traffic', 'school', 'children',
    'elderly', 'hospital', 'flood', 'slippery', 'skidding',
    'ஆபத்து', 'ஆபத்தானது', 'விபத்து', 'தீவிரம்', 'உயிரபாயம்', 'காயம்', 'மின்சாரம்',
    'போக்குவரத்து', 'பள்ளி', 'குழந்தைகள்', 'வழுக்குகிறது'
  ];
  return keywords.some((k) => lower.includes(k));
}

/**
 * Smart skip evaluator: determines if future questions are already answered
 * @param {object} answers
 * @param {'where'|'what'|'since'|'danger'} currentField
 * @param {string} latestAnswer
 * @returns {{ skipWhat: boolean, skipSince: boolean, skipDanger: boolean }}
 */
export function evaluateSmartSkip(answers = {}, currentField, latestAnswer = '') {
  const combined = `${answers.where || ''} ${answers.what || ''} ${answers.since || ''} ${answers.danger || ''} ${latestAnswer}`.trim();

  let skipWhat = false;
  let skipSince = false;
  let skipDanger = false;

  if (currentField === 'where') {
    if (containsProblemDetails(latestAnswer)) {
      skipWhat = true;
    }
    if (containsDurationDetails(latestAnswer)) {
      skipSince = true;
    }
    if (containsDangerDetails(latestAnswer)) {
      skipDanger = true;
    }
  } else if (currentField === 'what') {
    if (containsDurationDetails(combined)) {
      skipSince = true;
    }
    if (containsDangerDetails(combined)) {
      skipDanger = true;
    }
  } else if (currentField === 'since') {
    if (containsDangerDetails(combined)) {
      skipDanger = true;
    }
  }

  return { skipWhat, skipSince, skipDanger };
}

/**
 * Find best matching SpeechSynthesis voice for a given language
 * @param {'en'|'ta'} language
 * @returns {SpeechSynthesisVoice|null}
 */
export function getBestVoice(language = 'en') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  if (language === 'ta') {
    // Look for Tamil voices
    const taVoice = voices.find((v) => v.lang && (v.lang === 'ta-IN' || v.lang.startsWith('ta')));
    return taVoice || null;
  }

  // English: prefer en-IN, then en-GB, then any en
  const enIn = voices.find((v) => v.lang === 'en-IN');
  if (enIn) return enIn;

  const enAny = voices.find((v) => v.lang && v.lang.startsWith('en'));
  return enAny || voices[0] || null;
}
