-- Fase 1 · Migración 2 de 2 (CIERRE). Aplicar SOLO DESPUÉS de desplegar el
-- código que inscribe con service_role (registerForEvent) y confirma por correo.
--
-- 1) Elimina el INSERT público: desde ahora solo el servidor (service_role)
--    crea inscripciones, siempre como 'pending' con token de confirmación.
drop policy if exists "Public can register for open events" on public.event_registrations;

-- 2) Las filas 'pending' SIN token solo pudo crearlas el código anterior
--    (insertaba directo, sin confirmación) entre la migración 1 y el
--    despliegue. Esas personas nunca recibirán un enlace, así que se
--    respeta el comportamiento con el que se inscribieron: quedan confirmadas.
update public.event_registrations
  set status = 'confirmed',
      confirmed_at = coalesce(confirmed_at, created_at)
  where status = 'pending'
    and confirmation_token_hash is null;
