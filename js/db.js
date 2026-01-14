import {
    getFirestore,
    collection,
    getDocs,
    getDoc, // 👈 تمت الإضافة
    setDoc, // 👈 تمت الإضافة
    arrayUnion, // 👈 تمت الإضافة
    query,
    orderBy,
    doc,
    updateDoc,
    addDoc,
    increment,
    serverTimestamp,
    limit,
    where,
    Timestamp,
    onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./config.js";

// ==========================================
// مفاتيح التخزين (Caching Keys)
// ==========================================
const DOWNLOADS_KEY = "asu_anki_downloads";
const READ_NOTIFS_KEY = "asu_anki_read_general";
const CACHED_DECKS_KEY = "asu_anki_cached_decks_v1"; // 📦 مخزن الكروت
const CACHED_NOTIFS_KEY = "asu_anki_cached_notifs_v1"; // 📦 مخزن الإشعارات
const LAST_SYNC_KEY = "asu_anki_last_sync_timestamp"; // 🕒 وقت آخر مزامنة ناجحة

// 🤖 اسم بوت التيليجرام (بدون @)
const BOT_USERNAME = "asu_anki_bot"; // 🔴 استبدله لاحقاً باسم بوتك الحقيقي

// ==========================================
// 1. المتغيرات العامة (Global Variables)
// ==========================================
let allFlashcards = [];
let currentDisplayCount = 0;
const BATCH_SIZE = 8;

// ==========================================
// 2. دالة تحميل الكروت (System Core)
// ==========================================
export async function loadFlashcards(isLoadMore = false) {
    const grid = document.getElementById("flashcardsGrid");
    const loadMoreBtn = document.getElementById("loadMoreBtn");

    // عناصر البحث والفلترة
    const searchInput = document.getElementById("searchInput");
    const searchTerm = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";
    const subjectFilter =
        document.getElementById("filterModule")?.value || "all";
    const yearFilter = document.getElementById("yearSelect")?.value || "all";
    const categoryFilter =
        document.getElementById("categorySelect")?.value || "all";

    // أ) التحميل الأولي (ليس Load More)
    if (!isLoadMore) {
        currentDisplayCount = 0;

        // عرض الـ Spinner فقط لو المصفوفة فاضية
        if (allFlashcards.length === 0) {
            // محاولة التحميل من الكاش أولاً
            const cachedData = localStorage.getItem(CACHED_DECKS_KEY);
            if (cachedData) {
                try {
                    allFlashcards = JSON.parse(cachedData);
                } catch (e) {
                    console.error("Cache Parse Error", e);
                    allFlashcards = [];
                }
            }

            // لو لسه فاضية (أول مرة خالص)، اعرض لودينج
            if (allFlashcards.length === 0 && grid) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px;">
                        <div class="spinner" style="width: 50px; height: 50px; border-width: 5px; border-color: rgba(128,128,128,0.2); border-top-color: var(--main-color);"></div>
                        <p style="margin-top: 15px; color: var(--text-secondary-color); font-size: 0.9rem;">Checking for updates...</p>
                    </div>`;
            }
        }

        // 🔥 تشغيل المزامنة الذكية (Smart Delta Sync) 🔥
        syncDecksWithServer().then(() => {
            // 👇 بداية الكود الجديد (تجميل البحث) 👇
            const deepLinkInput = document.getElementById("deepLinkDeckId");
            const searchInput = document.getElementById("searchInput");

            if (deepLinkInput && deepLinkInput.value) {
                // نبحث عن الملف في البيانات المحملة
                const targetDeck = allFlashcards.find(
                    (c) => c.id === deepLinkInput.value.trim()
                );
                if (targetDeck && searchInput) {
                    searchInput.value = targetDeck.title; // نكتب الاسم للمستخدم
                    console.log(
                        "🔗 Auto-filled search with:",
                        targetDeck.title
                    );
                }
            }
            // 👆 نهاية الكود الجديد 👆

            // تحديث الواجهة فقط إذا كنا في الوضع الافتراضي
            if (searchTerm === "" && subjectFilter === "all") {
                applyClientSideFilters(false);
            }
        });
    }

    applyClientSideFilters(isLoadMore);
}

// دالة الفلترة والرسم (محلية)
function applyClientSideFilters(isLoadMore) {
    const grid = document.getElementById("flashcardsGrid");
    const loadMoreBtn = document.getElementById("loadMoreBtn");

    // قراءة الـ Input المخفي
    const deepLinkInput = document.getElementById("deepLinkDeckId");
    const deepLinkId = deepLinkInput ? deepLinkInput.value.trim() : "";

    const searchInput = document.getElementById("searchInput");
    const searchTerm = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";
    const subjectFilter =
        document.getElementById("filterModule")?.value || "all";
    const yearFilter = document.getElementById("yearSelect")?.value || "all";
    const categoryFilter =
        document.getElementById("categorySelect")?.value || "all";

    // 1. التصفية
    let filteredCards = allFlashcards.filter((card) => {
        if (deepLinkId) {
            return card.id === deepLinkId;
        }
        // 🔥 شرط الإخفاء: لو الكارت مخفي، لا تعرضه أبداً 🔥
        if (card.isHidden === true) return false;

        const matchesSearch =
            !searchTerm ||
            (card.title && card.title.toLowerCase().includes(searchTerm)) ||
            (card.module && card.module.toLowerCase().includes(searchTerm)) ||
            (card.creator && card.creator.toLowerCase().includes(searchTerm));

        const matchesYear = yearFilter === "all" || card.year === yearFilter;
        const matchesSubject =
            subjectFilter === "all" || card.module === subjectFilter;
        const matchesCategory =
            categoryFilter === "all" || card.category === categoryFilter;

        return (
            matchesSearch && matchesYear && matchesSubject && matchesCategory
        );
    });

    // 2. الترتيب (الأحدث creation أو الأحدث update)
    filteredCards.sort((a, b) => {
        // نستخدم updated timestamp لو موجود، أو created
        const dateA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const dateB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return dateB - dateA;
    });

    // 3. التقسيم
    if (!isLoadMore) {
        currentDisplayCount = BATCH_SIZE;
        if (grid) grid.innerHTML = "";
    } else {
        currentDisplayCount += BATCH_SIZE;
    }

    const cardsToShow = filteredCards.slice(0, currentDisplayCount);

    // 4. معالجة "لا يوجد نتائج"
    if (cardsToShow.length === 0 && !isLoadMore) {
        if (grid)
            grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary-color);">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 15px; display:block;"></i>
                <p>No results found.</p>
            </div>`;
        if (loadMoreBtn) loadMoreBtn.style.display = "none";
        loadAllNotifications(allFlashcards);
        return;
    }

    // 5. الرسم
    renderCards(cardsToShow, isLoadMore);

    // تحديث الإشعارات
    loadAllNotifications(allFlashcards);

    // 6. زر Load More
    if (loadMoreBtn) {
        loadMoreBtn.style.display =
            cardsToShow.length < filteredCards.length ? "flex" : "none";
    }
}

// 🔥🔥 دالة المزامنة الزمنية (Time-Based Delta Sync) 🔥🔥
async function syncDecksWithServer() {
    try {
        let q;
        const lastSyncTime = localStorage.getItem(LAST_SYNC_KEY);
        let fetchAll = false;

        // الحالة 1: أول مرة يفتح الموقع (أو مسح الكاش)
        if (!lastSyncTime || allFlashcards.length === 0) {
            console.log("Fetching ALL decks (First Run)...");
            q = query(
                collection(db, "decks"),
                orderBy("createdAt", "desc"),
                limit(500)
            );
            fetchAll = true;
        }
        // الحالة 2: تحديثات فقط (Delta)
        else {
            const lastDate = new Date(lastSyncTime);
            console.log("Checking for updates since:", lastSyncTime);

            // نطلب الدكات التي تم تعديلها (updatedAt) بعد آخر مزامنة
            // ملاحظة: هذا يتطلب أن يكون الـ Deck يحتوي على حقل updatedAt
            q = query(
                collection(db, "decks"),
                where("updatedAt", ">", lastDate)
            );
        }

        const snapshot = await getDocs(q);

        // لو مفيش تحديثات (Snapshot Empty)، وفرنا القراءات! (1 Read cost)
        if (snapshot.empty && !fetchAll) {
            console.log("No new updates found. Cache is valid. ✅");
            return;
        }

        let hasChanges = false;

        // لو كنا بنجيب الكل، بنصفر المصفوفة ونعبيها
        if (fetchAll) {
            allFlashcards = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                // لو بنجيب الكل، نتجاهل المحذوف تماماً
                if (data.isDeleted !== true) {
                    allFlashcards.push({ id: doc.id, ...data });
                }
            });
            hasChanges = true;
        } else {
            // 🔥 هنا السحر (Delta Sync) 🔥
            snapshot.forEach((doc) => {
                const serverDeck = { id: doc.id, ...doc.data() };
                const localIndex = allFlashcards.findIndex(
                    (d) => d.id === serverDeck.id
                );

                // 1. هل وصلتنا إشارة بأن الملف "محذوف"؟
                if (serverDeck.isDeleted === true) {
                    if (localIndex !== -1) {
                        // الملف موجود عندنا؟ امسحه فوراً من الذاكرة!
                        allFlashcards.splice(localIndex, 1);
                        hasChanges = true;
                        console.log(
                            "♻️ Deck removed from cache:",
                            serverDeck.title
                        );
                    }
                    // لا تكمل باقي الكود لهذا الملف
                    return;
                }

                // 2. لو مش محذوف، كمل عادي (إضافة جديد أو تحديث)
                if (localIndex === -1) {
                    allFlashcards.unshift(serverDeck);
                    console.log("New Deck Found:", serverDeck.title);
                } else {
                    allFlashcards[localIndex] = serverDeck;
                    console.log("Deck Updated:", serverDeck.title);
                }
                hasChanges = true;
            });
        }

        if (hasChanges) {
            // حفظ الكاش الجديد
            localStorage.setItem(
                CACHED_DECKS_KEY,
                JSON.stringify(allFlashcards)
            );

            // حفظ وقت اللحظة الحالية كآخر وقت مزامنة
            // (نستخدم ISO string لسهولة المقارنة)
            const now = new Date();
            localStorage.setItem(LAST_SYNC_KEY, now.toISOString());

            console.log(`Synced ${snapshot.size} decks. ✅`);
        }
    } catch (error) {
        console.error("Sync Error:", error);
        // في حالة الخطأ (مثل نقص الـ Index)، لا نعطل الموقع
        // يمكن إضافة رابط للإندكس في الكونسول لو ظهرت المشكلة
    }
}

