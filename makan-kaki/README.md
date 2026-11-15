# Makan Kaki

Makan Kaki is a mobile-first web app that matches Singapore hawker stalls and cafés with nano-creators from the same HDB town. It counts how many diners each creator's code brings in.

**Built with:** React, Vite and Tailwind. The database is a full Postgres (PGlite) that runs **inside the browser**. You don't need any accounts, servers or keys.

## Run it
```bash
npm install
npm run dev
```
Open http://localhost:5173. To try it on your phone, use the same Wi-Fi and run `npm run dev -- --host`.

## Demo accounts
The login page lists one-tap demo logins for every role. All of them use the password `makan123`.

| Account | Role |
|---|---|
| admin@makankaki.test | Admin (founder) |
| owner@makankaki.test | Owner of Ah Seng Fishball Noodle (Hawker plan) |
| cafe@makankaki.test | Owner of Kopi & Toast Co. (Café plan) |
| staff@makankaki.test | Counter staff at Ah Seng |
| jason@makankaki.test, priya@makankaki.test | Approved creators in Tampines |
| wei@makankaki.test | Creator waiting for approval |

The sample data includes:
- a completed post with diners
- a visit waiting for its post link
- a missed post
- open visit slots

You can also sign up new owners, creators and staff.

**Tips:**
- Each browser tab can be logged in as a different person. For example, use one tab as a creator and another as the owner.
- Data is saved in this browser only. A different browser or device starts with fresh sample data.
- **Reset demo data** at the bottom of the login page restores the sample data.

## Who sees what

| Role | Can | Cannot |
|---|---|---|
| Guest | See the landing page, sign-up and log-in pages | See anything else (they are sent to log in) |
| Owner | Register 1 outlet, add visit slots, redeem codes, see their own results, add up to 3 staff | See other outlets, or creators' email and phone |
| Staff | Use the Redeem code screen for their outlet | See the dashboard, results, billing or creator details |
| Creator | After approval: book open slots in their HDB town, get a code, submit their post link, see their own counts | See other creators' bookings or any outlet's results |
| Admin | Approve or reject creators, see everything, edit or cancel bookings, export billing CSV | n/a |

These rules are enforced inside the database by Postgres row-level security, not only by hiding screens. Every query runs as the logged-in user.

## Business rules
- **Plans:** Hawker is S$99 a month for 2 creator visits. Café is S$299 a month for 5 creator visits. Every redeemed code costs S$1.
  - When an outlet's visits for a month are all booked, its other slots that month are hidden.
- **Cost per diner** = (plan fee + S$1 × redemptions this month) ÷ redemptions this month. With no redemptions it shows "No redemptions yet".
- **Codes** look like `MK-JASON-4821`.
  - They are unique and not case-sensitive.
  - They work from booking until 30 days after the visit date, unless the booking is cancelled.
- **Booking status:**
  - "Completed" when the creator submits a post link on or after the visit date.
  - "Missed" if there's no link 7 days after the visit. Missed bookings are flagged on the Admin dashboard.
- **Cancelling** (admin only):
  - The code stops working.
  - The slot reopens if its date hasn't passed.
- **Dates and times** are in Singapore time. **Prices** are in SGD.

## Testing the database rules
```bash
npm run test:db
```
This runs 66 checks covering permissions, double-booking, plan limits, codes, the 30-day window, missed posts, staff access and billing.

## Where things are
| What | Where |
|---|---|
| Database tables, security rules and server functions | `supabase/migrations/20261115000000_init.sql` |
| In-browser database, login and sample data | `src/lib/local/` |
| Screens | `src/pages/` |

## Putting it online (free)
Run `npm run build` and upload the `dist` folder to Netlify, Vercel or GitHub Pages. Each visitor gets their own copy of the sample data in their browser.

## Moving to a shared online database later
The SQL file is written for Supabase. If you later want everyone to share one database:
1. Run the SQL file in a Supabase project.
2. Install `@supabase/supabase-js`.
3. In `src/lib/supabase.ts`, replace the export with `createClient(url, anonKey)`.

The screens don't need to change.
