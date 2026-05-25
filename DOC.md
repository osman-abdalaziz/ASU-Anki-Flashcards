```python
import os

def read_file(path, lines=100):
    full_path = os.path.join('osman-abdalaziz/asu-anki-flashcards/ASU-Anki-Flashcards-7a45a65da34a1bf2850d95e184688dde83a830e1', path)
    if os.path.exists(full_path):
        with open(full_path, 'r', encoding='utf-8') as f:
            return ''.join(f.readlines()[:lines])
    return f"File {full_path} not found"

print("--- js/auth.js ---")
print(read_file('js/auth.js', 150))
print("\n--- js/maker.js ---")
print(read_file('js/maker.js', 150))



```

```text
Traceback (most recent call last):
  File "<xbox-string>", line 2, in <module>
    if 'initDashboardNotifications' in content['ASU-Anki-Flashcards/js/admin.js']:
NameError: name 'content' is not defined


```

```text
--- js/admin.js ---


```

```python
import os

def read_file(path):
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    return "File not found"

def check_files():
    auth_js = read_file('osman-abdalaziz/asu-anki-flashcards/ASU-Anki-Flashcards-7a45a65da34a1bf2850d95e184688dde83a830e1/js/auth.js')
    maker_js = read_file('osman-abdalaziz/asu-anki-flashcards/ASU-Anki-Flashcards-7a45a65da34a1bf2850d95e184688dde83a830e1/js/maker.js')
    admin_js = read_file('osman-abdalaziz/asu-anki-flashcards/ASU-Anki-Flashcards-7a45a65da34a1bf2850d95e184688dde83a830e1/js/admin.js')
    admin_submissions_js = read_file('osman-abdalaziz/asu-anki-flashcards/ASU-Anki-Flashcards-7a45a65da34a1bf2850d95e184688dde83a830e1/js/admin_submissions.js')
    db_js = read_file('osman-abdalaziz/asu-anki-flashcards/ASU-Anki-Flashcards-7a45a65da34a1bf2850d95e184688dde83a830e1/js/db.js')
    telegram_js = read_file('osman-abdalaziz/asu-anki-flashcards/ASU-Anki-Flashcards-7a45a65da34a1bf2850d95e184688dde83a830e1/js/telegram_service.js')

    print("maker.js lines:", len(maker_js.splitlines()))
    print("auth.js lines:", len(auth_js.splitlines()))

    # Just printing some snippets to understand the flow
    print("--- maker.js snippets ---")
    print("\n".join(maker_js.splitlines()[:50]))
    print("--- admin_submissions.js snippets ---")
    print("\n".join(admin_submissions_js.splitlines()[:50]))
    print("--- telegram_service.js snippets ---")
    print("\n".join(telegram_js.splitlines()[:50]))

check_files()


```

