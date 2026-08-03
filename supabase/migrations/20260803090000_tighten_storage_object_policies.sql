-- storage.objects had the same "to authenticated" gap just closed on the
-- regular tables: any signed-up member (not just admins) could upload files
-- straight to the news-images bucket via the Storage API, bypassing every
-- admin-only upload form in the app. The bucket is shared across noticias,
-- eventos, formacion, publicaciones, donaciones and the site logo, so this
-- covers all of them at once.
--
-- There was also no update/delete policy at all for this bucket, so the
-- admin's own "remove old file" calls (e.g. SiteSettingsForm.tsx replacing
-- the site logo) were silently failing under RLS — the error gets logged to
-- the console but never blocks the save, so old files were piling up
-- unnoticed. Adding admin-scoped update/delete policies fixes that too.

drop policy "Permitir subir imagenes de noticias" on "storage"."objects";

create policy "Admins can upload images"
  on "storage"."objects" as permissive for insert to authenticated
  with check (bucket_id = 'news-images' and public.is_admin());

create policy "Admins can update images"
  on "storage"."objects" as permissive for update to authenticated
  using (bucket_id = 'news-images' and public.is_admin())
  with check (bucket_id = 'news-images' and public.is_admin());

create policy "Admins can delete images"
  on "storage"."objects" as permissive for delete to authenticated
  using (bucket_id = 'news-images' and public.is_admin());
