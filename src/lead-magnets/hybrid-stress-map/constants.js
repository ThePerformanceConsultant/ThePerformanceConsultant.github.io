export const STORAGE_KEY = 'tpc-hybrid-stress-map-v1'
export const SCHEMA_VERSION = 1

export const DAYS = [
  { value: 0, short: 'Mon', label: 'Monday' },
  { value: 1, short: 'Tue', label: 'Tuesday' },
  { value: 2, short: 'Wed', label: 'Wednesday' },
  { value: 3, short: 'Thu', label: 'Thursday' },
  { value: 4, short: 'Fri', label: 'Friday' },
  { value: 5, short: 'Sat', label: 'Saturday' },
  { value: 6, short: 'Sun', label: 'Sunday' },
]

export const GOAL_OPTIONS = [
  'Maximal strength',
  'Olympic weightlifting performance',
  'Muscle growth',
  'CrossFit performance',
  'HYROX performance',
  'Running performance',
  'Aerobic capacity',
  'Power or sprint performance',
  'BJJ or combat-sport performance',
  'Fat loss while maintaining performance',
  'General fitness',
  'Other',
]

export const RECOVERY_FLAGS = [
  { id: 'low-sleep', label: 'Average sleep below approximately seven hours' },
  { id: 'variable-sleep', label: 'Sleep timing has been highly variable' },
  { id: 'high-stress', label: 'High work or family stress' },
  { id: 'calorie-deficit', label: 'Intentional calorie deficit' },
  { id: 'rapid-weight-loss', label: 'Body weight falling faster than intended' },
  { id: 'hunger-recovery', label: 'Persistent hunger or worsening recovery' },
  { id: 'recent-illness', label: 'Recent illness' },
  { id: 'pain-changing-training', label: 'Current pain is changing how I train' },
  { id: 'returning', label: 'Return after more than two weeks away' },
  { id: 'new-sport-volume', label: 'Addition of a new sport or substantial training volume' },
  { id: 'travel-shifts', label: 'Frequent travel or shift work' },
  { id: 'none', label: 'None of the above' },
]

export const BODY_AREAS = [
  'Calf or Achilles',
  'Foot or ankle',
  'Knee or quadriceps',
  'Hamstring',
  'Hip or adductor',
  'Lower back',
  'Shoulder',
  'Elbow',
  'Wrist or grip',
  'Neck',
]

export const ROLE_OPTIONS = [
  {
    value: 'priority1-direct',
    label: 'Direct Priority 1 work',
    score: 3,
    description: 'Directly develops the primary outcome.',
  },
  {
    value: 'priority1-support',
    label: 'Supports Priority 1',
    score: 2,
    description: 'Supports the primary outcome without being its main exposure.',
  },
  {
    value: 'priority2',
    label: 'Direct Priority 2 work',
    score: 2,
    description: 'Directly develops the secondary outcome.',
  },
  {
    value: 'maintenance',
    label: 'Maintenance',
    score: 1,
    description: 'Maintains a quality that does not need to progress now.',
  },
  {
    value: 'enjoyment',
    label: 'Enjoyment or social',
    score: 1,
    description: 'Valuable for enjoyment, variety or social participation.',
  },
  {
    value: 'unclear',
    label: 'Purpose unclear',
    score: 0,
    description: 'Its intended adaptation cannot yet be stated.',
  },
]

export const PROGRESSION_OPTIONS = [
  {
    value: 'yes',
    label: 'Yes',
    description: 'A variable such as load, pace, distance, volume or skill complexity is planned to progress.',
  },
  {
    value: 'partly',
    label: 'Partly',
    description: 'The session is repeated consistently, but progression is informal.',
  },
  {
    value: 'no',
    label: 'No',
    description: 'Content is random, unknown or repeated without a progression criterion.',
  },
]

export const STRUCTURE_OPTIONS = [
  { value: 'standalone', label: 'Standalone session' },
  { value: 'technical-then-conditioning', label: 'Technical or power work, then substantial conditioning' },
  { value: 'conditioning-then-technical', label: 'Hard conditioning before technical or power work' },
]

