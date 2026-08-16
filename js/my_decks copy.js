import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    doc, // 👈 أضفنا دي
    updateDoc, // 👈 أضفنا دي
    serverTimestamp, // 👈 أضفنا دي
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showConfirmModal } from "./ui.js";
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById("mobileUserName").innerText =
            user.displayName || "Creator";
        loadMyDecks();
    } else {
        window.location.href = "../index.html";
    }
});

async function loadMyDecks() {
    const tableBody = document.getElementById("myDecksTableBody");
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Loading... <i class="fa-solid fa-spinner fa-spin"></i></td></tr>`;

    try {
        // جلب كروت المستخدم الحالي فقط
        const q = query(
            collection(db, "decks"),
            where("creatorId", "==", currentUser.uid),
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary-color);">You haven't uploaded any decks yet.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";
        let visibleCount = 0; // لعد الكروت غير المحذوفة

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;

            // 🔥 تخطي الكروت المحذوفة
            if (data.isDeleted === true) return;
            visibleCount++;

            const statusClass =
                data.status === "approved" ? "badge-green" : "badge-yellow";
            const statusText =
                data.status === "approved" ? "Approved" : "Pending";

            const row = document.createElement("tr");
            row.innerHTML = `
                <td style="display: flex; align-items: center; justify-content: center;"><img src="${data.imageUrl}" class="banner-thumb" alt="Banner" onerror="this.src='../images/default_banner.webp'"></td>
                <td>
                    <div style="font-weight: 600; color: #fff;">${data.title}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary-color);">${data.module} - ${data.year}</div>
                </td>
                <td>${data.type || "Theoretical"}</td>
                <td><span style="background: rgba(255,255,255,0.1); padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">${data.version || "v1.0"}</span></td>
                <td style="text-align: center;"><span class="badge-download ${statusClass}">${statusText}</span></td>
                <td>
                    <a href="submit_deck.html?id=${id}" class="action-btn edit" title="Edit & Update">
                        Edit <i class="fa-solid fa-pen-to-square"></i> 
                    </a>
                    <!-- 🔥 زر الحذف -->
                    <button style="margin-left: 5px;" class="action-btn delete" title="Delete Deck" onclick="window.confirmDeleteDeck('${id}')">
                        Delete <i class="fa-solid fa-trash"></i> 
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        if (visibleCount === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary-color);">You haven't uploaded any active decks yet.</td></tr>`;
        }
    } catch (error) {
        console.error("Error loading decks:", error);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error loading data.</td></tr>`;
    }
}

// ==========================================
// 🗑️ Delete Deck Logic (Using Clean ui.js)
// ==========================================
window.confirmDeleteDeck = (deckId) => {
    showConfirmModal(
        "Delete Deck?",
        "Are you sure you want to delete this deck? It will be removed from the platform.",
        async () => {
            try {
                // الحذف الفعلي (Soft Delete)
                await updateDoc(doc(db, "decks", deckId), {
                    isDeleted: true,
                    updatedAt: serverTimestamp(),
                });

                // إعادة تحميل الجدول فوراً بعد التحديث لإخفاء الكارت
                loadMyDecks();
            } catch (error) {
                console.error("Error deleting deck:", error);
                alert("Failed to delete deck. Please try again.");
            }
        },
        "Yes, Delete",
        "danger", // عشان يخلي زرار التأكيد وأيقونة المودال لونهم أحمر تلقائياً
    );
};
