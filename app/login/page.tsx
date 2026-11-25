import { Suspense } from "react";
import LoginForm from "./LoginForm";
import Photo from "@/components/Photo";
import { PHOTOS } from "@/lib/photos";

export default function LoginPage() {
  return (
    <div className="bleed">
      <div className="wide login-grid">
        <Suspense>
          <LoginForm />
        </Suspense>
        <div className="login-photo">
          <Photo photo={PHOTOS.womenPraying} width={900} />
        </div>
      </div>
    </div>
  );
}
