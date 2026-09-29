import { z } from 'zod'
import { heroSpecSchema } from './schema'
import { aboutSchema } from './sections/about'
import type { AboutSpec } from './sections/about'
import { areasSchema } from './sections/areas'
import type { AreasSpec } from './sections/areas'
import { certificationsSchema } from './sections/certifications'
import type { CertificationsSpec } from './sections/certifications'
import { contactSchema } from './sections/contact'
import type { ContactSpec } from './sections/contact'
import { footerSchema } from './sections/footer'
import type { FooterSpec } from './sections/footer'
import { gallerySchema } from './sections/gallery'
import type { GallerySpec } from './sections/gallery'
import { servicesSchema } from './sections/services'
import type { ServicesSpec } from './sections/services'
import { testimonialsSchema } from './sections/testimonials'
import type { TestimonialsSpec } from './sections/testimonials'
import { trustBarSchema } from './sections/trustBar'
import type { TrustBarSpec } from './sections/trustBar'
import { whyUsSchema } from './sections/whyUs'
import type { WhyUsSpec } from './sections/whyUs'
import type { HeroSpec } from './schema'

/** The spec type for each section. */
export interface SectionSpecs {
  hero: HeroSpec
  trust_bar: TrustBarSpec
  services: ServicesSpec
  about: AboutSpec
  why_us: WhyUsSpec
  gallery: GallerySpec
  certifications: CertificationsSpec
  testimonials: TestimonialsSpec
  areas: AreasSpec
  contact: ContactSpec
  footer: FooterSpec
}

/** Stored-spec schemas, by section. Every string is an enum and every number bounded. */
export const sectionSchemas = {
  hero: heroSpecSchema,
  trust_bar: trustBarSchema,
  services: servicesSchema,
  about: aboutSchema,
  why_us: whyUsSchema,
  gallery: gallerySchema,
  certifications: certificationsSchema,
  testimonials: testimonialsSchema,
  areas: areasSchema,
  contact: contactSchema,
  footer: footerSchema,
} satisfies { [K in keyof SectionSpecs]: z.ZodType<SectionSpecs[K]> }

const seed = z.number().int().min(0).max(0xffffffff)
const generated = <S extends z.ZodType>(spec: S) => z.object({ seed, spec, preferred: spec.optional() }).strict()

/** How the site record stores generated sections: batch seed, resolved spec, and the customer's own pick if a repair replaced it. */
export const generatedSectionsSchema = z.object({
  hero: generated(heroSpecSchema).optional(),
  trust_bar: generated(trustBarSchema).optional(),
  services: generated(servicesSchema).optional(),
  about: generated(aboutSchema).optional(),
  why_us: generated(whyUsSchema).optional(),
  gallery: generated(gallerySchema).optional(),
  certifications: generated(certificationsSchema).optional(),
  testimonials: generated(testimonialsSchema).optional(),
  areas: generated(areasSchema).optional(),
  contact: generated(contactSchema).optional(),
  footer: generated(footerSchema).optional(),
}).strict()
export type GeneratedSections = z.infer<typeof generatedSectionsSchema>
