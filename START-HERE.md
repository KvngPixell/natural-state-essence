# Natural State Peptides — finished source upgrade

This package contains the upgraded site and deployable backend code. It has NOT been deployed to your GitHub, Lovable, database, or email account from this session. Uploading a ZIP as a file on GitHub does not install the code.

## 1. Update the preview

1. Extract this ZIP on your computer.
2. Open the extracted `natural-state-essence-main` folder. You should see `src`, `public`, `supabase`, and `package.json`.
3. In GitHub, open `KvngPixell/natural-state-essence` on `main` and choose **Add file → Upload files**.
4. Drag the contents of the extracted folder into GitHub, including the folders. Upload the CONTENTS, not the ZIP or its outer folder. Commit the changes. If GitHub skips a hidden configuration file, open that existing file and replace its contents from this package separately.
5. Return to Lovable and wait for Git sync/build. Check the homepage, catalog, Quality & Testing, and Ambassadors pages. You can keep the site in preview while configuring the backend.

## 2. Activate the backend

The implementation uses Supabase Auth, Postgres, and an Edge Function. Use the Supabase project connected to Lovable, or have Lovable configure its compatible Cloud backend. Do not create two separate databases accidentally.

Give Lovable this instruction after the source sync:

> Activate the backend included in this repository. Apply `supabase/migrations/202609090001_portal.sql` once to our connected database. Deploy `supabase/functions/nsp-portal/index.ts` with the function config in `supabase/config.toml`. Connect the public frontend environment variables from `.env.example`. Configure Auth invitations/password reset and the server secrets listed in START-HERE.md. Do not replace the protected tables with browser storage, demo records, or fake submission success. Ask me for the owner email, receiving inbox, and final site URL when needed. Bootstrap only my approved owner account in nsp_admins. Verify a test inquiry and two isolated partner accounts before launch.

Server-only secrets:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Provided by the Supabase function environment. Never place the service key in frontend variables. |
| `APP_URL` | Final HTTPS site origin, without trailing slash. Used for invitation links. |
| `ALLOWED_ORIGINS` | Comma-separated exact site origins, including the actual preview iframe origin during testing; no wildcard. |
| `RATE_LIMIT_SALT` | Long random secret for hashing request IPs. |
| `RESEND_API_KEY` | API key for your email provider account (this function uses Resend). |
| `EMAIL_FROM` | Sender on your verified Resend domain, e.g. Natural State <inquiries@your-domain>. |
| `INQUIRY_TO` | Your chosen inbox receiving inquiry notifications. |

Set Auth Site URL to APP_URL; allow the exact `/ambassador/reset` redirect on your live/test site. Configure Auth SMTP for reliable account invitation/reset emails. Disable public self-signup if using this invitation-only program. Owner setup: create/invite your Auth user, then add its UUID using the trusted database SQL editor:

```sql
insert into public.nsp_admins(user_id) values ('YOUR-OWNER-AUTH-USER-UUID');
```

Log in at `/ambassador/login`, then open `/admin/ambassadors`. Database administration is required for this initial step; there is no public “make me admin” action.

## 3. Run your ambassador program

1. Review applications in owner controls → Inquiries.
2. Add an ambassador with their email and unique code. Set the agreed commission percentage, written terms and payout hold. No commission rate has been assumed for you.
3. Send their account invitation. They set a password and access their dashboard.
4. They copy their referral link or generate a QR code. Referral codes follow the current browsing session into inquiries. This version does not promise a multi-day tracking cookie.
5. When an order is actually paid, enter its unique payment/order reference, partner, merchandise amount after discounts (excluding tax/shipping), products and payment date.
6. Record refunds as the cumulative refunded merchandise amount. After the hold, approve eligible commissions.
7. Send the payment using your normal payment method. Record its reference in the payout screen only AFTER paying. The website records payouts; it does not transfer money.

Ambassadors see their own sales, commission balances, terms, referral link, QR code and payout history. Customer/contact details and raw payment references remain owner-only. The dashboard has a Refresh sales button. No Facebook message reading, checkout integration, payment webhook, automatic payout, or historic sales import is included. If you later add checkout, integrate verified server payment events with this ledger before calling tracking automatic.

## 4. Check before publishing

- Submit a product inquiry and COA request. Confirm each is stored in owner controls and the notification reaches your inbox. “Accepted” means the email provider accepted it, not proof of inbox delivery.
- Invite two test ambassadors. Confirm each sees only their own orders. Test sign-out and password reset.
- Record a test paid order, partial refund, approval and payout; then review both dashboards. Use an isolated test database for test financial records.
- Confirm product names, strengths, inventory and supplied bottle artwork on desktop and mobile. Bottle images are branded mockups based on your label; the provided SS-31 artwork is not evidence of testing for other batches.
- Review current product documentation before supplying a COA. The site requests documents privately and makes no universal independent-testing promise.
- Publish only after those live checks. Update APP_URL, frontend public site URL, Auth redirects and ALLOWED_ORIGINS if the address changes.

## Included changes and verification

Product-led homepage, in-stock products, search aliases, branded vial mockups, useful quality documentation page, COA inquiry flow, partner applications/login/dashboard, owner controls, protected database, inquiry storage plus email notification, commission/refund/payout ledger, referral QR codes and partner copy guide.

Local production build and TypeScript validation pass. `node scripts/verify-portal.mjs` tests real PostgreSQL execution with PGlite: role isolation, owner-only mutation, deduplication, referral attribution, refund arithmetic, payout reconciliation and suspension. Local checks do not verify your undeployed Auth, email provider, preview-origin configuration or payment operations. The image assets were inspected; a full browser walkthrough of this updated build remains part of the live checks above.

For development: `npm ci`, `npm run build`, `npx tsc --noEmit`, `node scripts/verify-portal.mjs`, `node scripts/verify-inquiries.mjs`.
