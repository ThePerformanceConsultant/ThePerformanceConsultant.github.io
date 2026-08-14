import { useEffect } from 'react'
import { updateMetadata } from '../metadata.js'

const navigation = [
  ['01', 'Start here', 'start-here'],
  ['02', 'Programme tracks', 'programme-tracks'],
  ['03', 'Training rules', 'training-rules'],
  ['04', 'Bonus work', 'bonus-work'],
  ['05', 'Session changes', 'session-changes'],
  ['06', 'Comp Ready', 'comp-ready'],
  ['07', 'Return week', 'return-week'],
  ['08', 'FAQ', 'faq'],
  ['09', 'Programme links', 'programme-links'],
  ['A', 'Detailed guidance', 'appendix-a'],
  ['B', 'Sources', 'appendix-b'],
]

const tracks = [
  {
    name: 'Main',
    label: 'Develop',
    copy: 'The current rolling development programme. It is updated weekly so you continue progressing while you remain on it.',
  },
  {
    name: 'Baseline',
    label: 'Assess',
    copy: 'The testing week used to establish current performance and identify your primary limiter.',
  },
  {
    name: 'Comp Ready',
    label: 'Taper',
    copy: 'Sessions that replace Main during the final three weeks so fatigue falls while competition familiarity remains.',
  },
  {
    name: 'Return',
    label: 'Recover',
    copy: 'The recovery and review week immediately after competition, before returning to Main.',
  },
]

const maleStandards = [
  ['Lite', 'Strength total', '≥325 kg', '275–324 kg', '<275 kg'],
  ['', '22-min Run:Row', '≥4,600 m', '4,300–4,599 m', '<4,300 m'],
  ['', '5 km proxy', '≤23:00', '23:01–25:00', '>25:00'],
  ['', 'Lite solo MetCon', '≤13:30', '13:31–16:00', '>16:00'],
  ['Intermediate / ATHX', 'Strength total', '≥400 kg', '350–399 kg', '<350 kg'],
  ['', '22-min Run:Row', '≥5,000 m', '4,700–4,999 m', '<4,700 m'],
  ['', '5 km proxy', '≤21:30', '21:31–23:30', '>23:30'],
  ['', 'ATHX MetCon X', '≤11:30', '11:31–13:30', '>13:30'],
  ['Pro', 'Strength total', '≥440 kg', '400–439 kg', '<400 kg'],
  ['', '22-min Run:Row', '≥5,300 m', '5,000–5,299 m', '<5,000 m'],
  ['', '5 km proxy', '≤20:30', '20:31–22:00', '>22:00'],
  ['', 'Pro MetCon X', '≤12:00', '12:01–14:00', '>14:00'],
]

const femaleStandards = [
  ['Lite', 'Strength total', '≥225 kg', '180–224 kg', '<180 kg'],
  ['', '22-min Run:Row', '≥4,300 m', '4,000–4,299 m', '<4,000 m'],
  ['', '5 km proxy', '≤25:30', '25:31–28:00', '>28:00'],
  ['', 'Lite solo MetCon', '≤12:30', '12:31–15:30', '>15:30'],
  ['Intermediate / ATHX', 'Strength total', '≥285 kg', '240–284 kg', '<240 kg'],
  ['', '22-min Run:Row', '≥4,650 m', '4,350–4,649 m', '<4,350 m'],
  ['', '5 km proxy', '≤23:30', '23:31–26:00', '>26:00'],
  ['', 'ATHX MetCon X', '≤10:15', '10:16–12:00', '>12:00'],
  ['Pro', 'Strength total', '≥340 kg', '290–339 kg', '<290 kg'],
  ['', '22-min Run:Row', '≥5,100 m', '4,800–5,099 m', '<4,800 m'],
  ['', '5 km proxy', '≤22:00', '22:01–24:00', '>24:00'],
  ['', 'Pro MetCon X', '≤10:00', '10:01–12:00', '>12:00'],
]

function GuidanceSection({ number, title, id, children, appendix = false }) {
  return (
    <section className={`athx-section ${appendix ? 'athx-section--appendix' : ''}`} id={id}>
      <div className="athx-section__heading">
        <span>{number}</span>
        <h2>{title}</h2>
      </div>
      <div className="athx-section__content">{children}</div>
    </section>
  )
}

function Callout({ children, tone = 'signal' }) {
  return <aside className={`athx-callout athx-callout--${tone}`}>{children}</aside>
}