// ==========================================
// 3. دالة رسم الكروت (Render Cards)
// ==========================================
function renderCards(cardsList, shouldAppend = false) {
    const grid = document.getElementById("flashcardsGrid");
    if (!grid) return;

    grid.innerHTML = "";

    cardsList.forEach((data) => {
        const rating =
            data.totalStars && data.totalReviews
                ? data.totalStars / data.totalReviews
                : 0;
        const reviewsCount = data.totalReviews || 0;
        const starsHTML = getStarsHTML(rating);
        const title = data.title || "Untitled Deck";
        const desc = data.description || "No description available.";

        grid.innerHTML += `
            <div class="card">
                <div class="thumbnail">
                    <img src="${
                        data.imageUrl || "images/default_banner.webp"
                    }" alt="${title}" loading="lazy">
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; margin-bottom: 5px;">
                    <div class="rating-display" style="cursor: pointer; margin: 0;" onclick="window.openRatingModal('${
                        data.id
                    }', '${title}')">
                        ${starsHTML} <span style="font-size: 0.75rem; color: #777; margin-left: 5px;">(${reviewsCount})</span>
                    </div>
                    <div style="cursor: pointer; padding: 5px;" onclick="window.openReportModal('${
                        data.id
                    }', '${title}')">
                         <i class="fa-solid fa-flag report-btn" style="font-size: 14px;"></i>
                    </div>
                </div>

                <h3 style="margin-top: 0px; margin-bottom: 10px; line-height: 1.4;">${title}</h3>
                <p class="description">${desc}</p>
                <ul>
                    <li>Study Year: ${data.year || "All"}</li>
                    <li>Category: ${data.category || "Theoretical"}</li>
                    <li>Creator: ${data.creator || "Unknown"}</li>
                </ul>
                <p class="meta">
                    <span class="date">Last Update: ${
                        data.lastUpdate || "Unknown"
                    }</span>
                    <span class="version">Version: ${
                        data.version || "v1.0"
                    }</span>
                </p>
                <a href="${data.downloadUrl}" download target="_self"
                   class="main-btn download-trigger" 
                   data-id="${data.id}" 
                   data-version="${
                       data.version || "v1.0"
                   }" onclick="animateDownload(this)">
                    Download <i class="fa-solid fa-download fa-fw"></i>
                </a>
            </div>
        `;
    });
}

