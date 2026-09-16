import { getSessionType } from './constants.js'
import { bookingDuration, newPart, parseClock } from './planning-model.js'

const present = (value) => value !== '' && value != null
const wholeMinutes = (value, minimum, maximum) =>
  present(value) &&
  Number.isInteger(Number(value)) &&
  Number(value) >= minimum &&
  Number(value) <= maximum

export function validatePlanningSession(session) {
  const errors = {}
  if (!session?.name?.trim()) errors.name = 'Give this session a specific name.'
  if (!wholeMinutes(session?.day, 0, 6)) errors.day = 'Choose a day.'
  if (!Number.isFinite(parseClock(session?.startTime)))
    errors.startTime = 'Enter a valid start time.'
  if (session?.components?.length) {
    if (!wholeMinutes(session.startDelay ?? 0, 0, 1440))
      errors.startDelay = 'Enter 0 to 1,440 whole minutes.'
    session.components.forEach((part, index) => {
      if (!part.name?.trim()) errors[`part-${index}-name`] = 'Name this part.'
      if (!wholeMinutes(part.duration, 1, 1440))
        errors[`part-${index}-duration`] = 'Enter 1 to 1,440 whole minutes.'
      if (!wholeMinutes(part.breakAfter ?? 0, 0, 1440))
        errors[`part-${index}-breakAfter`] = 'Enter 0 to 1,440 whole minutes.'
    })
    if (bookingDuration(session) > 1440)
      errors.booking = 'The full booking must be 24 hours or less.'
  } else if (!wholeMinutes(session?.duration, 1, 1440)) {
    errors.duration = 'Enter 1 to 1,440 whole minutes.'
  }
  for (const key of ['plannedRpe', 'actualRpe']) {
    if (
      present(session?.[key]) &&
      (!Number.isFinite(Number(session[key])) ||
        Number(session[key]) < 1 ||
        Number(session[key]) > 10)
    ) {
      errors[key] = 'Enter a score from 1 to 10, or leave this blank.'
    }
  }
  if (
    present(session?.actualDuration) &&
    !wholeMinutes(session.actualDuration, 1, 1440)
  ) {
    errors.actualDuration =
      'Enter 1 to 1,440 whole minutes, or leave this blank.'
  }
  for (const key of ['runDistance', 'longestRun30']) {
    if (
      present(session?.[key]) &&
      (!Number.isFinite(Number(session[key])) || Number(session[key]) <= 0)
    ) {
      errors[key] = 'Enter a positive distance, or leave this blank.'
    }
  }
  return errors
}

export function changeSessionType(session, type) {
  return {
    ...session,
    type,
    stress: { ...getSessionType(type).stress },
    fingerprintConfirmed: false,
  }
}

export function makeAthxParts() {
  return [
    newPart({
      name: 'Strength: deadlifts',
      type: 'lower-strength',
      duration: 20,
      breakAfter: 5,
      effort: 'hard',
      exercises: 'Deadlifts',
      stress: { ...getSessionType('lower-strength').stress },
    }),
    newPart({
      name: 'Endurance: bike or row',
      type: 'zone2-bike-row',
      duration: 20,
      breakAfter: 5,
      effort: 'moderate',
      stress: { ...getSessionType('zone2-bike-row').stress },
    }),
    newPart({
      name: 'MetCon circuit',
      type: 'hyrox-mixed',
      duration: 20,
      breakAfter: 0,
      effort: 'hard',
      stress: { ...getSessionType('hyrox-mixed').stress },
    }),
  ]
}

export function parseEquipment(value) {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ]
}
