import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// بمجرد تحميل الصفحة والتأكد من حالة المستخدم، اجلب عدد الرسائل المرفوضة
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await updateGlobalInboxBadge(user.uid);
    }
});

async function updateGlobalInboxBadge(userId) {
    const badge = document.getElementById("sidebarInboxBadge");

    // إذا كان العنصر غير موجود في الصفحة الحالية، توقف فوراً
    if (!badge) return;

    try {
        const q = query(
            collection(db, "decks"),
            where("creatorId", "==", userId),
            where("status", "==", "rejected"),
        );

        const snapshot = await getDocs(q);
        const rejectedCount = snapshot.size;

        badge.innerText = rejectedCount;
        // إظهار البادج فقط إذا كان هناك كروت مرفوضة
        badge.style.display = rejectedCount > 0 ? "inline-block" : "none";
    } catch (error) {
        console.error("Error fetching inbox badge count:", error);
    }
}
