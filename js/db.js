import {
    getFirestore,
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    updateDoc,
    addDoc,
    increment,
    serverTimestamp,
    limit,
    where,
    startAfter, // ✅ تم إضافة الاستيراد الناقص
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./config.js";

// مفاتيح التخزين في متصفح الطالب
const DOWNLOADS_KEY = "asu_anki_downloads";
const READ_NOTIFS_KEY = "asu_anki_read_general";

// ==========================================
// 1. المتغيرات العامة (Global Variables)
// ==========================================
let allFlashcards = []; // لتخزين كل البيانات المحملة (لأجل الفلترة والإشعارات)
let lastVisibleDoc = null; // لتخزين أخر كارت وصلنا له (لأجل Load More)
const BATCH_SIZE = 8; // عدد الكروت في كل دفعة

// ==========================================
// 2. دالة تحميل الكروت (Load Flashcards)
// ==========================================
export async function loadFlashcards(isLoadMore = false) {
    const grid = document.getElementById("flashcardsGrid");
    const loadMoreBtn = document.getElementById("loadMoreBtn");

    // جلب قيم البحث
    const searchInput = document.getElementById("searchInput");
    const searchTerm = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    // هل نحن في وضع البحث؟
    const isSearchMode = searchTerm.length > 0;

    // 🔥 تصحيح الـ IDs لتطابق ملف HTML 🔥
    // (filterModule غير موجود في HTML حالياً، لذا سيبقى "all" إلا إذا أضفته)
    const subjectFilter =
        document.getElementById("filterModule")?.value || "all";
    const yearFilter = document.getElementById("yearSelect")?.value || "all"; // ✅ تم التصحيح
    const categoryFilter =
        document.getElementById("categorySelect")?.value || "all"; // ✅ تم التصحيح

    // تصفير الشبكة إذا كان بحثاً جديداً أو فلترة جديدة
    // تصفير الشبكة وعرض الـ Spinner
    if (!isLoadMore) {
        if (grid)
            grid.innerHTML = `
            <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px;">
                <div class="spinner" style="width: 50px; height: 50px; border-width: 5px; border-color: rgba(128,128,128,0.2); border-top-color: var(--main-color);"></div>
                <p style="margin-top: 15px; color: var(--text-secondary-color); font-size: 0.9rem;">Loading Decks...</p>
            </div>
        `;
        lastVisibleDoc = null;
        allFlashcards = [];
        if (loadMoreBtn) loadMoreBtn.style.display = "none";
    }

    try {
        let q = collection(db, "decks");
        let constraints = [];

        // 1. تطبيق الفلاتر على الاستعلام (Server-Side Filtering)
        if (yearFilter !== "all")
            constraints.push(where("year", "==", yearFilter));
        if (subjectFilter !== "all")
            constraints.push(where("module", "==", subjectFilter));
        if (categoryFilter !== "all")
            constraints.push(where("category", "==", categoryFilter));

        constraints.push(orderBy("createdAt", "desc"));

        // 2. التفرع المنطقي: بحث شامل أم تصفح عادي؟
        if (isSearchMode) {
            // في وضع البحث نجلب عدداً كبيراً لنبحث بداخله
            constraints.push(limit(100));
        } else {
            // في التصفح العادي نستخدم Pagination
            if (isLoadMore && lastVisibleDoc) {
                constraints.push(startAfter(lastVisibleDoc));
            }
            constraints.push(limit(BATCH_SIZE));
        }

        // تنفيذ الاستعلام
        const finalQuery = query(q, ...constraints);
        const querySnapshot = await getDocs(finalQuery);

        // تنظيف اللودر
        if (!isLoadMore && grid) grid.innerHTML = "";

        // معالجة البيانات
        let newCards = [];
        querySnapshot.forEach((doc) => {
            newCards.push({ id: doc.id, ...doc.data() });
        });

        // 3. فلترة البحث النصي (Client-Side)
        if (isSearchMode) {
            newCards = newCards.filter((card) => {
                return (
                    (card.title &&
                        card.title.toLowerCase().includes(searchTerm)) ||
                    (card.module &&
                        card.module.toLowerCase().includes(searchTerm)) ||
                    (card.creator &&
                        card.creator.toLowerCase().includes(searchTerm))
                );
            });
        }

        // حالة عدم وجود نتائج
        if (newCards.length === 0 && !isLoadMore) {
            if (grid)
                grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary-color);">
                    <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 15px; display:block;"></i>
                    <p>No results found.</p>
                </div>`;
            if (loadMoreBtn) loadMoreBtn.style.display = "none";
            return;
        }

        // حفظ أخر مستند (فقط في التصفح العادي لاستكمال التحميل)
        if (!isSearchMode && querySnapshot.docs.length > 0) {
            lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        }

        // تحديث المصفوفة العامة
        if (isLoadMore) {
            allFlashcards = [...allFlashcards, ...newCards];
        } else {
            allFlashcards = newCards;
        }

        // رسم الكروت
        renderCards(newCards, isLoadMore);

        // تشغيل الإشعارات
        loadAllNotifications(allFlashcards);

        // 4. التحكم في زر Load More
        if (loadMoreBtn) {
            if (isSearchMode) {
                // نخفي الزر في وضع البحث لأننا جلبنا النتائج دفعة واحدة
                loadMoreBtn.style.display = "none";
            } else {
                // نظهره في التصفح العادي إذا كان هناك بقية
                loadMoreBtn.style.display =
                    querySnapshot.docs.length < BATCH_SIZE ? "none" : "block";
            }
        }
    } catch (error) {
        console.error("Error loading decks:", error);
        if (grid)
            grid.innerHTML = `<p style="color:red; text-align:center;">Error: ${error.message}</p>`;
    }
}

// ==========================================
// 3. دالة رسم الكروت (Render Cards)
// ==========================================
function renderCards(cardsList, shouldAppend = false) {
    const grid = document.getElementById("flashcardsGrid");
    if (!grid) return;

    if (!shouldAppend) {
        grid.innerHTML = "";
    }

    if (cardsList.length === 0 && !shouldAppend) {
        grid.innerHTML = `<p style="text-align:center;">No matches found.</p>`;
        return;
    }

    cardsList.forEach((data) => {
        // حساب النجوم
        const rating =
            data.totalStars && data.totalReviews
                ? data.totalStars / data.totalReviews
                : 0;
        const reviewsCount = data.totalReviews || 0;
        const starsHTML = getStarsHTML(rating);

        const title = data.title || "Untitled Deck";
        const desc = data.description || "No description available.";

        // HTML الكارت
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
                         <i class="fa-solid fa-flag report-btn" 
                            style="font-size: 14px; "></i>
                    </div>
                </div>

                <h3 style="margin-top: 0px; margin-bottom: 15px; line-height: 1.4;">${title}</h3>
                <p class="description">${desc}</p>
                <ul>
                    <li>Study Year: ${data.year || "All"}</li>
                    <li>Category: ${data.category || "Theoretical"}</li>
                    <li>Creator: ${data.creator || "Unknown"}</li>
                </ul>
                <p class="meta">
                    <span class="date">Update: ${
                        data.lastUpdate || "Unknown"
                    }</span>
                    <span class="version">Ver: ${data.version || "v1.0"}</span>
                </p>
                <a href="${data.downloadUrl}" target="_blank" 
                   class="main-btn download-trigger" 
                   data-id="${data.id}" 
                   data-version="${data.version || "v1.0"}">
                    Download <i class="fa-solid fa-download fa-fw"></i>
                </a>
            </div>
        `;
    });
}

