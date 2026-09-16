import { planWeek } from './planner.js'
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ result: planWeek(data) })
  } catch (error) {
    self.postMessage({
      error: error.message || 'The timetable could not be checked.',
    })
  }
}
