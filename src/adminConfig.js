// Single source of truth for who may see the /admin dashboard.
// Mirrored in firestore.rules (isAdmin()). Custom claims would need a server
// (Blaze); a hard-coded uid is the right call on the free Spark plan.
export const ADMIN_UIDS = ['E7Kc9DudNYY5YgObML67NJt6y202'] // ola@turbin.se (Google)

export function isAdminUid(uid) {
  return !!uid && ADMIN_UIDS.includes(uid)
}