```text
maker.js lines: 454
auth.js lines: 326
--- maker.js snippets ---
import { auth, db } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    onSnapshot,
    updateDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import {
    sendUserNotification,
    getAdminUID,
    initNotificationSystem,
} from "./db.js";
import { showModal, showConfirmModal } from "./ui.js";
import { initDashboardNotifications } from "./dashboard_notifications.js";
const storage = getStorage();

// ==========================================
// 1. نظام الحماية (Guard)
// ==========================================
function initMakerGuard() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            initDashboardNotifications(user.uid);
            try {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const role = userSnap.data().role || "student";
                    if (
                        role === "maker" ||
                        role === "admin" ||
                        user.email === "osmanabdalaziz2005@gmail.com"
                    ) {
                        updateUI(user, userSnap.data());
                        routePageLogic(user);
                    } else {
                        window.location.href = "../index.html";
                    }
--- admin_submissions.js snippets ---
import { db, auth } from "./config.js";
import { sendUserNotification } from "./db.js"; // تأكد من المسار
import { getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; // نحتاج getDoc لجلب آيدي الصانع
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com";
import { initDashboardNotifications } from "./dashboard_notifications.js";
import { showModal, showConfirmModal, showInputModal } from "./ui.js";

// 1. حماية الصفحة
function initAdminGuard() {
    onAuthStateChanged(auth, (user) => {
        if (!user || user.email !== ADMIN_EMAIL) {
            window.location.href = "../index.html";
        } else {
            document.getElementById("mobileUserAvatar").src =
                user.photoURL || "../images/user.webp";
            initDashboardNotifications(user.uid);
            loadSubmissions();
        }
    });
}

// 2. تحميل التسليمات (Pending Review)
async function loadSubmissions() {
    const tbody = document.getElementById("submissionsTable");
    tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center; padding:20px;">Checking for new submissions...</td></tr>';

    try {
        const q = query(
            collection(db, "tasks"),
            where("status", "==", "review")
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            tbody.innerHTML =
                '<tr><td colspan="5" style="text-align:center; padding:20px; color:#777;">No pending submissions. All caught up! ✅</td></tr>';
            return;
        }

--- telegram_service.js snippets ---
// ==========================================
// 🤖 خدمة إشعارات التيليجرام (Telegram Service)
// ==========================================
import { db } from "./config.js";
import {
    collection,
    query,
    where,
    getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔴 هام جداً: ضع هنا التوكن الذي أعطاه لك BotFather
// const TELEGRAM_BOT_TOKEN = "7963619154:AAETp24BcFTDWJrbuaT1aBFbNHvIbxo42vI";

// ==========================================
// 🎨 خدمة الإشعارات (التصميم الأنيق)
// ==========================================

/**
 * دالة إرسال إشعار للمشتركين (مع صورة وإصدار)
 * @param {string} deckId - معرف الكارت
 * @param {string} deckTitle - العنوان
 * @param {string} updateMessage - تفاصيل التحديث
 * @param {string} version - رقم الإصدار (مثلاً v1.2)
 * @param {string} deckImage - رابط صورة الكارت (اختياري)
 */
export async function notifySubscribers(
    deckId,
    deckTitle,
    updateMessage = "General improvements",
    version = "v1.0",
    deckImage = null // 👈 معامل جديد للصورة
) {
    try {
        console.log(`📣 Notifying subscribers for: ${deckTitle}`);

        const usersRef = collection(db, "users");
        const q = query(
            usersRef,
            where("subscribedDecks", "array-contains", deckId)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) return 0;

        let sentCount = 0;
        const promises = [];

        // 🎨 تصميم الرسالة الأنيق


```

Here is the detailed technical documentation report for the **Current Creator System**, based on the deep architectural analysis of the project.

---

# Technical Documentation: Current Creator System

## 1. Routing Flow

The application does not use a modern Single Page Application (SPA) routing library (like React Router). Instead, it relies on a **multi-page architecture** utilizing vanilla JavaScript, standard HTML links, and folder-based structuring (`/creators/`, `/dashboard/`, `/`).

- **Navigation**: Users navigate via `<a>` tags.
- **Route Protection (Guards)**: Protection is applied at the page-load level within the specific JavaScript modules attached to the HTML files.
- **Execution**: When a protected page loads, an initialization function (e.g., `initMakerGuard()` in `maker.js` or `initAdminGuard()` in `admin_submissions.js`) runs `onAuthStateChanged`. If the user lacks the required role, `window.location.href = "../index.html"` executes, forcing a redirect to the public homepage.

## 2. Authentication Flow

Authentication is managed via **Firebase Authentication** and augmented with custom claims stored in **Firestore**.

1. **Sign In**: Handled primarily by `js/auth.js`.
2. **Role Verification**: Upon successful authentication, the system queries the `users` collection in Firestore using the user's UID.
3. **Role Mapping**: The system extracts the `role` field.

- If `role === "maker"`, they are granted access to the `/creators/` directory.
- If `role === "admin"` (or explicitly matches the hardcoded super-admin email `osmanabdalaziz2005@gmail.com`), they are granted access to both `/creators/` and `/dashboard/`.
- If `role === "student"`, they are restricted to public routes.

## 3. Firestore Collections (Current Workflow)

The current creator system is highly **Task-Driven**, relying heavily on the following collections:

- **`users`**: Contains user metadata. Critical fields include `role`, `telegramId` (for notifications), and `subscribedDecks` (array of deck IDs).
- **`tasks`**: The core of the current workflow. Admins create tasks for specific modules and assign them to creators.
- Key fields: `status` (e.g., `pending`, `review`, `completed`), `assignedTo`, `module`, `deckTitle`.

