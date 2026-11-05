# GymBuddy

Goal-based workout plans for home or gym, **live form checking from the phone camera**, and recorded sessions that coaches and physios can review for injury prevention.

Built from the GymBuddy v2 design. Pose tracking uses **MediaPipe Pose Landmarker** (33 BlazePose landmarks) with the SVBM method:

- **Elbow angle**: three-point arccos at shoulder → elbow → wrist
- **Torso line**: hip midpoint → shoulder midpoint, measured against the vertical (limit 6°)
- **Neckline**: shoulder midpoint → eye midpoint, against the vertical
- **Elbow drift**: upper arm angle against the torso

A curl rep counts when the elbow bends under 70° and straightens past 140°. A rep is flagged when the torso swings past the limit or the elbow drifts forward.

## Screens

Onboarding (goal, place, equipment, experience, look) · Today's plan · Live camera · Form report · Recordings (with offline video analysis) · Coach view (sample clients) · Me / settings.
Three looks: **Volt** (default), **Night Lab**, **Clinic**.

Everything is stored on the phone: settings and pose data in localStorage, video clips in IndexedDB.

## Try it on Android

- **Web:** open the GitHub Pages link in Chrome, then use ⋮ › *Add to Home screen*.
- **App:** open the **Releases › latest** page on your phone, download `GymBuddy.apk`, and allow *Install unknown apps*.

Both are rebuilt automatically on every push to `main`.

## Develop

```bash
npm install
npm run dev        # open the printed URL; camera needs https or localhost
npm run build
```

Android project (needs Android Studio / JDK 17 locally):

```bash
npm run build && npx cap add android && npx cap sync android && npx cap open android
```

Add `<uses-permission android:name="android.permission.CAMERA" />` to `android/app/src/main/AndroidManifest.xml` (the CI workflow does this for you).

## Current limits

- The form rules are tuned for curls. Other exercises run the same counter, so their rep counts may be off.
- The pose model and its runtime load from the internet the first time the camera opens.
- Coach view uses sample clients; there are no accounts or cloud sync yet.
