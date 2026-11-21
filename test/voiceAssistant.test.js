process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateVoiceParseInput } from '../server/validators/voiceValidator.js';
import {
  validateVoiceParsedOutput,
  generateVoiceFallback,
} from '../server/services/voiceParseService.js';
import {
  detectSpokenLanguage,
  detectSpokenConfirmation,
  evaluateSmartSkip,
} from '../src/lib/voiceHelpers.js';
import voiceRoutes from '../server/routes/voiceRoutes.js';

describe('Voice Assistant Validation Test Suite', () => {
  it('should accept valid English and Tamil voice parse payloads', () => {
    const validEn = {
      answers: {
        where: 'Opposite Cross Cut Road signal, Gandhipuram',
        what: 'Large open drainage trench with broken stone slab',
        since: 'Since 3 days',
        danger: 'High risk of pedestrians falling in at night',
      },
      language: 'en',
    };
    const resEn = validateVoiceParseInput(validEn);
    assert.equal(resEn.isValid, true);
    assert.equal(resEn.data.language, 'en');
    assert.equal(resEn.data.answers.where, validEn.answers.where);

    const validTa = {
      answers: {
        where: 'காந்திபுரம் பஸ் நிலையம் அருகில்',
        what: 'சாலை முழுவதும் ஆழமான பள்ளங்கள் ஏற்பட்டுள்ளன',
        since: 'இரண்டு வாரங்களாக',
        danger: 'இருசக்கர வாகனங்கள் விபத்துக்குள்ளாகின்றன',
      },
      language: 'ta',
    };
    const resTa = validateVoiceParseInput(validTa);
    assert.equal(resTa.isValid, true);
    assert.equal(resTa.data.language, 'ta');
  });

  it('should reject payload missing both where and what', () => {
    const emptyPayload = {
      answers: {
        where: '',
        what: '',
        since: '2 days',
        danger: 'moderate',
      },
      language: 'en',
    };
    const res = validateVoiceParseInput(emptyPayload);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.content);
  });

  it('should reject answers exceeding 500 characters', () => {
    const longPayload = {
      answers: {
        where: 'Gandhipuram',
        what: 'A'.repeat(505),
      },
      language: 'en',
    };
    const res = validateVoiceParseInput(longPayload);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.what);
  });

  it('should reject invalid language codes', () => {
    const badLang = {
      answers: {
        where: 'RS Puram',
        what: 'Water leak',
      },
      language: 'fr',
    };
    const res = validateVoiceParseInput(badLang);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.language);
  });
});

describe('Voice Parsed Output Schema & Fallback Suite', () => {
  it('should normalize and validate schema-conforming structured output', () => {
    const raw = {
      title: 'Water main burst',
      description: 'Underground pipeline burst along Avinashi road causing water wastage.',
      category: 'Water Supply & Leakage',
      landmark: 'Near PSG Tech signal',
      locality: 'Peelamedu',
      urgency_hint: 'high',
      missing_info: ['What is the approximate leak rate?'],
    };

    const validated = validateVoiceParsedOutput(raw, 'en');
    assert.equal(validated.title, 'Water main burst');
    assert.equal(validated.category, 'Water Supply & Leakage');
    assert.equal(validated.urgency_hint, 'high');
    assert.equal(validated.missing_info.length, 1);
  });

  it('should fallback category to "Let AI decide" if unrecognized enum passed', () => {
    const raw = {
      title: 'Broken civic asset',
      description: 'Street asset damaged outside Saibaba Colony market.',
      category: 'Unknown Alien Department',
      urgency_hint: 'normal',
    };
    const validated = validateVoiceParsedOutput(raw, 'en');
    assert.equal(validated.category, 'Let AI decide');
  });

  it('should limit missing_info to at most 2 questions', () => {
    const raw = {
      title: 'Civic issue',
      description: 'General road surface distress in Saibaba Colony ward.',
      category: 'Roads & Potholes',
      urgency_hint: 'normal',
      missing_info: ['Q1', 'Q2', 'Q3', 'Q4'],
    };
    const validated = validateVoiceParsedOutput(raw, 'en');
    assert.equal(validated.missing_info.length, 2);
  });

  it('generateVoiceFallback synthesizes full English complaint and extracts first 8 words for title', () => {
    const answers = {
      where: '100 Feet Road, Gandhipuram',
      what: 'Massive deep pothole causing car tires to blow out and traffic jam',
      since: 'Past 4 days',
      danger: 'Severe hazard, bikes skidding',
    };

    const fallback = generateVoiceFallback({ answers, language: 'en' });
    assert.ok(fallback.title.length >= 5 && fallback.title.length <= 100);
    assert.ok(fallback.title.includes('Massive deep pothole'));
    assert.ok(fallback.description.length >= 20);
    assert.ok(fallback.description.includes('Location: 100 Feet Road, Gandhipuram'));
    assert.equal(fallback.urgency_hint, 'high');
    assert.equal(fallback.locality, 'Gandhipuram');
  });

  it('generateVoiceFallback synthesizes natural Tamil complaint with Tamil prefixes', () => {
    const answers = {
      where: 'ஆர்.எஸ்.புரம் தபால் நிலையம் எதிரில்',
      what: 'குடிநீர் குழாயில் கடுமையான உடைப்பு ஏற்பட்டு தண்ணீர் வீணாகிறது',
      since: 'நேற்றிலிருந்து',
      danger: 'ஆம் சாலை முழுவதும் தண்ணீர் சூழ்ந்துள்ளது',
    };

    const fallback = generateVoiceFallback({ answers, language: 'ta' });
    assert.ok(fallback.description.includes('இடம்:'));
    assert.ok(fallback.description.includes('கால அளவு:'));
    assert.ok(fallback.description.includes('பாதிப்பு/ஆபத்து:'));
    assert.equal(fallback.urgency_hint, 'high');
  });
});

