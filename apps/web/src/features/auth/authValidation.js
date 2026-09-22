export const PASSWORD_MIN_LENGTH = 8;

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function validateEmail(value) {
  return /^\S+@\S+\.\S+$/.test(normalizeEmail(value));
}

export function validateLoginInput({ email, password }) {
  const errors = {};
  if (!validateEmail(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export function validateSignupInput({ displayName, email, password, confirmPassword }) {
  const errors = {};
  if (displayName && displayName.trim().length > 120) errors.displayName = 'Name must be 120 characters or fewer.';
  if (!validateEmail(email)) errors.email = 'Enter a valid email address.';
  if (!password || password.length < PASSWORD_MIN_LENGTH) errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

export function firstError(errors) {
  return Object.values(errors).find(Boolean) || '';
}
