// Mask utilities for sensitive data

export function maskCPF(cpf: string | null): string {
  if (!cpf) return "—";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length < 11) return "***.***.***-**";
  return `${clean.slice(0, 3)}.***.***-${clean.slice(9)}`;
}

export function maskPhone(phone: string | null): string {
  if (!phone) return "—";
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 10) return "(**) *****-****";
  return `(${clean.slice(0, 2)}) *****-${clean.slice(-4)}`;
}

export function maskPix(pix: string | null): string {
  if (!pix) return "—";
  if (pix.length <= 6) return "******";
  return `${pix.slice(0, 3)}***${pix.slice(-3)}`;
}

export function maskBankAccount(account: string | null): string {
  if (!account) return "—";
  if (account.length <= 4) return "****";
  return `****${account.slice(-4)}`;
}

export function formatCPF(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}

export function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

export function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(clean[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(clean[10]);
}
