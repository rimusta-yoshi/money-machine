import { definePack } from '../define'
import type { PackLanding } from '../schema'

export const electrician = definePack({
  kind: 'single',
  id: 'electrician',
  slug: 'electricians',
  name: 'Electrician',
  plural: 'electricians',
  synonyms: ['sparky', 'sparkie', 'electrical contractor', 'electrical', 'electrics', 'rewiring', 'ev charger installer'],
  category: 'trade',
  featured: true,
  emoji: '⚡',
  look: {
    colours: { navy: '#1C1710', navyHover: '#2A2318', accent: '#D97706', accentInk: '#B45309', accentTint: '#FEF3C7' },
    theme: 'workwear',
    legacyTheme: 'professional',
  },
  copy: {
    tagline: 'Safe, tidy electrical work from local electricians.',
    cta: 'Book an electrician',
    ctaNote: 'No obligation',
    offer: 'Free quotes',
  },
  services: [
    { name: 'Fuse board upgrades', description: 'Old fuse boxes swapped for a modern consumer unit with RCD protection, tested and certified.' },
    { name: 'Rewiring', description: 'Full and part rewires, planned room by room so you’re never left without power for long.' },
    { name: 'EV charger installation', description: 'Home chargers fitted on a driveway or garage wall, with the right protection and paperwork.' },
    { name: 'Lighting', description: 'Downlights, pendants, garden and security lights, moved, added or replaced.' },
    { name: 'Safety inspections', description: 'Electrical installation condition reports (EICRs) for homeowners, buyers and landlords.' },
    { name: 'Emergency repairs', description: 'Tripping switches, burning smells and no power: made safe quickly, then put right.' },
  ],
  badges: ['NICEIC approved', 'Fully insured', '24/7 emergency call-outs', 'Part P registered', 'EV charger installer'],
  sections: [
    { type: 'hero' },
    { type: 'trust_bar' },
    { type: 'certifications' },
    { type: 'services' },
    { type: 'testimonials', optional: true },
    { type: 'contact' },
  ],
  stickyCallBar: false,
  photos: [
    { file: 'electrician-light-switches.jpg', alt: 'Sample photo: white light switches on a stone wall', hero: true, credit: { licence: 'Pexels License', photographer: 'Srattha Nualsate', page: 'https://www.pexels.com/photo/white-light-rocker-switches-on-gray-wall-12996907/' } },
    { file: 'electrician-kitchen-lights.jpg', alt: 'Sample photo: pendant lights over a kitchen island', hero: true, credit: { licence: 'Pexels License', photographer: 'Max Vakhtbovych', page: 'https://www.pexels.com/photo/modern-interior-of-spacious-minimalist-kitchen-6283972/' } },
    { file: 'electrician-socket-boxes.jpg', alt: 'Sample photo: new socket boxes with wiring ready to fit', hero: true, credit: { licence: 'Pexels License', photographer: 'La Miko', page: 'https://www.pexels.com/photo/holes-on-white-wall-with-electrical-wires-3615735/' } },
    { file: 'electrician-junction-wiring.jpg', alt: 'Sample photo: wiring in a junction box', hero: true, credit: { licence: 'Pexels License', photographer: 'Kindel Media', page: 'https://www.pexels.com/photo/close-up-photo-of-opened-switchboard-8488059/' } },
    { file: 'electrician-junction-box.jpg', alt: 'Sample photo: an open junction box during rewiring', credit: { licence: 'Pexels License', photographer: 'Kindel Media', page: 'https://www.pexels.com/photo/close-up-photo-of-opened-switchboard-8488029/' } },
    { file: 'electrician-fitting-sockets.jpg', alt: 'Sample photo: hands wiring a new socket', credit: { licence: 'Pexels License', photographer: 'Ksenia Chernaya', page: 'https://www.pexels.com/photo/an-electrician-using-pliers-to-repair-the-ac-power-plugs-and-sockets-5691588/' } },
    { file: 'electrician-socket-wiring.jpg', alt: 'Sample photo: an open socket box with wires', credit: { licence: 'Pexels License', photographer: 'Ksenia Chernaya', page: 'https://www.pexels.com/photo/power-socket-during-construction-on-building-5691642/' } },
    { file: 'electrician-consumer-unit.jpg', alt: 'Sample photo: an open consumer unit on a wall', credit: { licence: 'Pexels License', photographer: 'Ksenia Chernaya', page: 'https://www.pexels.com/photo/an-opened-switchbox-5767595/' } },
  ],
})

