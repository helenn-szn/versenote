// Free photos from Unsplash (Unsplash License: free to use, credit appreciated),
// chosen to show the church around the world: Thailand, South Africa, Italy,
// Nigeria, New Zealand, Canada and more.
// To swap a photo, replace its `id` with another Unsplash image id and update the credit.
export type Photo = {
  id: string; // path after images.unsplash.com/, e.g. "photo-1593678820334-91d5f99be314"
  alt: string;
  credit: string;
  creditUrl: string;
  page: string;
  place?: string;
  position?: string; // CSS object-position
};

const utm = "?utm_source=versenote&utm_medium=referral";

export const PHOTOS = {
  prayerCircle: {
    id: "photo-1763355873417-1e0926397851",
    alt: "A church family gathered around one woman, praying for her",
    credit: "Amonwat Dumkrut",
    creditUrl: `https://unsplash.com/@amonwatdumkrut${utm}`,
    page: `https://unsplash.com/photos/4QtdAWmarsw${utm}`,
    place: "Bangkok, Thailand",
  },
  reader: {
    id: "photo-1529070538774-1843cb3265df",
    alt: "A woman reading her Bible during a church service",
    credit: "Sincerely Media",
    creditUrl: `https://unsplash.com/@sincerelymedia${utm}`,
    page: `https://unsplash.com/photos/dGxOgeXAXm8${utm}`,
    place: "Port Elizabeth, South Africa",
  },
  homily: {
    id: "photo-1604443830970-05ac4193ada9",
    alt: "A priest giving a homily to his congregation",
    credit: "Gabriella Clare Marino",
    creditUrl: `https://unsplash.com/@gabiontheroad${utm}`,
    page: `https://unsplash.com/photos/86CwOQlFAzo${utm}`,
    place: "Italy",
  },
  congregation: {
    id: "photo-1653133672754-82025e7e9074",
    alt: "A congregation worshipping together in a church",
    credit: "Sophie Spree",
    creditUrl: `https://unsplash.com/@sophiespree${utm}`,
    page: `https://unsplash.com/photos/9zJcrli2WCU${utm}`,
  },
  choir: {
    id: "photo-1593678820334-91d5f99be314",
    alt: "A church choir singing during a service",
    credit: "John Onaeko",
    creditUrl: `https://unsplash.com/@iyinoluwaonaeko${utm}`,
    page: `https://unsplash.com/photos/8__esxuic9Q${utm}`,
    place: "Ibadan, Nigeria",
    position: "center 35%",
  },
  worship: {
    id: "photo-1665397858118-1a66a692407c",
    alt: "A worship leader on stage with a congregation",
    credit: "Steven Biak Ling",
    creditUrl: `https://unsplash.com/@sb_ling${utm}`,
    page: `https://unsplash.com/photos/DX4PmOA4c7A${utm}`,
    place: "New Zealand",
  },
  womenPraying: {
    id: "photo-1555817132-c5ec1afbd2a0",
    alt: "Three women praying together with open hands",
    credit: "Priscilla Du Preez",
    creditUrl: `https://unsplash.com/@priscilladupreez${utm}`,
    page: `https://unsplash.com/photos/qwPACFMqhPg${utm}`,
    place: "Canada",
  },
  smallGroup: {
    id: "photo-1729089049653-24312fdca908",
    alt: "A small group praying together",
    credit: "Ziph",
    creditUrl: `https://unsplash.com/@sheen_xcllnt${utm}`,
    page: `https://unsplash.com/photos/ANnH4uqKrSI${utm}`,
  },
  phoneWorship: {
    id: "photo-1625779661071-6efd5ae231be",
    alt: "Someone holding up a phone during a worship service",
    credit: "Morgan Lane",
    creditUrl: `https://unsplash.com/@themorganlane${utm}`,
    page: `https://unsplash.com/photos/qQKVYcPFJVo${utm}`,
  },
  phoneBible: {
    id: "photo-1587517495424-978e0364ae20",
    alt: "A phone resting on an open Bible",
    credit: "Nicolas Lobos",
    creditUrl: `https://unsplash.com/@lobosnico${utm}`,
    page: `https://unsplash.com/photos/rHwMkuJD6GM${utm}`,
    place: "Argentina",
  },
  bibleCoffee: {
    id: "photo-1569503169334-e72c72ea5ed1",
    alt: "An open Bible beside a cup of coffee and a phone",
    credit: "Sixteen Miles Out",
    creditUrl: `https://unsplash.com/@sixteenmilesout${utm}`,
    page: `https://unsplash.com/photos/nhIN7moxdU4${utm}`,
  },
} satisfies Record<string, Photo>;

export function photoUrl(p: Photo, width = 1200): string {
  return `https://images.unsplash.com/${p.id}?auto=format&fit=crop&w=${width}&q=70`;
}
