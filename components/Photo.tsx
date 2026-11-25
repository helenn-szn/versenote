import { photoUrl, type Photo as P } from "@/lib/photos";

export default function Photo({
  photo,
  width = 1200,
  className = "",
  priority = false,
}: {
  photo: P;
  width?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <figure className={`photo ${className}`} style={{ margin: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl(photo, width)}
        srcSet={`${photoUrl(photo, Math.round(width / 2))} ${Math.round(width / 2)}w, ${photoUrl(photo, width)} ${width}w`}
        sizes="(max-width: 860px) 100vw, 50vw"
        alt={photo.alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        style={{ objectPosition: photo.position ?? "center" }}
      />
    </figure>
  );
}