export const DOMAIN_DEFINITIONS = [
  {
    key: 'lowerForce',
    short: 'Force',
    label: 'Lower-body force',
    description: 'Force and local muscular stress through the legs, hips and posterior chain.',
  },
  {
    key: 'impact',
    short: 'Impact',
    label: 'Impact and eccentric load',
    description: 'Repeated foot contacts, landing, braking and lengthening-dominant muscular work.',
  },
  {
    key: 'upperGrip',
    short: 'Grip',
    label: 'Upper-body and grip',
    description: 'Substantial pulling, pressing, hanging, carrying and gripping.',
  },
  {
    key: 'metabolic',
    short: 'High int.',
    label: 'High-intensity metabolic demand',
    description: 'Repeated hard efforts and sustained work near the upper intensity range.',
  },
  {
    key: 'aerobic',
    short: 'Duration',
    label: 'Aerobic duration',
    description: 'The prolonged endurance component of the session.',
  },
  {
    key: 'freshness',
    short: 'Freshness',
    label: 'Freshness requirement',
    description: 'Dependence on coordination, speed, precision and high-quality force production.',
  },
]

const fingerprint = (lowerForce, impact, upperGrip, metabolic, aerobic, freshness) => ({
  lowerForce,
  impact,
  upperGrip,
  metabolic,
  aerobic,
  freshness,
})

export const SESSION_LIBRARY = [
  { value: 'mobility', label: 'Mobility or recovery', stress: fingerprint(0, 0, 0, 0, 0, 0) },
  { value: 'easy-cycle', label: 'Easy cycling under 45 min', stress: fingerprint(1, 0, 0, 0, 1, 0) },
  { value: 'zone2-bike-row', label: 'Zone 2 bike or row, 45 to 75 min', stress: fingerprint(1, 0, 1, 0, 2, 0) },
  { value: 'easy-run', label: 'Easy run, 30 to 60 min', stress: fingerprint(1, 2, 0, 0, 2, 0), running: true },
  { value: 'long-run', label: 'Long easy run, 75 to 120 min', stress: fingerprint(2, 3, 0, 0, 3, 0), running: true },
  { value: 'threshold-run', label: 'Tempo or threshold run', stress: fingerprint(2, 2, 0, 3, 2, 1), running: true },
  { value: 'running-intervals', label: 'Running intervals or sprints', stress: fingerprint(3, 3, 0, 3, 1, 2), running: true },
  { value: 'lower-strength', label: 'Lower-body strength', stress: fingerprint(3, 1, 0, 1, 0, 2) },
  { value: 'lower-hypertrophy', label: 'Lower-body hypertrophy', stress: fingerprint(3, 1, 0, 2, 0, 1) },
  { value: 'upper-strength', label: 'Upper-body strength or hypertrophy', stress: fingerprint(0, 0, 3, 1, 0, 1) },
  { value: 'full-strength', label: 'Full-body strength', stress: fingerprint(3, 0, 2, 1, 0, 2) },
  { value: 'weightlifting', label: 'Olympic weightlifting', stress: fingerprint(3, 1, 2, 1, 0, 3) },
  { value: 'crossfit-skill', label: 'CrossFit skill or weightlifting', stress: fingerprint(2, 1, 2, 1, 0, 3) },
  { value: 'crossfit', label: 'Standard CrossFit class', stress: fingerprint(2, 2, 2, 3, 1, 1) },
  { value: 'crossfit-volume', label: 'High-volume CrossFit session', stress: fingerprint(3, 2, 3, 3, 2, 2) },
  { value: 'hyrox-stations', label: 'HYROX stations session', stress: fingerprint(3, 1, 2, 3, 1, 1) },
  { value: 'hyrox-mixed', label: 'HYROX mixed session', stress: fingerprint(3, 2, 2, 3, 2, 1) },
  { value: 'hyrox-simulation', label: 'HYROX simulation', stress: fingerprint(3, 3, 2, 3, 3, 2) },
  { value: 'bjj-technical', label: 'BJJ technical session', stress: fingerprint(1, 0, 2, 1, 0, 2) },
  { value: 'bjj-hard', label: 'BJJ with hard rolling', stress: fingerprint(2, 1, 3, 3, 1, 2) },
  { value: 'custom', label: 'Other or custom session', stress: fingerprint(0, 0, 0, 0, 0, 0), custom: true },
]

