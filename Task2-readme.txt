
 Task2-readme.txt

App name: VolunteerHub (DugnadApp)

Description:
This app is built with React Native (Expo) + Firebase and provides a complete volunteer-event platform where users can register/login, browse volunteer work, view event details, sign up for events, and (if organiser) create new volunteer activities with images from the camera or gallery. Navigation is handled with React Navigation, and all data is stored in Firestore/Storage.

---

 Implemented Core Requirements

1. User Authentication

    Firebase Email/Password login and registration.
    User accounts stored in Firestore with roles (volunteer/organiser).

2. Viewing Volunteer Work (Dugnader)

    List of all upcoming events.
    Search and category filter.
    Event details page with title, description, tasks, category, volunteer capacity, and images.
    Users can sign up for events (with automatic update of remaining capacity).

3. Creation of New Volunteer Events

    Organisers can create new events with:

      Title
      Description
      Tasks
      Category
      Location
      Date/time
      Max volunteers
      Uploading images via camera or gallery
    Images stored in Firebase Storage.

4. Navigation

    Auth stack + bottom tab navigation.
    Navigation between event list → event details → profile → create event.

---

 Extended Functionality Implemented

 Simple (3 features)

1. Search & Filter – Users can search events by title/description and filter by category.
2. Error Handling – Custom error banner + alerts for authentication, uploads, and form errors.
3. Favorites – Users can mark/unmark favorite events and view them in profile.

 Medium (2 features)

4. Personal Statistics – Profile screen shows total events participated, upcoming events, past events, and favorite events.
5. Event Management (Capacity Tracking) – Each event has a max capacity; remaining slots update when users sign up/withdraw.

 Advanced (1 feature)

6. User Roles (Organiser vs Volunteer) –

    Organisers can create events and manage events they created.
    Volunteers can only view and sign up.
    Role switch (for testing) included in profile.

---

 Testing Platforms

 Android Emulator: ✔ Tested successfully
 Web (Expo Web): ✔ Tested successfully
 iOS Simulator: ✘ Not tested (macOS environment may vary)

---

 Notes

 Images stored in Firebase Storage.
 Firestore rules currently in “test mode” for development.
 The app runs with Firebase config loaded from .env using `process.env.EXPO_PUBLIC_`.
 For the video demo (loom), each implemented feature can be shown from the emulator.

