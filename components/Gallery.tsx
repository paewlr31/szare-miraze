"use client";

import { useEffect, useRef, useState } from "react";
import { photoSrc, type Photo } from "@/lib/photos";

export function Gallery({
  photos,
  layout = "bento",
}: {
  photos: Photo[];
  layout?: "bento" | "strip";
}) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const current = index === null ? null : photos[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index === null) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        setIndex((value) => (value === null ? value : (value + 1) % photos.length));
      }
      if (event.key === "ArrowLeft") {
        setIndex((value) => (value === null ? value : (value - 1 + photos.length) % photos.length));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length]);

  return (
    <>
      <div className={layout === "strip" ? "garden-grid" : "gallery-grid"}>
        {photos.map((photo, photoIndex) => (
          <button
            key={photo.file}
            type="button"
            className={photo.wide && layout === "bento" ? "shot is-wide" : "shot"}
            onClick={() => setIndex(photoIndex)}
          >
            <img src={photoSrc(photo.file)} alt={photo.alt} />
            <span>{photo.alt}</span>
          </button>
        ))}
      </div>
      <dialog
        ref={dialogRef}
        className="lightbox"
        onClose={() => setIndex(null)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setIndex(null);
        }}
      >
        {current ? (
          <div className="lightbox-frame">
            <img src={photoSrc(current.file)} alt={current.alt} />
            <p>{current.alt}</p>
            <div className="lightbox-actions">
              <button type="button" onClick={() => setIndex((value) => (value === null ? value : (value - 1 + photos.length) % photos.length))}>
                Poprzednie
              </button>
              <button type="button" onClick={() => setIndex(null)}>
                Zamknij
              </button>
              <button type="button" onClick={() => setIndex((value) => (value === null ? value : (value + 1) % photos.length))}>
                Następne
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
