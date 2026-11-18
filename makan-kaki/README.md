# Makan Kaki: clickable demo

Makan Kaki is one web platform with two logged-in apps, one for business owners and one for creators, joined by a diner QR checkout that needs no download. Every order is traced back to the creator video that brought it.

This is a **demo**, not a working product:
- All data is sample data saved in the viewer's browser.
- HitPay, PayNow, WhatsApp, OTP codes, follower checks and post checks are simulated and clearly marked "Demo".
- Nothing is sent anywhere.

**Live:** https://grassuser3-stack.github.io/gracia-sfin-ia/

## Run it locally
```bash
npm install
npm run dev
```
Open http://localhost:5173.

## How to show it
- **Guided tour:** on the landing page, tap **▶ Start the 11-step demo tour**. A bar at the bottom walks through the end-to-end flow, switching between owner, Makan Kaki, creator and diner screens. You can also tap any step in the flow diagram.
  1. Owner signs up, picks a plan and pays
  2. Owner books a visit
  3. Makan Kaki matches a creator
  4. Creator accepts
  5. Creator checks in
  6. Creator posts the video
  7. Diner scans and orders with the creator code
  8. Diner pays by PayNow
  9. Owner completes the order
  10. Owner sees results
  11. Makan Kaki pays out
- **Demo accounts:** the Log in page has one-tap logins, with no passwords:

  | Account | What you see |
  |---|---|
  | Owner: Xiao Nong Tian (Hawker) | Owner app with past orders and results |
  | Owner: All Hands Café (Café) | Owner app, launch pack on |
  | Creator: Zelia (@foodieboonie) | Creator app with offers, an upcoming visit and earnings |
  | Creator: Priya (@priyamakan) | Creator with one strike |
  | Creator: Chen Wei | Waiting for approval |
  | Admin | Approvals, matching, payouts, disputes |
  | Diner | The QR checkout, no account |

- **Two tabs, live:** open an owner's **Live orders** in one tab and the diner checkout (`/order/xnt` or `/order/ahc`) in another.
  - A diner's order pops up for the owner with a sound alert.
  - Moving the order along updates the diner's status page.
- **Real QR code:** the owner's **More → QR stand** shows a real, scannable QR code that opens that stall's checkout. Creators get QR links with their code filled in.
- **Languages:** use the 🌐 picker for English, 中文, Melayu or தமிழ். Main buttons, tabs and the whole diner checkout are translated. Some detail text stays in English.
- **Reset demo** at the bottom of the Log in page restores the sample data.

## What's in each app
**Owner app (12 screens):**
1. Sign up with WhatsApp OTP
2. Choose a plan
3. Pay and payout setup
4. Stall profile and menu (with one-tap sold out)
5. QR stand
6. Book creator visits (with the 90-day launch pack)
7. Creator profiles
8. Live orders (New → Preparing → Ready → Completed, cancel and refund)
9. Results dashboard (views, coded orders, sales, cost per new diner, best creator, best dish, WhatsApp monthly report)
10. Payouts (with CSV)
11. Staff accounts
12. Settings and support (with WhatsApp chat)

**Creator app (12 screens):**
1. Sign up with OTP and platform link (1,000–10,000 follower check)
2. Profile and approval
3. Payout setup
4. Visit offers across Singapore
5. Accept and book (24h free cancellation, strikes)
6. Visit brief with code, QR and #ad label
7. QR check-in that releases the free meal
8. Submit post within 48h with checks
9. Creator code and links
10. Performance
11. Earnings (S$30 per visit + 20% of commission, statement CSV)
12. Ratings and strikes

**Diner checkout:**
1. Scan the QR, or tap a creator's link
2. Pick a language
3. Browse the menu, with featured dishes first
4. Enter the creator code (auto-filled from a link)
5. Choose dine-in with a table number, or takeaway
6. Pay by PayNow through HitPay
7. See the live order status, with an optional WhatsApp
8. Get a receipt

Orders without a code still go through, at no commission.

**Admin panel:**
- Creator approvals (follower, engagement and PayNow checks)
- Visit matching ranked by language and cuisine
- Owner payouts (next working day) and creator payouts (monthly)
- Disputes and platform rules
- Outlet overview

## Money rules used in the demo
- **Plans:** Hawker S$99 for 2 visits a month. Café S$299 for 5. Unused visits roll over one month. Pilot outlets get 50% off their first paid month.
- **Commission:** 10% on coded orders only. Refunded or cancelled orders earn nothing.
- **Owner payout:** order value minus commission, by PayNow the next working day.
- **Creator pay:** S$30 per verified visit plus 20% of the commission their code earns, paid monthly.
- **Cost per new diner** = (plan fee + commission) ÷ coded orders.

## Where things are
| What | Where |
|---|---|
| Sample data and money constants | `src/demo/data.ts` |
| Shared state, cross-tab sync and maths | `src/demo/store.tsx` |
| Translations | `src/demo/i18n.tsx` |
| The 11 tour steps | `src/demo/tour.ts` |
| Screens | `src/pages/` (`public`, `owner`, `creator`, `diner`, `admin`) |

After changing the sample data, bump `DEMO_VERSION` in `src/demo/data.ts` so browsers load the new data.

Outlet addresses, menus, follower counts and phone numbers are placeholders. Translations for Malay and Tamil should be checked by a native speaker.
