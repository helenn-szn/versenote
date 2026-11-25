import { Suspense } from "react";
import LoginForm from "./LoginForm";
import Photo from "@/components/Photo";
import { PHOTOS } from "@/lib/photos";

export default function LoginPage() {
  return (
    <div className="bleed auth-page">
      <div className="auth-grid">
        <div className="auth-left">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        <aside className="auth-visual" aria-hidden>
          <Photo photo={PHOTOS.worship} width={1200} priority />
          <div className="auth-overlay" />
          <div className="auth-float verse">
            <div className="ref">
              Psalm 119:105 <small>KJV</small>
            </div>
            <div className="text">Thy word is a lamp unto my feet, and a light unto my path.</div>
          </div>
          <div className="auth-float chip">
            <span className="dot" /> 128 joined this Sunday
          </div>
          <div className="auth-quote">
            <h2>
              Never miss a word while searching for the <em>Word.</em>
            </h2>
            <p>Sermon notes with the scripture built in, for churches all over the world.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
