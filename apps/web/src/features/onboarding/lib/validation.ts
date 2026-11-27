import type { TranslationKey } from '../../../lib/i18n/en';
import type { BranchInfo, BusinessInfo } from '../api/onboarding.service';

/**
 * Pure validators. They return i18n *keys* (not messages) so the UI stays
 * localization-agnostic; the page maps keys through `t()`.
 */

export type FieldErrors<T extends string> = Partial<Record<T, TranslationKey>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Digits only, allowing an international prefix and common separators. */
function phoneDigitCount(value: string): number {
  return value.replace(/[^\d]/g, '').length;
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') return true; // optional field
  if (!/^[+()\-.\s\d]+$/.test(trimmed)) return false;
  const digits = phoneDigitCount(trimmed);
  return digits >= 7 && digits <= 15;
}

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') return true; // optional field
  return trimmed.length <= 254 && EMAIL_PATTERN.test(trimmed);
}

export type BusinessField = 'name' | 'phone' | 'email';

export function validateBusinessInfo(info: BusinessInfo): FieldErrors<BusinessField> {
  const errors: FieldErrors<BusinessField> = {};
  if (info.name.trim() === '') {
    errors.name = 'onboarding.error.required';
  } else if (info.name.trim().length > 120) {
    errors.name = 'onboarding.error.tooLong';
  }
  if (!isValidPhone(info.phone)) {
    errors.phone = 'onboarding.error.phone';
  }
  if (!isValidEmail(info.email)) {
    errors.email = 'onboarding.error.email';
  }
  return errors;
}

export type BranchField = 'name' | 'phone';

export function validateBranchInfo(info: BranchInfo): FieldErrors<BranchField> {
  const errors: FieldErrors<BranchField> = {};
  if (info.name.trim() === '') {
    errors.name = 'onboarding.error.required';
  } else if (info.name.trim().length > 120) {
    errors.name = 'onboarding.error.tooLong';
  }
  if (!isValidPhone(info.phone)) {
    errors.phone = 'onboarding.error.phone';
  }
  return errors;
}
