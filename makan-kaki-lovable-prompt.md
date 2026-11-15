You are an experienced full-stack web developer helping a non-technical student founder. Build "Makan Kaki", a mobile-first web app for Singapore.

## Project overview
Makan Kaki matches hawker stalls and cafés ("outlets") with nano-creators who live in the same HDB town. Creators book filming visits at outlets, and each booking gets a unique code that diners mention at the counter. The app counts how many diners redeem each creator's code.
Problem today: owners find creators through scattered Instagram DMs and cannot tell whether a post brought in any customers.
The core job: an owner can see exactly how many diners each creator's post brought in.
Speed targets:
- A creator books a visit slot in under 1 minute.
- An owner logs a diner's code at the counter in under 10 seconds.

## Users and permissions
There are four roles. Use these names everywhere: Guest, Owner, Creator, Admin.

**Guest (not logged in)**
- Can view only the public Landing page, the Sign up pages and the Login page.
- Opening any other URL redirects to the Login page.

**Owner**
- Registers exactly one outlet.
- Adds visit slots for their outlet.
- Sees upcoming bookings at their outlet.
- Logs redeemed codes on the Redeem code screen.
- Views redemption results for their own outlet only.
- Cannot see other outlets' data, even by changing the URL.
- Cannot see creators' email or phone number. Owners see only the creator's name and social handle.

**Creator**
- Signs up, then waits with approval status "pending" until the Admin approves them.
- While pending or rejected, cannot see or book any visit slots.
- Once approved: browses open visit slots at outlets in their own HDB town, books a slot, receives a unique code, submits their post link after the visit, and sees redemption counts for their own bookings.
- Cannot see other creators' bookings or any outlet's results.

**Admin (the founder)**
- Approves or rejects creators.
- Views all outlets, visit slots, bookings and redemptions.
- Edits or cancels any booking.
- Exports monthly billing data as CSV.

## Core features (MVP)
1. **Owner sign-up and outlet registration.** An owner signs up and registers their outlet with name, address, HDB town, cuisine and plan (Hawker or Café). The owner then adds visit slots, each with a date and start time.
2. **Creator sign-up and approval.** A creator signs up with name, email, phone, social handle, platform, follower count, HDB town and languages. Their approval status starts as "pending". The Admin approves or rejects them on the "Creators awaiting approval" screen. Only approved creators can see and book visit slots.
3. **Booking a visit slot.** An approved creator sees open visit slots at outlets in their HDB town and taps "Book a makan". The visit slot status changes to "booked" and the slot disappears from every other creator's list immediately. The owner sees the new booking on their Dashboard. Two creators must never be able to book the same visit slot, even if they tap at the same moment.
4. **Unique codes and post links.** Each booking generates a unique code in the format MK-<CREATORNAME>-<4 digits>, for example MK-JASON-4821. The creator puts this code in their post. After the visit, the creator opens My bookings, taps "Submit my post" and pastes the post link.
5. **Redeeming codes and owner results.** On the Redeem code screen, the owner types a diner's code and taps "Redeem code".
   - A valid code for that owner's outlet creates one redemption and shows a green "Code redeemed" message.
   - A code that does not exist, belongs to another outlet, or is past its 30-day window shows a red "Code not found" message.
   - The owner Dashboard shows, for the current month, redemptions per booking (one row per creator post) and the cost per diner.

## Out of scope
Do not build any of the following, even partially:
- In-app payments. Billing is invoiced manually by PayNow outside the app.
- AI matching. Matching is a simple filter on HDB town only.
- WhatsApp automation.
- Automatic creator payouts.
- Diner accounts of any kind.
- Ratings and reviews.
- Scraping view counts from TikTok or Instagram.
- Multiple languages. The interface is English only for now.

## Screens and user flow
**Public**
- Landing page → Sign up (choose Owner or Creator) → Login.

**Owner flow**
- Login → Owner Dashboard. Shows upcoming bookings, redemptions this month and cost per diner.
- Owner Dashboard → Manage visit slots. Lists the owner's visit slots and lets them add new ones.
- Owner Dashboard → Redeem code. One big code input box and one big "Redeem code" button, usable with one hand.
- Owner Dashboard → Booking detail. Shows the creator's name and handle, the post link and the redemption count.

**Creator flow**
- Login → Find visit slots. Lists open visit slots in the creator's HDB town as cards. A pending or rejected creator sees a status message here instead of slots.
- Find visit slots → Visit slot detail → tap "Book a makan" → Booking confirmation. Shows the unique code prominently.
- My bookings. Lists the creator's bookings with code, status and redemption count.
- My bookings → Submit post link.