/** The /websites-for/ page: its own export, so the builder's code never carries it. */
export const electricianLanding: PackLanding = {
  title: 'Websites for electricians: live in 15 minutes, pay once',
  description: 'An electrician’s website with your registrations up front: NICEIC or NAPIT, Part P, EICRs and EV chargers ready to go. One payment, no subscription.',
  headline: 'Show you’re registered before they even ring',
  intro: [
    'With electrics, people want proof. Before they let anyone near the fuse board they look for the scheme logo, the insurance and a business that’s been around a while. Your site should put all of that where they see it first.',
    'Pick Electrician and you get a qualifications section high up the page, plus the jobs people search for most: fuse boards, rewires, EICRs, lighting and EV chargers. Change anything, add a few photos of tidy work, and you’re live.',
  ],
  needs: [
    { title: 'Your scheme, front and centre', text: 'NICEIC, NAPIT or ELECSA: whichever you belong to, say so near the top. It’s often the first thing a customer checks.' },
    { title: 'Part P and certificates', text: 'Homeowners are told to use a registered electrician for notifiable work. Mention that you certify your work and handle the building-control side.' },
    { title: 'Landlord EICRs', text: 'Landlords need an electrical safety report at least every five years. If you do them, list them: it’s steady, repeat work.' },
    { title: 'EV chargers', text: 'More people search for charger installers every month. If you fit them, give them their own service line.' },
    { title: 'Emergency call-outs', text: 'No power and a tripping switch is an emergency to the person on the other end. If you go out, say how quickly.' },
    { title: 'Photos of tidy work', text: 'A neat consumer unit or a well-run cable says “safe pair of hands” better than words can.' },
  ],
  faqs: [
    { q: 'Where do my NICEIC or NAPIT details go?', a: 'In your badges and your qualifications section, which sits high on an electrician’s page. Add the scheme you belong to, such as “NAPIT registered”, and a note like “Certificates available on request” if you want.' },
    { q: 'Can I list EICRs for landlords?', a: 'Yes. “Safety inspections” is already on your list; rename it “Landlord EICRs” or add it as its own service. You can list up to eight services.' },
    { q: 'I only do commercial work. Does it still fit?', a: 'Mostly, yes. Change the services and the top line to match, for example shop fit-outs, emergency lighting and testing. The wording we start you with is aimed at homeowners, so give it a read through.' },
    { q: 'Can I say I’m an approved EV charger installer?', a: 'Yes, if you are. The “EV charger installer” badge is there to add. Only add badges you can back up: we never add claims for you.' },
    { q: 'Do I need photos?', a: 'Not to go live. The builder fills empty spots with clearly marked sample pictures while you work, but those never appear on your published site: only photos you upload do. A neat consumer unit makes a good first one.' },
  ],
  examples: [
    { name: 'Brightwire Electrical', location: 'Manchester', about: 'Domestic electricians covering Greater Manchester. Rewires, fuse boards and EV chargers, done properly and certified every time.', years: '11', areas: ['Manchester', 'Salford', 'Stockport', 'Sale', 'Stretford'], theme: 'workwear', seed: 46802 },
    { name: 'Keane Electrical Services', location: 'Norwich', about: 'Testing, rewiring and landlord safety reports across Norfolk. Clear quotes, clean work and the paperwork sorted for you.', years: '14', areas: ['Norwich', 'Wymondham', 'Dereham', 'Aylsham', 'Great Yarmouth'], theme: 'clean-pro', seed: 57913 },
    { name: 'Hollis Electrics', location: 'Bath', about: 'I’m Sam, a local electrician who still answers his own phone. Small jobs welcome, from a new socket to a full rewire.', years: '7', areas: ['Bath', 'Keynsham', 'Bradford on Avon', 'Midsomer Norton'], theme: 'friendly-local', seed: 68024 },
  ],
}