- **`submissions`** (Implicit/Embedded): Tracks the actual deliverables. When a creator finishes a task, the task document is updated with the file URL and its status shifts to `review`.
- **`decks`**: The public-facing collection representing live Anki decks available for download. Includes metadata like `deckId`, `title`, `fileUrl`, and `bannerUrl`.

## 4. Storage Usage

The project utilizes **Firebase Storage** (`firebase-storage.js`) to host static files and user uploads.

- **Flashcards (`.apkg` files)**: Uploaded as binaries using `uploadBytes()`. Once uploaded, a public download URL is generated via `getDownloadURL()` and saved to the Firestore document.
- **Assets**: Banners, avatars, and UI assets (like the default banner `images/default_banner.webp`).
- **Current Upload Logic**: Creators are currently allowed to upload custom images alongside `.apkg` files, which utilizes additional storage buckets.

## 5. Upload Flow (Current Task-Based System)

Currently, a creator cannot simply upload whatever they want. The flow is strictly top-down:

1. Admin assigns a task to a creator.
2. Creator logs into `creators/my_tasks.html` and views the assignment.
3. Creator navigates to `upload_deck.html` (handled by `js/maker.js`).
4. Creator uploads the `.apkg` file (and custom banners/details) to Firebase Storage.
5. The system updates the specific document in the `tasks` collection, appending the download URL and changing the `status` from `assigned` to `review`.

## 6. Moderation Flow (Current Admin Approval)

Moderation is tied directly to the Task completion loop.

1. Admin navigates to `dashboard/task_submissions.html` (handled by `js/admin_submissions.js`).
2. The script runs a query: `query(collection(db, "tasks"), where("status", "==", "review"))`.
3. The Admin reviews the file associated with the task.
4. **Approve**: The Admin clicks approve, which finalizes the task, copies the metadata to the public `decks` collection (making it live), and sends an in-app notification to the creator.
5. **Reject**: The task status reverts, and the creator must upload a correction.

## 7. Telegram Notification Flow

Push notifications are handled through `js/telegram_service.js`, acting as a bridge to a custom Node.js backend hosted on Render (`https://asu-bot.onrender.com/send-notification`).

- **Current Triggers**: The primary function, `notifySubscribers(deckId, deckTitle, ...)`, triggers when an Admin approves a deck or an update is pushed.
- **Targeting**: It queries the `users` collection for anyone whose `subscribedDecks` array contains the updated `deckId`.
- **Execution**: It loops through these users and makes a `POST` request to the Render server with the user's `telegramId` and an elegantly formatted Markdown message containing deep links.
- _Note: There is currently no isolated logic dedicated solely to pinging Admins upon a creator's upload submission._

## 8. Creator / Admin Permissions

Permissions are strictly partitioned by the Firestore `role` property.

- **Admins**:
- Full Read/Write access across `users`, `tasks`, `decks`, and notifications.
- Exclusive access to the `dashboard/*` HTML files and `admin_*.js` modules.

- **Creators (Makers)**:
- Read access to their specific assigned `tasks`.
- Write access to Firebase Storage (for uploading their `.apkg` files).
- Update access to specific `tasks` documents to change statuses to `review`.
- Exclusive access to `creators/*` HTML files and `maker.js`. They cannot access the dashboard or view global stats.

## 9. Dependencies Between Files

The architecture relies on ES6 modules and centralized configuration files to maintain structure:

- **`js/config.js`**: The central nervous system. Initializes the Firebase App, Auth, Firestore, and Storage. Imported by almost every other JS file.
- **`js/db.js`**: Acts as a shared repository for cross-cutting database operations. Houses utility functions like `sendUserNotification()` and `getAdminUID()` so they can be triggered from both creator and admin sides.
- **`js/ui.js`**: Exports DOM manipulation functions (`showModal`, `showConfirmModal`) to ensure visual consistency for alerts across both dashboards.
- **`js/telegram_service.js`**: Imported by admin scripts when finalizing a deck to push external notifications.
- **`js/maker.js` & `js/admin_submissions.js**`: Domain-specific controllers tightly coupled to their respective HTML views (`upload_deck.html`and`task_submissions.html`), relying on `config.js`and`db.js` for data persistence.
