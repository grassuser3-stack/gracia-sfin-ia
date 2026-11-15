// The app talks to its database through this one object.
// Right now it's an in-browser Postgres (see lib/local). To move to a real
// Supabase project later, replace this export with createClient(url, key).
export { supabase } from './local/client'

/** Turn a database error into a sentence for the user. */
export function errorText(e: unknown): string {
  if (!e) return 'Something went wrong. Please try again.'
  const msg = (e as { message?: string }).message ?? String(e)
  if (msg.includes('Invalid login credentials')) return 'Wrong email or password.'
  if (msg.includes('User already registered')) return 'An account with this email already exists. Try logging in.'
  if (msg.includes('Password should be')) return 'Password must be at least 6 characters.'
  if (msg.includes('Database error saving new user')) return 'We could not create your account. Please check every field and try again.'
  if (msg.includes('bookings_one_live_per_slot')) return 'Sorry, this slot was just booked by someone else.'
  return msg
}
