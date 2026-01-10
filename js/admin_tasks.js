import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    addDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initDashboardNotifications } from "./dashboard_notifications.js";
import { showModal } from "./ui.js";
const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com";

// 1. حماية الصفحة
function initAdminGuard() {
    onAuthStateChanged(auth, (user) => {
        if (!user || user.email !== ADMIN_EMAIL) {
            window.location.href = "../index.html";
        } else {
            document.getElementById("mobileUserAvatar").src =
                user.photoURL || "../images/user.webp";
            initDashboardNotifications(user.uid);
        }
    });
}

// 2. منطق إضافة التاسك
function setupTaskForm() {
    const submitBtn = document.querySelector(".submit-task");

    if (!submitBtn) return;

    submitBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const title = document.getElementById("taskTitle").value.trim();
        const moduleVal = document.getElementById("taskModule").value.trim();
        const priority = document.getElementById("taskPriority").value;
        const desc = document.getElementById("taskDesc").value.trim();
        const deadline = document.getElementById("taskDeadline").value;

        if (!title || !moduleVal) {
            showModal(
                "Missing Info",
                "Please enter at least the Title and Module.",
                "error"
            );
            return;
        }

        // تغيير حالة الزر
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';
        submitBtn.disabled = true;

        try {
            // 🔥 بيانات التاسك في الداتابيز
            const newTask = {
                title: title,
                module: moduleVal,
                priority: priority,
                description: desc,
                deadline: deadline || "No Deadline",
                status: "open", // الحالة الافتراضية: متاحة للجميع
                assignedTo: null, // لم يتم تعيينها لأحد بعد
                assignedName: null,
                submissionUrl: null,
                createdAt: serverTimestamp(),
                createdBy: "Admin",
            };

            // الحفظ في Collection جديد اسمه "tasks"
            await addDoc(collection(db, "tasks"), newTask);

            showModal(
                "Success!",
                "New task has been published to the team board. 🚀",
                "success"
            );

            // تصفير الحقول
            document.getElementById("addTaskForm").reset();
        } catch (error) {
            console.error("Error creating task:", error);
            showModal(
                "Error",
                "Something went wrong: " + error.message,
                "error"
            );
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// // 3. المودل (نسخناه من admin.js ليعمل هنا أيضاً بشكل مستقل)
// function showModal(title, message, type = "success") {
//     const overlay = document.getElementById("customModal");
//     const box = overlay.querySelector(".modal-box");
//     const titleEl = document.getElementById("modalTitle");
//     const msgEl = document.getElementById("modalMessage");
//     const iconEl = document.getElementById("modalIconClass");
//     const btn = document.getElementById("modalOkBtn");

//     titleEl.textContent = title;
//     msgEl.textContent = message;

//     box.className = "modal-box";
//     if (type === "success") {
//         box.classList.add("success");
//         iconEl.className = "fa-solid fa-check";
//     } else {
//         box.classList.add("error");
//         iconEl.className = "fa-solid fa-xmark";
//     }

//     overlay.classList.add("active");
//     btn.onclick = () => overlay.classList.remove("active");
// }

document.addEventListener("DOMContentLoaded", () => {
    initAdminGuard();
    setupTaskForm();
});
