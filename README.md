# IVBCC — Sistema Web Institucional

Plataforma web institucional de la Iglesia **Valle de Bendición Cruzada Cristiana**, desarrollada como trabajo de grado para la Especialización en Ingeniería de Software.

Centraliza desde un panel administrativo todo lo que antes se manejaba de forma manual: publicaciones por WhatsApp, anuncios en Facebook, avisos físicos, etc.

---

## 1. Arquitectura

**Frontend:** Next.js (App Router) + React + TypeScript + Tailwind CSS, con Server Components por defecto y Client Components solo donde se necesita interactividad (formularios, modales, botones).

**Backend:** no hay servidor propio (Express/NestJS). El proyecto usa **Supabase** como *Backend as a Service*: base de datos PostgreSQL, autenticación, Storage, políticas de seguridad (RLS) y API REST/Realtime generadas automáticamente.

**Base de datos:** PostgreSQL administrado por Supabase.

**Hosting:** Vercel (frontend) + Supabase (base de datos y storage). Repositorio en GitHub.

```
Usuario → Next.js (Server/Client Components) → Supabase Client SDK
        → API REST de Supabase → PostgreSQL / Storage → respuesta → UI
```

### ¿Dónde está el backend?

> El proyecto usa una arquitectura *Backend as a Service* (BaaS). No hay un backend tradicional construido con Express o NestJS: Supabase provee PostgreSQL, autenticación, almacenamiento, políticas RLS y API REST/Realtime autogeneradas, que el frontend consume mediante el SDK oficial (`@supabase/supabase-js`, `@supabase/ssr`).

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript + Tailwind CSS v4 |
| Backend/DB | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Hosting | Vercel |
| Control de versiones | Git + GitHub |

Dependencias principales (`package.json`): `next`, `react`, `react-dom`, `@supabase/supabase-js`, `@supabase/ssr`, `typescript`, `tailwindcss`, `eslint`.

---

## 3. Estructura del proyecto

```
src/
  app/            Rutas públicas y administrativas (App Router)
    admin/
      (protected)/  Panel administrativo (noticias, eventos, formación,
                     publicaciones, en-vivo, certificados, contacto,
                     centro-ayuda, donaciones, configuración, inscripciones)
  components/
    admin/        Primitivas del panel (AdminPageShell, AdminSection,
                   AdminPanelCard, AdminMetricCard, AdminStatusBadge,
                   AdminTable, AdminQuickAction, etc.)
    analytics/    Google Analytics y tracking de enlaces
    certificates/ Vista de certificado verificable
    help-center/  Widget del Centro de Ayuda
    home/         Carrusel de contenido de inicio
    media/        Embed de YouTube
    publications/ Preview de video en publicaciones
    ui/           Componentes de UI compartidos (formularios, countdown, share)
  lib/            supabase.ts, supabase-server.ts, site-settings.ts,
                  certificates.ts, course-progress.ts, security.ts, seo.ts, analytics.ts
```

Patrones usados: componentes reutilizables por dominio, layouts compartidos (`app/layout.tsx`, `admin/layout.tsx`, `admin/(protected)/layout.tsx`), Server Components para lectura de datos públicos, Client Components solo para interacción, y CRUD consistente por módulo dentro de `admin/(protected)`.

---

## 4. Módulos

**Públicos:** Inicio, Noticias, Eventos, Formación (cursos, lecciones, quizzes, certificados), Publicaciones, Donaciones, Contacto, En Vivo, Centro de Ayuda, Mis Cursos, Perfil.

**Administrador:** Dashboard, Noticias, Eventos, Formación, Publicaciones, En Vivo, Certificados, Inscripciones, Contacto, Centro de Ayuda, Donaciones, Configuración.

---

## 5. Base de datos (tablas usadas por la app)

```
profiles, news, events, publications, courses, lessons,
quizzes, quiz_questions, quiz_options, quiz_attempts,
course_enrollments, course_certificates, event_registrations,
contact_messages, contact_message_replies, donation_methods, live_streams,
help_center_items, site_settings
```

Seguridad vía Supabase Auth + Row Level Security (roles administrador/usuario).

---

## 6. Ejecutar el proyecto localmente

**Requisitos:** Git, Node.js LTS, un editor (VS Code recomendado).

```bash
git clone https://github.com/olimpoupc/ivbcc.git
cd ivbcc
npm install
```

Crear `.env.local` en la raíz con las variables del proyecto de Supabase (**Project Settings → API**). Nunca se deben subir al repositorio:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Opcionales
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=google-site-verification-token

# Envío de respuestas de contacto (Resend)
RESEND_API_KEY=
CONTACT_FROM_EMAIL="IVBCC <contacto@tu-dominio.com>"
CONTACT_REPLY_TO_EMAIL=contacto@tu-dominio.com
```

- `NEXT_PUBLIC_SITE_URL` se usa para generar enlaces absolutos (SEO, certificados).
- `NEXT_PUBLIC_GA_ID` activa Google Analytics 4 solo en rutas públicas.
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` agrega el meta tag de verificación de Search Console.
- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en server-side (p. ej. verificación pública de certificados) — nunca exponerla al cliente.
- `RESEND_API_KEY` / `CONTACT_FROM_EMAIL` / `CONTACT_REPLY_TO_EMAIL` habilitan el envío real de correo desde `/admin/contacto` (requieren cuenta de Resend con dominio verificado). Sin ellas, el envío falla con un mensaje controlado.

Levantar el servidor de desarrollo:

```bash
npm run dev
# o, si hay problemas con Turbopack en Windows:
npm run dev:webpack
```

Abrir [http://localhost:3000](http://localhost:3000).

Otros scripts disponibles (`package.json`): `npm run build`, `npm run start`, `npm run typecheck`, `npm run lint`, y las variantes `:win` que aumentan la memoria de Node en Windows (`dev:win`, `build:win`).

---

## 7. Desplegar cambios

```bash
git add .
git commit -m "Descripción de cambios"
git push
```

Con el repositorio conectado a Vercel, cada push a la rama desplegada dispara un nuevo deploy automáticamente.

---

## 8. Funcionalidades destacadas

- Panel administrativo con identidad institucional IVBCC.
- Gestión completa de noticias, eventos, publicaciones, formación (cursos/lecciones/quizzes/certificados), transmisiones y donaciones.
- Certificados de cursos con verificación pública (`/certificados/verificar/[code]`).
- Centro de Ayuda administrable desde el panel, con navegación por categorías y derivación a WhatsApp.
- Formulario de contacto con panel de gestión de mensajes.
- Módulo de donaciones configurable.
- Transmisiones embebidas de YouTube.
- SEO: metadata, `sitemap.ts` y `robots.ts`.
- Diseño responsive.
- Autenticación y almacenamiento de archivos vía Supabase.
