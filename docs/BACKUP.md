# Backups de la base de datos a S3

## Qué hace el workflow

`.github/workflows/backup.yml` corre todos los días a las **08:00 UTC (03:00 hora Colombia)** y también se puede disparar manualmente desde la pestaña *Actions* (`workflow_dispatch`). En cada corrida:

1. Instala la CLI de Supabase (`supabase/setup-cli@v1`, versión fijada `2.117.0`, la misma que usa `ci.yml`).
2. Configura las credenciales de AWS con `aws-actions/configure-aws-credentials`.
3. Hace el dump de la base remota con el procedimiento oficial de Supabase CLI, en **3 archivos separados** (roles, esquema, datos):
   ```bash
   supabase db dump --db-url "$SUPABASE_DB_URL" -f dump/roles.sql  --role-only
   supabase db dump --db-url "$SUPABASE_DB_URL" -f dump/schema.sql
   supabase db dump --db-url "$SUPABASE_DB_URL" -f dump/data.sql   --data-only --use-copy
   ```
   (Referencia: [Supabase CLI — `db dump`](https://supabase.com/docs/reference/cli/supabase-db-dump)). `--use-copy` hace que `data.sql` use sentencias `COPY` en vez de un `INSERT` por fila, mucho más rápido de generar y de restaurar.
4. Empaqueta los 3 archivos en un único `.tar.gz` con fecha y hora UTC en el nombre, por ejemplo:
   ```
   ivbcc-db-backup-20260925-080012Z.tar.gz
   ```
5. Sube ese archivo a S3 con `aws s3 cp` al bucket configurado en el secret `S3_BUCKET`.
6. Borra los archivos de dump y el `.tar.gz` del runner (paso `Limpiar archivos locales`, corre siempre con `if: always()`, incluso si un paso anterior falla).

## Dónde quedan las copias

En el bucket de S3 indicado por el secret `S3_BUCKET`, región `AWS_REGION` (`us-east-2`), en la raíz del bucket, un objeto por día con el nombre `ivbcc-db-backup-<AAAAMMDD>-<HHMMSS>Z.tar.gz`.

## Retención (30 días)

La retención **no la controla este workflow**: es una regla de ciclo de vida (*lifecycle rule*) ya configurada directamente en el bucket de S3, que expira (borra) los objetos 30 días después de su creación. Si el bucket o la regla cambian, este documento hay que actualizarlo, pero el workflow en sí no necesita ningún cambio porque no gestiona el borrado.

## Secrets que usa

| Secret | Uso |
|---|---|
| `SUPABASE_DB_URL` | Cadena de conexión del **session pooler** (puerto 5432) del proyecto Supabase. **Debe ser el session pooler, no el transaction pooler (6543)**: `pg_dump`/`pg_dumpall` necesitan *prepared statements*, que el transaction pooler no soporta. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credenciales del usuario IAM dedicado a este workflow. Ese usuario **solo tiene `s3:PutObject` sobre el bucket de backups** (principio de mínimo privilegio: ni siquiera puede leer o borrar objetos). |
| `AWS_REGION` | `us-east-2`. |
| `S3_BUCKET` | Nombre del bucket destino. |

Ningún secreto se imprime en los logs: el job usa `set -euo pipefail` (para que cualquier error corte la ejecución en vez de seguir en un estado a medias) y nunca hace `echo`/`set -x` de las variables de entorno que los contienen. GitHub Actions además enmascara automáticamente en los logs cualquier valor que coincida exactamente con un secret registrado del repositorio.

## Nota sobre `roles.sql`

`roles.sql` contiene sentencias `CREATE ROLE`/`ALTER ROLE`. Si en algún momento el proyecto crea roles de Postgres personalizados con contraseña propia (distinto de los roles gestionados por Supabase: `anon`, `authenticated`, `service_role`, etc.), ese archivo podría incluir su hash. Por eso viaja siempre dentro del `.tar.gz` en un bucket privado con acceso restringido, nunca en texto plano fuera de S3.

---

## Procedimiento para restaurar un backup en Supabase local (Docker)

Esto se usa para **verificar** que un backup es restaurable, o para recuperar datos en un entorno de prueba — nunca se restaura directamente sobre el proyecto remoto de producción sin una razón explícita y coordinada.

### 1. Descargar y descomprimir el backup

```bash
aws s3 cp s3://<bucket>/ivbcc-db-backup-<fecha>.tar.gz .
tar -xzf ivbcc-db-backup-<fecha>.tar.gz
# queda: roles.sql  schema.sql  data.sql
```

### 2. Levantar el stack local de Supabase

Desde la raíz del repo (ya trae `supabase/config.toml` y las migraciones en `supabase/migrations/`):

```bash
supabase start
```

Al terminar, `supabase status` muestra las URLs locales. La cadena de conexión de Postgres local por defecto es:

```
postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

> Si el stack local ya tenía datos de una corrida anterior y se quiere partir de una base limpia antes de restaurar, usar `supabase db reset` primero (esto vuelve a aplicar solo las migraciones del repo, no el backup).

### 3. Restaurar los 3 archivos, en orden (roles → esquema → datos)

```bash
LOCAL_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

psql --single-transaction --variable ON_ERROR_STOP=1 --file roles.sql  "$LOCAL_DB_URL"
psql --single-transaction --variable ON_ERROR_STOP=1 --file schema.sql "$LOCAL_DB_URL"
psql --single-transaction --variable ON_ERROR_STOP=1 --file data.sql   "$LOCAL_DB_URL"
```

`--single-transaction` hace que cada archivo se aplique todo o nada (si algo falla a mitad de camino, no deja el esquema/datos a medias); `--variable ON_ERROR_STOP=1` corta la ejecución en el primer error en vez de seguir e imprimir más errores encadenados. El orden importa: los roles deben existir antes de aplicar el esquema (que les asigna `GRANT`s), y el esquema debe existir antes de insertar datos.

### 4. Verificar el conteo de filas de las tablas principales

```bash
psql "$LOCAL_DB_URL" -c "
select 'profiles' as tabla, count(*) from public.profiles
union all select 'courses', count(*) from public.courses
union all select 'course_enrollments', count(*) from public.course_enrollments
union all select 'events', count(*) from public.events
union all select 'event_registrations', count(*) from public.event_registrations
union all select 'news', count(*) from public.news
union all select 'publications', count(*) from public.publications
union all select 'contact_messages', count(*) from public.contact_messages
union all select 'quiz_attempts', count(*) from public.quiz_attempts
union all select 'course_certificates', count(*) from public.course_certificates
order by 1;
"
```

Comparar esos conteos contra los del proyecto remoto (por ejemplo con `supabase db query --linked "select count(*) from public.<tabla>;"`) para confirmar que el backup restaurado tiene el mismo volumen de datos que el origen al momento del dump. Una tabla en 0 cuando en remoto tiene filas, o un error de restauración en alguno de los 3 archivos, indica que ese backup no es utilizable y hay que investigar (revisar los logs del run de `backup.yml` de esa fecha) antes de confiar en él.

### 5. Limpiar el entorno local

```bash
supabase stop
```

(`supabase stop --no-backup` si además se quiere descartar el volumen de Docker con los datos restaurados).
