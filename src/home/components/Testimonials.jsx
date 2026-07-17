import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useState } from 'react'
import { supportingResults, testimonials } from '../data/content.js'
import { ArrowIcon, PauseIcon, PlayIcon } from './Icons.jsx'
import { Reveal, SectionLabel } from './MotionPrimitives.jsx'

function QuoteParagraph({ paragraph }) {
  if (typeof paragraph === 'string') return <p>{paragraph}</p>

  return (
    <p>
      {paragraph.prefix}
      <a href={paragraph.href} target="_blank" rel="noreferrer">{paragraph.linkLabel}</a>
      {paragraph.suffix}
    </p>
  )
}

function ResultRailGroup({ duplicate = false }) {
  return (
    <div className="results-rail__group" aria-hidden={duplicate || undefined}>
      {supportingResults.map((result, index) => (
        <figure className="results-rail__card" key={`${duplicate ? 'duplicate-' : ''}${result.id}`}>
          <img
            src={result.image.src}
            srcSet={result.image.srcSet}
            sizes="(max-width: 640px) 68vw, (max-width: 1100px) 42vw, 30vw"
            width={result.image.width}
            height={result.image.height}
            alt={duplicate ? '' : result.imageAlt}
            loading="lazy"
            decoding="async"
          />
          <figcaption aria-hidden="true">Result {String(index + 1).padStart(2, '0')}</figcaption>
        </figure>
      ))}
    </div>
  )
}

