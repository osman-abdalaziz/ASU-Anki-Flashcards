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

// 🔥 استيراد دوال الإشعارات من ملف db.js
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
                    // السماح للصناع والأدمن
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
                } else {
                    window.location.href = "../index.html";
                }
            } catch (e) {
                console.error(e);
                window.location.href = "../index.html";
            }
        } else {
            window.location.href = "../signin.html";
        }
    });
}

function updateUI(user, data) {
    const avatar = document.getElementById("makerAvatar");
    const name = document.getElementById("makerName");
    if (avatar) avatar.src = user.photoURL || "../images/user.webp";
    if (name) name.innerText = data.name || "Creator";
    document.body.style.display = "flex";
}

// ==========================================
// 2. موجه الصفحات (Router)
// ==========================================
function routePageLogic(user) {
    const path = window.location.pathname;

    // 🔥 تشغيل نظام الإشعارات في كل الصفحات
    initNotificationSystem(user);
    initCounters(user);

    if (path.includes("index.html")) {
        initTaskBoard(user);
    } else if (path.includes("my_tasks.html")) {
        initMyTasks(user);
    } else if (path.includes("upload_deck.html")) {
        initUploadPage(user);
    }
}

// ==========================================
// 3. صفحة اللوحة الرئيسية (Board)
// ==========================================
function initTaskBoard(user) {
    const q = query(collection(db, "tasks"), where("status", "==", "open"));
    onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const tbody = document.getElementById("openTasksTable");
        const countEl = document.getElementById("statOpenTasks");

        if (countEl) countEl.innerText = tasks.length;
        if (!tbody) return;

        tbody.innerHTML = "";
        if (tasks.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="4" style="text-align:center; padding:20px; color:#777;">No available tasks.</td></tr>';
            return;
        }

        // ترتيب محلي
        tasks.sort((a, b) => (b.priority === "High" ? 1 : -1));

        tasks.forEach((t) => {
            let badge = "";
            if (t.priority === "High") {
                badge = `<span class="badge-download badge-red ">High</span>`;
            } else if (t.priority === "Low") {
                badge = `<span class="badge-download badge-gray">Low</span>`;
            } else {
                badge = `<span class="badge-download">Normal</span>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td><strong>${
                        t.title
                    }</strong><br><small style="color:#777">${
                t.description || ""
            }</small></td>
                    <td>${t.module}</td>
                    <td>${badge}</td>
                    <td>
                        <button style="padding: 5px 15px" class="main-btn" onclick="window.claimTask('${
                            t.id
                        }', '${
                t.title
            }')">Take Task <i class="fa-solid fa-handshake-angle fa-fw"></i></button>
                    </td>
                </tr>`;
        });
    });
    window.currentUser = user;
}

// ==========================================
// 4. صفحة مهامي (My Tasks)
// ==========================================
function initMyTasks(user) {
    // بدون orderBy لتجنب الأخطاء
    const q = query(
        collection(db, "tasks"),
        where("assignedTo", "==", user.uid)
    );

    onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        const activeTable = document.getElementById("myTasksTable");
        const completedTable = document.getElementById("completedTasksTable");

        if (!activeTable || !completedTable) return;

        activeTable.innerHTML = "";
        completedTable.innerHTML = "";

        const activeTasks = tasks.filter((t) => t.status !== "approved");
        const completedTasks = tasks.filter((t) => t.status === "approved");

        // ترتيب محلي
        activeTasks.sort(
            (a, b) =>
                (b.assignedAt?.seconds || 0) - (a.assignedAt?.seconds || 0)
        );
        completedTasks.sort(
            (a, b) =>
                (b.approvedAt?.seconds || 0) - (a.approvedAt?.seconds || 0)
        );

        // رسم المهام النشطة
        if (activeTasks.length === 0) {
            activeTable.innerHTML =
                '<tr><td colspan="4" style="text-align:center; padding:30px; color:#777;">No active tasks currently.</td></tr>';
        } else {
            activeTasks.forEach((t) => {
                let statusBadge =
                    t.status === "review"
                        ? `<span class="badge-download st-review">Under Review</span>`
                        : `<span class="badge-download st-assigned">In Progress</span>`;

                let action =
                    t.status === "review"
                        ? `<span style="color:#777; font-size:0.85rem;"><i class="fa-solid fa-clock fa-fw"></i> Waiting Admin</span>`
                        : `<a href="upload_deck.html?taskId=${t.id}" class="action-btn main-btn">Submit Work <i class="fa-solid fa-arrow-right"></i></a>`;

                activeTable.innerHTML += `
                    <tr>
                        <td><strong>${t.title}</strong></td>
                        <td>${t.module}</td>
                        <td>${statusBadge}</td>
                        <td>${action}</td>
                    </tr>`;
            });
        }

        // رسم المهام المكتملة
        if (completedTasks.length === 0) {
            completedTable.innerHTML =
                '<tr><td colspan="3" style="text-align:center; padding:30px; color:#777;">No completed tasks yet.</td></tr>';
        } else {
            completedTasks.forEach((t) => {
                const dateOptions = {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                };
                const date = t.approvedAt
                    ? t.approvedAt
                          .toDate()
                          .toLocaleDateString("en-US", dateOptions)
                    : "Recently";

                completedTable.innerHTML += `
                    <tr>
                        <td><strong>${t.title}</strong></td>
                        <td>${date}</td>
                        <td><span class="badge-download badge-green">Approved</span></td>
                    </tr>`;
            });
        }
    });
}

