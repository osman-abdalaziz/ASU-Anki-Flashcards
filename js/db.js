import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./config.js";

// متغير لتخزين الكروت
let allFlashcards = [];

// مفاتيح التخزين في متصفح الطالب
const DOWNLOADS_KEY = 'asu_anki_downloads';

const READ_NOTIFS_KEY = 'asu_anki_read_general';

// ==========================================
// 1. دالة جلب الكروت (الأساسية)
// ==========================================
// export async function loadFlashcards() {
//     const grid = document.getElementById('flashcardsGrid');
//     if (!grid) return;

//     // Spinner
//     grid.innerHTML = `
//         <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px;">
//             <span class="spinner" style="width: 40px; height: 40px; border-width: 4px; margin: 0 0 15px 0; border-color:  var(--text-color)  var(--text-color)  var(--text-color) transparent"></span>
//             <p style="color: var(--text-color); font-size: 0.9rem;">Loading library...</p>
//         </div>
//     `;

//     try {
//         // جلب الكروت من فايربيس
//         const querySnapshot = await getDocs(collection(db, "decks"));

//         if (querySnapshot.empty) {
//             grid.innerHTML = '<p style="color: var(--text-color); text-align:center; grid-column: 1/-1;">No flashcards found.</p>';
//             return;
//         }

//         allFlashcards = [];
//         querySnapshot.forEach((doc) => {
//             allFlashcards.push({ id: doc.id, ...doc.data() });
//         });

//         // رسم الكروت
//         renderCards(allFlashcards);

//         // 🔥 تشغيل نظام الإشعارات الموحد بعد جلب البيانات
//         loadAllNotifications(allFlashcards);

//     } catch (error) {
//         console.error("Error:", error);
//         if (error.code === 'permission-denied') {
//             grid.innerHTML = `
//                 <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
//                     <i class="fa-solid fa-lock" style="font-size: 3rem; color: var(--text-color); margin-bottom: 20px;"></i>
//                     <h3>Members Only</h3>
//                     <p style="color: var(--text-secondary-color); margin-bottom: 20px;">Please sign in to view and download flashcards.</p>
//                 </div>
//             `;
//         } else {
//             grid.innerHTML = '<p style="color:#ff6b6b; text-align:center; grid-column: 1/-1;">Failed to load data.</p>';
//         }
//     }
// }

// في ملف js/db.js

export async function loadFlashcards() {
    const grid = document.getElementById('flashcardsGrid');

    // 1. إظهار "جاري التحميل" فقط إذا كانت الشبكة موجودة في الصفحة
    if (grid) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px;">
                <span class="spinner" style="width: 40px; height: 40px; border-width: 4px; margin: 0 0 15px 0; border-color:  var(--text-color)  var(--text-color)  var(--text-color) transparent"></span>
                <p style="color: var(--text-color); font-size: 0.9rem;">Loading library...</p>
            </div>
        `;
    }

    try {
        // 2. جلب الكروت دائماً (لأننا نحتاجها لمقارنة الإصدارات في الإشعارات)
        const querySnapshot = await getDocs(collection(db, "decks"));

        allFlashcards = [];
        querySnapshot.forEach((doc) => {
            allFlashcards.push({ id: doc.id, ...doc.data() });
        });

        // 🔥🔥🔥 التعديل الجوهري هنا 🔥🔥🔥
        // نشغل نظام الإشعارات الآن، بغض النظر هل وجدنا كروت أم لا، وبغض النظر عن الصفحة التي نحن فيها
        // مررنا المصفوفة (حتى لو كانت فارغة) لكي يتمكن النظام من جلب الإشعارات العامة (General Notifications)
        await loadAllNotifications(allFlashcards);

        // 3. الرسم على الشاشة (فقط إذا كانت الشبكة موجودة)
        if (grid) {
            if (allFlashcards.length === 0) {
                grid.innerHTML = '<p style="color: var(--text-color); text-align:center; grid-column: 1/-1; padding: 40px;">No flashcards found yet.</p>';
            } else {
                renderCards(allFlashcards);
            }
        }

    } catch (error) {
        console.error("Error loading data:", error);

        // التعامل مع رسائل الخطأ في الواجهة فقط إذا كانت الشبكة موجودة
        if (grid) {
            if (error.code === 'permission-denied') {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                        <i class="fa-solid fa-lock" style="font-size: 3rem; color: var(--text-color); margin-bottom: 20px;"></i>
                        <h3>Members Only</h3>
                        <p style="color: var(--text-secondary-color); margin-bottom: 20px;">Please sign in to view and download flashcards.</p>
                    </div>
                `;
            } else {
                grid.innerHTML = '<p style="color:#ff6b6b; text-align:center; grid-column: 1/-1;">Failed to load data. Please try again later.</p>';
            }
        }
    }
}

