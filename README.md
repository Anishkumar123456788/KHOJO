# KHOJO

Mobile-first skilled-labour discovery and booking app for customers and workers in India. Firebase Phone Authentication handles OTP; Firebase Admin and Cloud Firestore are used by server-side application routes. Customer/worker location is opt-in browser geolocation, stored as approximate coordinates and a Firestore geohash for nearby search.

## Firebase setup

Create a Firebase project, add a Web app, enable **Authentication → Phone**, and create a **Cloud Firestore** database. Add your deployed domain under Authentication authorized domains. Firebase projects created after April 28, 2025 may not include localhost as an authorized domain; use the Auth Emulator below for local OTP testing. For real Indian numbers, configure the SMS region policy and check Firebase SMS quotas, billing, and supported-region availability before launch. [Firebase phone-auth setup](https://firebase.google.com/docs/auth/web/phone-auth)

From `D:\KHOJO` in Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Set `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID` in `.env.local` using the Firebase Web app config. These are public app identifiers, not service account secrets. For server-side Firestore access, configure **one** of:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete service-account JSON as a secret (keep it only in `.env.local` locally and the deployment platform secret manager in production); or
- Application Default Credentials using `GOOGLE_APPLICATION_CREDENTIALS` locally / the hosting platform's attached service account in production.

Set `FIREBASE_PROJECT_ID` to the same project. Never commit `.env.local` or expose service-account credentials to browser code. Keep the service account limited to the Firebase project KHOJO uses.

For local OTP and Firestore development without sending SMS, set the three emulator host variables in `.env.local` to the values shown in `.env.example`, then run:

```powershell
npm install --global firebase-tools
firebase login
firebase emulators:start --only auth,firestore
```

The emulator prints test SMS codes in its terminal. To use Firebase itself instead, leave all emulator host variables empty and use Firebase Console test numbers or real OTP.

Deploy Firestore rules and indexes from Firebase CLI:

```powershell
firebase deploy --project YOUR_FIREBASE_PROJECT_ID --only firestore:rules,firestore:indexes
```

The supplied rules deny direct browser access to application collections. KHOJO reads and writes them through server routes using Firebase Admin, where role and ownership checks are applied. The indexes support city and geohash worker queries.

## Sign-in and administrator setup

The login form uses Firebase Phone Auth's reCAPTCHA verifier. Firebase sends and verifies OTPs; KHOJO does not generate mock OTPs or claim SMS was sent unless Firebase accepts the request. Configure test numbers in Firebase Console for development. Enable Firebase App Check and monitor Auth quotas before public production traffic.

Public onboarding only permits customer or worker roles. To grant the first administrator, use the Firebase Console to create/update `users/{firebase-auth-uid}` and set `role` to `ADMIN`. Do this only for a trusted account; never expose admin role selection through registration. Worker verification is a separate explicit admin action and is not a government identity check.

## Data model and location

Firestore collections used by this app: `users`, `workers`, `bookings`, `reviews`, `notifications`, `auditLogs`, and `settings/platform`. Booking records contain worker IDs/statuses and snapshots of rates; worker coordinates are not included in public search responses. Do not put exact residential addresses in worker profile documents. Booking addresses are only returned to the booking parties through authorized routes.

Search uses `geofire-common` geohash range bounds, then Haversine distance checks to remove false positives. The browser asks for location only when the user requests it; denied permission falls back to city selection. Worker coordinates are saved only after a worker chooses the location button in profile settings. City-only search is supported when coordinates are unavailable. No map tile or geocoding provider is configured; add a provider later via a server-side adapter if a map picker is needed.

## Features and limitations

- Firebase OTP login with HttpOnly Firebase session cookies and server-side user lookup.
- Customer and worker onboarding/profile updates, skill/city search, opt-in geolocation and radius/sort filters.
- Worker availability and schedule editing, admin verification, multi-worker hourly/full-day booking requests, rate snapshots, accept/reject, overlap checks, cancellation, progress status and post-completion reviews.
- Booking rates are server-calculated estimates; this app does not collect payments.
- Profile/portfolio photo uploads, masked calls, map picker/geocoding, post-acceptance contact UI, notifications UI, and broad admin operations are not configured. Private phone numbers are not exposed in search results or booking responses.
- Existing Prisma/PostgreSQL schema and migrations are retained in the repository as legacy artifacts but are no longer used by application routes. Existing PostgreSQL data is not automatically copied to Firestore. Back up/export data and plan a separate migration before removing the old database.
- Firestore transaction checks prevent overlapping accepted bookings by serializing updates on worker documents. Validate this under concurrent load in a Firebase staging project before launch.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Some tests in the existing suite cover phone validation, pricing, schedule math and OTP utility code retained from the former PostgreSQL implementation. Add Firebase Emulator Suite integration tests for session-cookie verification, Firestore security, role authorization, transaction conflicts, search indexes and booking workflows before production.

## Deploy with Firebase App Hosting

App Hosting supports this Next.js server-rendered application and its API routes. It requires a Firebase project on the **Blaze (pay as you go) plan**; usage can incur charges. Set a budget alert before opening the service to public traffic. App Hosting supports either a connected GitHub branch or direct source deployment from Firebase CLI 14.4+. This workspace has no Firebase project credentials yet. See [App Hosting overview](https://firebase.google.com/docs/app-hosting) and [pricing](https://firebase.google.com/docs/app-hosting/costs).

### 1. Prepare a repository and Firebase project

1. Create or select a Firebase project in the Firebase Console and upgrade it to Blaze. Copy its project ID.
2. Create a **Cloud Firestore database** in that project. Register a Firebase Web app and enable **Authentication → Phone**. Set the SMS region policy to permit India, and add the deployed app domain under Authorized domains. Firebase Phone Auth requires reCAPTCHA; this app uses Firebase's `RecaptchaVerifier`. Tell users that phone numbers are processed by Google for authentication and abuse prevention and that SMS charges may apply.
3. You can deploy directly from this local source directory without GitHub. Install Firebase CLI 14.4+ and run:

```powershell
npm install --global firebase-tools
firebase login
firebase init apphosting
```

Choose the existing project, create a backend, choose a region and the project root (`.`). This writes App Hosting backend configuration into `firebase.json`. Then deploy the Firestore security rules/indexes and source:

```powershell
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only apphosting:YOUR_BACKEND_ID
```

Replace `YOUR_BACKEND_ID` with the backend ID selected during initialization. Alternatively, connect a GitHub repository in the Firebase Console for continuous deployment. Never commit `.env.local`, service-account JSON, or other secrets.

### 2. Configure Firebase services and secrets

Configure Phone Authentication's reCAPTCHA and consent flow per [Firebase Phone Auth for Web](https://firebase.google.com/docs/auth/web/phone-auth). Add a Firebase fictional test phone number/code in the console for development: Firebase does not send SMS for test numbers. For real numbers, SMS is sent only after Firebase accepts the request. Firestore is accessed through Firebase Admin in server routes; deploy the repository's rules and indexes from a logged-in Firebase CLI:

```powershell
npm install
npx firebase-tools login
npx firebase-tools use YOUR_FIREBASE_PROJECT_ID
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

In the App Hosting backend's environment/secrets settings, configure the four public Web app values `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID`, plus server-only `FIREBASE_PROJECT_ID`, all matching the same Firebase project. Do not set `NEXT_PUBLIC_*` to secrets. Do not set Auth or Firestore emulator variables in production.

For server-side Firestore access, prefer the App Hosting runtime service identity with the minimum Firestore and Firebase Authentication permissions needed. If using a service-account key instead, store the complete JSON in Secret Manager as `FIREBASE_SERVICE_ACCOUNT_JSON`, grant the backend access to that secret, and never put it in a public variable or source control. App Hosting supports environment configuration and Secret Manager bindings; follow [App Hosting configuration](https://firebase.google.com/docs/app-hosting/configure).

### 3. Verify the deployment

Wait for the first rollout to finish successfully, then open the backend URL. Test phone OTP using a configured Firebase test number first. Verify registration, customer and worker profiles, worker search with manually selected city and granted browser location, booking requests and acceptance, and admin restrictions. Then test OTP delivery to real Indian carrier numbers and confirm SMS quotas and billing. Configure backups, logging and alerts before production use.

No production Firebase credentials are included in this repository. The application does not collect payments, and existing PostgreSQL data is not migrated automatically to Firestore. Review the feature limitations above and complete staging security and concurrency checks before inviting customers.
