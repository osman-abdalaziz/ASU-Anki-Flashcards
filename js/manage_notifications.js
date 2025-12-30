import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com";
onAuthStateChanged(auth, (user) => { if (!user || user.email !== ADMIN_EMAIL) window.location.href = "../index.html"; });

const tableBody = document.getElementById('notifTableBody');

async function loadNotifs() {
    tableBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    const querySnapshot = await getDocs(collection(db, "general_notifications"));
    tableBody.innerHTML = '';

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        tableBody.innerHTML += `
            <tr>
                <td>${data.title}</td>
                <td>${data.message.substring(0, 50)}...</td>
                <td>${data.type}</td>
                <td>
                    <button class="action-btn edit" onclick="window.openEditNotif('${docSnap.id}', '${data.title}', '${data.message}')">
                        Edit <i class="fa-solid fa-pen fa-fw"></i>
                    </button>
                    <button class="action-btn delete" onclick="window.deleteNotif('${docSnap.id}')">
                        Delete <i class="fa-solid fa-trash fa-fw"></i>
                    </button>
                </td>
            </tr>`;
    });
}

window.deleteNotif = async (id) => {
    if (confirm("Delete this notification?")) {
        await deleteDoc(doc(db, "general_notifications", id));
        loadNotifs();
    }
};

window.openEditNotif = (id, title, message) => {
    document.getElementById('editNotifId').value = id;
    document.getElementById('editTitle').value = title;
    document.getElementById('editMessage').value = message;
    document.getElementById('editNotifModal').classList.add('active');
};

window.closeEditModal = () => {
    document.getElementById('editNotifModal').classList.remove('active');
};

document.getElementById('editNotifForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editNotifId').value;
    await updateDoc(doc(db, "general_notifications", id), {
        title: document.getElementById('editTitle').value,
        message: document.getElementById('editMessage').value
    });
    showModal("Updated!", "The Notification Is Updated Successfully", 'success')
    closeEditModal();
    loadNotifs();
});

document.addEventListener('DOMContentLoaded', loadNotifs);

function showModal(title, message, type = 'success') {
    const overlay = document.getElementById('customModal');
    const box = overlay.querySelector('.modal-box');
    const titleEl = document.getElementById('modalTitle');
    const msgEl = document.getElementById('modalMessage');
    const iconEl = document.getElementById('modalIconClass');
    const btn = document.getElementById('modalOkBtn');

    // تعبئة البيانات
    titleEl.textContent = title;
    msgEl.textContent = message;

    // تنسيق حسب النوع (نجاح أو خطأ)
    box.className = 'modal-box'; // reset classes
    if (type === 'success') {
        box.classList.add('success');
        iconEl.className = 'fa-solid fa-check';
    } else {
        box.classList.add('error');
        iconEl.className = 'fa-solid fa-xmark';
    }

    // إظهار المودل
    overlay.classList.add('active');

    // إغلاق المودل عند الضغط
    btn.onclick = () => overlay.classList.remove('active');
}

// ==========================================
// 4. منطق البحث في الجدول 🔍
// ==========================================
const searchInput = document.getElementById('searchNotifInput');

if (searchInput) {
    searchInput.addEventListener('keyup', function () {
        const filter = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll('#notifTableBody tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(filter)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}