export const RPE_GUIDE = [
  ['1–2', 'Very easy'],
  ['3–4', 'Easy'],
  ['5', 'Moderate'],
  ['6', 'Moderately hard'],
  ['7', 'Hard'],
  ['8', 'Very hard'],
  ['9', 'Near-maximal'],
  ['10', 'Maximal'],
]

export const ACTION_COPY = {
  protect: {
    label: 'Protect',
    description: 'Place this session where it receives the highest realistic freshness. Modify lower-priority work first.',
  },
  keep: {
    label: 'Keep',
    description: 'This session has a clear role and is not the actor in an unresolved collision.',
  },
  move: {
    label: 'Move',
    description: 'Preserve the session but change its position in the week.',
  },
  modify: {
    label: 'Modify',
    description: 'The session is fixed, so reduce or change the stress domain creating the collision.',
  },
  'remove-or-rotate': {
    label: 'Remove or rotate',
    description: 'Keep it as an occasional choice rather than adding it automatically every week.',
  },
  review: {
    label: 'Review',
    description: 'Clarify what this session develops, how it progresses and what would happen if it were removed.',
  },
}

export const STATUS_COPY = {
  coherent: {
    eyebrow: 'Coherent week',
    title: 'Your week is coherent.',
    summary: 'The main priorities are visible and the largest sessions are not repeatedly competing with each other.',
  },
  sequencing: {
    eyebrow: 'Good sessions, poor sequencing',
    title: 'The sessions make sense. The order does not.',
    summary: 'Useful sessions are asking for similar tissues, energy systems or technical freshness within a short period.',
  },
  'lower-body': {
    eyebrow: 'Repeated lower-body stress',
    title: 'Different sessions are creating the same lower-body demand.',
    summary: 'The exercises and sports vary, but the lower-body stress profile does not.',
  },
  metabolic: {
    eyebrow: 'Excessive metabolic density',
    title: 'Too much of the week is being performed hard.',
    summary: 'Several sessions draw on the same high-intensity demand without enough distinction in purpose.',
  },
  progression: {
    eyebrow: 'Progression missing',
    title: 'The week contains stress without a clear progression model.',
    summary: 'Effort is present, but Priority 1 does not specify what should improve from one week to the next.',
  },
  recovery: {
    eyebrow: 'Recovery-capacity mismatch',
    title: 'The week does not match your current capacity.',
    summary: 'The schedule may be reasonable in isolation, but current sleep, stress, illness, nutrition or pain changes its practical cost.',
  },
  dilution: {
    eyebrow: 'Priority dilution',
    title: 'Several legitimate goals are being treated as equal priorities.',
    summary: 'The week has no reliable basis for deciding which session should be protected when fatigue or time becomes limiting.',
  },
  running: {
    eyebrow: 'Running-distance warning',
    title: 'One run is a large departure from recent training.',
    summary: 'The planned distance is more than 10% above the longest run completed during the previous 30 days.',
  },
  review: {
    eyebrow: 'Structural review required',
    title: 'The week needs a clearer decision rule.',
    summary: 'The current entries do not support a coherent result without making assumptions about your priorities or available training slots.',
  },
}

