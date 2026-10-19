import { brand } from '@/config/brand'

/**
 * All story copy. Short sentences, calm and precise.
 * `scene` describes what the 3D shows at that point, for screen readers and the static version.
 */
export const copy = {
  machine: {
    eyebrow: `${brand.fullName}`,
    title: brand.tagline,
    body: 'Repairs, upgrades and quality-checked laptops in Colombo. Scroll to watch us work.',
    scene: 'A closed laptop rests in darkness, lit only along its edge. Its lid opens and the screen’s glow spills over the keyboard.',
  },
  fault: {
    eyebrow: 'Something is wrong',
    title: 'You know the feeling.',
    lines: ['It’s slow.', 'It runs hot.', 'The fan never stops.', 'The battery is gone by lunch.', 'The screen cracked.', 'It won’t turn on.'],
    body: 'Most of these are fixable. Usually faster, and for less, than you expect.',
    scene: 'The screen flickers and glitches. The underside glows amber with heat and the fan spins hard.',
  },
  teardown: {
    eyebrow: 'The teardown',
    title: 'We open it up.',
    body: 'Every laptop is a stack of parts that can be tested, repaired or replaced on their own. That is where we work.',
    scene:
      'The laptop rolls over, the bottom cover lifts away and the machine separates into layers: bottom cover, battery, SSD, RAM, fan and heat pipes, motherboard, keyboard deck, hinge and display panel.',
  },
  servicesIntro: 'What we do, part by part',
  diagnosis: {
    eyebrow: 'Diagnosis',
    title: 'We find the fault before we touch anything.',
    readout: ['> scan board ............ ok', '> rail PP3V3 ............ 0.2 V', '> short located ......... C412', '> replace C412 .......... done', '> rail PP3V3 ............ 3.3 V'],
    points: [
      ['Free diagnosis', 'We find the cause first. No charge to look.'],
      ['A quote before any work', 'You approve the price. Nothing happens without it.'],
      ['Genuine parts', 'Matched to your exact model.'],
      ['Warranty on repairs', 'Written on your receipt.'],
    ] as [string, string][],
    scene: 'A scan line sweeps across the motherboard and its traces light up. One small component pulses red: the fault. It is replaced and turns cyan.',
  },
  reassembly: {
    eyebrow: 'Reassembly',
    title: 'It’s ready.',
    body: 'Rebuilt, tested under load, cleaned. Cool, quiet and back to work.',
    scene: 'The parts fly back into place, the last screws settle, the laptop turns upright and boots to a clean desktop.',
  },
  shelf: {
    eyebrow: 'The shelf',
    title: 'Laptops we’d trust ourselves.',
    body: 'New machines, and refurbished ones we have tested part by part. Every one comes with a warranty.',
    scene: 'The camera pulls back. The laptop now sits on a dark display plinth among several others from the shop’s stock.',
  },
  track: {
    eyebrow: 'Track a repair',
    title: 'Where is my laptop?',
    body: 'Enter the ticket number from your receipt.',
    scene: 'The camera moves to the laptop’s screen, which shows the repair status timeline.',
  },
  book: {
    eyebrow: 'Book a repair',
    title: 'Tell us what’s wrong.',
    body: 'It takes a minute. We’ll call to confirm, and diagnosis is free.',
    scene: 'The laptop sits to the side, open and running.',
  },
  findUs: {
    eyebrow: 'Find us',
    title: 'Bring it in.',
    body: 'Walk in during opening hours, or book first and we’ll have a bench ready.',
    scene: 'The lid closes gently and the logo on it glows.',
  },
}