function StandardsTable({ title, rows }) {
  return (
    <div className="athx-table-shell">
      <table className="athx-table">
        <caption>{title}</caption>
        <thead>
          <tr><th>Pathway</th><th>Domain</th><th>Strong</th><th>Adequate</th><th>Limiter</th></tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr className={row[0] ? 'athx-table__group' : undefined} key={`${row[1]}-${index}`}>
              <th scope="row">{row[0]}</th>
              <td>{row[1]}</td>
              <td><strong>{row[2]}</strong></td>
              <td>{row[3]}</td>
              <td>{row[4]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExternalLink({ href, children }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
}

export default function AthxGuidance() {
  useEffect(() => {
    updateMetadata({
      title: 'ATHX Performance Programming Guidance',
      description: 'Private-link guidance for ATHX performance programming, testing, competition preparation and return to training.',
      path: '/athx/guidance',
      robots: 'noindex, nofollow',
    })
  }, [])

  return (
    <div className="athx-page">
      <header className="athx-hero">
        <div className="athx-hero__grid" aria-hidden="true" />
        <div className="athx-hero__eyebrow"><span>ATHX</span><i /><p>Client guidance</p></div>
        <div className="athx-hero__content">
          <div>
            <p className="athx-hero__kicker">Performance programming</p>
            <h1><span>Know where</span><em>to start.</em></h1>
          </div>
          <p>How to choose your track, identify your limiter, adjust training and arrive ready to perform.</p>
        </div>
        <div className="athx-hero__tracks" aria-label="Programme track sequence">
          {tracks.map((track, index) => (
            <div key={track.name}><span>{String(index + 1).padStart(2, '0')}</span><strong>{track.name}</strong><small>{track.label}</small></div>
          ))}
        </div>
      </header>

      <div className="athx-document">
        <aside className="athx-toc" aria-label="Guidance contents">
          <p>On this page</p>
          <nav>
            {navigation.map(([number, label, id]) => <a href={`#${id}`} key={id}><span>{number}</span>{label}</a>)}
          </nav>
        </aside>

        <article className="athx-article">
          <GuidanceSection number="01" title="Start here" id="start-here">
            <p className="athx-lead">Welcome to the programme.</p>
            <p>If you have a few minutes, I strongly recommend watching <strong>the introductory video</strong>, as it explains the programme very simply.</p>
            <p>If you have not, use the following rules to choose your starting track:</p>
            <ul className="athx-decision-list">
              <li><strong>If you completed testing within the last six weeks:</strong> ignore Baseline and go directly to Main until you reach three weeks out from competition.</li>
              <li><strong>If you are not competing:</strong> ignore Baseline, go directly to Main and remain there.</li>
              <li><strong>If you are at least eight weeks from competition and have no recent testing:</strong> choose Baseline and complete the Full Baseline option.</li>
              <li><strong>If you are seven weeks or less from competition and have no recent testing:</strong> choose Main. There is little value in adding a full testing week this close to competition.</li>
              <li><strong>If you competed this weekend:</strong> choose Return for Week 1, then begin Main in Week 2.</li>
              <li><strong>If you are three weeks or less from competition:</strong> choose Comp Ready and follow the option for your number of weeks out.</li>
            </ul>
          </GuidanceSection>

          <GuidanceSection number="02" title="Main, Baseline, Comp Ready and Return" id="programme-tracks">
            <p>Everyone joins at a different point relative to competition, if they have committed to one at all. The four tracks allow you to enter the programme at the appropriate point.</p>
            <div className="athx-track-grid">
              {tracks.map((track, index) => (
                <article key={track.name}><span>0{index + 1} · {track.label}</span><h3>{track.name}</h3><p>{track.copy}</p></article>
              ))}
            </div>
            <Callout><strong>Always follow the actual week shown on the calendar.</strong> Select the track that matches where you are now.</Callout>
          </GuidanceSection>

          <GuidanceSection number="03" title="Training rules" id="training-rules">
            <p>The following rules cover the decisions you will make most often. More detail is provided in Appendix A.</p>
            <ul>
              <li>Calculate percentages from a current or recent training 1RM, completed within the last six weeks.</li>
              <li>The written percentage is the planned starting weight.</li>
              <li>RPE and exercise technique take priority over weight.</li>
              <li>Reduce the load in 2.5–5 kg steps if your chosen weight exceeds the prescribed RPE or your technique deteriorates.</li>
              <li>Do not increase above the written weight. The sessions are carefully periodised.</li>
              <li>RPE 8 means that two technically sound repetitions remain.</li>
              <li><strong>Do not grind or fail repetitions.</strong> Reduce the weight if this happens.</li>
              <li>Round to the nearest sensible weight you can assemble.</li>
              <li>Rest for 3–5 minutes between main lift sets unless the session states otherwise.</li>
              <li>Accessory movements can be trained slightly harder at RPE 8–9.</li>
              <li>For accessory work only, progress repetitions before weight. Add load after your sets reach the upper end of the range at the required RPE.</li>
            </ul>
            <div className="athx-example"><span>Example</span><p>If the session requires five squat repetitions at RPE 8 and 120 kg turns the final repetition into a grind, reduce the load to approximately 115 kg.</p></div>
            <Callout tone="gold">If percentages confuse you, use RPE, shown as “Effort” out of ten, to guide your weights.</Callout>
          </GuidanceSection>

          <GuidanceSection number="04" title="Choosing your bonus work" id="bonus-work">
            <p>If you are unsure which discipline is currently your strongest or weakest, use your Strength, Endurance and MetCon results against the standards below.</p>
            <StandardsTable title="Male assessment standards" rows={maleStandards} />
            <StandardsTable title="Female assessment standards" rows={femaleStandards} />
            <Callout tone="neutral"><strong>These are not official ATHX qualification standards.</strong> “Strong” is only used to compare your three disciplines and allocate limiter work. It does not predict a top-three, top-five or top-ten placing.</Callout>

            <h3>Score each discipline</h3>
            <div className="athx-score-grid">
              <div><strong>2</strong><span>Strong</span></div>
              <div><strong>1</strong><span>Adequate</span></div>
              <div><strong>0</strong><span>Limiter</span></div>
            </div>
            <p>Your <strong>lowest score determines your Bonus Day pathway</strong>.</p>
            <div className="athx-example">
              <span>Pro male example</span>
              <ul><li>Strength: 455 kg = 2</li><li>Run:Row: 5,080 m = 1</li><li>MetCon: 14:20 = 0</li></ul>
              <p>This athlete should select MetCon as their weakness.</p>
            </div>

            <h3>Resolving a tie</h3>
            <p>If two domains tie, calculate how far each result sits from the Strong threshold as a percentage. Train the domain with the larger deficit.</p>
            <div className="athx-formulas">
              <div><span>Higher is better</span><code>((Strong threshold − result) ÷ Strong threshold) × 100</code><p>Use for Strength and Endurance.</p></div>
              <div><span>Lower is better</span><code>((Result in seconds − Strong threshold) ÷ Strong threshold) × 100</code><p>Use for MetCon and 5 km time.</p></div>
            </div>
            <p>For example, 420 kg against a 440 kg Strength target is a 4.5% deficit. A 5,050 m result against a 5,300 m Endurance target is a 4.7% deficit. Endurance is therefore the larger limiter.</p>
            <p>If you do not have a Run:Row result, you can use a 5 km completed within the last four weeks as a proxy. Completing Run:Row under competition standards remains preferable. A capped MetCon is automatically scored as a Limiter.</p>
            <Callout><strong>Keep the same limiter for Weeks 1–4.</strong> Reassess after the Week 4 benchmarks. Do not change it each week according to what felt worst. Performance is what matters, and the work is meant to feel difficult.</Callout>
          </GuidanceSection>

          <GuidanceSection number="05" title="Rearranging or missing sessions" id="session-changes">
            <p>The normal order is Squat, Zone 2, Press plus Run:Row, Rest, Deadlift plus MetCon, Bonus, Rest.</p>
            <ul>
              <li>The programme works on its own without additional training. If you add work, protect at least one rest day.</li>
              <li>Avoid placing heavy lower-body work immediately after a demanding run or MetCon.</li>
              <li>If you combine lifting and conditioning, lift first.</li>
              <li>Keep at least one recovery day between Deadlift plus MetCon and another substantial lower-body exposure where possible.</li>
              <li>When time is limited, prioritise the most event-specific session and your current limiter.</li>
              <li>Do not push through abnormal pain or injury. Seek guidance from an appropriate physical therapist.</li>
            </ul>
            <div className="athx-example"><span>Practical adjustment</span><p>If your Bonus pathway is Strength, complete Deadlift plus MetCon on Thursday and rest on Friday where that arrangement gives the additional lifting session more space.</p></div>
          </GuidanceSection>

          <GuidanceSection number="06" title="Comp Ready" id="comp-ready">
            <p>Comp Ready replaces Main during the final three weeks. Each day in Fitr contains complete options for:</p>
            <ol className="athx-countdown">
              <li><span>03</span><div><strong>Three weeks out</strong><p>The final substantial event-specific work.</p></div></li>
              <li><span>02</span><div><strong>Two weeks out</strong><p>Competition movement familiarity with less volume and fatigue.</p></div></li>
              <li><span>01</span><div><strong>Event week</strong><p>Brief exposures only. There is no Friday lifting or MetCon for Saturday or Sunday competitors.</p></div></li>
            </ol>
            <div className="athx-example"><span>Liverpool 2026 · 3–4 October</span><ul><li>Up to Week 5, 7–13 September: Main</li><li>Week 6, 14–20 September: Comp Ready, Three Weeks Out</li><li>Week 7, 21–27 September: Comp Ready, Two Weeks Out</li><li>Week 8, 28 September–4 October: Comp Ready, Event Week</li></ul></div>
          </GuidanceSection>

          <GuidanceSection number="07" title="Return week" id="return-week">
            <p>Use Return for the first week after competition so you recover before trying to progress again. Do not move directly back to Main.</p>
            <ul>
              <li>After a Saturday competition, complete the Day 1 squat option only when soreness is no higher than 4/10 and readiness is at least 6/10.</li>
              <li>After a Sunday competition, or whenever soreness and fatigue remain elevated, use the walking option.</li>
              <li>Run only when impact is pain-free.</li>
              <li>There is no limiter session during Return.</li>
              <li>If readiness, soreness or fatigue worsens, rest completely.</li>
              <li>Join Main after one week on Return.</li>
            </ul>
          </GuidanceSection>

          <GuidanceSection number="08" title="Frequently asked questions" id="faq">
            <div className="athx-faq">
              <details><summary>Can I join midway through the season?</summary><p>Yes. Follow the steps in Start Here and choose the appropriate track.</p></details>
              <details><summary>When do I switch to Comp Ready?</summary><p>At Three Weeks Out. Comp Ready replaces Main for the remainder of the countdown to your event.</p></details>
              <details><summary>What happens during the week after competition?</summary><p>Complete one week on Return to recover. Then rejoin Main or the relevant Comp Ready phase according to your next event date.</p></details>
              <details><summary>What should I do if I miss or rearrange a session?</summary><p>If you feel ready, use your rest days and adjust the weights sensibly. For example, if Friday is unavailable but Thursday is free, move Deadlift plus MetCon to Thursday. You may need to reduce the deadlift load slightly if Wednesday’s session is still affecting you. Completing the planned work at 5–10% less load is usually better than missing it.</p></details>
              <details><summary>How do I handle back-to-back events?</summary><p>Eight weeks is the minimum practical window for recovery, a short development block and another taper. Twelve weeks or more is preferable when meaningful progress between events is the aim. If you attempt more than two or three of these events each year, do not expect consistent progress between them.</p></details>
            </div>
          </GuidanceSection>

          <GuidanceSection number="09" title="Free Week 1 and paid programme links" id="programme-links">
            <div className="athx-link-list">
              <ExternalLink href="https://www.instagram.com/theperformanceconsultant/"><span>Available</span><strong>Free Week 1</strong><small>@theperformanceconsultant ↗</small></ExternalLink>
              <div><span>Coming soon</span><strong>Lite programme</strong><small>£19.99 per month · seven-day trial</small></div>
              <div><span>Coming soon</span><strong>Intermediate programme</strong><small>£19.99 per month · seven-day trial</small></div>
              <div><span>Coming soon</span><strong>Pro programme</strong><small>£19.99 per month · seven-day trial</small></div>
            </div>
          </GuidanceSection>

          <GuidanceSection number="A" title="Detailed training guidance and examples" id="appendix-a" appendix>
            <h3>Workout details</h3>
            <h4>Movement preparation and warm-up sets</h4>
            <p>A general mobility section will be available for anyone who prefers to use one before training, but it is optional. You do not need an elaborate 30–40 minute warm-up. If time is limited, or you do not feel that mobility work is necessary, use lighter sets of your main movement to prepare.</p>
            <p>The purpose of warm-up sets is to prepare for the working sets without wasting energy. You do not need to get a pump. Use a small number of repetitions at progressively heavier weights.</p>
            <div className="athx-workout">
              <div><span>Programmed work</span><h4>Barbell Back Squat</h4><p>Set 1: 3 reps at 82.5% 1RM<br />Sets 2–5: 3 reps at 75% 1RM<br />Rest: 3–4 minutes<br />Difficulty: RPE 7–8</p></div>
              <div><span>Example warm-up for 150 kg</span><p>6 reps × 60 kg<br />4 reps × 100 kg<br />2 reps × 130 kg<br />Optional: 1 rep × 140 kg</p></div>
            </div>
            <p>No additional warm-up would normally be needed for Bulgarian split squats after barbell squats. A low-complexity machine movement such as a leg curl or calf raise may need one quick set. The precise number of warm-up sets remains individual. They exist to prepare you for the working sets, nothing more.</p>

            <h3>RPE and percentage-based loading</h3>
            <h4>RPE: Rate of Perceived Exertion</h4>
            <figure className="athx-figure athx-figure--portrait">
              <img src="/images/athx/guidance-01.png" width="599" height="889" loading="lazy" decoding="async" alt="Rate of perceived exertion scale from RPE 1 to RPE 10" />
              <figcaption>Use RPE to estimate how many technically sound repetitions remain.</figcaption>
            </figure>
            <p>If I prescribe <strong>3 sets of 6–8 repetitions at RPE 7–8</strong>, choose a weight that feels moderate to difficult and leaves approximately two or three further repetitions available.</p>
            <div className="athx-comparison">
              <div><span>Same load, accumulated effort</span><p>Set 1: 30 kg × 8 at RPE 7<br />Set 2: 30 kg × 8 at RPE 8<br />Set 3: 30 kg × 7 at RPE 8</p></div>
              <div><span>Same load, stable effort</span><p>Set 1: 30 kg × 8 at RPE 7<br />Set 2: 30 kg × 7 at RPE 7<br />Set 3: 30 kg × 6 at RPE 7.5</p></div>
            </div>
            <p>Neither approach is inherently better. Use RPE to adjust the load while remaining inside the prescribed repetition range. For accessories, progress repetitions first and add load once every set reaches the upper end at the required effort. For main lifts, reduce the load when the written percentage would breach the RPE or technical cap. Do not add repetitions or increase above the percentage unless the session explicitly requests an autoregulated attempt.</p>
            <p>RPE is a skill and takes time to learn. Two useful practical cues are:</p>
            <ol>
              <li>If you complete every set for exactly the same repetitions without a meaningful change in speed or difficulty, you are unlikely to be near RPE 10 and may be at or below RPE 7.</li>
              <li>The point where the load begins to feel as though it is pushing back more than it did earlier in the set is often around RPE 7–8 for many movements.</li>
            </ol>
            <p>Higher RPE values have a greater recovery cost on large, demanding movements than on small isolation exercises. This is why the prescribed RPE on the main lifts must remain controlled. Being able to do more in Week 1 is irrelevant if accumulated fatigue reduces competition performance later.</p>

            <h4>Percentage of one-repetition maximum</h4>
            <p>A percentage prescription uses your one-repetition maximum for that lift. If your back squat 1RM is 170 kg and the prescription is 75%, the calculation is:</p>
            <div className="athx-equation"><code>170 kg × 75 ÷ 100 = 127.5 kg</code></div>
            <p>If you do not have a recent maximum, estimate it using the <ExternalLink href="https://strengthlevel.com/one-rep-max-calculator">Strength Level 1RM calculator</ExternalLink>. Calculators generally assume the entered set was maximal. If it was not, add the repetitions you believe remained to the number completed.</p>
            <p>For example, if 140 kg for five squat repetitions felt as though two repetitions remained, enter 140 kg for seven repetitions.</p>
            <figure className="athx-figure">
              <img src="/images/athx/guidance-02.png" width="986" height="357" loading="lazy" decoding="async" alt="Example of estimating a one-repetition maximum from weight and repetitions" />
              <figcaption>Account for repetitions remaining when estimating a 1RM from a submaximal set.</figcaption>
            </figure>

            <h3>Rest between sets</h3>
            <p>Rest periods are prescribed when the duration matters. Otherwise, use approximately 1–2 minutes for smaller, less complex movements and at least three minutes for larger, more demanding lifts.</p>
            <p>For supersets, you do not need to rush immediately between exercises. Complete the first exercise, move to the next at a comfortable pace, rest briefly if needed, complete the second exercise and then recover before beginning the next round.</p>
            <p>If time allows, longer rest is acceptable. The main drawback is a longer session. Prioritise high-quality work, particularly for strength movements.</p>

            <h3>Modifications and substitutions</h3>
            <p>The programme is designed so that most people can complete it in most gyms. Equipment, training history and movement capabilities still vary. If you need a substitution, ask in the chat before you reach the middle of the session. The chat is not monitored continuously, so plan ahead where possible.</p>
            <p>If a lifting percentage is too high or low for the prescribed RPE, adjust the load. The aim is to work close to competition demands without forcing a repetition target that you cannot perform confidently. A five-repetition squat load can still improve performance if you are not ready to reproduce a three-repetition competition demand safely.</p>

            <h3>Balancing strength and conditioning</h3>
            <blockquote>Is it possible to progress maximally in both strength and conditioning at the same time?</blockquote>
            <p>The simple answer is <strong>no</strong>. Hybrid training requires a deliberate balance between competing adaptations. If both qualities could be maximised without sacrifice, elite endurance athletes would display elite powerlifting strength and elite strongmen would produce world-class marathon performances.</p>
            <p>The interaction between strength and endurance training is usually discussed through concurrent training and the interference effect. The practical rules are:</p>
            <ul>
              <li><strong>Prioritise what matters most and do it while freshest.</strong> Complete Strict Press before conditioning when pressing is the priority.</li>
              <li><strong>Separate demanding endurance and lifting by at least six hours</strong> where possible.</li>
              <li><strong>If sessions must be combined, complete the priority discipline first.</strong></li>
              <li><strong>Keep most aerobic work easy</strong> so it does not compromise the sessions that drive progress.</li>
              <li><strong>Manage total lower-body fatigue.</strong> Hard running, squats and MetCons all contribute.</li>
              <li><strong>Fuel the workload,</strong> particularly with sufficient carbohydrate around demanding sessions.</li>
              <li><strong>If performance repeatedly declines, reduce the least important source of fatigue first.</strong> This will often be accessory volume.</li>
            </ul>
            <p>The programme already considers these interactions, but work, sleep, family and practical demands will sometimes require you to rearrange the week. If the week deteriorates substantially, prioritise your weakness instead of abandoning the plan.</p>
            <div className="athx-mistakes">
              <article><span>Mistake 01</span><h4>Heavy lifting immediately after hard running</h4><p>Lift first when combining sessions, or separate them by several hours. A short, low-volume acceleration session is different from substantial intervals such as 10 × 800 m.</p></article>
              <article><span>Mistake 02</span><h4>Speed work on very sore legs</h4><p>Easy running on tired legs can be acceptable. Avoid speed or MetCon work when leg soreness is above 3/10 or clearly restricts performance.</p></article>
            </div>
            <Callout tone="gold"><strong>Best practice:</strong> protect the most demanding, event-specific running session in a position where you are likely to feel capable of producing high-quality work.</Callout>
          </GuidanceSection>

          <GuidanceSection number="B" title="Sources" id="appendix-b" appendix>
            <div className="athx-sources">
              <div><h3>Official ATHX sources</h3><ul>
                <li><ExternalLink href="https://athxgames.com/workouts/2026">2026 workouts</ExternalLink></li>
                <li><ExternalLink href="https://athxgames.com/movement-standards/2026">2026 movement standards</ExternalLink></li>
                <li><ExternalLink href="https://athxgames.com/events">Event calendar</ExternalLink></li>
                <li><ExternalLink href="https://athxgames.com/finals-qualification/2026">2026 Finals qualification rules</ExternalLink></li>
                <li><ExternalLink href="https://athxgames.com/workouts/2027">2027 workouts</ExternalLink></li>
              </ul></div>
              <div><h3>Programming evidence</h3><ul>
                <li><ExternalLink href="https://doi.org/10.1186/s40798-021-00404-9">Hickmott et al. Autoregulation and fixed loading</ExternalLink></li>
                <li><ExternalLink href="https://doi.org/10.3389/fphys.2018.00247">Helms et al. RPE-based resistance training</ExternalLink></li>
                <li><ExternalLink href="https://doi.org/10.1249/mss.0b013e31806010e0">Bosquet et al. Taper meta-analysis</ExternalLink></li>
                <li><ExternalLink href="https://doi.org/10.1371/journal.pone.0282838">Wang et al. Tapering and performance</ExternalLink></li>
                <li><ExternalLink href="https://doi.org/10.3390/sports8090125">Travis et al. Strength tapering</ExternalLink></li>
                <li><ExternalLink href="https://vdoto2.com/calculator">V.O2 Running Calculator</ExternalLink></li>
              </ul></div>
            </div>
          </GuidanceSection>
        </article>
      </div>
    </div>
  )
}
