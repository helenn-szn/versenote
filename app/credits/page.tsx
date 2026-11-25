import { PHOTOS } from "@/lib/photos";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/config";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t.credits.title} · VerseNote` };
}

// Every Bible in VerseNote, with its licence. Open-licence texts are credited as their licences ask.
const BIBLES = [
  { name: "King James Version (KJV)", licence: "Public domain", via: "bible-api.com" },
  { name: "Berean Standard Bible (BSB)", licence: "Public domain", via: "bible-api.com" },
  { name: "World English Bible (WEB)", licence: "Public domain", via: "bible-api.com" },
  { name: "Louis Segond 1910 (LSG), Français", licence: "Public domain", via: "midvash/bible-data" },
  { name: "Reina-Valera 1909 (RV1909), Español", licence: "Public domain", via: "seven1m/open-bibles" },
  {
    name: "Bíblia Livre (BLIVRE), Português",
    licence:
      "Bíblia Livre, Copyright © 2018 Diego Santos, Mario Sérgio e Marco Teles. Creative Commons Atribuição 4.0 Brasil (CC BY 4.0 BR)",
    via: "midvash/bible-data",
  },
  {
    name: "Kiswahili Contemporary Version (SWC), Kiswahili",
    licence: "Biblica® Toleo Wazi Neno: Bibilia Takatifu™, Copyright © Biblica, Inc. Creative Commons Attribution-ShareAlike 4.0",
    via: "eBible.org (BibleNLP/ebible)",
  },
  { name: "개역한글 Korean Revised Version (KRV), 한국어", licence: "Public domain", via: "seven1m/open-bibles" },
  { name: "和合本 Chinese Union Version, Simplified (CUVS), 中文", licence: "Public domain", via: "midvash/bible-data" },
];

export default async function CreditsPage() {
  const { t } = await getI18n();
  const C = t.credits;
  return (
    <div>
      <h1>{C.title}</h1>
      <h2 style={{ marginTop: "1.5rem" }}>{C.scripture}</h2>
      <p className="meta">{C.scriptureNote}</p>
      <div className="list">
        {BIBLES.map((b) => (
          <div key={b.name} className="card" style={{ margin: 0 }}>
            <div>{b.name}</div>
            <div className="meta">
              {b.licence} · {b.via}
            </div>
          </div>
        ))}
      </div>
      <h2 style={{ marginTop: "1.5rem" }}>{C.photos}</h2>
      <p className="meta">{C.photosNote}</p>
      <div className="list">
        {Object.values(PHOTOS).map((p) => {
          const [before, mid = "", after = ""] = fmt(C.photoBy, { name: "\u0000", site: "\u0001" }).split(/[\u0000\u0001]/);
          const nameFirst = C.photoBy.indexOf("{name}") < C.photoBy.indexOf("{site}");
          const name = <a href={p.creditUrl} target="_blank" rel="noopener noreferrer">{p.credit}</a>;
          const site = <a href={p.page} target="_blank" rel="noopener noreferrer">Unsplash</a>;
          return (
            <div key={p.id} className="card" style={{ margin: 0 }}>
              <div>
                {p.alt}
                {"place" in p && p.place ? ` (${p.place})` : ""}
              </div>
              <div className="meta">
                {before}
                {nameFirst ? name : site}
                {mid}
                {nameFirst ? site : name}
                {after}
              </div>
            </div>
          );
        })}
      </div>
      <h2 style={{ marginTop: "1.5rem" }}>{C.illus}</h2>
      <p className="meta">{C.illusNote}</p>
    </div>
  );
}