describe('Spoken Language & Affirmation Detection Suite', () => {
  it('should recognize spoken language choices in English and Tamil', () => {
    assert.equal(detectSpokenLanguage('english please'), 'en');
    assert.equal(detectSpokenLanguage('I want english'), 'en');
    assert.equal(detectSpokenLanguage('இங்கிலீஷ்'), 'en');

    assert.equal(detectSpokenLanguage('tamil'), 'ta');
    assert.equal(detectSpokenLanguage('தமிழ்'), 'ta');
    assert.equal(detectSpokenLanguage('thamizh pesu'), 'ta');
    assert.equal(detectSpokenLanguage('random gibberish'), null);
  });

  it('should recognize spoken Yes / No confirmations in English and Tamil', () => {
    assert.equal(detectSpokenConfirmation('yes please', 'en'), 'yes');
    assert.equal(detectSpokenConfirmation('sure fill it', 'en'), 'yes');
    assert.equal(detectSpokenConfirmation('no restart', 'en'), 'no');
    assert.equal(detectSpokenConfirmation('cancel', 'en'), 'no');

    assert.equal(detectSpokenConfirmation('ஆம் நிரப்புங்கள்', 'ta'), 'yes');
    assert.equal(detectSpokenConfirmation('சரி', 'ta'), 'yes');
    assert.equal(detectSpokenConfirmation('aam', 'ta'), 'yes');
    assert.equal(detectSpokenConfirmation('இல்லை', 'ta'), 'no');
    assert.equal(detectSpokenConfirmation('vendaam', 'ta'), 'no');
  });
});

describe('Smart Skipping Heuristic Suite', () => {
  it('should flag skipWhat if user describes problem in location answer', () => {
    const comprehensiveWhere = 'There is a severe open drain and broken manhole on DB Road RS Puram';
    const result = evaluateSmartSkip({}, 'where', comprehensiveWhere);
    assert.equal(result.skipWhat, true, 'Should detect defect keyword and skip what question');
  });

  it('should flag skipSince and skipDanger if duration and hazard are included', () => {
    const richAnswer = 'Deep pothole on Avinashi road for 3 days and very dangerous accident hazard';
    const result = evaluateSmartSkip({}, 'where', richAnswer);
    assert.equal(result.skipWhat, true);
    assert.equal(result.skipSince, true);
    assert.equal(result.skipDanger, true);
  });

  it('should not flag skips if answer only provides location street name', () => {
    const simpleWhere = 'DB Road, RS Puram, Coimbatore';
    const result = evaluateSmartSkip({}, 'where', simpleWhere);
    assert.equal(result.skipWhat, false);
    assert.equal(result.skipSince, false);
    assert.equal(result.skipDanger, false);
  });
});

describe('POST /api/voice/parse Endpoint Integration Test', () => {
  it('should successfully execute route handler and return structured complaint payload', async () => {
    let responseData = null;
    let statusCode = 200;

    const mockReq = {
      body: {
        answers: {
          where: 'Gandhipuram 7th street corner',
          what: 'Overflowing municipal garbage dumpster blocking traffic',
          since: 'Since 3 days',
          danger: 'Stench and disease hazard near school gate',
        },
        language: 'en',
      },
    };

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    // Find the POST /parse route layer
    const postLayer = voiceRoutes.stack.find(
      (s) => s.route && s.route.path === '/parse' && s.route.methods.post
    );
    assert.ok(postLayer, 'Must have POST /parse on voiceRoutes');

    // Run the handler
    const handler = postLayer.route.stack[postLayer.route.stack.length - 1].handle;
    await handler(mockReq, mockRes);

    assert.equal(statusCode, 200);
    assert.equal(responseData.success, true);
    assert.ok(responseData.data.title);
    assert.ok(responseData.data.description);
    assert.ok(responseData.data.category);
    assert.equal(responseData.data.urgency_hint, 'high');
  });

  it('should return 400 Bad Request when answers are empty', async () => {
    let statusCode = 200;
    let responseData = null;

    const mockReq = {
      body: {
        answers: { where: '', what: '' },
        language: 'en',
      },
    };

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    const postLayer = voiceRoutes.stack.find(
      (s) => s.route && s.route.path === '/parse' && s.route.methods.post
    );
    const handler = postLayer.route.stack[postLayer.route.stack.length - 1].handle;
    await handler(mockReq, mockRes);

    assert.equal(statusCode, 400);
    assert.equal(responseData.success, false);
    assert.ok(responseData.errors);
  });
});
