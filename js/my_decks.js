import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;

            const statusClass =
                data.status === "approved"
                    ? "status-approved"
                    : "status-pending";
            const statusText =
                data.status === "approved" ? "Approved" : "Pending";

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><img src="${data.imageUrl}" class="banner-thumb" alt="Banner" onerror="this.src='../images/default_banner.webp'"></td>
                <td>
                    <div style="font-weight: 600; color: #fff;">${data.title}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary-color);">${data.module} - ${data.year}</div>
                </td>
                <td>${data.type || "Theoretical"}</td>
                <td><span style="background: rgba(255,255,255,0.1); padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">${data.version || "v1.0"}</span></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <a href="submit_deck.html?id=${id}" class="action-btn" title="Edit & Update">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </a>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading decks:", error);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error loading data.</td></tr>`;
    }
}