// ==========================================
// 4. نظام الإشعارات (Notifications)
// ==========================================
export async function loadAllNotifications(allDecks) {
    window.currentDecksData = allDecks;

    const listDesktop = document.querySelector("#notifDropdown .notif-list");
    const listMobile = document.querySelector(
        "#mobileNotifDropdown .notif-list"
    );
    const badgeDesktop = document.getElementById("notifBadge");
    const badgeMobile = document.getElementById("mobileNotifBadge");

    const downloadHistory =
        JSON.parse(localStorage.getItem(DOWNLOADS_KEY)) || {};
    let cardUpdates = [];

    allDecks.forEach((deck) => {
        const userVersion = downloadHistory[deck.id];
        const serverVersion = deck.version;
        if (userVersion && userVersion !== serverVersion) {
            cardUpdates.push(deck);
        }
    });

    let generalNotifs = [];
    const readGeneralIds =
        JSON.parse(localStorage.getItem(READ_NOTIFS_KEY)) || [];

    const cachedNotifs = localStorage.getItem(CACHED_NOTIFS_KEY);
    if (cachedNotifs) {
        generalNotifs = JSON.parse(cachedNotifs);
    }

    try {
        const q = query(
            collection(db, "general_notifications"),
            orderBy("createdAt", "desc"),
            limit(5)
        );
        const snapshot = await getDocs(q);
        let notifsChanged = false;

        snapshot.forEach((doc) => {
            const notifData = { id: doc.id, ...doc.data() };
            if (!generalNotifs.some((n) => n.id === notifData.id)) {
                generalNotifs.unshift(notifData);
                notifsChanged = true;
            }
        });

        if (notifsChanged) {
            localStorage.setItem(
                CACHED_NOTIFS_KEY,
                JSON.stringify(generalNotifs)
            );
        }
    } catch (error) {
        console.error("Error fetching general notifications:", error);
    }

    let displayGeneralNotifs = generalNotifs.filter(
        (n) => !readGeneralIds.includes(n.id)
    );
    window.currentGeneralIds = displayGeneralNotifs.map((n) => n.id);

    const welcomeId = "welcome_msg_v1";
    if (auth.currentUser && !readGeneralIds.includes(welcomeId)) {
        const firstName = auth.currentUser.displayName
            ? auth.currentUser.displayName.split(" ")[0]
            : "Doctor";
        const welcomeMsg = {
            id: welcomeId,
            title: `Welcome, ${firstName}! 👋`,
            message:
                "We are glad to have you with us. Explore the decks and start studying smart!",
            type: "success",
            createdAt: { seconds: Date.now() / 1000 },
        };
        displayGeneralNotifs.unshift(welcomeMsg);
        if (window.currentGeneralIds) window.currentGeneralIds.push(welcomeId);
    }

    const totalCount = cardUpdates.length + displayGeneralNotifs.length;

    if (badgeDesktop) {
        badgeDesktop.style.display = totalCount > 0 ? "flex" : "none";
        badgeDesktop.innerText = totalCount;
    }
    if (badgeMobile) {
        badgeMobile.style.display = totalCount > 0 ? "flex" : "none";
        badgeMobile.innerText = totalCount;
    }

    if (totalCount === 0) {
        const emptyHTML =
            '<div class="notif-item"><p class="notif-text" style="text-align:center; color:#777;">No new notifications.</p></div>';
        if (listDesktop) listDesktop.innerHTML = emptyHTML;
        if (listMobile) listMobile.innerHTML = emptyHTML;
        return;
    }

    let htmlContent = "";

    cardUpdates.forEach((deck) => {
        const dateStr = deck.lastUpdate || "Recent";
        htmlContent += `
            <div class="notif-item unread" style="align-items: flex-start;">
                <div class="notif-icon bg-green"><i class="fa-solid fa-rotate"></i></div>
                <div class="notif-content" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <p class="notif-text" style="margin: 0;">Check The New Update: <b>${
                            deck.title
                        }</b></p>
                        <span style="font-size: 0.65rem; color: #777; white-space: nowrap; margin-left: 8px;">${dateStr}</span>
                    </div>
                    <p class="notif-text" style="font-size: 0.75rem; color:#777; margin-top: 2px;">${
                        downloadHistory[deck.id]
                    } ➝ ${deck.version}</p>
                    <div class="notif-actions">
                        <a href="${
                            deck.downloadUrl
                        }" target="_blank" onclick="window.handleUpdateClick('${
            deck.id
        }', '${deck.version}')" class="notif-action-btn download">Download</a>
                        <button onclick="window.handleUpdateClick('${
                            deck.id
                        }', '${
            deck.version
        }')" class="notif-action-btn ignore">Mark read</button>
                    </div>
                </div>
            </div>`;
    });

    displayGeneralNotifs.forEach((notif) => {
        let icon =
            notif.type === "danger"
                ? "fa-triangle-exclamation"
                : notif.type === "success"
                ? "fa-check"
                : "fa-bell";
        let bg =
            notif.type === "danger"
                ? "bg-red"
                : notif.type === "success"
                ? "bg-green"
                : "bg-blue";
        let dateStr = "";
        if (notif.createdAt && notif.createdAt.seconds) {
            const dateObj = new Date(notif.createdAt.seconds * 1000);
            dateStr = dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });
        } else {
            dateStr = "Now";
        }
        let notifLinks = ``;
        if (notif.link) {
            notifLinks = `<a href="${notif.link}" target="_blank"  class="notif-action-btn main-btn">Visit Link <i class="fa-solid fa-arrow-up-right-from-square fa-fw"></i></a>`;
        } else {
            notifLinks = ``;
        }
        htmlContent += `
            <div class="notif-item unread" style="align-items: flex-start;">
                <div class="notif-icon ${bg}"><i class="fa-solid ${icon}"></i></div>
                <div class="notif-content" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <p class="notif-text" style="margin: 0;"><b>${notif.title}</b></p>
                        <span style="font-size: 0.65rem; color: #777; white-space: nowrap; margin-left: 8px;">${dateStr}</span>
                    </div>
                    <p class="notif-text" style="margin-top: 5px;">${notif.message}</p>
                    <div class="notif-actions">
                        ${notifLinks}
                        <button onclick="window.markGeneralAsRead('${notif.id}')" class="notif-action-btn ignore">Mark read</button>
                    </div>
                </div>
            </div>`;
    });

    if (listDesktop) listDesktop.innerHTML = htmlContent;
    if (listMobile) listMobile.innerHTML = htmlContent;
}

