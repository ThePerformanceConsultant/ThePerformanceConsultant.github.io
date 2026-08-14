import { useMemo, useState } from 'react'

const standards = {
  male: {
    lite: {
      strength: { strong: 325, adequate: 275 },
      runRow: { strong: 4600, adequate: 4300 },
      fiveKm: { strong: 23 * 60, adequate: 25 * 60 },
      metcon: { strong: 13 * 60 + 30, adequate: 16 * 60, label: 'Lite solo MetCon' },
    },
    intermediate: {
      strength: { strong: 400, adequate: 350 },
      runRow: { strong: 5000, adequate: 4700 },
      fiveKm: { strong: 21 * 60 + 30, adequate: 23 * 60 + 30 },
      metcon: { strong: 11 * 60 + 30, adequate: 13 * 60 + 30, label: 'ATHX MetCon X' },
    },
    pro: {
      strength: { strong: 440, adequate: 400 },
      runRow: { strong: 5300, adequate: 5000 },
      fiveKm: { strong: 20 * 60 + 30, adequate: 22 * 60 },
      metcon: { strong: 12 * 60, adequate: 14 * 60, label: 'Pro MetCon X' },
    },
  },
  female: {
    lite: {
      strength: { strong: 225, adequate: 180 },
      runRow: { strong: 4300, adequate: 4000 },
      fiveKm: { strong: 25 * 60 + 30, adequate: 28 * 60 },
      metcon: { strong: 12 * 60 + 30, adequate: 15 * 60 + 30, label: 'Lite solo MetCon' },
    },
    intermediate: {
      strength: { strong: 285, adequate: 240 },
      runRow: { strong: 4650, adequate: 4350 },
      fiveKm: { strong: 23 * 60 + 30, adequate: 26 * 60 },
      metcon: { strong: 10 * 60 + 15, adequate: 12 * 60, label: 'ATHX MetCon X' },
    },
    pro: {
      strength: { strong: 340, adequate: 290 },
      runRow: { strong: 5100, adequate: 4800 },
      fiveKm: { strong: 22 * 60, adequate: 24 * 60 },
      metcon: { strong: 10 * 60, adequate: 12 * 60, label: 'Pro MetCon X' },
    },
  },
}

const labels = ['Limiter', 'Adequate', 'Strong']

