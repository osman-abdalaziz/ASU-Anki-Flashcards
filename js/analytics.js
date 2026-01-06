// ✅ Correct Import: Get db directly from config.js
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

        // 1. Get User Count (from users collection)
        const usersCol = collection(db, "users");
        // Note: Using getCountFromServer is cost-effective
        const usersSnap = await getCountFromServer(usersCol);
        const userCount = usersSnap.data().count;
        document.getElementById("usersCount").innerText = userCount;

        // 2. Get Downloads & Decks Count
        const decksCol = collection(db, "decks");
        const decksSnap = await getDocs(decksCol);

        let totalDownloads = 0;
        let totalDecks = 0;

        decksSnap.forEach((doc) => {
            totalDecks++;
            const data = doc.data();
            // Sum up downloads (checking both common field names just in case)
            totalDownloads += data.downloads || data.downloadCount || 0;
        });

        document.getElementById("decksCount").innerText = totalDecks;
        document.getElementById("downloadsCount").innerText = totalDownloads;

        // 3. Load Visits Chart
        await loadVisitsData();
    } catch (error) {
        console.error("Error loading analytics:", error);
        document.getElementById("usersCount").innerText = "-";
        document.getElementById("decksCount").innerText = "-";
    }
}

async function loadVisitsData() {
    // Reference to the specific document storing daily visits
    const docRef = doc(db, "analytics", "daily_visits");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();

        // Sort dates to show timeline correctly
        const sortedDates = Object.keys(data).sort();
        // Take only the last 7 days
        const last7Days = sortedDates.slice(-7);
        const visitCounts = last7Days.map((date) => data[date]);

        // Show today's visits
        const today = new Date().toISOString().split("T")[0];
        document.getElementById("todayVisits").innerText = data[today] || 0;

        renderChart(last7Days, visitCounts);
    } else {
        document.getElementById("todayVisits").innerText = 0;
        renderChart([], []);
    }
}

function renderChart(labels, data) {
    const ctx = document.getElementById("visitsChart").getContext("2d");

    // Destroy old chart if exists to avoid overlap
    if (visitsChart) visitsChart.destroy();

    visitsChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Daily Visitors",
                    data: data,
                    borderColor: "#004d40", // Your primary color
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 2,
                    tension: 0.3, // Smooth curve
                    fill: true,
                    pointBackgroundColor: "#fff",
                    pointBorderColor: "#0f1112",
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
                    grid: { color: "rgba(255,255,255,0.05)" },
                },
                x: {
                    grid: { display: false },
                },
            },
        },
    });
}

// Run when page loads
document.addEventListener("DOMContentLoaded", initAnalytics);
