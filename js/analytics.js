import { db } from "./config.js";
import {
    collection,
    getDocs,
    getCountFromServer,
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let visitsChart = null;

async function initAnalytics() {
    try {
        console.log("🔄 Loading Analytics...");

        // 1. جلب عدد المستخدمين (مع معالجة الأخطاء)
        try {
            const usersCol = collection(db, "users");
            const usersSnap = await getCountFromServer(usersCol);
            document.getElementById("usersCount").innerText =
                usersSnap.data().count;
        } catch (e) {
            console.error("Error fetching users count:", e);
            document.getElementById("usersCount").innerText = "N/A";
        }

        // 2. جلب الملفات (مع استبعاد المحذوف + حساب الموديولات)
        const decksCol = collection(db, "decks");
        const decksSnap = await getDocs(decksCol);

        let activeDecks = 0;
        let totalDownloads = 0;
        let moduleStats = {}; // لتخزين إحصائيات كل موديول

        decksSnap.forEach((doc) => {
            const data = doc.data();

            // 🔥 التعديل: تجاهل الملفات المحذوفة 🔥
            if (data.isDeleted === true) return;

            activeDecks++;

            // حساب التنزيلات (نتأكد من وجود الحقل)
            const downloads = data.downloads || 0;
            totalDownloads += downloads;

            // تجميع البيانات للجدول (Module Stats)
            const modName = data.module || "General / Other";
            if (!moduleStats[modName]) {
                moduleStats[modName] = 0;
            }
            moduleStats[modName] += downloads;
        });

        // تحديث الأرقام في الشاشة
        document.getElementById("decksCount").innerText = activeDecks;
        document.getElementById("downloadsCount").innerText = totalDownloads;

        // رسم جدول الموديولات
        renderModulesTable(moduleStats);

        // 3. جلب ورسم زيارات الموقع
        await loadVisitsData();
    } catch (error) {
        console.error("Critical Error loading analytics:", error);
    }
}

// دالة رسم الجدول الجديد
function renderModulesTable(stats) {
    const tbody = document.getElementById("modulesTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    // تحويل الكائن لمصفوفة وترتيبها بالأكثر تنزيلاً
    const sortedModules = Object.entries(stats).sort((a, b) => b[1] - a[1]);

    if (sortedModules.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="2" style="text-align:center;">No data available yet</td></tr>';
        return;
    }

    sortedModules.forEach(([name, count]) => {
        const row = `
            <tr>
                <td>${name}</td>
                <td><span class="badge-download">${count} Downloads</span></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// دالة رسم الجراف (كما هي)
async function loadVisitsData() {
    const docRef = doc(db, "analytics", "daily_visits");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        const sortedDates = Object.keys(data).sort().slice(-7);
        const visitCounts = sortedDates.map((date) => data[date]);
        const today = new Date().toISOString().split("T")[0];
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

    // الألوان حسب الثيم (افتراضي)
    const isDark = document.body.classList.contains("dark-mode");

    visitsChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Daily Visitors",
                    data: data,
                    borderColor: "#0088d1", // Your primary color
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 2,
                    tension: 0.3, // Smooth curve
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
            plugins: {
                legend: { display: false }, // Hide legend for cleaner look
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: "rgba(255,255,255,0.075)" },
                },
                x: {
                    grid: { display: false },
                },
            },
        },
    });
}

document.addEventListener("DOMContentLoaded", initAnalytics);