// ==========================================
// 5. دوال مساعدة (Actions & Rating & Reporting)
// ==========================================

export function filterFlashcards(searchText, category, year) {
    loadFlashcards(false);
}

// ==========================================
// 🔗 نظام ربط التيليجرام (Telegram Deep Linking)
// ==========================================
export async function getTelegramBotLink(user) {
    if (!user) return "#";

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();

            // أ) إذا كان لديه كود مسبقاً، نستخدمه (لضمان الثبات)
            if (data.telegramLinkCode) {
                return `https://t.me/${BOT_USERNAME}?start=${data.telegramLinkCode}`;
            }

            // ب) إذا لم يكن لديه، نولد كود جديد ونحفظه
            // الكود عبارة عن: uid_randomString (لضمان التفرد)
            const uniqueCode = `${user.uid}_${Math.random()
                .toString(36)
                .substring(2, 8)}`;

            await updateDoc(userRef, {
                telegramLinkCode: uniqueCode,
            });

            return `https://t.me/${BOT_USERNAME}?start=${uniqueCode}`;
        }
    } catch (e) {
        console.error("Error generating Telegram link:", e);
    }
    return "#";
}

export async function saveDownloadHistory(deckId, version) {
    // 1. التخزين المحلي (لجعل الزر يتغير لونه وتظهر العلامة) - كما هو
    let history = JSON.parse(localStorage.getItem(DOWNLOADS_KEY)) || {};
    history[deckId] = version;
    localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(history));

    // تحديث الواجهة فوراً
    loadAllNotifications(allFlashcards);

    // 2. 🔥 الجديد: تسجيل الاشتراك في السيرفر (Firebase) 🔥
    const user = auth.currentUser;
    if (user) {
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                subscribedDecks: arrayUnion(deckId), // يضيف الملف للقائمة بدون تكرار
                lastActive: serverTimestamp(), // لتحديث نشاط المستخدم
            });
            console.log("✅ User subscribed to deck updates:", deckId);
        } catch (e) {
            console.error("Subscription Error:", e);
        }
    }
}

