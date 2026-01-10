import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    deleteDoc,
    updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showModal, showConfirmModal } from "./ui.js";
import { initDashboardNotifications } from "./dashboard_notifications.js";
const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com";
let allTasks = []; // لتخزين البيانات والفلترة محلياً

// 1. الحماية
function initAdminGuard() {
    onAuthStateChanged(auth, (user) => {
        if (!user || user.email !== ADMIN_EMAIL) {
            window.location.href = "../index.html";
        } else {
            document.getElementById("mobileUserAvatar").src =
                user.photoURL || "../images/user.webp";
            initDashboardNotifications(user.uid);
            initTasksListener();
        }
    });
}

// 2. الاستماع للمهام (Real-time)
function initTasksListener() {
    // نجلب كل التاسكات ونرتبها بالأحدث
    // (إذا طلب منك Index في الكونسول، اضغط على الرابط، أو احذف orderBy مؤقتاً)
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));

    onSnapshot(
        q,
        (snapshot) => {
            allTasks = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            applyFilters(); // رسم الجدول
        },
        (error) => {
            console.error("Error fetching tasks:", error);
            // في حالة خطأ الـ Index، نجرب بدون ترتيب
            if (error.code === "failed-precondition") {
                const qFallback = collection(db, "tasks");
                onSnapshot(qFallback, (snap) => {
                    allTasks = snap.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    // ترتيب محلي
                    allTasks.sort(
                        (a, b) =>
                            (b.createdAt?.seconds || 0) -
                            (a.createdAt?.seconds || 0)
                    );
                    applyFilters();
                });
            }
        }
    );
}

// 3. الفلترة والرسم
function applyFilters() {
    const filterVal = document.getElementById("statusFilter").value;
    const tbody = document.getElementById("allTasksTable");

    let filtered = allTasks;
    if (filterVal !== "all") {
        filtered = allTasks.filter((t) => t.status === filterVal);
    }

    document.getElementById("tasksCount").innerText =
        "Total: " + filtered.length;
    tbody.innerHTML = "";

    if (filtered.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="5" style="text-align:center; padding:30px; color:#777;">No tasks found.</td></tr>';
        return;
    }

    filtered.forEach((t) => {
        const dateOptions = { year: "numeric", month: "short", day: "numeric" };
        const date = t.createdAt
            ? new Date(t.createdAt.seconds * 1000).toLocaleDateString(
                  "en-US",
                  dateOptions
              )
            : "-";

        // شارة الحالة
        let badgeClass = "st-open";
        let badgeText = t.status.charAt(0).toUpperCase() + t.status.slice(1);
        if (t.status === "assigned") {
            badgeClass = "st-assigned";
            badgeText = "In Progress";
        }
        if (t.status === "review") {
            badgeClass = "st-review";
            badgeText = "Review";
        }
        if (t.status === "approved") {
            badgeClass = "st-approved";
            badgeText = "Done";
        }

        // اسم الشخص
        const assignedInfo = t.assignedName
            ? `<span class="badge-download badge-gray"><i class="fa-solid fa-user fa-fw" style="font-size:0.8rem; color:#777;"></i> ${t.assignedName}</span>`
            : `<span style="color:#888; font-style: italic">Not Assigned</span>`;

        // الأزرار المتاحة
        // زر "سحب التاسك" يظهر فقط لو التاسك محجوز ومش مكتمل
        let resetBtn = "";
        if (t.status === "assigned" || t.status === "review") {
            resetBtn = `
                <button class="action-btn edit" onclick="window.resetTask('${t.id}', '${t.title}')" title="Unassign (Reset to Open)">
                    Reset <i class="fa-solid fa-rotate-left"></i>
                </button>
            `;
        }

        tbody.innerHTML += `
            <tr>
                <td><strong>${t.title}</strong><br><small style="color:#777;">${t.module}</small></td>
                <td><span class="badge-download ${badgeClass}">${badgeText}</span></td>
                <td>${assignedInfo}</td>
                <td>${date}</td>
                <td>
                    ${resetBtn}
                    <button class="action-btn delete" onclick="window.deleteTask('${t.id}', '${t.title}')" title="Delete Task">
                        Delete <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// 4. حذف التاسك (Delete)
window.deleteTask = async function (id, title) {
    showConfirmModal(
        "DANGER",
        `Are you sure you want to PERMANENTLY delete task "${title}"?`,
        async () => {
            try {
                await deleteDoc(doc(db, "tasks", id));
                // لا نحتاج تحديث الجدول يدوياً لأن onSnapshot سيفعل ذلك
                showModal("Deleted", "Task deleted successfully.", "success");
            } catch (e) {
                showModal("Error", e.message, "error");
            }
        },
        "Yes, Delete",
        "danger"
    );
};

// 5. سحب التاسك (Unassign / Reset)
window.resetTask = async function (id, title) {
    showConfirmModal(
        "Warning",
        `Are you sure you want to unassign "${title}"?\nThis will remove it from the creator and make it 'Open' again.`,
        async () => {
            try {
                await updateDoc(doc(db, "tasks", id), {
                    status: "open",
                    assignedTo: null,
                    assignedName: null,
                    assignedAt: null,
                    submissionUrl: null, // مسح الرابط القديم إن وجد
                });
            } catch (e) {
                showModal("Error", e.message, "error");
            }
        },
        "Yes, Reset",
        "warning"
    );
};

// تفعيل الفلتر عند التغيير
document
    .getElementById("statusFilter")
    .addEventListener("change", applyFilters);

document.addEventListener("DOMContentLoaded", initAdminGuard);
