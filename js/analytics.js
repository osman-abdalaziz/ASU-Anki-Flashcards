import { db } from "./config.js";
import {
    collection,
    getDocs,
    getCountFromServer,
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let visitsChart = null;
let allDecksData = []; // 🔥 مصفوفة لتخزين كل البيانات محلياً للفلترة السريعة

async function initAnalytics() {
    try {
        console.log("🔄 Loading Analytics...");

        // 1. جلب عدد المستخدمين
        try {
            const usersCol = collection(db, "users");
            const usersSnap = await getCountFromServer(usersCol);
            document.getElementById("usersCount").innerText =
                usersSnap.data().count;
        } catch (e) {
            console.error("Error fetching users count:", e);
            document.getElementById("usersCount").innerText = "0";
        }

        // 2. جلب الـ Decks وتخزينها
        const decksCol = collection(db, "decks");
        const decksSnap = await getDocs(decksCol);

        let activeDecks = 0;
        let totalDownloads = 0;
        allDecksData = []; // تصفير المصفوفة

        decksSnap.forEach((doc) => {
            const data = doc.data();
            if (data.isDeleted === true) return; // تجاهل المحذوف

            activeDecks++;
            const dl = data.downloads || 0;
            totalDownloads += dl;

            // تخزين البيانات للجدول والفلترة
            allDecksData.push({
                title: data.title || "Untitled",
                module: data.module || "-",
                year: data.year || "-",
                category: data.category || "Theoretical", // تأكد من الاسم في الداتابيز
                downloads: dl,
            });
        });

        // تحديث البطاقات العلوية
        document.getElementById("decksCount").innerText = activeDecks;
        document.getElementById("downloadsCount").innerText = totalDownloads;

        // 3. رسم الجدول الأولي (بدون فلترة)
        applyFilters();

        // 4. رسم الجراف
        await loadVisitsData();

        // 5. تفعيل مستمعي الأحداث للفلاتر (Event Listeners)
        setupEventListeners();
    } catch (error) {
        console.error("Critical Error loading analytics:", error);
    }
}

// دالة تفعيل الفلاتر
function setupEventListeners() {
    const searchInput = document.getElementById("analyticsSearch");
    const yearSelect = document.getElementById("analyticsYear");
    const catSelect = document.getElementById("analyticsCategory");

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (yearSelect) yearSelect.addEventListener("change", applyFilters);
    if (catSelect) catSelect.addEventListener("change", applyFilters);
}

// دالة تطبيق الفلترة
function applyFilters() {
    const searchVal = document
        .getElementById("analyticsSearch")
        .value.toLowerCase();
    const yearVal = document.getElementById("analyticsYear").value;
    const catVal = document.getElementById("analyticsCategory").value;

    // الفلترة
    let filteredDecks = allDecksData.filter((deck) => {
        const matchSearch =
            deck.title.toLowerCase().includes(searchVal) ||
            deck.module.toLowerCase().includes(searchVal);
        const matchYear = yearVal === "all" || deck.year === yearVal;

        // مقارنة مرنة للتصنيف (Case Insensitive)
        const matchCat =
            catVal === "all" ||
            (deck.category &&
                deck.category.toLowerCase() === catVal.toLowerCase());

        return matchSearch && matchYear && matchCat;
    });

    // إعادة الرسم
    renderTopDecksTable(filteredDecks);
}

function renderTopDecksTable(decks) {
    const tbody = document.getElementById("topDecksTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    // ترتيب تنازلي حسب التحميلات
    decks.sort((a, b) => b.downloads - a.downloads);

    // عرض أول 50 نتيجة فقط لتسريع الصفحة (أو يمكن إزالة الشرط لعرض الكل)
    const displayDecks = decks.slice(0, 50);

    if (displayDecks.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="4" style="text-align:center; padding: 20px;">No decks found matching filters.</td></tr>';
        return;
    }

    displayDecks.forEach((deck) => {
        const row = `
            <tr>
                <td><strong>${deck.title}</strong></td>
                <td>${deck.module}</td>
                <td>${deck.category}</td>
                <td><span style="font-size:0.85rem; color:#888;">${deck.year}</span></td>
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

document.addEventListener("DOMContentLoaded", initAnalytics);
