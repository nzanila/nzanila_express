// Phones are stored normalised without a plus or spaces: 257XXXXXXXX (Burundi, 8 local
// digits) or 250XXXXXXXXX (Rwanda, 9 local digits).
export const COUNTRIES = {
  BI: { label: 'Burundi', flag: '🇧🇮', dialCode: '+257', dial: '257', digits: 8, example: '61 23 4567' },
  RW: { label: 'Rwanda', flag: '🇷🇼', dialCode: '+250', dial: '250', digits: 9, example: '78 123 4567' },
} as const;
export type CountryCode = keyof typeof COUNTRIES;

const DIALS = Object.values(COUNTRIES).map(country => country.dial);

/** Always show the country code so a number is never ambiguous. */
export function formatPhone(value?: string | null): string {
  const raw = String(value ?? '').trim();
  // Accounts created without a phone carry a "user_..." placeholder, not a real number.
  if (!raw || raw.startsWith('user_')) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  for (const country of Object.values(COUNTRIES)) {
    if (digits.startsWith(country.dial)) {
      const local = digits.slice(country.dial.length);
      if (local.length === country.digits) {
        return `${country.dialCode} ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
      }
    }
  }
  // Bare local number: assume the default country when the length matches.
  if (digits.length === COUNTRIES.BI.digits) {
    return `${COUNTRIES.BI.dialCode} ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  return raw.startsWith('+') ? raw : `+${digits}`;
}

/** The digits after the country code. Neither country uses a trunk 0 internationally. */
export function localPhoneDigits(value?: string | null): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  for (const dial of DIALS) {
    if (digits.startsWith(dial)) return digits.slice(dial.length);
  }
  return digits;
}

/**
 * Valid when the local part matches the country's length and does not start with 0.
 * Only length is enforced: operator prefix ranges change over time and hard-coding them
 * would lock out real customers on newer ranges.
 */
export function isValidPhone(value?: string | null, country: CountryCode = 'BI'): boolean {
  const local = localPhoneDigits(value);
  const expected = COUNTRIES[country]?.digits ?? COUNTRIES.BI.digits;
  return new RegExp(`^[1-9]\\d{${expected - 1}}$`).test(local);
}

export function phoneHint(country: CountryCode = 'BI'): string {
  const info = COUNTRIES[country] ?? COUNTRIES.BI;
  return `Enter your ${info.digits}-digit number, for example ${info.example}.`;
}

export const PHONE_HINT = phoneHint('BI');
