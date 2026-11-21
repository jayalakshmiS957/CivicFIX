/**
 * Input validator for POST /api/voice/parse
 */

export function validateVoiceParseInput(body = {}) {
  const errors = {};

  if (!body || typeof body !== 'object') {
    return {
      isValid: false,
      errors: { body: 'Request payload must be a JSON object.' },
      data: null,
    };
  }

  const { answers, language } = body;

  // Validate language
  const cleanLang = (language || 'en').toString().toLowerCase().trim();
  if (cleanLang !== 'en' && cleanLang !== 'ta') {
    errors.language = 'Language must be either "en" (English) or "ta" (Tamil).';
  }

  // Validate answers object
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    errors.answers = 'Answers must be an object containing civic voice response fields.';
    return { isValid: false, errors, data: null };
  }

  const cleanAnswers = {
    where: typeof answers.where === 'string' ? answers.where.trim() : '',
    what: typeof answers.what === 'string' ? answers.what.trim() : '',
    since: typeof answers.since === 'string' ? answers.since.trim() : '',
    danger: typeof answers.danger === 'string' ? answers.danger.trim() : '',
  };

  // Length check (max 500 characters per field)
  const MAX_LEN = 500;
  for (const [key, val] of Object.entries(cleanAnswers)) {
    if (val.length > MAX_LEN) {
      errors[key] = `Answer for "${key}" cannot exceed ${MAX_LEN} characters.`;
    }
  }

  // At least where or what must be non-empty
  if (!cleanAnswers.where && !cleanAnswers.what) {
    errors.content = 'At least "where" (location) or "what" (issue description) must be provided.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      answers: cleanAnswers,
      language: cleanLang === 'ta' ? 'ta' : 'en',
    },
  };
}
