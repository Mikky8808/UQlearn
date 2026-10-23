/**
 * Developer and Super-Admin Verification Helper
 * Authorized developer emails have instant 3-portal switching capabilities across UQlearn.
 */

export const DEVELOPER_EMAILS = [
  'omaremichael8808@gmail.com',
  'omaremichael8808@gmail',
  'michaelomare045@gmail.com',
  'michaelomare045@gmail'
];

/**
 * Checks if the current user is an authorized developer.
 * Case-insensitive, trims whitespace, and supports variations.
 */
export function isDeveloperUser(user?: { email?: string | null; role?: string } | null): boolean {
  if (!user || !user.email) return false;
  const em = user.email.trim().toLowerCase();
  return DEVELOPER_EMAILS.some(devEmail => em === devEmail || em.startsWith(devEmail));
}
