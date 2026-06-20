// One-time data reset + dummy seed for Sarh AI demo (hackathon-ready showcase).
// Bumps `SEED_VERSION` to force a wipe + reseed when defaults change.
import { initialUsers } from '@/data/users';
import { initialDepartments } from '@/data/departments';
import { seedRequests, seedStickers, seedPermits, seedExternalUsers } from '@/lib/seedData';

const VERSION_KEY = 'sarh_ai_seed_version';
const SEED_VERSION = '1';

export function resetAndSeedIfNeeded() {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(VERSION_KEY) === SEED_VERSION) return;

    // Wipe any legacy keys from the previous (Farabi) build and prior demo data
    Object.keys(window.localStorage).forEach(k => {
      if (k.startsWith('farabi_') || k.startsWith('sarh_ai_')) {
        window.localStorage.removeItem(k);
      }
    });

    // Best-effort IndexedDB wipe — contexts will re-hydrate from localStorage seeds.
    try { window.indexedDB?.deleteDatabase('farabi-id-system'); } catch { /* ignore */ }

    // Seed generic demo data
    window.localStorage.setItem('farabi_users', JSON.stringify(initialUsers));
    window.localStorage.setItem('farabi_departments', JSON.stringify(initialDepartments));
    window.localStorage.setItem('farabi_requests', JSON.stringify(seedRequests));
    window.localStorage.setItem('farabi_vehicle_stickers', JSON.stringify(seedStickers));
    window.localStorage.setItem('farabi_permits', JSON.stringify(seedPermits));
    window.localStorage.setItem('farabi_external_users', JSON.stringify(seedExternalUsers));
    window.localStorage.setItem('farabi_audit_log', JSON.stringify([]));

    window.localStorage.setItem(VERSION_KEY, SEED_VERSION);
  } catch {
    // ignore storage failures — app still works with empty state
  }
}
