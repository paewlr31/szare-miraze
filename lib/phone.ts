export function nationalPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("48") && digits.length === 11) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10) digits = digits.slice(1);
  if (!/^[1-9]\d{8}$/.test(digits)) return null;
  return digits;
}

export function smsPhone(input: string): string | null {
  const national = nationalPhone(input);
  return national ? `48${national}` : null;
}

export function formatPhone(input: string): string {
  const national = nationalPhone(input);
  if (!national) return input.trim();
  return `+48 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

export function cleanName(input: string): string | null {
  const name = input.replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!/^[\p{L}][\p{L}\s.'-]{1,79}$/u.test(name)) return null;
  return name;
}