function parseTime(value) {
  const match = value.trim().match(/^(\d{1,3}):([0-5]\d)$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function scoreHigher(result, threshold) {
  const score = result >= threshold.strong ? 2 : result >= threshold.adequate ? 1 : 0
  return {
    score,
    deficit: ((threshold.strong - result) / threshold.strong) * 100,
  }
}

function scoreLower(result, threshold) {
  const score = result <= threshold.strong ? 2 : result <= threshold.adequate ? 1 : 0
  return {
    score,
    deficit: ((result - threshold.strong) / threshold.strong) * 100,
  }
}

function formatDifference(deficit) {
  const amount = Math.abs(deficit).toFixed(1)
  if (Math.abs(deficit) < 0.05) return 'At the Strong threshold'
  return deficit > 0 ? `${amount}% from Strong` : `${amount}% beyond Strong`
}

export default function BonusWorkCalculator() {
  const [sex, setSex] = useState('male')
  const [pathway, setPathway] = useState('intermediate')
  const [enduranceTest, setEnduranceTest] = useState('runRow')
  const [strength, setStrength] = useState('')
  const [endurance, setEndurance] = useState('')
  const [metcon, setMetcon] = useState('')
  const [capped, setCapped] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const assessment = useMemo(() => {
    if (!submitted) return null

    const selected = standards[sex][pathway]
    const strengthResult = Number(strength)
    const enduranceResult = enduranceTest === 'runRow' ? Number(endurance) : parseTime(endurance)
    const metconResult = capped ? null : parseTime(metcon)

    if (
      !Number.isFinite(strengthResult) || strengthResult <= 0
      || !Number.isFinite(enduranceResult) || enduranceResult <= 0
      || (!capped && (!Number.isFinite(metconResult) || metconResult <= 0))
    ) return { error: 'Enter a valid result for each domain. Times must use MM:SS.' }

    const domains = [
      { name: 'Strength', ...scoreHigher(strengthResult, selected.strength) },
      {
        name: 'Endurance',
        ...(enduranceTest === 'runRow'
          ? scoreHigher(enduranceResult, selected.runRow)
          : scoreLower(enduranceResult, selected.fiveKm)),
      },
      capped
        ? { name: 'MetCon', score: 0, deficit: Number.POSITIVE_INFINITY, capped: true }
        : { name: 'MetCon', ...scoreLower(metconResult, selected.metcon) },
    ]

    const ranked = [...domains].sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
      return a.deficit - b.deficit
    })
    const weakest = ranked[ranked.length - 1]
    const tiedWeakest = ranked.filter((item) => (
      item.score === weakest.score && item.deficit === weakest.deficit
    ))

    return { ranked, weakest: tiedWeakest }
  }, [capped, endurance, enduranceTest, metcon, pathway, sex, strength, submitted])

  function update(setter) {
    return (event) => {
      setter(event.target.value)
      setSubmitted(false)
    }
  }

  function submit(event) {
    event.preventDefault()
    setSubmitted(true)
  }

  const metconLabel = standards[sex][pathway].metcon.label

  return (
    <section className="athx-calculator" aria-labelledby="bonus-calculator-title">
      <div className="athx-calculator__heading">
        <p>Bonus work calculator</p>
        <h2 id="bonus-calculator-title">Rank your three disciplines.</h2>
        <span>Enter your latest results. The calculator applies the assessment standards above and identifies the domain that should guide your Bonus Day.</span>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="athx-calculator__selectors">
          <fieldset>
            <legend>Assessment table</legend>
            <label><input type="radio" name="sex" value="male" checked={sex === 'male'} onChange={update(setSex)} /> Male</label>
            <label><input type="radio" name="sex" value="female" checked={sex === 'female'} onChange={update(setSex)} /> Female</label>
          </fieldset>

          <label>
            Pathway
            <select value={pathway} onChange={update(setPathway)}>
              <option value="lite">Lite</option>
              <option value="intermediate">Intermediate / ATHX</option>
              <option value="pro">Pro</option>
            </select>
          </label>
        </div>

        <div className="athx-calculator__inputs">
          <label>
            <span><b>Strength</b> total</span>
            <span className="athx-calculator__field"><input type="number" min="1" step="0.5" inputMode="decimal" value={strength} onChange={update(setStrength)} placeholder="e.g. 420" /> <i>kg</i></span>
          </label>

          <div className="athx-calculator__endurance">
            <fieldset>
              <legend><b>Endurance</b> test</legend>
              <label><input type="radio" name="enduranceTest" value="runRow" checked={enduranceTest === 'runRow'} onChange={update(setEnduranceTest)} /> 22-min Run:Row</label>
              <label><input type="radio" name="enduranceTest" value="fiveKm" checked={enduranceTest === 'fiveKm'} onChange={update(setEnduranceTest)} /> 5 km proxy</label>
            </fieldset>
            <label className="athx-calculator__field">
              <span className="sr-only">{enduranceTest === 'runRow' ? 'Run:Row distance in metres' : '5 kilometre time in minutes and seconds'}</span>
              <input
                type={enduranceTest === 'runRow' ? 'number' : 'text'}
                min={enduranceTest === 'runRow' ? '1' : undefined}
                inputMode={enduranceTest === 'runRow' ? 'numeric' : 'decimal'}
                value={endurance}
                onChange={update(setEndurance)}
                placeholder={enduranceTest === 'runRow' ? 'e.g. 5050' : 'MM:SS'}
              />
              <i>{enduranceTest === 'runRow' ? 'm' : 'min'}</i>
            </label>
          </div>

          <div className="athx-calculator__metcon">
            <label>
              <span><b>MetCon</b> · {metconLabel}</span>
              <span className="athx-calculator__field"><input type="text" inputMode="decimal" value={metcon} onChange={update(setMetcon)} placeholder="MM:SS" disabled={capped} /> <i>min</i></span>
            </label>
            <label className="athx-calculator__check"><input type="checkbox" checked={capped} onChange={(event) => { setCapped(event.target.checked); setSubmitted(false) }} /> I did not finish within the cap</label>
          </div>
        </div>

        <button type="submit">Rank my results</button>
      </form>

      <div className="athx-calculator__output" aria-live="polite">
        {!submitted && <p>Complete all three results to calculate your Bonus Day priority.</p>}
        {assessment?.error && <p className="athx-calculator__error">{assessment.error}</p>}
        {assessment?.ranked && (
          <>
            <div className="athx-calculator__recommendation">
              <p>Recommended Bonus Day</p>
              <strong>{assessment.weakest.map((item) => item.name).join(' + ')}</strong>
              <span>{assessment.weakest.length > 1 ? 'The results are tied. Use either domain until the next reassessment.' : 'This is currently your weakest ranked domain.'}</span>
            </div>
            <ol className="athx-calculator__ranking">
              {assessment.ranked.map((item, index) => (
                <li key={item.name} className={index === assessment.ranked.length - 1 ? 'is-priority' : ''}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{item.name}</strong><small>{index === 0 ? 'Strongest' : index === 2 ? 'Bonus priority' : 'Middle'}</small></div>
                  <div><b>{labels[item.score]}</b><small>{item.capped ? 'Capped result' : formatDifference(item.deficit)}</small></div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  )
}
