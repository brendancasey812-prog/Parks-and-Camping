# Cloud sync

The dashboard's **My list** is always saved in the browser. With cloud sync turned on, signing in with
Google also saves it to your Firebase account, and every browser signed in to the same Google account
shows the same list, updating live.

It is off until `cloud-config.js` holds a Firebase web config. It is free on Firebase's Spark plan.

## 1. Firebase project

Use the project you already made for Real Food Hackz, or create one at <https://console.firebase.google.com>
(**Add project**, Analytics off).

- **Authentication → Sign-in method → Google → Enable** (skip if already on).
- **Authentication → Settings → Authorized domains → Add domain:** `brendancasey812-prog.github.io`
  (skip if it is already listed).
- **Firestore Database → Create database** (production mode) if there isn't one.
- **Firestore Database → Rules:** paste [`firestore.rules`](../firestore.rules) and **Publish**. It keeps the
  Real Food Hackz rule and adds one for `parks/{uid}`: each account can read and write only its own data.

## 2. Web config

**Project settings → Your apps → Web app** (register one if needed) and copy the `firebaseConfig`
values into `cloud-config.js`:

```js
window.CLOUD_CONFIG={apiKey:"…",authDomain:"…",projectId:"…",storageBucket:"…",messagingSenderId:"…",appId:"…"};
```

These values are public by design; the rules are what protect the data. Commit to `main` and GitHub Pages
publishes it.

## 3. Use it

Dashboard → **My list → Sign in to sync** (or **Settings → Cloud sync → Sign in with Google**). Do the same on
each browser. The newest copy of the list wins; deleting has an Undo.

Visited checks, edits and trips still use **Settings → Save backup** to move between browsers.
