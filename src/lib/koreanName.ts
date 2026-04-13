// Name validation for 2-20 chars.
// Supports Hangul, English letters, spaces, periods, apostrophes, and hyphens.
const NAME_REGEX = /^[A-Za-z\uAC00-\uD7AF][A-Za-z\uAC00-\uD7AF .'-]{1,19}$/;
const KOREAN_ONLY_REGEX = /^[\uAC00-\uD7AF]+$/;

/**
 * Validates a child name (2-20 chars, Hangul/English plus separators)
 */
export function isValidKoreanName(name: string): boolean {
  return NAME_REGEX.test(name.trim());
}

/**
 * Returns the display name based on hide_surname setting.
 * For 2-character names, always shows the full name since a single
 * character isn't meaningful to guess.
 */
export function getDisplayName(name: string, hideSurname: boolean): string {
  // Only hide surname for Korean names where this convention is meaningful.
  if (hideSurname && KOREAN_ONLY_REGEX.test(name) && name.length > 2) {
    return name.slice(1);
  }
  return name;
}

/**
 * Checks if the user's answer matches the correct name (exact match)
 * @param hideSurname - If true, compare without the first character (surname)
 */
export function matchName(
  input: string,
  correct: string,
  hideSurname: boolean = false
): boolean {
  const trimmedInput = input.trim();
  return trimmedInput === getDisplayName(correct, hideSurname);
}

/**
 * Returns an error message if the name is invalid
 */
export function getNameValidationError(name: string): string | null {
  if (!name) {
    return "이름을 입력해주세요";
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 20) {
    return "이름은 2~20글자여야 합니다";
  }
  if (!NAME_REGEX.test(trimmed)) {
    return "이름 형식이 올바르지 않습니다";
  }
  return null;
}
