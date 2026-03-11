"use client";

import { useRef, useState } from "react";
import Image from "next/image";

type ProductImagesFieldProps = {
  name: string;
  defaultValue?: string;
  placeholder: string;
  rows?: number;
  className: string;
};

function parseImageLines(raw: string): Array<{ url: string; alt: string }> {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [urlPart, altPart] = line.split("|");
      return {
        url: urlPart.trim(),
        alt: altPart?.trim() || "Product image",
      };
    })
    .filter((image) => image.url.length > 0);
}

function appendLines(existing: string, nextLines: string[]): string {
  const trimmed = existing.trim();
  const next = nextLines.join("\n");

  if (!trimmed) {
    return next;
  }

  return `${trimmed}\n${next}`;
}

export function ProductImagesField({
  name,
  defaultValue = "",
  placeholder,
  rows = 4,
  className,
}: ProductImagesFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previews = parseImageLines(value);

  async function uploadSelectedFiles() {
    const files = inputRef.current?.files;
    if (!files?.length) {
      setError("Choose one or more images first.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (const file of Array.from(files)) {
        formData.append("files", file);
      }

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        error?: string;
        files?: Array<{ url: string }>;
      };

      if (!response.ok || !data.files?.length) {
        throw new Error(data.error || "Upload failed.");
      }

      const uploadedFiles = data.files;
      setValue((current) =>
        appendLines(
          current,
          uploadedFiles.map((file) => file.url),
        ),
      );

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="md:col-span-2">
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-300 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="block text-sm text-stone-700 file:mr-4 file:rounded-full file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-stone-100 hover:file:bg-stone-700"
          />
          <button
            type="button"
            onClick={uploadSelectedFiles}
            disabled={isUploading}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? "Uploading..." : "Upload selected images"}
          </button>
        </div>

        <textarea
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={className}
        />

        <p className="text-xs text-stone-600">
          Uploaded files are appended here automatically. You can still paste
          external image URLs manually.
        </p>

        {previews.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {previews.map((image, index) => (
              <div
                key={`${image.url}-${index}`}
                className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, 240px"
                    className="object-cover"
                  />
                </div>
                <div className="border-t border-stone-200 px-3 py-2 text-xs text-stone-700">
                  Image {index + 1}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
