// Korean name validation for 2-4 Korean characters
// Covers: 2-char names (김수), 3-char names (김민수), 4-char names (남궁민수)
// Korean syllables range: AC00-D7AF (가-힣)
const KOREAN_NAME_REGEX = /^[\uAC00-\uD7AF]{2,4}$/;

/**
 * Validates that a name is 2-4 Korean characters
 */
export function isValidKoreanName(name: string): boolean {
  return KOREAN_NAME_REGEX.test(name);
}

/**
 * Checks if the user's answer matches the correct name (exact match)
 */
export function matchName(input: string, correct: string): boolean {
  return input.trim() === correct;
}

/**
 * Returns an error message if the name is invalid
 */
export function getNameValidationError(name: string): string | null {
  if (!name) {
    return "이름을 입력해주세요";
  }
  if (name.length < 2 || name.length > 4) {
    return "이름은 2~4글자여야 합니다";
  }
  if (!KOREAN_NAME_REGEX.test(name)) {
    return "한글 이름만 입력 가능합니다";
  }
  return null;
}
