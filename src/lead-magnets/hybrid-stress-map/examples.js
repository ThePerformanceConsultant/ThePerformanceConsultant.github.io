import { getSessionType } from './constants.js'
import {
  newPlanningAudit,
  newPlanningSession,
  newPart,
} from './planning-model.js'

export function workedExample() {
  const audit = newPlanningAudit()
  audit.id = 'worked-athx-week'
  audit.timeZone = 'Europe/London'
  audit.profile.priority1 = 'ATHX performance'
  audit.locations = ['Gym', 'Outdoors']
  const session = (patch) =>
    newPlanningSession({
      ...patch,
      fingerprintConfirmed: true,
      stress: { ...getSessionType(patch.type).stress },
    })
  audit.sessions = [
    session({
      id: 'example-deadlifts',
      name: 'Deadlifts and split squats',
      type: 'lower-strength',
      day: 1,
      startTime: '18:00',
      duration: 60,
      effort: 'hard',
      freshness: 'yes',
      mobility: 'fixed',
      exercises: 'Deadlifts with a controlled lowering phase; split squats',
      location: 'Gym',
      equipment: ['Barbell', 'Dumbbells'],
    }),
    session({
      id: 'example-intervals',
      name: '6 × 3-minute run intervals',
      type: 'running-intervals',
      day: 2,
      startTime: '07:00',
      duration: 60,
      effort: 'hard',
      freshness: 'yes',
      priority: true,
      exercises:
        'Warm-up, six 3-minute intervals, jog recoveries and cool-down',
      location: 'Outdoors',
    }),
    session({
      id: 'example-upper',
      name: 'Bench press and weighted pull-ups',
      type: 'upper-strength',
      day: 4,
      startTime: '18:00',
      duration: 55,
      effort: 'moderate',
      freshness: 'no',
      mobility: 'fixed',
      exercises: 'Bench press and weighted pull-ups',
      location: 'Gym',
      equipment: ['Barbell', 'Pull-up bar'],
    }),
    session({
      id: 'example-athx',
      name: 'ATHX practice: strength, endurance and MetCon',
      type: 'custom',
      day: 5,
      startTime: '10:00',
      duration: 100,
      effort: 'hard',
      freshness: 'fatigue',
      priority: true,
      mobility: 'fixed',
      location: 'Gym',
      equipment: ['Barbell', 'Rower'],
      components: [
        newPart({
          id: 'example-athx-strength',
          name: 'Strength practice',
          type: 'lower-strength',
          duration: 20,
          breakAfter: 15,
          effort: 'moderate-hard',
          exercises: 'Squats and overhead press',
          stress: { ...getSessionType('lower-strength').stress },
          fingerprintConfirmed: true,
        }),
        newPart({
          id: 'example-athx-endurance',
          name: 'Endurance practice',
          type: 'zone2-bike-row',
          duration: 20,
          breakAfter: 15,
          effort: 'moderate',
          exercises: 'Steady rowing',
          stress: { ...getSessionType('zone2-bike-row').stress },
          fingerprintConfirmed: true,
        }),
        newPart({
          id: 'example-athx-metcon',
          name: 'MetCon practice',
          type: 'hyrox-mixed',
          duration: 30,
          breakAfter: 0,
          effort: 'hard',
          exercises: 'Rowing, carries and burpees',
          stress: { ...getSessionType('hyrox-mixed').stress },
          fingerprintConfirmed: true,
        }),
      ],
    }),
  ]
  audit.availableWindows = [
    {
      id: 'example-thursday',
      day: 3,
      startTime: '07:00',
      endTime: '08:00',
      location: 'Outdoors',
      equipment: [],
      label: 'Before work',
    },
  ]
  audit.blockedWindows = [0, 1, 2, 3, 4].map((day) => ({
    id: `example-work-${day}`,
    day,
    startTime: '09:00',
    endTime: '17:00',
    label: 'Work',
    kind: 'busy',
  }))
  return audit
}
