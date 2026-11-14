export const normalizeUsername = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 32);
export const isStrongPassword = (v: string) => v.length >= 8 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v);

export const isValidPin = (v: string) => /^\d{4}$/.test(v);