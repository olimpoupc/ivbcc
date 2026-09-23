// Medicion de latencia de rutas publicas (NO es una prueba de estres).
// Requests estrictamente secuenciales; cada muestra mide desde el envio hasta
// haber leido el cuerpo completo (no solo TTFB). Sin dependencias: Node >= 18.
//
// Uso: node scripts/perf/latency.mjs <baseUrl> [--runs 3] [--n 50] [--csv ruta.csv]

import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

const args = process.argv.slice(2);
const baseUrl = (args[0] ?? "").replace(/\/$/, "");
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : args[i + 1];
};
const RUNS = Number(opt("runs", 3));
const N = Number(opt("n", 50));
const CSV = opt("csv", null);
const PAUSE_MS = 5000;

if (!baseUrl.startsWith("http")) {
  console.error("Uso: node scripts/perf/latency.mjs <baseUrl> [--runs 3] [--n 50] [--csv ruta.csv]");
  process.exit(2);
}

const ROUTES = [
  { name: "Inicio", path: "/" },
  { name: "Eventos (listado)", path: "/eventos" },
  { name: "Noticias (listado)", path: "/noticias" },
  { name: "Curso publicado (detalle)", path: "/formacion/fundamentos-fe-cristiana" },
];

// nearest-rank: p-esimo percentil = valor ordenado en la posicion ceil(p/100*n)
const pct = (sorted, p) => sorted[Math.ceil((p / 100) * sorted.length) - 1];
const f = (x) => x.toFixed(1).padStart(8);

function stats(samples) {
  const ok = samples.filter((s) => s.status === 200 && !s.error);
  const t = ok.map((s) => s.ms).sort((a, b) => a - b);
  const codes = {};
  const cache = {};
  for (const s of samples) {
    const k = s.error ? `ERR(${s.error})` : String(s.status);
    codes[k] = (codes[k] ?? 0) + 1;
    if (!s.error) cache[s.cache ?? "(sin header)"] = (cache[s.cache ?? "(sin header)"] ?? 0) + 1;
  }
  return { n: samples.length, ok: ok.length, t, codes, cache };
}

function line(label, st) {
  if (st.t.length === 0) return `${label.padEnd(30)} sin muestras 200 OK`;
  const mean = st.t.reduce((a, b) => a + b, 0) / st.t.length;
  return (
    `${label.padEnd(30)} n=${String(st.n).padStart(3)} ok=${String(st.ok).padStart(3)}` +
    ` min=${f(st.t[0])} p50=${f(pct(st.t, 50))} p95=${f(pct(st.t, 95))} p99=${f(pct(st.t, 99))}` +
    ` max=${f(st.t[st.t.length - 1])} mean=${f(mean)}  (ms)`
  );
}

async function once(url) {
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "ivbcc-latency-check/1.0", accept: "text/html" },
      redirect: "manual",
    });
    await res.arrayBuffer();
    return {
      ms: performance.now() - t0,
      status: res.status,
      cache: res.headers.get("x-vercel-cache") ?? undefined,
    };
  } catch (e) {
    return { ms: performance.now() - t0, status: 0, error: e?.cause?.code ?? e?.name ?? "error" };
  }
}

const all = {}; // route.name -> samples[]
const rows = ["run,route,i,ms,status,x_vercel_cache,error"];
const out = [];
const log = (s = "") => {
  out.push(s);
  console.log(s);
};

log(`Latencia de rutas publicas`);
log(`Inicio:      ${new Date().toISOString()}`);
log(`Objetivo:    ${baseUrl}`);
log(`Cliente:     Node ${process.version} (${process.platform} ${process.arch}), fetch/undici con keep-alive`);
log(`Plan:        ${RUNS} corridas x ${N} requests secuenciales por ruta (rutas intercaladas por corrida, ${PAUSE_MS / 1000}s entre corridas)`);
log(`Metodo:      tiempo desde el envio hasta leer el cuerpo completo; percentiles por nearest-rank`);
log(`Nota:        la 1a request de cada ruta en la corrida 1 incluye DNS+TLS; no se descarta ninguna muestra`);
log();

for (let run = 1; run <= RUNS; run++) {
  log(`=== Corrida ${run}/${RUNS} ===`);
  for (const r of ROUTES) {
    const samples = [];
    for (let i = 1; i <= N; i++) {
      const s = await once(baseUrl + r.path);
      samples.push(s);
      rows.push([run, JSON.stringify(r.path), i, s.ms.toFixed(2), s.status, s.cache ?? "", s.error ?? ""].join(","));
    }
    (all[r.name] ??= []).push(...samples);
    const st = stats(samples);
    log(line(`${r.name} ${r.path}`, st));
    log(`${" ".repeat(30)} status: ${JSON.stringify(st.codes)}  x-vercel-cache: ${JSON.stringify(st.cache)}`);
  }
  if (run < RUNS) await new Promise((res) => setTimeout(res, PAUSE_MS));
  log();
}

log(`=== Agregado (${RUNS} corridas juntas, n=${RUNS * N} por ruta) ===`);
for (const r of ROUTES) {
  const st = stats(all[r.name]);
  log(line(`${r.name} ${r.path}`, st));
  log(`${" ".repeat(30)} status: ${JSON.stringify(st.codes)}  x-vercel-cache: ${JSON.stringify(st.cache)}`);
}
log();
log(`Fin:         ${new Date().toISOString()}`);

if (CSV) writeFileSync(CSV, rows.join("\n") + "\n");
