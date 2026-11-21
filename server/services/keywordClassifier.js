/**
 * Fallback Rule-Based Keyword Classifier.
 * Guarantees zero downtime if Google Gemini API key is unset, rate-limited, or offline.
 */

const KEYWORD_MAP = {
  'Public Safety': [
    'live wire', 'exposed wire', 'sparking', 'electric shock', 'electrocution',
    'open pit', 'sinkhole', 'falling tree', 'structural collapse', 'landslide',
    'fallen wire', 'hazardous', 'fire danger'
  ],
  'Drainage & Sewage': [
    'sewage', 'manhole', 'open manhole', 'drainage', 'drain', 'gutter',
    'sewer', 'clogged drain', 'foul smell', 'overflowing drain', 'stagnant water',
    'septic'
  ],
  'Water Supply & Leakage': [
    'water leak', 'pipe burst', 'pipeline', 'water supply', 'drinking water',
    'burst pipe', 'leaking valve', 'water contamination', 'no water', 'low pressure'
  ],
  'Street Lighting': [
    'streetlight', 'street light', 'pole', 'lamp', 'dark street', 'flickering light',
    'blown bulb', 'blackout', 'high mast', 'lighting'
  ],
  'Garbage & Sanitation': [
    'garbage', 'trash', 'waste', 'dump', 'overflowing bin', 'debris',
    'rotting', 'litter', 'sanitation', 'plastic waste', 'stench', 'refuse'
  ],
  'Roads & Potholes': [
    'pothole', 'road damage', 'crater', 'asphalt', 'tar road', 'uneven road',
    'speed breaker', 'cave in', 'road crack', 'trench', 'paver block'
  ]
};

const DEPARTMENT_MAP = {
  'Roads & Potholes': 'Public Works Department',
  'Garbage & Sanitation': 'Solid Waste Management',
  'Street Lighting': 'Electricity Board / Street Lighting Division',
  'Water Supply & Leakage': 'Water Supply & Drainage Board',
  'Drainage & Sewage': 'Water Supply & Drainage Board',
  'Public Safety': 'Municipal Safety & Enforcement',
  'Other': 'General Administration',
};

const CRITICAL_TRIGGERS = [
  'live wire', 'exposed wire', 'open manhole', 'pipe burst', 'major leak',
  'sinkhole', 'electrocution', 'sparking', 'near hospital', 'near school', 'collapse'
];

const HIGH_TRIGGERS = [
  'main road', 'highway', 'deep pothole', 'flooding', 'overflowing sewage',
  'busy junction', 'heavy traffic', 'hazardous', 'severe'
];

const LOW_TRIGGERS = [
  'minor', 'cosmetic', 'faint', 'paint', 'small crack', 'aesthetic', 'cleaning mark'
];

/**
 * Classifies an issue using keyword rules when AI service is unavailable.
 * @param {{ title: string, description: string, requestedCategory?: string, locationText?: string }} params
 * @returns {Record<string, any>} Formatted AI analysis object with aiSource='fallback'
 */
export function classifyWithKeywords({ title, description, requestedCategory, locationText = '' }) {
  const fullText = `${title || ''} ${description || ''} ${locationText || ''}`.toLowerCase();

  // 1. Determine category
  let category = 'Other';
  if (requestedCategory && requestedCategory !== 'Let AI decide') {
    category = requestedCategory;
  } else {
    let bestScore = 0;
    for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
      let score = 0;
      for (const kw of keywords) {
        if (fullText.includes(kw)) {
          score += kw.length > 6 ? 2 : 1; // prioritize longer, more specific phrases
        }
      }
      if (score > bestScore) {
        bestScore = score;
        category = cat;
      }
    }
  }

  // 2. Determine department
  let department = DEPARTMENT_MAP[category] || 'General Administration';
  if (category === 'Public Safety' && (fullText.includes('wire') || fullText.includes('electric') || fullText.includes('cable') || fullText.includes('pole'))) {
    department = 'Electricity Board / Street Lighting Division';
  }
  const secondaryDepartment = category === 'Drainage & Sewage'
    ? 'Municipal Safety & Enforcement'
    : null;

  // 3. Determine priority & severity based on Rubric
  let priority = 'Medium';
  let severityScore = 52;
  let safetyImpactScore = 48;
  let priorityReason = 'Standard municipal queue priority based on civic impact guidelines.';

  const isCritical = CRITICAL_TRIGGERS.some((trig) => fullText.includes(trig));
  const isHigh = HIGH_TRIGGERS.some((trig) => fullText.includes(trig));
  const isLow = LOW_TRIGGERS.some((trig) => fullText.includes(trig));

  if (isCritical) {
    priority = 'Critical';
    severityScore = 90;
    safetyImpactScore = 95;
    priorityReason = 'Immediate hazard or critical service interruption posing risk to life or health.';
  } else if (isHigh) {
    priority = 'High';
    severityScore = 75;
    safetyImpactScore = 70;
    priorityReason = 'Significant civic hazard affecting heavy commuter traffic or community zones.';
  } else if (isLow) {
    priority = 'Low';
    severityScore = 25;
    safetyImpactScore = 15;
    priorityReason = 'Minor civic inconvenience with low risk to public safety or transit.';
  } else {
    // Default Medium
    priority = 'Medium';
    severityScore = 55;
    safetyImpactScore = 45;
    priorityReason = 'Standard municipal maintenance issue with moderate local inconvenience.';
  }

  // 4. Accessibility check
  const accessibilityKeywords = ['sidewalk', 'footpath', 'pedestrian', 'wheelchair', 'ramp', 'crossing', 'walker'];
  const affectsAccessibility = accessibilityKeywords.some((kw) => fullText.includes(kw));

  // 5. Follow-up questions
  const followUpQuestions = [];
  if (!fullText.includes('near') && !fullText.includes('opposite') && !fullText.includes('door') && !fullText.includes('ward')) {
    followUpQuestions.push('Could you provide a nearby prominent landmark or building name?');
  }
  if (category === 'Water Supply & Leakage' && !fullText.includes('rate') && !fullText.includes('gush') && !fullText.includes('drip')) {
    followUpQuestions.push('Is the water flowing continuously or intermittently during supply hours?');
  }

  // 6. Summary
  const cleanTitle = (title || 'Civic infrastructure concern').trim();
  const summary = `${category} issue: ${cleanTitle.slice(0, 70)}`;

  return {
    category,
    damage_detected: `Automated detection identified signs of ${category.toLowerCase()} issues.`,
    severity_score: severityScore,
    safety_impact_score: safetyImpactScore,
    priority,
    priority_reason: priorityReason,
    department,
    secondary_department: secondaryDepartment,
    summary: summary.slice(0, 100),
    affects_accessibility: affectsAccessibility,
    follow_up_questions: followUpQuestions.slice(0, 2),
    image_matches_description: null,
    confidence: 0.80,
    aiSource: 'fallback',
    aiNotice: 'Smart analysis unavailable, standard rules applied',
  };
}
