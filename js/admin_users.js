import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    orderBy,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showModal, showConfirmModal } from "./ui.js";
import { initDashboardNotifications } from "./dashboard_notifications.js";
const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com";
let allUsers = [];

// 1. الحماية
function initAdminGuard() {
    onAuthStateChanged(auth, (user) => {
        if (!user || user.email !== ADMIN_EMAIL) {
            window.location.href = "../index.html";
        } else {
            document.getElementById("mobileUserAvatar").src =
                user.photoURL || "../images/user.webp";
            initDashboardNotifications(user.uid);
            loadUsers();
        }
    });
}

// 2. تحميل المستخدمين
async function loadUsers() {
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading users list...</td></tr>';

    try {
        // ترتيب حسب تاريخ الانضمام (الأحدث)
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        allUsers = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

        // 🔥🔥 التعديل الوحيد هنا: ترتيب المصفوفة حسب الرتبة 🔥🔥
        sortUsersByRole();

        renderUsers(allUsers);
    } catch (error) {
        console.error("Error loading users:", error);
        // في حال فشل الترتيب بسبب الاندكس، نجلب بدون ترتيب
        if (error.code === "failed-precondition") {
            const snapshot = await getDocs(collection(db, "users"));
            allUsers = snapshot.docs.map((doc) => ({
                uid: doc.id,
                ...doc.data(),
            }));

            // 🔥 إعادة الترتيب حتى في حالة الخطأ
            sortUsersByRole();

            renderUsers(allUsers);
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
        }
    }
}

// 🔥 دالة مساعدة للترتيب (لكي لا نكرر الكود)
function sortUsersByRole() {
    const rolePriority = { admin: 1, maker: 2, student: 3 };
    allUsers.sort((a, b) => {
        const roleA = a.role || "student";
        const roleB = b.role || "student";
        // الرقم الأقل (1) يظهر أولاً
        return (rolePriority[roleA] || 3) - (rolePriority[roleB] || 3);
    });
}

// 3. رسم الجدول
function renderUsers(users) {
    const tbody = document.getElementById("usersTable");
    const searchVal = document.getElementById("userSearch").value.toLowerCase();

    // فلترة البحث
    const filtered = users.filter(
        (u) =>
            (u.name && u.name.toLowerCase().includes(searchVal)) ||
            (u.email && u.email.toLowerCase().includes(searchVal))
    );

    tbody.innerHTML = "";
    if (filtered.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="4" style="text-align:center; padding:20px;">No users found.</td></tr>';
        return;
    }

    filtered.forEach((u) => {
        const role = u.role || "student";
        const dateOptions = { year: "numeric", month: "short", day: "numeric" };
        const joined = u.createdAt
            ? new Date(u.createdAt.seconds * 1000).toLocaleDateString(
                  "en-US",
                  dateOptions
              )
            : "-";
        const email = u.email || "No Email";

        // منع الأدمن الرئيسي من تغيير رتبته بنفسه
        const isMainAdmin = email === ADMIN_EMAIL;
        const disabledAttr = isMainAdmin ? "disabled" : "";
        const titleAttr = isMainAdmin ? "Can't change main admin role" : "";

        tbody.innerHTML += `
            <tr>
                <td>
                    <div style="font-weight:600; color:var(--text-color);">${
                        u.name || "User"
                    }</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary-color);">${email}</div>
                </td>
                <td>${joined}</td>
                <td><span class="badge-download role-${role}">${role}</span></td>
                <td>
                    <div class="filters" style="margin:0">
                    <select style="${
                        role == "admin" ? "cursor: not-allowed !important;" : ""
                    } margin: 0 auto" onchange="window.updateUserRole('${
            u.uid
        }', this.value, '${u.name}')" 
                            ${disabledAttr} title="${titleAttr}">
                        <option value="student" ${
                            role === "student" ? "selected" : ""
                        }>Student</option>
                        <option value="maker" ${
                            role === "maker" ? "selected" : ""
                        }>Maker (Team)</option>
                        <option value="admin" ${
                            role === "admin" ? "selected" : ""
                        }>Admin</option>
                    </select>
                    </div>
                </td>
            </tr>
        `;
    });
}

// 4. تحديث الرتبة
window.updateUserRole = async function (uid, newRole, userName) {
    showConfirmModal(
        "Update Role",
        `Change ${userName}'s role to "${newRole.toUpperCase()}"?`,
        async () => {
            try {
                await updateDoc(doc(db, "users", uid), { role: newRole });
                showModal("Success", "User role updated!", "success");

                // تحديث المصفوفة المحلية
                const userIndex = allUsers.findIndex((u) => u.uid === uid);
                if (userIndex !== -1) {
                    allUsers[userIndex].role = newRole;
                    // 🔥 إعادة الترتيب فوراً ليقفز المستخدم لمكانه الجديد
                    sortUsersByRole();
                    renderUsers(allUsers);
                }
            } catch (e) {
                showModal("Error", e.message, "error");
            }
        },
        "Confirm",
        "warning"
    );
};

// 5. البحث الفوري
document
    .getElementById("userSearch")
    .addEventListener("input", () => renderUsers(allUsers));

document.addEventListener("DOMContentLoaded", initAdminGuard);
