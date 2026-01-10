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

        tbody.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const t = docSnap.data();

            const dateOptions = {
                year: "numeric",
                month: "short",
                day: "numeric",
            };
            const date = t.submittedAt
                ? new Date(t.submittedAt.seconds * 1000).toLocaleDateString(
                      "en-US",
                      dateOptions
                  )
                : "Just now";

            const row = `
    <tr>
        <td><strong>${t.title}</strong><br><small style="color: #777">${
                t.module
            }</small></td>
        <td><span class="badge-download badge-gray"><i class="fa-solid fa-user fa-fw" style="font-size:0.8rem; color:#777;"></i> ${
            t.assignedName || "Unknown"
        }</span></td>
        <td style="color: var(--main-color);">${t.fileName || "File.apkg"}</td>
        <td>${date}</td> <td>
            <a  style="display: inline-block; margin-right: 5px"  href="${
                t.submissionUrl
            }" target="_self" download class="action-btn main-btn" title="Download">
                Download <i class="fa-solid fa-download"></i> 
            </a>
            <button style="margin-right: 5px" class="action-btn btn-success" onclick="window.approveTask('${
                docSnap.id
            }', '${t.title}')">
                Approve <i class="fa-solid fa-check"></i> 
            </button>
            <button  class="action-btn delete" onclick="window.rejectTask('${
                docSnap.id
            }', '${t.title}')">
                Reject <i class="fa-solid fa-xmark"></i> 
            </button>
        </td>
    </tr>
`;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error("Error loading submissions:", error);
        tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
    }
}

// 3. الموافقة على التاسك (Approve)
window.approveTask = async function (taskId, title) {
    showConfirmModal("Approve Task", `Approve "${title}"?`, async () => {
        try {
            // 1. نجلب التاسك لمعرفة من هو الصانع (assignedTo)
            const taskRef = doc(db, "tasks", taskId);
            const taskSnap = await getDoc(taskRef);
            const makerId = taskSnap.exists()
                ? taskSnap.data().assignedTo
                : null;

            // 2. التحديث
            await updateDoc(taskRef, {
                status: "approved",
                approvedAt: serverTimestamp(),
            });

            // 3. 🔥 إرسال إشعار للصانع 🔥
            if (makerId) {
                await sendUserNotification(
                    makerId,
                    "Task Approved! 🎉",
                    `Great job! Your work on "${title}" has been approved.`,
                    "my_tasks.html",
                    "success"
                );
            }

            showModal("Approved", "Task approved successfully.", "success");
            loadSubmissions();
        } catch (e) {
            showModal("Error", e.message, "error");
        }
    });
};

// 4. رفض التاسك (Reject)
window.rejectTask = async function (taskId, title) {
    showInputModal(
        "Reject Task",
        "Enter reason for rejection...",
        async (reason) => {
            try {
                const taskRef = doc(db, "tasks", taskId);
                const taskSnap = await getDoc(taskRef);
                const makerId = taskSnap.exists()
                    ? taskSnap.data().assignedTo
                    : null;

                await updateDoc(doc(db, "tasks", taskId), {
                    status: "assigned",
                    adminComment: reason,
                    rejectedAt: serverTimestamp(),
                });

                // 3. 🔥 إرسال إشعار للصانع 🔥
                if (makerId) {
                    await sendUserNotification(
                        makerId,
                        "Task Rejected ⚠️",
                        `Admin returned "${title}": ${reason}`,
                        "upload_deck.html", // ليعيد الرفع
                        "error"
                    );
                }

                showModal("Rejected", "Task returned to maker.", "success");
                loadSubmissions();
            } catch (e) {
                showModal("Error", e.message, "error");
            }
        }
    );
};

// 5. المودل (للتنبيهات)

document.addEventListener("DOMContentLoaded", initAdminGuard);
