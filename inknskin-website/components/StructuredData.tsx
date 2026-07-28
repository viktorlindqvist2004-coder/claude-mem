import { contact, site } from "@/lib/site";
import { REVIEWS_VERIFIED, averageRating, reviewCount } from "@/lib/reviews";

/**
 * schema.org TattooParlor. aggregateRating emitted only once the reviews in
 * lib/reviews.ts have been replaced with verified ones — publishing a rating
 * built from placeholder copy would be false advertising.
 */
export default function StructuredData() {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TattooParlor",
    name: site.name,
    legalName: site.legalName,
    description: site.description,
    url: site.url,
    image: `${site.url}/og.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.street,
      postalCode: contact.postal,
      addressLocality: contact.city,
      addressCountry: "SE",
    },
    areaServed: "Trollhättan",
    priceRange: "$$",
    sameAs: [contact.instagram, contact.tiktok],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "12:00",
        closes: "16:30",
      },
    ],
  };

  if (contact.phone) data.telephone = contact.phone;
  if (contact.email) data.email = contact.email;

  if (REVIEWS_VERIFIED) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: averageRating,
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
