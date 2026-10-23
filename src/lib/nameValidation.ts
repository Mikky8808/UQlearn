/**
 * Utility functions for validating and checking user display names
 * across UQlearn authentication, profile management, and global prompts.
 */

/**
 * Known generic placeholder names or role-derived strings
 */
const GENERIC_NAME_TERMS = new Set([
  'user',
  'educator',
  'student',
  'learner',
  'instructor',
  'admin',
  'administrator',
  'guest',
  'account',
  'anonymous',
  'user_anon',
  'default_instructor',
  'null',
  'undefined',
  'new user',
  'john doe',
  'jane doe',
  'test user',
  'demo user',
  'professor',
  'member',
  'enrolled student',
  'verified instructor',
  'system administrator'
]);

/**
 * Checks whether a given user name is generic, placeholder, email-derived, or incomplete.
 * When this returns true, the app will prompt the user to update their First & Last name.
 */
export function isGenericName(name?: string | null, email?: string | null): boolean {
  if (!name) return true;
  const clean = name.trim();
  if (clean.length < 2) return true;

  const lower = clean.toLowerCase();

  // 1. Direct match with generic placeholder terms
  if (GENERIC_NAME_TERMS.has(lower)) {
    return true;
  }

  // 2. System-generated pattern check (e.g., usr-17260012, stu-88231, inst-9921, adm-1023)
  if (/^(usr|stu|inst|adm|user|student|educator|admin)[_\-\d]+/i.test(clean)) {
    return true;
  }

  // 3. Match against email username (part before @)
  if (email) {
    const emailUser = email.split('@')[0].toLowerCase().trim();
    const formattedEmailUser = emailUser.replace(/[\._\-]/g, ' ');

    if (lower === emailUser || lower === formattedEmailUser) {
      // If the email username itself is generic or lacks a space (not First Last)
      if (!clean.includes(' ') || GENERIC_NAME_TERMS.has(emailUser)) {
        return true;
      }
    }
  }

  // 4. Single-word check (lacks a space) where single word matches role or email prefix
  if (!clean.includes(' ')) {
    if (GENERIC_NAME_TERMS.has(lower)) return true;
    if (email && lower === email.split('@')[0].toLowerCase().trim()) return true;
  }

  return false;
}

/**
 * Splits a full name string into First Name and Last Name
 */
export function splitFullName(fullName?: string | null): { firstName: string; lastName: string } {
  if (!fullName) return { firstName: '', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) {
    const lower = parts[0].toLowerCase();
    if (GENERIC_NAME_TERMS.has(lower)) {
      return { firstName: '', lastName: '' };
    }
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}
