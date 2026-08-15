import { useMemo, useState } from 'react'

const rpeRows = [
  { rpe: 10, percentages: [100, 95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0] },
  { rpe: 9.5, percentages: [97.8, 93.9, 90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7] },
  { rpe: 9, percentages: [95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3] },
  { rpe: 8.5, percentages: [93.9, 90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64.0] },
  { rpe: 8, percentages: [92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3, 62.6] },
  { rpe: 7.5, percentages: [90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64.0, 61.3] },
  { rpe: 7, percentages: [89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3, 62.6, 59.9] },
  { rpe: 6.5, percentages: [87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64.0, 61.3, 58.6] },
]

const maxPercentages = rpeRows[0].percentages.slice(0, 5)

function roundToHalf(value) {
  return Math.round(value * 2) / 2
}

function formatWeight(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export default function OneRepMaxCalculator() {
  const [weight, setWeight] = useState('')
  const [repetitions, setRepetitions] = useState('5')
  const [rpe, setRpe] = useState('8')
  const [submitted, setSubmitted] = useState(false)

  const estimate = useMemo(() => {
    if (!submitted) return null

    const load = Number(weight)
    const repetitionIndex = Number(repetitions) - 1
    const row = rpeRows.find((item) => item.rpe === Number(rpe))
    const percentage = row?.percentages[repetitionIndex]

    if (!Number.isFinite(load) || load <= 0 || !percentage) {
      return { error: 'Enter a valid working weight.' }
    }

    const estimatedOneRepMax = load / (percentage / 100)
    const maximums = maxPercentages.map((maxPercentage, index) => ({
      repetitions: index + 1,
      weight: roundToHalf(estimatedOneRepMax * (maxPercentage / 100)),
    }))

    return { percentage, estimatedOneRepMax, maximums }
  }, [repetitions, rpe, submitted, weight])

  function update(setter) {
    return (event) => {
      setter(event.target.value)
      setSubmitted(false)
    }
  }

  return (
    <section className="athx-rm-calculator" aria-labelledby="rm-calculator-title">
      <div className="athx-rm-calculator__heading">
        <p>RPE-aware load estimator</p>
        <h4 id="rm-calculator-title">Estimate your 1-5 RM.</h4>
        <span>Enter a recent working set. The estimate accounts for both the repetitions completed and the RPE reported.</span>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); setSubmitted(true) }} noValidate>
        <label>
          Weight lifted
          <span className="athx-rm-calculator__field"><input type="number" min="0.5" step="0.5" inputMode="decimal" value={weight} onChange={update(setWeight)} placeholder="e.g. 140" /><i>kg</i></span>
        </label>
        <label>
          Repetitions completed
          <select value={repetitions} onChange={update(setRepetitions)}>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option value={value} key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          Set RPE
          <select value={rpe} onChange={update(setRpe)}>
            {rpeRows.map((row) => <option value={row.rpe} key={row.rpe}>{row.rpe}</option>)}
          </select>
        </label>
        <button type="submit">Estimate maximums</button>
      </form>

      <div className="athx-rm-calculator__output" aria-live="polite">
        {!submitted && <p>Complete the set details to estimate your maximums.</p>}
        {estimate?.error && <p className="athx-rm-calculator__error">{estimate.error}</p>}
        {estimate?.maximums && (
          <>
            <div className="athx-rm-calculator__context">Your set represents approximately <strong>{estimate.percentage.toFixed(1)}%</strong> of estimated 1RM.</div>
            <ol>
              {estimate.maximums.map((item) => (
                <li key={item.repetitions}>
                  <span>{item.repetitions}RM</span>
                  <strong>{formatWeight(item.weight)} kg</strong>
                </li>
              ))}
            </ol>
            <p>These values are estimates from the set entered. They are not tested maximums.</p>
          </>
        )}
      </div>

      <details className="athx-rpe-chart">
        <summary>View the full RPE percentage table</summary>
        <div className="athx-rpe-chart__scroll">
          <table>
            <caption>
              {estimate?.estimatedOneRepMax
                ? 'Percentage and calculated load by repetitions and RPE'
                : 'Percentage of estimated 1RM by repetitions and RPE'}
            </caption>
            <thead><tr><th scope="col">RPE</th>{Array.from({ length: 12 }, (_, index) => <th scope="col" key={index + 1}>{index + 1}</th>)}</tr></thead>
            <tbody>
              {rpeRows.map((row) => (
                <tr key={row.rpe}>
                  <th scope="row">{row.rpe}</th>
                  {row.percentages.map((percentage, index) => (
                    <td style={{ '--rpe-column': index }} key={`${row.rpe}-${index}`}>
                      <span>{percentage.toFixed(1)}%</span>
                      {estimate?.estimatedOneRepMax && (
                        <strong className="athx-rpe-chart__weight">
                          {formatWeight(roundToHalf(estimate.estimatedOneRepMax * (percentage / 100)))} kg
                        </strong>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
