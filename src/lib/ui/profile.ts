const PROFILE_NAME_KEY = 'pf:profile-name';
const DEFAULT_PROFILE_NAME = 'Pengguna';

export function getProfileName(): string {
  try {
    const value = localStorage.getItem(PROFILE_NAME_KEY)?.trim();
    return value || DEFAULT_PROFILE_NAME;
  } catch {
    return DEFAULT_PROFILE_NAME;
  }
}

export function setProfileName(name: string): string {
  const value = name.trim().slice(0, 40);
  try {
    if (value) {
      localStorage.setItem(PROFILE_NAME_KEY, value);
    } else {
      localStorage.removeItem(PROFILE_NAME_KEY);
    }
  } catch {
    // localStorage bisa diblokir; abaikan.
  }
  return value || DEFAULT_PROFILE_NAME;
}
