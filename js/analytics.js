import { db, auth } from "./config.js";
import {
    collection,
    getDocs,
    getCountFromServer, // 👈 دالة العد الرخيصة
    doc,
    getDoc,
    query,
    where,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com";
let visitsChart = null;
let allDecksData = [];

// 1. الحماية والتهيئة (تم التصحيح)
document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, (user) => {
        if (!user || user.email !== ADMIN_EMAIL) {
            window.location.href = "../index";
            return; // 🔥 هذا السطر مهم جداً لمنع الانهيار
        }
        initAnalytics();
    });
});

async function initAnalytics() {
    try {
        console.log("🔄 Loading Precision Analytics...");

        // 1. جلب عدد المستخدمين
        try {
            const usersCol = collection(db, "users");
            const usersSnap = await getCountFromServer(usersCol);
            document.getElementById("usersCount").innerText =
                usersSnap.data().count;
        } catch (e) {
            console.error("Error fetching users count:", e);
            document.getElementById("usersCount").innerText = "-";
        }

        // 🔥 2. حساب عدد الملفات النشطة (Active Decks) بدقة وتوفير 🔥
        // المعادلة: الكل - المحذوف = النشط
        try {
            const decksCol = collection(db, "decks");

            // أ) العدد الكلي (رخيص)
            const totalSnap = await getCountFromServer(decksCol);
            const totalCount = totalSnap.data().count;

            // ب) عدد المحذوف فقط (رخيص)
            const deletedQuery = query(
                decksCol,
                where("isDeleted", "==", true)
            );
            const deletedSnap = await getCountFromServer(deletedQuery);
            const deletedCount = deletedSnap.data().count;

            // ج) الناتج الصافي
            const activeDecks = totalCount - deletedCount;
            document.getElementById("decksCount").innerText = activeDecks;
        } catch (e) {
            console.error("Error calculating active decks:", e);
        }

        // 🔥 3. جلب بيانات الجدول (للملفات المحملة فقط) 🔥
        // نطلب فقط الملفات التي عليها تحميلات (لتوفير القراءات)
        const decksCol = collection(db, "decks");
        const q = query(decksCol, where("downloads", ">", 0));

        const decksSnap = await getDocs(q);

        let totalDownloads = 0;
        allDecksData = []; // تصفير المصفوفة

        decksSnap.forEach((doc) => {
            const data = doc.data();

            // 🛑 التحقق الأهم: لو الملف محذوف، تجاهله تماماً (حتى لو عليه تحميلات)
            if (data.isDeleted === true) return;

            const dl = data.downloads || 0;
            totalDownloads += dl;

            // تخزين البيانات
            allDecksData.push({
                title: data.title || "Untitled",
                module: data.module || "-",
                year: data.year || "-",
                category: data.category || "Theoretical",
                downloads: dl,
            });
        });

        // تحديث رقم إجمالي التحميلات
        document.getElementById("downloadsCount").innerText = totalDownloads;

        // 4. رسم الجدول الأولي
        applyFilters();

        // 5. رسم الجراف
        await loadVisitsData();

        // 6. تفعيل الفلاتر
        setupEventListeners();
    } catch (error) {
        console.error("Critical Error loading analytics:", error);
    }
}

// --- باقي الدوال (الفلترة والرسم) كما هي ---

function setupEventListeners() {
    const searchInput = document.getElementById("analyticsSearch");
    const yearSelect = document.getElementById("analyticsYear");
    const catSelect = document.getElementById("analyticsCategory");

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (yearSelect) yearSelect.addEventListener("change", applyFilters);
    if (catSelect) catSelect.addEventListener("change", applyFilters);
}

function applyFilters() {
    const searchVal = document
        .getElementById("analyticsSearch")
        .value.toLowerCase();
    const yearVal = document.getElementById("analyticsYear").value;
    const catVal = document.getElementById("analyticsCategory").value;

    let filteredDecks = allDecksData.filter((deck) => {
        const matchSearch =
            deck.title.toLowerCase().includes(searchVal) ||
            deck.module.toLowerCase().includes(searchVal);
        const matchYear = yearVal === "all" || deck.year === yearVal;
        const matchCat =
            catVal === "all" ||
            (deck.category &&
                deck.category.toLowerCase() === catVal.toLowerCase());

        return matchSearch && matchYear && matchCat;
    });

    renderTopDecksTable(filteredDecks);
}

function renderTopDecksTable(decks) {
    const tbody = document.getElementById("topDecksTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    // ترتيب تنازلي
    decks.sort((a, b) => b.downloads - a.downloads);

    // عرض أول 50
    const displayDecks = decks.slice(0, 50);

    if (displayDecks.length === 0) {
        const msg =
            allDecksData.length === 0
                ? "No downloads recorded yet."
                : "No decks match filters.";
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 15px;">${msg}</td></tr>`;
        return;
    }

    displayDecks.forEach((deck) => {
        const row = `
            <tr>
                <td><strong class="badge-download"><i class="fa-solid fa-folder-closed fa-fw"></i> ${deck.title}</strong></td>
                <td>${deck.module}</td>
                <td>${deck.category}</td>
                <td><span style="font-size:0.85rem; background: #ffffff11; color:#888; padding: 4px 10px; border-radius: 6px;">${deck.year}</span></td>
                <td><span class="badge-download">${deck.downloads} <i class="fa-solid fa-download" style="font-size:0.7rem; margin-left:3px;"></i></span></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function loadVisitsData() {
    const docRef = doc(db, "analytics", "daily_visits");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        const sortedDates = Object.keys(data).sort().slice(-7);
        const visitCounts = sortedDates.map((date) => data[date]);

        const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Africa/Cairo",
        });

        document.getElementById("todayVisits").innerText = data[today] || 0;
        renderChart(sortedDates, visitCounts);
    } else {
        document.getElementById("todayVisits").innerText = 0;
        renderChart([], []);
    }
}

function renderChart(labels, data) {
    const ctx = document.getElementById("visitsChart").getContext("2d");
    if (visitsChart) visitsChart.destroy();

    visitsChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Visits",
                    data: data,
                    borderColor: "#0088d1",
                    backgroundColor: "rgba(0, 136, 209, 0.1)",
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: "#fff",
                    pointBorderColor: "#0088d1",
                    pointRadius: 4,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: "rgba(255,255,255,0.05)" },
                    ticks: { color: "#888" },
                },
                x: { grid: { display: false }, ticks: { color: "#888" } },
            },
        },
    });
}
