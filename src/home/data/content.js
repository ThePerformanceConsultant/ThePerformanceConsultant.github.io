export const methodSteps = [
  {
    index: '01',
    title: 'Establish',
    signal: 'Context before prescription',
    copy: 'We define the outcome, then map your training history, schedule, food preferences, recovery and practical constraints.',
  },
  {
    index: '02',
    title: 'Prescribe',
    signal: 'One coordinated plan',
    copy: 'Training and nutrition are built together so that volume, intensity, energy intake and meal structure support the same goal.',
  },
  {
    index: '03',
    title: 'Review',
    signal: 'Weekly feedback, interpreted',
    copy: 'Performance, adherence, appetite, digestion, sleep and recovery are reviewed in context. One difficult day is not treated as a trend.',
  },
  {
    index: '04',
    title: 'Refine',
    signal: 'Change only what needs changing',
    copy: 'The programme develops as your capacity and circumstances change, with the reasoning behind each decision explained clearly.',
  },
]

export const plans = [
  {
    name: 'Rx',
    price: '149',
    label: 'Structured oversight',
    intro: 'For athletes who want training, nutrition and weekly professional review in one coherent service.',
    features: [
      'Structured training programming, adapted to you',
      'Nutrition plan built to your training, lifestyle and biofeedback',
      'Options for every meal, with recipes the household will eat',
      'Weekly review and adjustments',
      '1:1 messaging support and education that explains the why',
    ],
  },
  {
    name: 'Rx+',
    price: '250',
    label: 'Complete performance oversight',
    intro: 'For complex goals, competition demands and athletes who need closer access and detailed review.',
    features: [
      'Fully bespoke, periodised programming, tailored exclusively to you',
      'Video reviews of training, including corrective work',
      'The full Rx nutrition standard',
      'Direct line on WhatsApp, plus calls when needed',
      'Recovery, stress, lifestyle and workload optimisation',
      'Competition prep, and further testing when needed',
    ],
  },
]

const testimonialImage = (basename, width, height) => ({
  src: `/images/testimonials/${basename}-960.webp`,
  srcSet: `/images/testimonials/${basename}-640.webp 640w, /images/testimonials/${basename}-960.webp 960w`,
  width,
  height,
})

export const testimonials = [
  {
    id: 'jefferson-cartmel',
    name: 'Jefferson Cartmel',
    role: 'Coach & Multiple Business Owner',
    image: testimonialImage('jefferson-cartmel', 960, 947),
    imageAlt: 'Jefferson Cartmel before and after coaching',
    paragraphs: [
      '3 months of graft... and we’re only just getting started.',
      'Just over 12 months ago, I was in a bad place.',
      'I hated what I’d become.\nI hated what I stood for.\nI felt like a fraud.',
      'I was letting myself down, but more importantly, I was letting down the people closest to me.',
      'But that version of me is gone.',
      'I don’t look back anymore. I look forward.',
      'The targets are set, the vision is clear and I will achieve them.',
      {
        prefix: 'For the last 3 months I’ve been working with the incredible ',
        linkLabel: '@theperformanceconsultant',
        href: 'https://www.instagram.com/theperformanceconsultant/',
        suffix: ' who has kept me accountable every single day.',
      },
      'The process is working.',
    ],
  },
  {
    id: 'dimos-kourtzis',
    name: 'Dimos Kourtzis',
    role: 'Online Coach',
    image: testimonialImage('dimos-kourtzis', 960, 1059),
    imageAlt: 'Dimos Kourtzis before and after coaching',
    paragraphs: [
      'I have the best teacher that pushes me to do better and be better. I wouldn’t be where I am today without Will. I truly believe that. Still a lot of work to be done, but with him by my side I’m not afraid.',
    ],
  },
  {
    id: 'dale-kneen',
    name: 'Dale Kneen',
    role: 'Service Designer',
    image: testimonialImage('dale-kneen', 960, 962),
    imageAlt: 'Dale Kneen before and after coaching',
    paragraphs: [
      'Over the past year, my fitness journey with Will has been nothing short of transformative. What began as a New Year’s resolution to shed some excess weight evolved into a comprehensive reevaluation of my fitness goals and a commitment to achieving a balanced, sustainable physique.',
    ],
  },
  {
    id: 'lawrence',
    name: 'Lawrence',
    role: 'Retail Manager',
    image: testimonialImage('lawrence', 960, 959),
    imageAlt: 'Lawrence before and after coaching',
    paragraphs: [
      'Just wanted to send a not so quick message over to say a massive thank you for the last 10/11 months working with you! Today last year was the day I knew that something was amiss in my relationship and training, and things were ultimately heading downhill. I know I was a bit of a mess those first few months, you saw first-hand, but after finding you, you really did give me that belief that I could do this and make something of myself, and I really did fall in love with training all over again! Since then I honestly don’t recognise myself in how far I’ve come and how almost reprogrammed I’ve become in terms of efficiency and output. I had none of that this time last year, yet now I feel like a machine hitting every note! Seriously man, thank you for all you do. You genuinely are an inspiration with what you do and how you do it, and I’m seriously stoked for ramping everything up going into next year! Much love bro.',
    ],
  },
]

export const supportingResults = [
  ['result-01', 960, 963],
  ['result-02', 960, 943],
  ['result-03', 960, 979],
  ['result-04', 960, 959],
  ['result-05', 960, 962],
  ['result-06', 960, 957],
  ['result-07', 960, 959],
  ['result-08', 960, 1055],
].map(([id, width, height], index) => ({
  id,
  image: testimonialImage(id, width, height),
  imageAlt: `Client transformation comparison, result ${index + 1} of 8`,
}))

export const qualifications = [
  'PhD · Molecular & Structural Biology',
  'MSc · Performance Nutrition',
  'MSc · Biosciences',
  'BSc · Molecular & Cellular Biology',
  'L4 · Advanced Nutrition',
  'L3 · Sports Performance Specialist',
  'Neurotyping Specialist',
  'Movement Optimisation Specialist',
]

export const faqs = [
  {
    question: 'Do I need to compete?',
    answer: 'No. The service is designed for everyday athletes who train consistently and want a more individualised approach. Competition preparation is available within Rx+ when relevant.',
  },
  {
    question: 'What does biofeedback mean here?',
    answer: 'Relevant information can include appetite, digestion, sleep, soreness, perceived recovery, training performance and bodyweight trends. It is considered alongside adherence and the wider context of your week.',
  },
  {
    question: 'Do I need to track calories?',
    answer: 'Not necessarily. The nutrition method can use targets, portions, meal structure or a combination. The level of detail should be sufficient for the goal and realistic to apply.',
  },
  {
    question: 'What happens after I apply?',
    answer: 'Your application is reviewed to establish whether the service is appropriate for your goals and circumstances. Completing the questionnaire does not commit you to coaching or create a coaching relationship.',
  },
]
