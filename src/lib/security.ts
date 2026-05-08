const imageSignatures: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

const documentSignatures: Record<string, number[][]> = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "application/msword": [[0xd0, 0xcf, 0x11, 0xe0]],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06],
    [0x50, 0x4b, 0x07, 0x08],
  ],
};

export const uploadLimits = {
  imageMaxBytes: 4 * 1024 * 1024,
  documentMaxBytes: 8 * 1024 * 1024,
  logoMaxBytes: 2 * 1024 * 1024,
};

export function sanitizeText(value: string, maxLength = 5000) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeMultilineText(value: string, maxLength = 20000) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "bin";
  const baseName =
    fileName
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "archivo";

  return `${baseName}.${extension}`;
}

export function buildSafeStoragePath(folder: string, file: File) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${folder}/${Date.now()}-${randomId}-${sanitizeFileName(file.name)}`;
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

async function hasAllowedSignature(file: File, signatures: number[][]) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const hasSignature = signatures.some((signature) => startsWith(bytes, signature));

  if (file.type === "image/webp") {
    return (
      hasSignature &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }

  return hasSignature;
}

export async function validateImageFile(file: File, maxBytes = uploadLimits.imageMaxBytes) {
  const signatures = imageSignatures[file.type];

  if (!signatures) {
    return "Solo se permiten imágenes JPG, PNG o WEBP.";
  }

  if (file.size > maxBytes) {
    return `La imagen no debe superar ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  }

  if (!(await hasAllowedSignature(file, signatures))) {
    return "El archivo no parece ser una imagen válida.";
  }

  return null;
}

export async function validateDocumentFile(
  file: File,
  allowedTypes: string[],
  maxBytes = uploadLimits.documentMaxBytes
) {
  if (!allowedTypes.includes(file.type)) {
    return "El tipo de archivo no está permitido.";
  }

  if (file.size > maxBytes) {
    return `El archivo no debe superar ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  }

  const signatures = documentSignatures[file.type];
  if (signatures && !(await hasAllowedSignature(file, signatures))) {
    return "El archivo no coincide con el formato declarado.";
  }

  return null;
}

export function isClientRateLimited(key: string, limit: number, windowMs: number) {
  if (typeof window === "undefined") return false;

  const now = Date.now();
  const storageKey = `ivbcc-rate-limit:${key}`;
  const attempts = JSON.parse(window.localStorage.getItem(storageKey) || "[]") as number[];
  const recentAttempts = attempts.filter((timestamp) => now - timestamp < windowMs);

  if (recentAttempts.length >= limit) {
    window.localStorage.setItem(storageKey, JSON.stringify(recentAttempts));
    return true;
  }

  recentAttempts.push(now);
  window.localStorage.setItem(storageKey, JSON.stringify(recentAttempts));
  return false;
}
