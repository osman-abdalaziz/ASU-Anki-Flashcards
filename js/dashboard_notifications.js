// =========================================================
// 🔔 DASHBOARD NOTIFICATIONS SYSTEM (Admins & Makers Only)
// =========================================================

import { db, auth } from "./config.js";
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    doc,
    updateDoc,
    writeBatch,
    where,
    getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * دالة التهيئة
 */
export function initDashboardNotifications(userUid) {
    const btn = document.getElementById("dashNotifBtn");
    const badge = document.getElementById("dashNotifBadge");
    const dropdown = document.getElementById("dashNotifDropdown");
    const list = document.getElementById("dashNotifList");
    const markAllBtn = document.getElementById("dashMarkAllRead");

    if (!btn || !dropdown || !list) return;

    // فتح/غلق القائمة
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isVisible = dropdown.style.display === "block";
        dropdown.style.display = isVisible ? "none" : "block";
    });

    // إغلاق عند الضغط خارجها
    document.addEventListener("click", (e) => {
        if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });

    // زر تعليم الكل كمقروء
    if (markAllBtn) {
        markAllBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            markAllAsRead(userUid);
        });
    }

    // الاستماع للإشعارات (Real-time)
    const q = query(
        collection(db, "users", userUid, "notifications"),
        orderBy("createdAt", "desc"),
        limit(50)
    );

    onSnapshot(q, (snapshot) => {
        const allNotifs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        // تحديث العداد
        const unreadCount = allNotifs.filter((n) => !n.read).length;
        updateBadge(unreadCount, badge);

        // عرض غير المقروء فقط
        const notifsToShow = allNotifs.filter((n) => !n.read);
        renderNotifications(notifsToShow, list);
    });
}

function updateBadge(count, badgeEl) {
    if (count > 0) {
        badgeEl.style.display = "flex";
        badgeEl.innerText = count > 9 ? "9+" : count;
    } else {
        badgeEl.style.display = "none";
    }
}

// رسم القائمة (مع الأزرار الجديدة)
function renderNotifications(notifs, container) {
    container.innerHTML = "";

    if (notifs.length === 0) {
        container.innerHTML =
            '<div class="notif-item"><p class="notif-text" style="text-align:center; color:#777;">No new notifications.</p></div>';
        return;
    }

    notifs.forEach((n) => {
        // الألوان والأيقونات
        let icon = "fa-bell";
        let colorClass = "bg-blue";

        if (n.type === "success") {
            icon = "fa-check";
            colorClass = "bg-green";
        }
        if (n.type === "error") {
            icon = "fa-xmark";
            colorClass = "bg-red";
        }
        if (n.type === "warning") {
            icon = "fa-exclamation";
            colorClass = "bg-orange";
        }

        const date = n.createdAt ? n.createdAt.toDate() : new Date();
        const timeStr = date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        // تجهيز زر الرابط (إن وجد)
        let linkBtnHTML = "";
        if (n.link && n.link !== "#") {
            linkBtnHTML = `
                <a href="${n.link}" class="notif-action-btn open-link" style="
                    background-color: var(--main-color); 
                    color: white; 
                    border: none;
                ">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Open
                </a>
            `;
        }

        // العنصر الحاوي
        const li = document.createElement("div");
        li.className = "notif-item";
        li.style.cssText = `
            display: flex; gap: 12px; padding: 12px 15px; 
            background-color: var(--card-color);
            cursor: default; /* إلغاء مؤشر اليد عن كامل العنصر */
        `;

        // المحتوى الداخلي مع الأزرار
        li.innerHTML = `
            <div class="notif-icon ${colorClass}" style="width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.9rem;">
                <i class="fa-solid ${icon}"></i>
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-color); margin-bottom: 4px;">
                    ${n.title}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary-color); line-height: 1.4; margin-bottom: 8px;">
                    ${n.body}
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                    <div style="display: flex; gap: 8px;">
                        ${linkBtnHTML}
                        <button class="notif-action-btn mark-read" style="
                            background-color: white; 
                            color: #555; 
                            border: 1px solid #ddd;
                        ">
                            <i class="fa-solid fa-check"></i> Read
                        </button>
                    </div>
                    <div style="font-size: 0.7rem; color: #aaa;">${timeStr}</div>
                </div>
            </div>
        `;

        // برمجة زر "Mark as Read"
        const markBtn = li.querySelector(".mark-read");
        if (markBtn) {
            markBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                // تحديث الداتا -> onSnapshot يشتغل -> يختفي من القائمة
                await updateDoc(
                    doc(
                        db,
                        "users",
                        auth.currentUser.uid,
                        "notifications",
                        n.id
                    ),
                    { read: true }
                );
            });
        }

        container.appendChild(li);
    });

    // إضافة ستايل سريع للأزرار داخل نفس الدالة لضمان عملها فوراً
    // (ستايل يضمن شكل الأزرار الصغير الجميل)
    const styleId = "notif-btn-styles";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
            .notif-action-btn {
                padding: 4px 10px;
                border-radius: 8px;
                font-size: 0.75rem;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                text-decoration: none;
                transition: 0.2s;
                font-family: inherit;
                font-weight: 500;
            }
            .notif-action-btn:hover {
                opacity: 0.8;
            }
            .notif-action-btn.mark-read{
                background-color: transparent !important;
                color: #ccc !important
            }
            .notif-action-btn.mark-read:hover {
                background-color: #9999990f !important;
                border-color: #ccc !important;
                text-decoration: none !important
            }
        `;
        document.head.appendChild(style);
    }
}

// دالة تعليم الكل كمقروء
async function markAllAsRead(userUid) {
    try {
        const q = query(
            collection(db, "users", userUid, "notifications"),
            where("read", "==", false)
        );
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((docSnap) =>
            batch.update(docSnap.ref, { read: true })
        );
        await batch.commit();
    } catch (e) {
        console.error(e);
    }
}
