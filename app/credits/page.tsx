import { PHOTOS } from "@/lib/photos";

export const metadata = { title: "Credits · VerseNote" };

export default function CreditsPage() {
  return (
    <div>
      <h1>Credits</h1>
      <h2 style={{ marginTop: "1.5rem" }}>Photography</h2>
      <p className="meta">Photos from Unsplash, used under the Unsplash License. Thank you to these photographers.</p>
      <div className="list">
        {Object.values(PHOTOS).map((p) => (
          <div key={p.id} className="card" style={{ margin: 0 }}>
            <div>{p.alt}{"place" in p && p.place ? ` (${p.place})` : ""}</div>
            <div className="meta">
              Photo by <a href={p.creditUrl} target="_blank" rel="noopener noreferrer">{p.credit}</a> on{" "}
              <a href={p.page} target="_blank" rel="noopener noreferrer">Unsplash</a>
            </div>
          </div>
        ))}
      </div>
      <h2 style={{ marginTop: "1.5rem" }}>Scripture</h2>
      <p className="meta">
        King James Version (KJV), Berean Standard Bible (BSB) and World English Bible (WEB), all in the public domain,
        served by bible-api.com.
      </p>
      <h2 style={{ marginTop: "1.5rem" }}>Illustrations and logo</h2>
      <p className="meta">Sermon illustrations and the VerseNote logo were designed for this project.</p>
    </div>
  );
}
