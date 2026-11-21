import { Type } from '@google/genai';

export const VALID_CATEGORIES = [
  'Roads & Potholes',
  'Garbage & Sanitation',
  'Street Lighting',
  'Water Supply & Leakage',
  'Drainage & Sewage',
  'Public Safety',
  'Other',
];

export const VALID_DEPARTMENTS = [
  'Public Works Department',
  'Solid Waste Management',
  'Electricity Board / Street Lighting Division',
  'Water Supply & Drainage Board',
  'Municipal Safety & Enforcement',
  'General Administration',
];

export const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

/**
 * Structured schema for Gemini API structured output
 */
export const GEMINI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: VALID_CATEGORIES,
      description: 'The civic service category that best matches the issue',
    },
    damage_detected: {
      type: Type.STRING,
      description: 'Concise description of the physical damage or civic breakdown visible or described',
    },
    severity_score: {
      type: Type.INTEGER,
      description: 'Physical severity and extent of structural damage on a scale of 0 to 100',
    },
    safety_impact_score: {
      type: Type.INTEGER,
      description: 'Potential hazard to public safety, human life, health, or vehicle accidents (0-100)',
    },
    priority: {
      type: Type.STRING,
      enum: VALID_PRIORITIES,
      description: 'Urgency classification: Critical, High, Medium, or Low',
    },
    priority_reason: {
      type: Type.STRING,
      description: 'Justification for the priority level (maximum 25 words)',
    },
    department: {
      type: Type.STRING,
      enum: VALID_DEPARTMENTS,
      description: 'Primary municipal department responsible for addressing the issue',
    },
    secondary_department: {
      type: Type.STRING,
      description: 'Optional supporting municipal department or null if none needed',
    },
    summary: {
      type: Type.STRING,
      description: 'Brief executive summary of the issue (maximum 20 words)',
    },
    affects_accessibility: {
      type: Type.BOOLEAN,
      description: 'Whether this obstruction directly blocks pedestrians, wheelchairs, or elderly transit',
    },
    follow_up_questions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Up to 2 clarifying questions if vital information (exact landmark, leak rate) is missing',
    },
    image_matches_description: {
      type: Type.BOOLEAN,
      description: 'Whether the uploaded image visually aligns with the reported text description',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Model confidence score from 0.0 to 1.0',
    },
  },
  required: [
    'category',
    'damage_detected',
    'severity_score',
    'safety_impact_score',
    'priority',
    'priority_reason',
    'department',
    'summary',
    'affects_accessibility',
    'follow_up_questions',
    'confidence',
  ],
};

/**
 * Validates and normalizes raw AI output against the strict domain rubric.
 * @param {any} raw
 * @returns {object} Validated analysis object
 */
export const validateAiOutput = (raw) => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI output must be a valid JSON object');
  }

  // Validate Category
  if (!VALID_CATEGORIES.includes(raw.category)) {
    throw new Error(`Invalid category enum received: ${raw.category}`);
  }

  // Validate Priority
  if (!VALID_PRIORITIES.includes(raw.priority)) {
    throw new Error(`Invalid priority enum received: ${raw.priority}`);
  }

  // Validate Department
  if (!VALID_DEPARTMENTS.includes(raw.department)) {
    throw new Error(`Invalid department enum received: ${raw.department}`);
  }

  // Validate Secondary Department (null or valid enum)
  let secondaryDept = raw.secondary_department || null;
  if (secondaryDept && !VALID_DEPARTMENTS.includes(secondaryDept)) {
    secondaryDept = null;
  }

  // Validate & Clamp Scores
  const severity = typeof raw.severity_score === 'number'
    ? Math.max(0, Math.min(100, Math.round(raw.severity_score)))
    : 50;

  const safety = typeof raw.safety_impact_score === 'number'
    ? Math.max(0, Math.min(100, Math.round(raw.safety_impact_score)))
    : 50;

  const confidence = typeof raw.confidence === 'number'
    ? Math.max(0.0, Math.min(1.0, parseFloat(raw.confidence.toFixed(2))))
    : 0.85;

  // Validate follow up questions: array, max 2 items
  let followUpQuestions = [];
  if (Array.isArray(raw.follow_up_questions)) {
    followUpQuestions = raw.follow_up_questions
      .filter((q) => typeof q === 'string' && q.trim().length > 0)
      .slice(0, 2)
      .map((q) => q.trim());
  }

  return {
    category: raw.category,
    damage_detected: String(raw.damage_detected || 'Physical wear or obstruction detected').trim(),
    severity_score: severity,
    safety_impact_score: safety,
    priority: raw.priority,
    priority_reason: String(raw.priority_reason || 'Evaluated based on civic hazard level').trim(),
    department: raw.department,
    secondary_department: secondaryDept,
    summary: String(raw.summary || 'Civic infrastructure concern reported by citizen').trim(),
    affects_accessibility: Boolean(raw.affects_accessibility),
    follow_up_questions: followUpQuestions,
    image_matches_description: typeof raw.image_matches_description === 'boolean'
      ? raw.image_matches_description
      : null,
    confidence,
  };
};
