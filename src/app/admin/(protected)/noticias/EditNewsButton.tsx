"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type NewsStatus = "published" | "scheduled" | "draft";

type Props = {
  noticia: {
    id: string;
    title: string;
    slug: string;
    summary: string;
    content: string;
    image_url?: string | null;
    status?: NewsStatus | null;
    published_at?: string | null;
    expires_at?: string | null;
  };
};

function toISOStringFromLocal(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export default function EditNewsButton({ noticia }: Props) {
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState(noticia.title);
  const [slug, setSlug] = useState(noticia.slug);
  const [summary, setSummary] = useState(noticia.summary);
  const [content, setContent] = useState(noticia.content);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<NewsStatus>(
    noticia.status || "published"
  );
  const [publishedAt, setPublishedAt] = useState(
    toDateTimeLocalValue(noticia.published_at)
  );
  const [expiresAt, setExpiresAt] = useState(
    toDateTimeLocalValue(noticia.expires_at)
  );

  function handleStatusChange(nextStatus: NewsStatus) {
    setStatus(nextStatus);

    if (nextStatus === "published" || nextStatus === "draft") {
      setPublishedAt("");
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();

    if (status === "scheduled" && !publishedAt) {
      alert("Selecciona la fecha de publicación.");
      return;
    }

    const normalizedPublishedAt =
      status === "draft"
        ? null
        : status === "published"
          ? toISOStringFromLocal(publishedAt) || new Date().toISOString()
          : toISOStringFromLocal(publishedAt);

    let imageUrl = noticia.image_url || null;

    if (imageFile) {
      const imagePath = `news/${Date.now()}-${imageFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("news-images")
        .upload(imagePath, imageFile);

      if (uploadError) {
        alert("Error al subir la imagen");
        console.error(uploadError);
        return;
      }

      const { data } = supabase.storage
        .from("news-images")
        .getPublicUrl(imagePath);

      imageUrl = data.publicUrl;
    }

    const { error } = await supabase
      .from("news")
      .update({
        title,
        slug,
        summary,
        content,
        image_url: imageUrl,
        status,
        published_at: normalizedPublishedAt,
        expires_at: status === "draft" ? null : toISOStringFromLocal(expiresAt),
      })
      .eq("id", noticia.id);

    if (error) {
      alert("Error al actualizar");
      console.error(error);
      return;
    }

    alert("Noticia actualizada");
    setImageFile(null);
    setOpen(false);
    window.location.reload();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-2 bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-600 mr-2"
      >
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Editar noticia</h2>

            <form onSubmit={handleUpdate} className="space-y-3">
              {noticia.image_url && (
                <div className="relative h-40 w-full overflow-hidden rounded">
                  <Image
                    src={noticia.image_url}
                    alt={noticia.title}
                    fill
                    sizes="512px"
                    className="object-cover"
                  />
                </div>
              )}

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border p-2 rounded"
              />

              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full border p-2 rounded"
              />

              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full border p-2 rounded"
              />

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border p-2 rounded"
                rows={4}
              />

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full border p-2 rounded"
              />

              <select
                value={status}
                onChange={(e) =>
                  handleStatusChange(e.target.value as NewsStatus)
                }
                className="w-full border p-2 rounded"
              >
                <option value="published">Publicada</option>
                <option value="scheduled">Programada</option>
                <option value="draft">Borrador</option>
              </select>

              {status === "scheduled" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Fecha de publicación
                    </label>
                    <input
                      type="datetime-local"
                      value={publishedAt}
                      onChange={(e) => setPublishedAt(e.target.value)}
                      required
                      className="w-full border p-2 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Fecha de vencimiento
                    </label>
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full border p-2 rounded"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  Guardar
                </button>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