// ==========================================
// 5. صفحة الرفع (Upload Page)
// ==========================================
async function initUploadPage(user) {
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    const fileNameDisplay = document.getElementById("fileNameDisplay");
    const taskSelect = document.getElementById("taskSelect"); // تأكد من تعريفه

    // 🔥 التصحيح: تعريف الفورم هنا 🔥
    const form = document.getElementById("uploadForm");

    // 1. تفعيل النقر
    if (dropZone) {
        dropZone.addEventListener("click", () => fileInput.click());

        // 2. تفعيل السحب والإفلات (Drag & Drop)
        ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ["dragenter", "dragover"].forEach((eventName) => {
            dropZone.addEventListener(
                eventName,
                () => dropZone.classList.add("active"),
                false
            );
        });
        ["dragleave", "drop"].forEach((eventName) => {
            dropZone.addEventListener(
                eventName,
                () => dropZone.classList.remove("active"),
                false
            );
        });

        dropZone.addEventListener("drop", (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInput.files = files;
                updateFileName(files[0].name);
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener("change", () => {
            if (fileInput.files.length > 0)
                updateFileName(fileInput.files[0].name);
        });
    }

    function updateFileName(name) {
        if (fileNameDisplay)
            fileNameDisplay.innerHTML = `<span style="color:var(--main-color); font-weight:600;">${name}</span>`;
    }

    // جلب التاسكات للقائمة
    const q = query(
        collection(db, "tasks"),
        where("assignedTo", "==", user.uid),
        where("status", "==", "assigned")
    );
    onSnapshot(q, (snapshot) => {
        if (!taskSelect) return;
        taskSelect.innerHTML = '<option value="">- Select a Task -</option>';
        snapshot.forEach((doc) => {
            const t = doc.data();
            taskSelect.innerHTML += `<option value="${doc.id}">${t.title}</option>`;
        });

        const urlParams = new URLSearchParams(window.location.search);
        const preSelectedId = urlParams.get("taskId");
        if (preSelectedId) taskSelect.value = preSelectedId;
    });

    // معالجة الرفع
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const taskId = taskSelect.value;
            const file = fileInput.files[0];

            if (!taskId || !file) {
                // استخدام المودال بدلاً من alert (اختياري، أو اتركه alert للسرعة)
                showModal("error", "Please select a task and a file.");
                return;
            }

            const btn = document.getElementById("submitBtn");
            const originalText = btn.innerHTML;
            btn.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
            btn.disabled = true;

            try {
                // 1. رفع الملف
                const storageRef = ref(
                    storage,
                    `submissions/${taskId}_${file.name}`
                );
                await uploadBytes(storageRef, file);
                const downloadUrl = await getDownloadURL(storageRef);

                // 2. تحديث التاسك
                await updateDoc(doc(db, "tasks", taskId), {
                    status: "review",
                    submissionUrl: downloadUrl,
                    submittedAt: serverTimestamp(),
                    fileName: file.name,
                });

                // 3. إشعار الأدمن
                const adminUID = await getAdminUID();
                if (adminUID) {
                    await sendUserNotification(
                        adminUID,
                        "New Submission 🚀",
                        `${user.displayName || "Maker"} submitted "${
                            file.name
                        }"`,
                        "task_submissions.html",
                        "info"
                    );
                }

                showModal(
                    "Success",
                    "Work submitted successfully!",
                    "success",
                    "Ok",
                    () => (window.location.href = "my_tasks.html")
                );
            } catch (error) {
                console.error("Upload Error:", error);
                showModal(
                    "Error",
                    "Error uploading file: " + error.message,
                    "error"
                );
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
}

// ==========================================
// 6. دوال مساعدة عامة
// ==========================================
function initCounters(user) {
    const tasksRef = collection(db, "tasks");

    // My Active
    const qActive = query(
        tasksRef,
        where("assignedTo", "==", user.uid),
        where("status", "in", ["assigned", "review"])
    );
    onSnapshot(qActive, (snap) => {
        const el = document.getElementById("statMyActive");
        if (el) el.innerText = snap.size;
    });

    // Completed
    const qDone = query(
        tasksRef,
        where("assignedTo", "==", user.uid),
        where("status", "==", "approved")
    );
    onSnapshot(qDone, (snap) => {
        const el = document.getElementById("statCompleted");
        if (el) el.innerText = snap.size;
    });
}

// ==========================================
// 7. دالة الحجز (Global)
// ==========================================
window.claimTask = async function (taskId, title) {
    const user = window.currentUser;
    // بدلاً من confirm نستخدم المودال الجديد
    showConfirmModal(
        "Claim Task",
        `Are you sure you want to take "${title}"?`,
        async () => {
            try {
                await updateDoc(doc(db, "tasks", taskId), {
                    status: "assigned",
                    assignedTo: user.uid,
                    assignedName: user.displayName || "Creator",
                    assignedAt: serverTimestamp(),
                });
                showModal("Success", "Task claimed successfully!", "success");
            } catch (e) {
                showModal("Error", e.message, "error");
            }
        },
        "Yes, Start",
        "info" // 🔥 النوع: أزرق
    );
};

// ==========================================
// 8. دوال واجهة الإشعارات (UI Helpers)
// ==========================================
window.toggleNotifications = function () {
    const dropdown = document.getElementById("notificationDropdown");
    const badge = document.getElementById("notifBadge");

    if (dropdown) {
        const isHidden = dropdown.style.display === "none";
        dropdown.style.display = isHidden ? "block" : "none";

        if (isHidden && badge) {
            badge.style.display = "none";
        }
    }
};

document.addEventListener("click", (e) => {
    const wrapper = document.querySelector(".notification-wrapper");
    const dropdown = document.getElementById("notificationDropdown");
    if (wrapper && dropdown && !wrapper.contains(e.target)) {
        dropdown.style.display = "none";
    }
});

// بدء التشغيل
document.addEventListener("DOMContentLoaded", () => {
    document.body.style.display = "none";
    initMakerGuard();
});