export function markGeneralAsRead(notifId) {
    let readList = JSON.parse(localStorage.getItem(READ_NOTIFS_KEY)) || [];
    if (!readList.includes(notifId)) {
        readList.push(notifId);
        localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(readList));
    }
    loadAllNotifications(allFlashcards);
}

export function markAllUpdatesAsRead() {
    let history = JSON.parse(localStorage.getItem(DOWNLOADS_KEY)) || {};
    const allDecks = window.currentDecksData || [];
    allDecks.forEach((deck) => {
        history[deck.id] = deck.version;
    });
    localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(history));

    let readList = JSON.parse(localStorage.getItem(READ_NOTIFS_KEY)) || [];
    const currentIds = window.currentGeneralIds || [];
    const updatedList = [...new Set([...readList, ...currentIds])];
    localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(updatedList));

    loadAllNotifications(allDecks);
}

function getStarsHTML(rating) {
    let stars = "";
    for (let i = 1; i <= 5; i++) {
        stars +=
            i <= Math.round(rating)
                ? '<i class="fa-solid fa-star"></i>'
                : '<i class="fa-regular fa-star" style="color: #666;"></i>';
    }
    return stars;
}

// 🔥🔥🔥 تم تحديث هذه الدالة لتحديث updatedAt في الدك 🔥🔥🔥
export async function submitDeckReview(deckId, ratingValue, comment) {
    const user = auth.currentUser;
    if (!user) {
        alert("Please sign in.");
        return false;
    }
    try {
        const deckRef = doc(db, "decks", deckId);
        const reviewsRef = collection(db, "decks", deckId, "reviews");
        const q = query(reviewsRef, where("userId", "==", user.uid), limit(1));
        const snapshot = await getDocs(q);

        // 🟢 الجديد هنا: نقوم بتحديث updatedAt للدك نفسه عند أي تقييم
        // هذا سيجعل الدك يظهر كـ "محدث" في عملية المزامنة
        const updatePayload = {
            updatedAt: serverTimestamp(),
            // إذا كان لديك حقول أخرى تريد تحديثها
        };

        if (!snapshot.empty) {
            const oldReviewDoc = snapshot.docs[0];
            const diff = ratingValue - oldReviewDoc.data().rating;

            await updateDoc(doc(reviewsRef, oldReviewDoc.id), {
                rating: ratingValue,
                comment: comment,
                updatedAt: serverTimestamp(),
            });

            if (diff !== 0) {
                updatePayload.totalStars = increment(diff);
            }
        } else {
            await addDoc(reviewsRef, {
                userId: user.uid,
                userName: user.displayName,
                rating: ratingValue,
                comment: comment,
                createdAt: serverTimestamp(),
            });

            updatePayload.totalReviews = increment(1);
            updatePayload.totalStars = increment(ratingValue);
        }

        // تنفيذ التحديث على وثيقة الدك (تغيير النجوم + تغيير التاريخ)
        await updateDoc(deckRef, updatePayload);

        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

export async function getUserReview(deckId) {
    const user = auth.currentUser;
    if (!user) return null;
    try {
        const q = query(
            collection(db, "decks", deckId, "reviews"),
            where("userId", "==", user.uid),
            limit(1)
        );
        const snapshot = await getDocs(q);
        return !snapshot.empty ? snapshot.docs[0].data() : null;
    } catch (e) {
        return null;
    }
}

export async function submitReport(deckId, deckTitle, reason, details) {
    try {
        await addDoc(collection(db, "reports"), {
            deckId,
            deckTitle,
            reason,
            details,
            status: "pending",
            createdAt: serverTimestamp(),
            reporterId: auth.currentUser ? auth.currentUser.uid : "Anonymous",
            reporterEmail: auth.currentUser ? auth.currentUser.email : "Guest",
        });
        return true;
    } catch (e) {
        return false;
    }
}
// ... (باقي الكود في الأعلى)

// دالة جديدة لزيادة عدد التنزيلات في الداتابيز
export async function incrementDeckDownloads(deckId) {
    try {
        const deckRef = doc(db, "decks", deckId);
        await updateDoc(deckRef, {
            downloads: increment(1), // هذا الحقل هو الذي سنعرضه في الإحصائيات
        });
        console.log(`Downloads incremented for deck: ${deckId}`);
    } catch (error) {
        console.error("Error incrementing downloads:", error);
    }
}

// ==========================================
// 🔥 نظام الإشعارات (Notification System) 🔥
// ==========================================

// 1. دالة إرسال إشعار لشخص محدد
export async function sendUserNotification(
    targetUid,
    title,
    message,
    link = "#",
    type = "info"
) {
    try {
        if (!targetUid) return;
        await addDoc(collection(db, "users", targetUid, "notifications"), {
            title: title,
            body: message,
            link: link,
            type: type, // 'success', 'error', 'info', 'warning'
            read: false,
            createdAt: serverTimestamp(),
        });
        console.log("Notification sent to:", targetUid);
    } catch (e) {
        console.error("Failed to send notification:", e);
    }
}

// 2. دالة جلب UID الأدمن (لإرسال الإشعارات له)
export async function getAdminUID() {
    // نبحث عن الأدمن بالإيميل
    const q = query(
        collection(db, "users"),
        where("email", "==", "osmanabdalaziz2005@gmail.com")
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        return snapshot.docs[0].id;
    }
    return null;
}

// 3. تشغيل جرس الإشعارات (Live Listener)
export function initNotificationSystem(user) {
    if (!user) return;

    const notifList = document.getElementById("notificationList"); // تأكد أن هذا الـ ID موجود في قائمة الجرس
    const badge = document.getElementById("notifBadge");

    // إذا لم يكن هناك قائمة إشعارات في الصفحة الحالية، لا تفعل شيئاً
    if (!notifList) return;

    const q = query(
        collection(db, "users", user.uid, "notifications"),
        orderBy("createdAt", "desc"),
        limit(20)
    );

    onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        // تحديث العداد (فقط للإشعارات غير المقروءة)
        const unreadCount = notifs.filter((n) => !n.read).length;
        if (badge) {
            badge.style.display = unreadCount > 0 ? "block" : "none";
            badge.innerText = unreadCount;
        }

        // رسم القائمة
        notifList.innerHTML = "";
        if (notifs.length === 0) {
            notifList.innerHTML =
                '<li class="dropdown-item empty">No notifications</li>';
            return;
        }

        notifs.forEach((n) => {
            const date = n.createdAt
                ? n.createdAt.toDate().toLocaleDateString()
                : "Just now";
            const icon =
                n.type === "success"
                    ? "fa-circle-check"
                    : n.type === "error"
                    ? "fa-circle-xmark"
                    : "fa-bell";
            const color =
                n.type === "success"
                    ? "green"
                    : n.type === "error"
                    ? "red"
                    : "blue";

            // رابط (اختياري)
            const linkHTML =
                n.link && n.link !== "#"
                    ? `<a href="${n.link}" style="font-size:0.75rem; color:var(--main-color); display:block; margin-top:5px;">Open Link <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`
                    : "";

            notifList.innerHTML += `
                <li class="dropdown-item ${n.read ? "read" : "unread"}">
                    <div class="notif-icon bg-${color}"><i class="fa-solid ${icon}"></i></div>
                    <div class="notif-content">
                        <div class="notif-header">
                            <span class="notif-title">${n.title}</span>
                            <span class="notif-date">${date}</span>
                        </div>
                        <p class="notif-body">${n.body}</p>
                        ${linkHTML}
                    </div>
                </li>
            `;
        });
    });
}