// ==========================================
// 2. نظام الإشعارات الموحد (Unified System)
// ==========================================
export async function loadAllNotifications(allDecks) {
    // حفظ بيانات الكروت لاستخدامها لاحقاً في زر Mark All
    window.currentDecksData = allDecks;

    const listDesktop = document.querySelector('#notifDropdown .notif-list');
    const listMobile = document.querySelector('#mobileNotifDropdown .notif-list');
    const badgeDesktop = document.getElementById('notifBadge');
    const badgeMobile = document.getElementById('mobileNotifBadge');

    // أ) حساب تحديثات الكروت
    const downloadHistory = JSON.parse(localStorage.getItem(DOWNLOADS_KEY)) || {};
    let cardUpdates = [];

    allDecks.forEach(deck => {
        const userVersion = downloadHistory[deck.id];
        const serverVersion = deck.version;
        // شرط التحديث: الطالب نزل نسخة قديمة + النسخة في السيرفر أحدث
        if (userVersion && userVersion !== serverVersion) {
            cardUpdates.push(deck);
        }
    });

    // ب) جلب الإشعارات العامة
    let generalNotifs = [];
    let currentGeneralIds = []; // لحفظ الـ IDs لغرض Mark All
    const readGeneralIds = JSON.parse(localStorage.getItem(READ_NOTIFS_KEY)) || [];

    try {
        const q = query(collection(db, "general_notifications"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            // الشرط: إذا لم يكن الإشعار موجوداً في قائمة "المقروء"
            if (!readGeneralIds.includes(doc.id)) {
                generalNotifs.push({ id: doc.id, ...doc.data() });
                currentGeneralIds.push(doc.id);
            }
        });

        // حفظ الـ IDs الحالية في Window لزر Mark All
        window.currentGeneralIds = currentGeneralIds;

    } catch (error) {
        console.error("Error fetching general notifications:", error);
    }

    // ج) الدمج والرسم
    const totalCount = cardUpdates.length + generalNotifs.length;

    if (totalCount === 0) {
        const emptyHTML = '<div class="notif-item"><p class="notif-text" style="color: var(--text-secondary-color); text-align:center;">No new notifications.</p></div>';
        if (listDesktop) listDesktop.innerHTML = emptyHTML;
        if (listMobile) listMobile.innerHTML = emptyHTML;
        if (badgeDesktop) badgeDesktop.style.display = 'none';
        if (badgeMobile) badgeMobile.style.display = 'none';
        return;
    }

    let htmlContent = '';

    // 1. رسم تحديثات الكروت
    cardUpdates.forEach(deck => {
        const dateStr = deck.lastUpdate || 'Recent';
        htmlContent += `
            <div class="notif-item unread" style="align-items: flex-start;">
                <div class="notif-icon bg-green">
                    <i class="fa-solid fa-rotate"></i>
                </div>
                <div class="notif-content" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <p class="notif-text" style="margin: 0; color: var(--text-color)">Check The New Update: <b>${deck.title}</b></p>
                        <span style="font-size: 0.65rem; color:  var(--text-secondary-color); white-space: nowrap; margin-left: 8px;">${dateStr}</span>
                    </div>
                    
                    <p class="notif-text" style="margin: 2px 0 5px 0;">
                        <span style="font-size: 0.75rem; color: var(--text-secondary-color);">${downloadHistory[deck.id]} ➝ ${deck.version}</span>
                    </p>

                    <div class="notif-actions">
                        <a href="${deck.downloadUrl}" target="_blank" 
                           onclick="window.handleUpdateClick('${deck.id}', '${deck.version}')"
                           class="notif-action-btn download">Download</a>
                        <button onclick="window.handleUpdateClick('${deck.id}', '${deck.version}')"
                           class="notif-action-btn ignore">Mark read</button>
                    </div>
                </div>
            </div>
        `;
    });

    // 2. رسم الإشعارات العامة
    generalNotifs.forEach(notif => {
        let icon = 'fa-bell';
        let bgClass = 'bg-blue';

        if (notif.type === 'success') { icon = 'fa-check'; bgClass = 'bg-green'; }
        else if (notif.type === 'danger') { icon = 'fa-triangle-exclamation'; bgClass = 'bg-red'; }

        // تحويل التاريخ
        let dateStr = '';
        if (notif.createdAt && notif.createdAt.seconds) {
            const dateObj = new Date(notif.createdAt.seconds * 1000);
            dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        let linkBtnHTML = '';
        if (notif.link && notif.link.trim() !== "") {
            linkBtnHTML = `
                <a href="${notif.link}" target="_blank" 
                   onclick="window.markGeneralAsRead('${notif.id}')"
                   class="notif-action-btn main-btn">
                   Visit Link <i class="fa-solid fa-arrow-up-right-from-square fa-fw"></i>
                </a>
            `;
        }

        htmlContent += `
            <div class="notif-item unread" style="align-items: flex-start;">
                <div class="notif-icon ${bgClass}">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="notif-content" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <p class="notif-text" style="margin: 0; color: var(--text-color)"><b>${notif.title}</b></p>
                        <span style="font-size: 0.65rem; color: var(--text-secondary-color); white-space: nowrap; margin-left: 8px;">${dateStr}</span>
                    </div>
                    
                    <p class="notif-text" style="margin: 5px 0;">${notif.message}</p>
                    
                    <div class="notif-actions">
                        ${linkBtnHTML}
                        <button onclick="window.markGeneralAsRead('${notif.id}')"
                           class="notif-action-btn ignore">Mark read</button>
                    </div>
                </div>
            </div>
        `;
    });

    if (listDesktop) listDesktop.innerHTML = htmlContent;
    if (listMobile) listMobile.innerHTML = htmlContent;

    if (badgeDesktop) { badgeDesktop.style.display = 'flex'; badgeDesktop.innerText = totalCount; }
    if (badgeMobile) { badgeMobile.style.display = 'flex'; badgeMobile.innerText = totalCount; }
}

// ==========================================
// 3. دوال مساعدة (Actions)
// ==========================================

// دالة حفظ التنزيل (فردي)
export function saveDownloadHistory(deckId, version) {
    let history = JSON.parse(localStorage.getItem(DOWNLOADS_KEY)) || {};
    history[deckId] = version;
    localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(history));
    // إعادة فحص الإشعارات لإخفاء ما تم تنزيله
    loadAllNotifications(window.currentDecksData || []);
}