export const EVIDENCE_REFERENCES = [
  {
    number: 1,
    citation: 'Schumann M, Feuerbacher JF, Sünkeler M, et al. Sports Medicine. 2022;52:601–612.',
    title: 'Compatibility of Concurrent Aerobic and Strength Training for Skeletal Muscle Size and Function',
    href: 'https://doi.org/10.1007/s40279-021-01587-7',
  },
  {
    number: 2,
    citation: 'Berryman N, Mujika I, Arvisais D, et al. International Journal of Sports Physiology and Performance. 2018;13(1):57–63.',
    title: 'Strength Training for Middle- and Long-Distance Performance',
    href: 'https://doi.org/10.1123/ijspp.2017-0032',
  },
  {
    number: 3,
    citation: 'Blagrove RC, Howatson G, Hayes PR. Sports Medicine. 2018;48:1117–1149.',
    title: 'Effects of Strength Training on the Physiological Determinants of Running Performance',
    href: 'https://doi.org/10.1007/s40279-017-0835-7',
  },
  {
    number: 4,
    citation: 'Haddad M, Stylianides G, Djaoui L, et al. Frontiers in Neuroscience. 2017;11:612.',
    title: 'Session-RPE Method for Training Load Monitoring',
    href: 'https://doi.org/10.3389/fnins.2017.00612',
  },
  {
    number: 5,
    citation: 'Crawford DA, Drake NB, Carper MJ, et al. Sports. 2018;6(3):84.',
    title: 'Validity, Reliability, and Application of the Session-RPE Method during High Intensity Functional Training',
    href: 'https://doi.org/10.3390/sports6030084',
  },
  {
    number: 6,
    citation: 'Impellizzeri FM, Marcora SM, Coutts AJ. International Journal of Sports Physiology and Performance. 2019;14(2):270–273.',
    title: 'Internal and External Training Load: 15 Years On',
    href: 'https://doi.org/10.1123/ijspp.2018-0935',
  },
  {
    number: 7,
    citation: 'Frandsen JSB, Hulme A, Parner ET, et al. British Journal of Sports Medicine. 2025;59(17):1203–1210.',
    title: 'How much running is too much? Identifying high-risk running sessions in a 5200-person cohort study',
    href: 'https://doi.org/10.1136/bjsports-2024-109380',
  },
  {
    number: 8,
    citation: 'Saw AE, Main LC, Gastin PB. British Journal of Sports Medicine. 2016;50(5):281–291.',
    title: 'Monitoring the athlete training response',
    href: 'https://doi.org/10.1136/bjsports-2015-094758',
  },
  {
    number: 9,
    citation: 'Bullock GS, Mylott J, Hughes T, et al. Sports Medicine. 2022.',
    title: 'Just How Confident Can We Be in Predicting Sports Injuries?',
    href: 'https://doi.org/10.1007/s40279-022-01698-9',
  },
]

export const EMPTY_PROFILE = {
  priority1: '',
  priority2: '',
  maintenanceGoals: [],
  performanceMarkers: ['', ''],
  enjoymentSessions: '',
  fixedSessions: '',
  removeFirst: '',
  recoveryFlags: [],
  bodyConcerns: [],
}

export const EMPTY_AUDIT = {
  schemaVersion: SCHEMA_VERSION,
  mode: 'plan',
  profile: EMPTY_PROFILE,
  sessions: [],
  currentStep: 0,
  updatedAt: null,
}

