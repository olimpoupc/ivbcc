-- Inscripciones a eventos: solo se permiten si el evento está abierto.
--
-- Antes la política de INSERT era `with check (true)`: cualquiera con la
-- clave pública podía inscribirse a un evento en borrador, con inscripciones
-- cerradas o que ya ocurrió (el formulario solo se ocultaba en la página).
-- Ahora la base exige que el evento:
--   * esté publicado (status = 'published'),
--   * tenga las inscripciones abiertas (registration_enabled = true),
--   * no haya empezado todavía (event_date > now()).
--
-- La subconsulta corre con los permisos de quien inserta; funciona porque
-- la política "Public can read published events" ya deja leer los eventos
-- publicados a anon y authenticated, y solo esos pueden pasar la regla.
-- No se cambian permisos (grants) ni otras políticas.

drop policy if exists "Public can create event registrations" on public.event_registrations;

create policy "Public can register for open events"
  on public.event_registrations
  as permissive
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.events e
      where e.id = event_registrations.event_id
        and e.status = 'published'
        and e.registration_enabled = true
        and e.event_date > now()
    )
  );
