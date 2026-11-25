import type { CardDraft } from '../cards/schema'

export const SAMPLE_TITLE = 'Biology: Photosynthesis'

export const SAMPLE_NOTES = `Photosynthesis — Bio 101, week 4

- Plants, algae and some bacteria turn light energy into chemical energy (glucose).
- Overall equation: 6CO2 + 6H2O + light → C6H12O6 + 6O2
- Happens in the chloroplasts. The green pigment chlorophyll absorbs mostly red and blue light and reflects green.

Two stages:
1. Light-dependent reactions — in the thylakoid membranes. Water is split (photolysis), releasing O2 as a by-product. Produces ATP and NADPH.
2. Calvin cycle (light-independent) — in the stroma. Uses ATP + NADPH to fix CO2 into sugar. Key enzyme: RuBisCO (most abundant protein on Earth).

Limiting factors: light intensity, CO2 concentration, temperature.
Stomata on leaves let CO2 in and O2 out; they close in hot/dry conditions to save water.`

export const SAMPLE_CARDS: CardDraft[] = [
  { front: 'What does photosynthesis convert light energy into?', back: 'Chemical energy stored as glucose.' },
  { front: 'What is the overall equation for photosynthesis?', back: '6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂' },
  { front: 'In which organelle does photosynthesis happen?', back: 'The chloroplast.' },
  { front: 'Why do leaves look green?', back: 'Chlorophyll absorbs mostly red and blue light and reflects green.' },
  { front: 'Where do the light-dependent reactions take place?', back: 'In the thylakoid membranes.' },
  { front: 'What is the source of the oxygen released by photosynthesis?', back: 'Water, split during the light-dependent reactions (photolysis).' },
  { front: 'What two products of the light-dependent reactions power the Calvin cycle?', back: 'ATP and NADPH.' },
  { front: 'Which enzyme fixes CO₂ in the Calvin cycle?', back: 'RuBisCO.' },
  { front: 'Name three limiting factors of photosynthesis.', back: 'Light intensity, CO₂ concentration and temperature.' },
  { front: 'Why do stomata close in hot, dry conditions?', back: 'To reduce water loss.' },
]