**Admin flow**
- Login → Admin Dashboard.
- Admin Dashboard → Creators awaiting approval. Approve or reject each creator.
- Admin Dashboard → All outlets.
- Admin Dashboard → All bookings. Edit or cancel any booking.
- Admin Dashboard → Monthly billing export. Pick a month and download a CSV.

## Data model
Use the platform's built-in login for passwords. Do not store passwords in your own tables.

- **Owner**: name, email, phone. Linked to one login user.
- **Outlet**: name, address, HDB town, cuisine, plan (Hawker or Café). Linked to one owner.
- **Creator**: name, email, phone, social handle, platform, follower count, HDB town, languages, approval status (pending, approved, rejected). Linked to one login user.
- **Visit slot**: date, start time, status (open or booked). Linked to one outlet.
- **Booking**: unique code, booked timestamp, post link (empty until submitted), status (booked, completed, cancelled). Linked to one visit slot and one creator.
- **Redemption**: timestamp. Linked to one booking. Store no diner details.

Relationships:
- One owner has one outlet.
- One outlet has many visit slots.
- One visit slot has at most one booking.
- One creator has many bookings.
- One booking has many redemptions.

## Design and style
- **Overall feel**: warm, local and friendly, but clean. Mobile-first.
- **Colours**:
  - Background: off-white #F8F9FA.
  - Burnt orange #D96B27: main buttons, highlights and the active tab.
  - Dark brown #3B2314: headings, body text, icons and small links.
  - Muted green #4A7C59: success messages, for example "Code redeemed".
  - Deep red #B3261E: error messages, for example "Code not found".
- **Buttons**: white, bold text of at least 18px. Never use orange for small text.
- **Shapes**: rounded cards with a light shadow and large tap targets.
- **Fonts**: Poppins for headings, Inter for body text.
- **References**: visit slot listings look like GrabFood's restaurant cards. Booking feels as simple as Calendly.
- **Button labels**: short and local, for example "Book a makan", "Redeem code" and "Submit my post".
- **Redeem code screen**: one large code input and one large button, nothing else competing for attention. Busy hawker staff must be able to use it with one hand.

## Constraints and rules
- Phones first. Every screen must work well at 375px width.
- Use the platform's built-in database and login (Supabase), with row-level security on every table.
- Access rules, enforced by row-level security and not only by hiding things in the UI:
  - Owners read and write only their own outlet's visit slots, bookings and redemptions.
  - Creators read only their own bookings and codes, plus open visit slots in their HDB town once approved.
  - Only the Admin can read everything.
- PDPA: collect only names, emails, phone numbers and social handles for people. Store no diner personal data.
- Codes:
  - Codes are unique across all bookings.
  - Matching is not case-sensitive: "mk-jason-4821" redeems MK-JASON-4821.
  - A code counts only if it is redeemed within 30 days of the visit slot's date.
- All prices are in SGD. All dates and times are stored and shown in Singapore time (SGT, UTC+8).
- Do not use any paid third-party services.

## Acceptance criteria
- [ ] On a phone, an owner can register an outlet and add three visit slots in under 2 minutes.
- [ ] A creator whose approval status is pending or rejected cannot see or book any visit slots, in the UI or through direct URLs or queries.
- [ ] When one creator books a visit slot, it disappears for every other creator immediately, and a second booking attempt on the same slot fails.
- [ ] Every booking shows a unique code, and no two bookings ever share the same code.
- [ ] On the Redeem code screen, typing a valid code (in any letter case) adds 1 to that booking's redemption count and shows a green "Code redeemed" message.
- [ ] An invalid code, another outlet's code, or a code past its 30-day window shows a red "Code not found" message and creates no redemption.
- [ ] An owner cannot see another outlet's dashboard or data, even by changing the URL.
- [ ] A logged-out user who types an Owner or Admin URL is sent to the Login page.
- [ ] The Admin can export a CSV of redemptions per outlet for any chosen month.

## How to start
Build in small steps. Stop for my approval after step 1.
1. **Propose, then wait.** List the pages, the database tables and fields, and the build order. Do not write code until I approve.
2. **Build every screen with sample data.** Use realistic Singapore sample data, for example outlets in Tampines, Toa Payoh and Jurong West, hawker cuisines, and creator handles. No database yet.
3. **Connect the database and login.** Connect Supabase, set up login for the Owner, Creator and Admin roles, and add row-level security for every table.
4. **Add features one at a time.** Build them in this order, and let me test each one before moving on:
   1. Outlet registration and visit slots
   2. Creator sign-up and Admin approval
   3. Booking and unique codes
   4. Post link submission
   5. Redeem code screen
   6. Owner Dashboard results
   7. Admin monthly CSV export
