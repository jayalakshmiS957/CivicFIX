/**
 * Municipal Departments Directory Data
 * Note: Sample directory data for demonstration purposes.
 * All personnel names, office phone lines, and ward officer assignments are fictional.
 */

export const ALLOWED_LOCATIONS = ['Gandhipuram', 'RS Puram', 'Peelamedu'];

export const DEPARTMENTS_DIRECTORY = [
  {
    id: 'dept-pwd',
    name: 'Public Works Department',
    shortName: 'PWD',
    description:
      'Responsible for municipal road infrastructure, asphalt surfacing, pothole restoration, footpaths, curbs, bridges, and structural concrete maintenance.',
    categories: ['Roads & Potholes'],
    officeName: 'Coimbatore Municipal Central PWD Divisional Office',
    address: 'Ward 42 Municipal Complex, DB Road, RS Puram, Coimbatore - 641002',
    zone: 'RS Puram',
    officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
    phone: '0422-XXXX101',
    email: 'pwd-coimbatore@civicresolve.gov',
    head: {
      name: 'Er. R. Sundaralingam (Fictional)',
      role: 'Superintending Engineer & Zonal Chief',
      zone: 'RS Puram',
    },
    officers: [
      {
        name: 'S. Kavin Kumar (Fictional)',
        role: 'Assistant Executive Engineer (Roads)',
        zone: 'Gandhipuram',
      },
      {
        name: 'M. Preethi Varma (Fictional)',
        role: 'Junior Highway & Pothole Inspector',
        zone: 'Peelamedu',
      },
      {
        name: 'V. Rajesh Kannan (Fictional)',
        role: 'Field Operations & Asphalt Crew Lead',
        zone: 'Saibaba Colony',
      },
    ],
    locations: {
      Gandhipuram: {
        officeName: 'Gandhipuram Ward 24 PWD Infrastructure Office',
        address: 'Cross Cut Road, Opp. City Bus Stand, Gandhipuram, Coimbatore - 641012',
        phone: '0422-XXXX201',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Er. K. Natarajan (Fictional)',
          role: 'Ward Executive Engineer (Gandhipuram)',
        },
        officers: [
          { name: 'S. Kavin Kumar (Fictional)', role: 'Assistant Executive Engineer (Roads)' },
          { name: 'P. Balaji (Fictional)', role: 'Junior Pothole Surveyor' },
          { name: 'R. Vignesh (Fictional)', role: 'Asphalt & Paving Foreman' },
        ],
      },
      'RS Puram': {
        officeName: 'RS Puram Ward 42 PWD Divisional Complex',
        address: 'Ward 42 Municipal Complex, DB Road, RS Puram, Coimbatore - 641002',
        phone: '0422-XXXX202',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Er. R. Sundaralingam (Fictional)',
          role: 'Senior Road Works Engineer (RS Puram)',
        },
        officers: [
          { name: 'V. Rajesh Kannan (Fictional)', role: 'Field Operations Lead' },
          { name: 'A. Muthusamy (Fictional)', role: 'Pavement Maintenance Inspector' },
          { name: 'S. Deepa (Fictional)', role: 'Concrete Footpath Officer' },
        ],
      },
      Peelamedu: {
        officeName: 'Peelamedu Ward 31 PWD Section Office',
        address: 'Avinashi Road Near PSG Tech, Peelamedu, Coimbatore - 641004',
        phone: '0422-XXXX203',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Er. S. Meenakshi Sundaram (Fictional)',
          role: 'Ward Highway Engineer (Peelamedu)',
        },
        officers: [
          { name: 'M. Preethi Varma (Fictional)', role: 'Junior Highway Inspector' },
          { name: 'T. Gokul (Fictional)', role: 'Footpath Restoration Supervisor' },
          { name: 'G. Suresh (Fictional)', role: 'Rapid Pothole Patch Crew Lead' },
        ],
      },
    },
  },
  {
    id: 'dept-swm',
    name: 'Solid Waste Management',
    shortName: 'SWM',
    description:
      'Manages daily doorstep municipal waste collection, micro-composting centers, street sweeping operations, and hazardous dump clearance.',
    categories: ['Garbage & Sanitation'],
    officeName: 'Zonal Sanitation & Public Health Directorate',
    address: 'Dr. Nanjappa Road, Near Central Bus Stand, Gandhipuram, Coimbatore - 641018',
    zone: 'Gandhipuram',
    officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
    phone: '0422-XXXX102',
    email: 'swm-sanitation@civicresolve.gov',
    head: {
      name: 'Dr. K. Meenakshi (Fictional)',
      role: 'Chief Municipal Health Officer',
      zone: 'Gandhipuram',
    },
    officers: [
      {
        name: 'T. Saravanan (Fictional)',
        role: 'Senior Sanitary Inspector',
        zone: 'Singanallur',
      },
      {
        name: 'A. Deepa Lakshmi (Fictional)',
        role: 'Micro-Compost Unit Lead',
        zone: 'Ukkadam',
      },
      {
        name: 'P. Vigneshwaran (Fictional)',
        role: 'Waste Fleet Dispatch Supervisor',
        zone: 'Saravanampatti',
      },
    ],
    locations: {
      Gandhipuram: {
        officeName: 'Gandhipuram Ward Sanitation & Micro-Compost Center',
        address: 'Dr. Nanjappa Road, Gandhipuram, Coimbatore - 641018',
        phone: '0422-XXXX211',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Dr. K. Meenakshi (Fictional)',
          role: 'Zonal Health & Sanitation Officer (Gandhipuram)',
        },
        officers: [
          { name: 'T. Saravanan (Fictional)', role: 'Senior Sanitary Inspector' },
          { name: 'B. Manikandan (Fictional)', role: 'Compactor Truck Supervisor' },
          { name: 'S. Karpagam (Fictional)', role: 'Street Sweeper Fleet Lead' },
        ],
      },
      'RS Puram': {
        officeName: 'RS Puram Ward Sanitation Operations Center',
        address: 'Diwan Bahadur Road, RS Puram, Coimbatore - 641002',
        phone: '0422-XXXX212',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Dr. V. Chandrasekaran (Fictional)',
          role: 'Ward Health Inspector (RS Puram)',
        },
        officers: [
          { name: 'A. Deepa Lakshmi (Fictional)', role: 'Micro-Compost Unit Lead' },
          { name: 'R. Senthil (Fictional)', role: 'Door-to-Door Waste Collector Lead' },
          { name: 'N. Mohan (Fictional)', role: 'Sanitation Compliance Officer' },
        ],
      },
      Peelamedu: {
        officeName: 'Peelamedu Ward Solid Waste Depot',
        address: 'Hopes College Road, Peelamedu, Coimbatore - 641004',
        phone: '0422-XXXX213',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Dr. J. Anbarasan (Fictional)',
          role: 'Ward Sanitation Officer (Peelamedu)',
        },
        officers: [
          { name: 'P. Vigneshwaran (Fictional)', role: 'Waste Fleet Dispatch Supervisor' },
          { name: 'K. Priya (Fictional)', role: 'Commercial Zone Litter Inspector' },
          { name: 'M. Dharmalingam (Fictional)', role: 'Bulk Waste Clearing Coordinator' },
        ],
      },
    },
  },
  {
    id: 'dept-eb',
    name: 'Electricity Board / Street Lighting Division',
    shortName: 'EB & Lighting',
    description:
      'Oversees energy-efficient LED street lighting luminaires, feeder pillars, timer circuit controls, high-mast towers, and overhead power hazard mitigation.',
    categories: ['Street Lighting'],
    officeName: 'Urban Lighting Operations & Distribution Circle',
    address: 'Avinashi Road Substation Complex, Peelamedu, Coimbatore - 641004',
    zone: 'Peelamedu',
    officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
    phone: '0422-XXXX103',
    email: 'streetlighting@civicresolve.gov',
    head: {
      name: 'Er. C. Venkatesh (Fictional)',
      role: 'Executive Electrical Engineer',
      zone: 'Peelamedu',
    },
    officers: [
      {
        name: 'N. Balachandar (Fictional)',
        role: 'Lineman & Streetlight Crew Lead',
        zone: 'Saibaba Colony',
      },
      {
        name: 'G. Harish Kumar (Fictional)',
        role: 'Distribution Box Safety Inspector',
        zone: 'Vadavalli',
      },
      {
        name: 'R. Gayathri (Fictional)',
        role: 'Smart Metering & Grid Technician',
        zone: 'Gandhipuram',
      },
    ],
    locations: {
      Gandhipuram: {
        officeName: 'Gandhipuram Streetlight Maintenance Depot',
        address: 'Cross Cut Extension Road, Gandhipuram, Coimbatore - 641012',
        phone: '0422-XXXX221',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Er. M. Sivakumar (Fictional)',
          role: 'Assistant Executive Engineer (Lighting - Gandhipuram)',
        },
        officers: [
          { name: 'R. Gayathri (Fictional)', role: 'Smart Metering & Grid Technician' },
          { name: 'K. Murugan (Fictional)', role: 'Senior Line Inspector' },
          { name: 'V. Prakash (Fictional)', role: 'LED Luminaire Replacement Specialist' },
        ],
      },
      'RS Puram': {
        officeName: 'RS Puram Electrical Substation & Lighting Depot',
        address: 'Cowley Brown Road, RS Puram, Coimbatore - 641002',
        phone: '0422-XXXX222',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Er. S. Jayaprakash (Fictional)',
          role: 'Ward Electrical Supervisor (RS Puram)',
        },
        officers: [
          { name: 'N. Balachandar (Fictional)', role: 'Lineman & Streetlight Crew Lead' },
          { name: 'T. Karthik (Fictional)', role: 'Underground Cable Route Inspector' },
          { name: 'D. Lavanya (Fictional)', role: 'Feeder Pillar Maintenance Officer' },
        ],
      },
      Peelamedu: {
        officeName: 'Peelamedu Urban Lighting Operations & Distribution Circle',
        address: 'Avinashi Road Substation Complex, Peelamedu, Coimbatore - 641004',
        phone: '0422-XXXX223',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Er. C. Venkatesh (Fictional)',
          role: 'Executive Electrical Engineer (Peelamedu)',
        },
        officers: [
          { name: 'G. Harish Kumar (Fictional)', role: 'Distribution Box Safety Inspector' },
          { name: 'P. Anandhan (Fictional)', role: 'High Mast Tower Maintenance Lead' },
          { name: 'E. Ramesh (Fictional)', role: 'Night Luminaire Patrol Officer' },
        ],
      },
    },
  },
  {
    id: 'dept-wsdb',
    name: 'Water Supply & Drainage Board',
    shortName: 'TWAD / WSDB',
    description:
      'Maintains Siruvani and Pillur municipal water trunk pipelines, pressure regulation valves, storm water drain networks, sewage channels, and manhole lids.',
    categories: ['Water Supply & Leakage', 'Drainage & Sewage'],
    officeName: 'Metro Water Supply & Underground Drainage Division',
    address: 'Trichy Road Municipal Complex, Singanallur, Coimbatore - 641005',
    zone: 'Singanallur',
    officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
    phone: '0422-XXXX104',
    email: 'waterboard@civicresolve.gov',
    head: {
      name: 'Er. N. Senthil Nathan (Fictional)',
      role: 'Chief Water Works & Drainage Engineer',
      zone: 'Singanallur',
    },
    officers: [
      {
        name: 'K. Divya Bharathi (Fictional)',
        role: 'Pipeline Leakage Detection Engineer',
        zone: 'RS Puram',
      },
      {
        name: 'S. Muthukumar (Fictional)',
        role: 'Storm Water Drain Supervisor',
        zone: 'Ukkadam',
      },
      {
        name: 'J. Naveen Prasanth (Fictional)',
        role: 'Underground Sewage Station Manager',
        zone: 'Peelamedu',
      },
    ],
    locations: {
      Gandhipuram: {
        officeName: 'Gandhipuram Water Works & Drainage Sub-Division',
        address: 'Sathyamangalam Road, Gandhipuram, Coimbatore - 641012',
        phone: '0422-XXXX231',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Er. G. Ravichandran (Fictional)',
          role: 'Assistant Executive Water Engineer (Gandhipuram)',
        },
        officers: [
          { name: 'S. Muthukumar (Fictional)', role: 'Storm Water Drain Supervisor' },
          { name: 'B. Saradha (Fictional)', role: 'Siruvani Distribution Valve Operator' },
          { name: 'K. Vinoth (Fictional)', role: 'Underground Sewer Jetting Lead' },
        ],
      },
      'RS Puram': {
        officeName: 'RS Puram Water Distribution & Leakage Command',
        address: 'Siruvani Main Road Pump Station, RS Puram, Coimbatore - 641002',
        phone: '0422-XXXX232',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Er. T. Ramakrishnan (Fictional)',
          role: 'Sub-Divisional Water Engineer (RS Puram)',
        },
        officers: [
          { name: 'K. Divya Bharathi (Fictional)', role: 'Pipeline Leakage Detection Engineer' },
          { name: 'M. Sridhar (Fictional)', role: 'Storm Channel De-silting Officer' },
          { name: 'R. Vijay (Fictional)', role: 'Emergency Main Leak Repairer' },
        ],
      },
      Peelamedu: {
        officeName: 'Peelamedu Metro Water & Drainage Center',
        address: 'Peelamedu Pudur Road, Coimbatore - 641004',
        phone: '0422-XXXX233',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Er. J. Naveen Prasanth (Fictional)',
          role: 'Underground Sewage Station Manager (Peelamedu)',
        },
        officers: [
          { name: 'A. Subhash (Fictional)', role: 'Pillur II Booster Pump Inspector' },
          { name: 'C. Gokilavani (Fictional)', role: 'Open Drain Encroachment Monitor' },
          { name: 'V. Jayaraj (Fictional)', role: 'Water Quality Testing Analyst' },
        ],
      },
    },
  },
  {
    id: 'dept-mse',
    name: 'Municipal Safety & Enforcement',
    shortName: 'Safety & Enforcement',
    description:
      'Enforces urban safety regulations, eliminates open hazard hazards, monitors building perimeter barriers, clears pedestrian corridor encroachments, and mitigates storm emergencies.',
    categories: ['Public Safety'],
    officeName: 'City Enforcement Directorate & Hazard Squad',
    address: 'Oppanakara Street Enforcement Depot, Ukkadam, Coimbatore - 641001',
    zone: 'Ukkadam',
    officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
    phone: '0422-XXXX105',
    email: 'city-safety@civicresolve.gov',
    head: {
      name: 'Thiru M. Arumugam (Fictional)',
      role: 'Assistant Commissioner (Enforcement)',
      zone: 'Ukkadam',
    },
    officers: [
      {
        name: 'B. Karthikeyan (Fictional)',
        role: 'Rapid Hazard Squad Leader',
        zone: 'Gandhipuram',
      },
      {
        name: 'S. Radhika (Fictional)',
        role: 'Encroachment Verification Officer',
        zone: 'RS Puram',
      },
      {
        name: 'D. Selvakumar (Fictional)',
        role: 'Public Space Safety Marshal',
        zone: 'Vadavalli',
      },
    ],
    locations: {
      Gandhipuram: {
        officeName: 'Gandhipuram Rapid Hazard Squad Depot',
        address: '100 Feet Road, Gandhipuram, Coimbatore - 641012',
        phone: '0422-XXXX241',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Thiru B. Karthikeyan (Fictional)',
          role: 'Rapid Hazard Squad Leader (Gandhipuram)',
        },
        officers: [
          { name: 'P. Arul Doss (Fictional)', role: 'Pedestrian Walkway Marshal' },
          { name: 'M. Sangeetha (Fictional)', role: 'Commercial Encroachment Squad' },
          { name: 'K. Thangaraj (Fictional)', role: 'Emergency Demolition Officer' },
        ],
      },
      'RS Puram': {
        officeName: 'RS Puram Safety & Public Order Post',
        address: 'East Sambandam Road, RS Puram, Coimbatore - 641002',
        phone: '0422-XXXX242',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Thiru S. Radhika (Fictional)',
          role: 'Encroachment Verification Officer (RS Puram)',
        },
        officers: [
          { name: 'D. Selvakumar (Fictional)', role: 'Public Space Safety Marshal' },
          { name: 'J. Ilango (Fictional)', role: 'Construction Barricade Auditor' },
          { name: 'N. Chitra (Fictional)', role: 'Sidewalk Access Officer' },
        ],
      },
      Peelamedu: {
        officeName: 'Peelamedu Hazard Squad & Zone Station',
        address: 'Masakalipalayam Road, Peelamedu, Coimbatore - 641004',
        phone: '0422-XXXX243',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Thiru R. Loganathan (Fictional)',
          role: 'Zonal Enforcement Supervisor (Peelamedu)',
        },
        officers: [
          { name: 'T. Suresh Kumar (Fictional)', role: 'Storm Emergency Responder' },
          { name: 'V. Balamurugan (Fictional)', role: 'Roadway Hazard Mitigation Lead' },
          { name: 'S. Sumathi (Fictional)', role: 'Civic Safety Compliance Inspector' },
        ],
      },
    },
  },
  {
    id: 'dept-ga',
    name: 'General Administration',
    shortName: 'General Admin',
    description:
      'Coordinates cross-departmental grievances, municipal citizen helpdesks, public information requests, inter-agency escalation, and unclassified municipal matters.',
    categories: ['Other'],
    officeName: 'Coimbatore City Municipal Corporation Headquarters',
    address: 'Big Bazaar Street, Town Hall, Coimbatore - 641001',
    zone: 'Gandhipuram',
    officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
    phone: '0422-XXXX106',
    email: 'admin-ccmc@civicresolve.gov',
    head: {
      name: 'Smt. P. Ananthi (Fictional)',
      role: 'Deputy Commissioner (Administration)',
      zone: 'Gandhipuram',
    },
    officers: [
      {
        name: 'R. Manoj Kumar (Fictional)',
        role: 'Grievance Redressal Officer',
        zone: 'Saibaba Colony',
      },
      {
        name: 'E. Kavitha (Fictional)',
        role: 'Public Relations & Helpdesk Lead',
        zone: 'Saravanampatti',
      },
      {
        name: 'T. Sanjay (Fictional)',
        role: 'Inter-Agency Coordination Officer',
        zone: 'Singanallur',
      },
    ],
    locations: {
      Gandhipuram: {
        officeName: 'Gandhipuram Ward Citizen Assistance Counter',
        address: '7th Street, Gandhipuram, Coimbatore - 641012',
        phone: '0422-XXXX251',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Smt. P. Ananthi (Fictional)',
          role: 'Deputy Commissioner (Administration - Gandhipuram)',
        },
        officers: [
          { name: 'R. Manoj Kumar (Fictional)', role: 'Grievance Redressal Officer' },
          { name: 'K. Mohanraj (Fictional)', role: 'Public Service Desk Assistant' },
          { name: 'S. Nithya (Fictional)', role: 'Citizen Feedback Coordinator' },
        ],
      },
      'RS Puram': {
        officeName: 'RS Puram Ward Administration Helpdesk',
        address: 'Thiruvenkatasamy Road, RS Puram, Coimbatore - 641002',
        phone: '0422-XXXX252',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Thiru M. Swaminathan (Fictional)',
          role: 'Ward Administration Officer (RS Puram)',
        },
        officers: [
          { name: 'E. Kavitha (Fictional)', role: 'Public Relations & Helpdesk Lead' },
          { name: 'A. Praveen (Fictional)', role: 'Municipal Records Registrar' },
          { name: 'G. Shanthi (Fictional)', role: 'Escalation Tracking Officer' },
        ],
      },
      Peelamedu: {
        officeName: 'Peelamedu Ward Civic Services Center',
        address: 'Airport Road, Peelamedu, Coimbatore - 641004',
        phone: '0422-XXXX253',
        officeHours: 'Mon-Sat 10:00 AM to 5:45 PM',
        zoneOfficer: {
          name: 'Smt. V. Kanchana (Fictional)',
          role: 'Assistant Ward Secretary (Peelamedu)',
        },
        officers: [
          { name: 'T. Sanjay (Fictional)', role: 'Inter-Agency Coordination Officer' },
          { name: 'L. Chandran (Fictional)', role: 'Citizen Grievance Receptionist' },
          { name: 'R. Divyaprabha (Fictional)', role: 'Civic Quality Auditor' },
        ],
      },
    },
  },
];