// ==========================================
// 4. نظام الإشعارات (Notifications) - المصححة
// ==========================================
export async function loadAllNotifications(allDecks) {
    window.currentDecksData = allDecks;

    const listDesktop = document.querySelector("#notifDropdown .notif-list");
    const listMobile = document.querySelector(
        "#mobileNotifDropdown .notif-list"
    );
    const badgeDesktop = document.getElementById("notifBadge");
    const badgeMobile = document.getElementById("mobileNotifBadge");

    // 1. حساب تحديثات الكروت
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

    // 2. جلب الإشعارات العامة
    let generalNotifs = [];
    let currentGeneralIds = [];
    const readGeneralIds =
        JSON.parse(localStorage.getItem(READ_NOTIFS_KEY)) || [];

    try {
        const q = query(
            collection(db, "general_notifications"),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);

        snapshot.forEach((doc) => {
            if (!readGeneralIds.includes(doc.id)) {
                generalNotifs.push({ id: doc.id, ...doc.data() });
                currentGeneralIds.push(doc.id);
            }
        });
        window.currentGeneralIds = currentGeneralIds;
    } catch (error) {
        console.error("Error fetching general notifications:", error);
    }

    // 3. الرسم
    const totalCount = cardUpdates.length + generalNotifs.length;

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

    // أ) رسم كروت التحديث (مع التاريخ)
    cardUpdates.forEach((deck) => {
        const dateStr = deck.lastUpdate || "Recent"; // 🔥 استرجاع التاريخ

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

    // ب) رسم الإشعارات العامة (مع التاريخ)
    generalNotifs.forEach((notif) => {
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

        // 🔥 حساب التاريخ
        let dateStr = "";
        if (notif.createdAt && notif.createdAt.seconds) {
            const dateObj = new Date(notif.createdAt.seconds * 1000);
            dateStr = dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
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
    const term = searchText.toLowerCase().trim();
    const filtered = allFlashcards.filter((card) => {
        const matchesSearch =
            card.title.toLowerCase().includes(term) ||
            (card.module && card.module.toLowerCase().includes(term)) ||
            (card.creator && card.creator.toLowerCase().includes(term));
        const matchesCategory =
            category === "all" || card.category === category;
        const matchesYear = year === "all" || card.year === year;
        return matchesSearch && matchesCategory && matchesYear;
    });
    // عند الفلترة، نعيد رسم الكروت المفلترة فقط
    renderCards(filtered, false);
}

export function saveDownloadHistory(deckId, version) {
    let history = JSON.parse(localStorage.getItem(DOWNLOADS_KEY)) || {};
    history[deckId] = version;
    localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(history));
    loadAllNotifications(allFlashcards); // تحديث فوري للإشعارات
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

// دالة مساعدة للنجوم
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

// دالة إرسال التقييم
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

        if (!snapshot.empty) {
            const oldReviewDoc = snapshot.docs[0];
            const diff = ratingValue - oldReviewDoc.data().rating;
            await updateDoc(doc(reviewsRef, oldReviewDoc.id), {
                rating: ratingValue,
                comment: comment,
                updatedAt: serverTimestamp(),
            });
            if (diff !== 0)
                await updateDoc(deckRef, { totalStars: increment(diff) });
        } else {
            await addDoc(reviewsRef, {
                userId: user.uid,
                userName: user.displayName,
                rating: ratingValue,
                comment: comment,
                createdAt: serverTimestamp(),
            });
            await updateDoc(deckRef, {
                totalReviews: increment(1),
                totalStars: increment(ratingValue),
            });
        }
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

// دالة جلب التقييم السابق
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

// دالة الإبلاغ
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