export function Testimonials() {
  const reduceMotion = useReducedMotion()
  const [[activeIndex, direction], setActive] = useState([0, 1])
  const [railPaused, setRailPaused] = useState(false)
  const [railInteracting, setRailInteracting] = useState(false)
  const activeTestimonial = testimonials[activeIndex]

  const move = useCallback((delta) => {
    setActive(([current]) => [
      (current + delta + testimonials.length) % testimonials.length,
      delta,
    ])
  }, [])

  const select = useCallback((nextIndex) => {
    setActive(([current]) => {
      if (current === nextIndex) return [current, 0]
      return [nextIndex, nextIndex > current ? 1 : -1]
    })
  }, [])

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      move(-1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      move(1)
    }
  }

  const handleDragEnd = (_, info) => {
    if (reduceMotion) return
    const shouldMove = Math.abs(info.offset.x) > 65 || Math.abs(info.velocity.x) > 550
    if (shouldMove) move(info.offset.x < 0 ? 1 : -1)
  }

  const railStopped = reduceMotion || railPaused || railInteracting

  return (
    <section className="testimonials" id="results" aria-labelledby="testimonials-title">
      <div className="testimonials__glow" aria-hidden="true" />
      <header className="testimonials__heading">
        <Reveal><SectionLabel index="02" light>Client outcomes</SectionLabel></Reveal>
        <Reveal as="h2" delay={0.08}>
          <span>Client outcomes,</span> in their <em>own words.</em>
        </Reveal>
        <Reveal as="p" delay={0.14}>
          These accounts describe each client’s experience. Results vary according to starting point, adherence, training history and individual circumstances.
        </Reveal>
      </header>

      <Reveal className="testimonials__carousel" delay={0.18}>
        <div
          className="testimonials__stage"
          role="region"
          aria-roledescription="carousel"
          aria-label="Client testimonials"
          tabIndex="0"
          onKeyDown={handleKeyDown}
        >
          {testimonials.map((testimonial, index) => {
            const isActive = index === activeIndex
            const restingX = direction >= 0 ? '4%' : '-4%'

            return (
              <motion.article
                className="testimonial-slide"
                key={testimonial.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${testimonials.length}: ${testimonial.name}`}
                aria-hidden={!isActive}
                inert={!isActive}
                initial={false}
                animate={reduceMotion
                  ? { opacity: isActive ? 1 : 0, x: 0 }
                  : { opacity: isActive ? 1 : 0, x: isActive ? 0 : restingX, scale: isActive ? 1 : 0.985 }}
                transition={{ duration: reduceMotion ? 0 : 0.62, ease: [0.16, 1, 0.3, 1] }}
                style={{ zIndex: isActive ? 2 : 1, pointerEvents: isActive ? 'auto' : 'none' }}
                drag={!reduceMotion && isActive ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragEnd={handleDragEnd}
              >
                <figure className="testimonial-slide__image">
                  <img
                    src={testimonial.image.src}
                    srcSet={testimonial.image.srcSet}
                    sizes="(max-width: 900px) calc(100vw - 40px), 52vw"
                    width={testimonial.image.width}
                    height={testimonial.image.height}
                    alt={testimonial.imageAlt}
                    loading="lazy"
                    decoding="async"
                  />
                  <span aria-hidden="true">Before <i /> After</span>
                </figure>

                <div className="testimonial-slide__copy">
                  <span className="testimonial-slide__mark" aria-hidden="true">“</span>
                  <blockquote>
                    <div className="testimonial-slide__quote">
                      {testimonial.paragraphs.map((paragraph, paragraphIndex) => (
                        <QuoteParagraph paragraph={paragraph} key={`${testimonial.id}-${paragraphIndex}`} />
                      ))}
                    </div>
                    <footer>
                      <cite>{testimonial.name}</cite>
                      <span>{testimonial.role}</span>
                    </footer>
                  </blockquote>
                </div>
              </motion.article>
            )
          })}
        </div>

        <div className="testimonials__controls">
          <div className="testimonials__counter" aria-hidden="true">
            <strong>{String(activeIndex + 1).padStart(2, '0')}</strong>
            <span>/ {String(testimonials.length).padStart(2, '0')}</span>
          </div>

          <div className="testimonials__progress" aria-label="Choose a testimonial">
            {testimonials.map((testimonial, index) => (
              <button
                type="button"
                key={testimonial.id}
                className={index === activeIndex ? 'is-active' : ''}
                aria-label={`Show testimonial from ${testimonial.name}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => select(index)}
              ><span /></button>
            ))}
          </div>

          <div className="testimonials__arrows">
            <button type="button" onClick={() => move(-1)} aria-label={`Previous testimonial, ${testimonials[(activeIndex - 1 + testimonials.length) % testimonials.length].name}`}>
              <ArrowIcon direction="left" />
            </button>
            <button type="button" onClick={() => move(1)} aria-label={`Next testimonial, ${testimonials[(activeIndex + 1) % testimonials.length].name}`}>
              <ArrowIcon />
            </button>
          </div>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Showing testimonial {activeIndex + 1} of {testimonials.length} from {activeTestimonial.name}.
        </p>
      </Reveal>

      <div className="results-rail">
        <div className="results-rail__heading">
          <Reveal as="h3">Further client outcomes</Reveal>
          {!reduceMotion && (
            <button
              type="button"
              className="results-rail__toggle"
              aria-pressed={railPaused}
              onClick={() => setRailPaused((value) => !value)}
            >
              {railPaused ? <PlayIcon /> : <PauseIcon />}
              <span>{railPaused ? 'Play' : 'Pause'} results reel</span>
            </button>
          )}
        </div>

        <div
          className={`results-rail__viewport ${railStopped ? 'is-paused' : ''}`}
          onPointerEnter={() => setRailInteracting(true)}
          onPointerLeave={() => setRailInteracting(false)}
          onPointerDown={() => setRailInteracting(true)}
          onPointerUp={() => setRailInteracting(false)}
        >
          <div className="results-rail__track">
            <ResultRailGroup />
            {!reduceMotion && <ResultRailGroup duplicate />}
          </div>
        </div>
      </div>

      <p className="testimonials__disclaimer">
        Individual outcomes vary. Images and testimonials represent the experience of the clients shown and do not guarantee a particular result.
      </p>
    </section>
  )
}
