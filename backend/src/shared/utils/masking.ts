/**
 * Masking utilities to protect Personally Identifiable Information (PII)
 * across summary, listing, and notification responses.
 */

/**
 * Mask 12-digit Aadhaar Number (UIDAI compliant) -> XXXX-XXXX-1234
 */
export function maskAadhaar(aadhaar?: string | null): string {
  if (!aadhaar) return '';
  const clean = aadhaar.replace(/[\s-]/g, '');
  if (clean.length < 4) return clean;
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

/**
 * Mask 10-character PAN Card -> ABCDE****F
 */
export function maskPan(pan?: string | null): string {
  if (!pan) return '';
  const clean = pan.trim().toUpperCase();
  if (clean.length !== 10) return clean;
  return `${clean.slice(0, 5)}****${clean.slice(9)}`;
}

/**
 * Mask ID Number according to ID Type (PAN or Aadhaar)
 */
export function maskIdNumber(idNumber?: string | null, idType?: string | null): string {
  if (!idNumber) return '';
  if (idType === 'PAN') {
    return maskPan(idNumber);
  }
  if (idType === 'AADHAAR') {
    return maskAadhaar(idNumber);
  }
  if (idNumber.length > 4) {
    return `XXXX-XXXX-${idNumber.slice(-4)}`;
  }
  return idNumber;
}

/**
 * Mask Bank Account Number -> XXXX-XXXX-5544
 */
export function maskAccountNumber(accountNumber?: string | null): string {
  if (!accountNumber) return '';
  const clean = accountNumber.trim();
  if (clean.length <= 4) return clean;
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

/**
 * Mask 10-digit Phone Number -> XXXXXX1234
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length <= 4) return clean;
  return `XXXXXX${clean.slice(-4)}`;
}

/**
 * Mask Email Address -> r***a@domain.com
 */
export function maskEmail(email?: string | null): string {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}
