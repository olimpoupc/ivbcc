/**
 * Enmascara un correo para mostrarlo o guardarlo sin exponerlo completo:
 * "gabriela@gmail.com" -> "g***@gmail.com". Puro (navegador y servidor).
 */
export function maskEmail(value: string): string {
  const email = value.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}
