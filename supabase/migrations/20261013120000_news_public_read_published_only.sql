-- Noticias: el público solo puede leer las publicadas y no vencidas (R3).
--
-- Antes la política de lectura era `using (true)`: cualquiera con la clave
-- pública podía leer por la API borradores, noticias programadas a futuro y
-- noticias vencidas; el filtro existía solo en la app.
--
-- Regla pública (anon y authenticated), igual a la que aplican las páginas:
--   * no vencida: expires_at is null or expires_at > now()   (/noticias)
--   * y publicada: status = 'published'                       (/noticias)
--     o programada cuya hora ya llegó: status = 'scheduled'
--     and published_at <= now()                               (portada, src/app/page.tsx)
-- Los administradores conservan la lectura de todo con una política propia
-- (hasta ahora dependían de la política pública `true`).

drop policy if exists "Permitir lectura publica de noticias" on public.news;

create policy "Public can read published news"
  on public.news
  as permissive
  for select
  to anon, authenticated
  using (
    (expires_at is null or expires_at > now())
    and (
      status = 'published'
      or (status = 'scheduled' and published_at is not null and published_at <= now())
    )
  );

create policy "Admins can read all news"
  on public.news
  as permissive
  for select
  to authenticated
  using (public.is_admin());