export const HYROX_EXAMPLE = {
  schemaVersion: SCHEMA_VERSION,
  mode: 'plan',
  currentStep: 2,
  updatedAt: null,
  profile: {
    priority1: 'Running performance',
    priority2: 'HYROX performance',
    maintenanceGoals: ['Maximal strength'],
    performanceMarkers: ['HYROX run pace', 'Five-kilometre time'],
    enjoymentSessions: '',
    fixedSessions: 'Tuesday running group and Thursday HYROX class',
    removeFirst: 'Sunday HYROX simulation',
    recoveryFlags: ['low-sleep', 'high-stress'],
    bodyConcerns: ['Calf or Achilles'],
  },
  sessions: [
    {
      id: 'example-lower-strength',
      day: 0,
      startTime: '18:00',
      name: 'Lower-body strength',
      type: 'lower-strength',
      duration: 65,
      plannedRpe: 7,
      role: 'priority1-support',
      progression: 'yes',
      mobility: 'movable',
      structure: 'standalone',
      bodyAreas: ['Knee or quadriceps', 'Hamstring', 'Hip or adductor'],
      availableDays: [2],
    },
    {
      id: 'example-intervals',
      day: 1,
      startTime: '18:30',
      name: 'Progressive running intervals',
      type: 'running-intervals',
      duration: 55,
      plannedRpe: 8,
      role: 'priority1-direct',
      progression: 'yes',
      mobility: 'fixed',
      structure: 'standalone',
      bodyAreas: ['Calf or Achilles', 'Foot or ankle', 'Hamstring'],
      availableDays: [],
      runDistance: 8,
      longestRun30: 12,
    },
    {
      id: 'example-hyrox-class',
      day: 2,
      startTime: '18:00',
      name: 'HYROX class',
      type: 'hyrox-mixed',
      duration: 60,
      plannedRpe: 8,
      role: 'priority2',
      progression: 'partly',
      mobility: 'movable',
      structure: 'standalone',
      bodyAreas: ['Calf or Achilles', 'Knee or quadriceps', 'Lower back', 'Wrist or grip'],
      availableDays: [3],
    },
    {
      id: 'example-easy-run',
      day: 3,
      startTime: '07:00',
      name: 'Easy run',
      type: 'easy-run',
      duration: 45,
      plannedRpe: 4,
      role: 'priority1-support',
      progression: 'yes',
      mobility: 'movable',
      structure: 'standalone',
      bodyAreas: ['Calf or Achilles', 'Foot or ankle'],
      availableDays: [6],
      runDistance: 7,
      longestRun30: 12,
    },
    {
      id: 'example-full-strength',
      day: 4,
      startTime: '17:30',
      name: 'Full-body strength',
      type: 'full-strength',
      duration: 70,
      plannedRpe: 7,
      role: 'priority1-support',
      progression: 'yes',
      mobility: 'movable',
      structure: 'standalone',
      bodyAreas: ['Knee or quadriceps', 'Hamstring', 'Lower back', 'Shoulder'],
      availableDays: [2],
    },
    {
      id: 'example-long-run',
      day: 5,
      startTime: '09:00',
      name: '14 km long run',
      type: 'long-run',
      duration: 85,
      plannedRpe: 6,
      role: 'priority1-direct',
      progression: 'yes',
      mobility: 'movable',
      structure: 'standalone',
      bodyAreas: ['Calf or Achilles', 'Foot or ankle', 'Hamstring'],
      availableDays: [],
      runDistance: 14,
      longestRun30: 10,
    },
    {
      id: 'example-simulation',
      day: 6,
      startTime: '10:00',
      name: 'HYROX simulation',
      type: 'hyrox-simulation',
      duration: 90,
      plannedRpe: 9,
      role: 'priority2',
      progression: 'partly',
      mobility: 'movable',
      structure: 'standalone',
      bodyAreas: ['Calf or Achilles', 'Knee or quadriceps', 'Lower back', 'Wrist or grip'],
      availableDays: [3],
    },
  ],
}

export function getSessionType(value) {
  return SESSION_LIBRARY.find((item) => item.value === value) || SESSION_LIBRARY.at(-1)
}

export function getRole(value) {
  return ROLE_OPTIONS.find((item) => item.value === value) || ROLE_OPTIONS.at(-1)
}

export function newSession(overrides = {}) {
  const baseType = getSessionType(overrides.type || 'custom')
  return {
    id: overrides.id || '',
    day: 0,
    startTime: '18:00',
    sequenceAtSameTime: 0,
    name: baseType.label,
    type: baseType.value,
    duration: 60,
    plannedRpe: 6,
    actualDuration: '',
    actualRpe: '',
    role: 'unclear',
    progression: 'no',
    mobility: 'movable',
    structure: 'standalone',
    fingerprintConfirmed: !baseType.custom,
    bodyAreas: [],
    availableDays: [],
    runDistance: '',
    longestRun30: '',
    review: {
      completion: '',
      performance: '',
      soreness: '',
      fatigue: '',
      painChangesMovement: false,
      deviationReason: '',
    },
    notes: '',
    ...overrides,
    stress: { ...baseType.stress, ...(overrides.stress || {}) },
  }
}