// دالة وضع علامة "مقروء" للإشعارات العامة (فردي)
export function markGeneralAsRead(notifId) {
    let readList = JSON.parse(localStorage.getItem(READ_NOTIFS_KEY)) || [];
    if (!readList.includes(notifId)) {
        readList.push(notifId);
        localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(readList));
    }
    loadAllNotifications(window.currentDecksData || []);
}

// دالة Mark All (للكل)
export function markAllUpdatesAsRead() {
    // 1. تحديث الكروت (نجعل كل الكروت محدثة)
    let history = JSON.parse(localStorage.getItem(DOWNLOADS_KEY)) || {};
    const allDecks = window.currentDecksData || [];
    allDecks.forEach(deck => { history[deck.id] = deck.version; });
    localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(history));

    // 2. تحديث الإشعارات العامة (نضيف المعروض حالياً لقائمة المقروء)
    let readList = JSON.parse(localStorage.getItem(READ_NOTIFS_KEY)) || [];
    const currentIds = window.currentGeneralIds || [];
    // دمج القوائم بدون تكرار
    const updatedList = [...new Set([...readList, ...currentIds])];
    localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(updatedList));

    // إعادة التحميل
    loadAllNotifications(allDecks);
    console.log("All notifications marked as read.");
}

// ==========================================
// 4. دوال الرسم والفلترة
// ==========================================
export function filterFlashcards(searchText, category, year) {
    const term = searchText.toLowerCase().trim();
    const filtered = allFlashcards.filter(card => {
        const matchesSearch =
            card.title.toLowerCase().includes(term) ||
            (card.module && card.module.toLowerCase().includes(term)) ||
            (card.creator && card.creator.toLowerCase().includes(term));
        const matchesCategory = category === 'all' || card.category === category;
        const matchesYear = year === 'all' || card.year === year;
        return matchesSearch && matchesCategory && matchesYear;
    });
    renderCards(filtered);
}

function renderCards(cardsList) {
    const grid = document.getElementById('flashcardsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (cardsList.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary-color);">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 15px; display:block;"></i>
                <p>No matches found.</p>
            </div>
        `;
        return;
    }

    cardsList.forEach(data => {
        grid.innerHTML += `
        <div class="card">
            <div class="thumbnail">
                <img src="${data.imageUrl || 'images/default_banner.png'}" alt="${data.title}">
            </div>
            <h3>${data.title}</h3>
            <p class="description">${data.description}</p>
            <ul>
                <li>Subject: ${data.module}</li>
                <li>Study Year: ${data.year}</li>
                <li>Category: ${data.category || 'Theoretical'}</li>
                <li>Creator: ${(data.creator || 'Unknown')}</li>
            </ul>
            <p class="meta">
                <span class="date">Last Update: ${data.lastUpdate || 'Unknown'}</span>
                <span class="version">Version ● ${data.version || 'v1.0'}</span>
            </p>
            <a href="${data.downloadUrl}" target="_blank" 
               class="main-btn download-trigger" 
               data-id="${data.id}" 
               data-version="${data.version || 'v1.0'}">
                Download <i class="fa-solid fa-download fa-fw"></i>
            </a>
        </div>
        `;
    });
}