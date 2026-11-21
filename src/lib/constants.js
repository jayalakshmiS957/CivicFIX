export const CATEGORIES = [
  'Roads & Potholes',
  'Garbage & Sanitation',
  'Street Lighting',
  'Water Supply & Leakage',
  'Drainage & Sewage',
  'Public Safety',
  'Other',
];

export const DEPARTMENTS = [
  'Public Works Department',
  'Solid Waste Management',
  'Electricity Board / Street Lighting Division',
  'Water Supply & Drainage Board',
  'Municipal Safety & Enforcement',
  'General Administration',
];

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const STATUSES = ['Reported', 'In Progress', 'Pending Review', 'Resolved', 'Reopened'];

export const ALLOWED_LOCATIONS = ['Gandhipuram', 'RS Puram', 'Peelamedu'];

export const COIMBATORE_CENTER = {
  lat: 11.0168,
  lng: 76.9673,
  zoom: 13,
};

export const DEMO_ACCOUNTS = [
  {
    role: 'citizen',
    label: 'Citizen 1 (Kavitha S.)',
    name: 'Kavitha S.',
    email: 'citizen1@civicresolve.gov',
    password: 'Password@123',
    description: 'Active community reporter with multiple logged complaints',
  },
  {
    role: 'citizen',
    label: 'Citizen 2 (Ramesh K.)',
    name: 'Ramesh K.',
    email: 'citizen2@civicresolve.gov',
    password: 'Password@123',
    description: 'Local neighborhood watch member in Saibaba Colony & RS Puram',
  },
  {
    role: 'admin',
    label: 'City Admin',
    name: 'City Admin',
    email: 'admin@civicresolve.gov',
    password: 'Admin@Civic2026!',
    description: 'Full municipal triage & administrative override authority',
  },
];

export const TRY_EXAMPLES = [
  {
    title: 'Severe open manhole on DB Road pedestrian sidewalk',
    description: 'A heavy concrete storm drain manhole cover has broken and fallen inward. The opening is over 3 feet deep directly along the pedestrian walkway in front of the supermarket. At night it is completely unlit and represents a grave hazard for schoolchildren and elderly walkers.',
    category: 'Drainage & Sewage',
    location: {
      latitude: 11.0086,
      longitude: 76.9514,
      address: 'Diwan Bahadur Road, RS Puram West, Coimbatore',
      locality: 'RS Puram',
      landmark: 'Near Nilgiris Supermarket and Post Office',
    },
  },
  {
    title: 'High-pressure water distribution pipe burst flooding Avinashi Road',
    description: 'Underground drinking water feeder conduit has ruptured opposite the college entrance. Treated potable water is gushing into the carriage lanes and threatening adjacent store basements.',
    category: 'Water Supply & Leakage',
    location: {
      latitude: 11.0248,
      longitude: 77.0028,
      address: 'Avinashi Road, Peelamedu, Coimbatore',
      locality: 'Peelamedu',
      landmark: 'Opposite PSG College Main Gate',
    },
  },
  {
    title: 'Overhead electric cable snapped and sparking after rain',
    description: 'Electric transmission wire snapped from pole #GB-12 and is hanging at chest level right near the bus shelter. Sparks were visible during the evening drizzle.',
    category: 'Public Safety',
    location: {
      latitude: 11.0168,
      longitude: 76.9673,
      address: 'Cross Cut Road, Gandhipuram, Coimbatore',
      locality: 'Gandhipuram',
      landmark: 'Near Central Bus Terminus Platform 2',
    },
  },
];
