import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    serverTimestamp,
    doc,
    getDoc,
    setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showModal } from "./ui.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const storage = getStorage();

// ==========================================
// 1. Authentication Guard
// ==========================================
let currentCreatorName = "Creator";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const role = userSnap.data().role || "student";
                if (
                    role === "maker" ||
                    role === "admin" ||
                    user.email === "osmanabdalaziz2005@gmail.com"
                ) {
                    currentCreatorName =
                        userSnap.data().name || user.displayName || "Creator";
                    const nameEl = document.getElementById("mobileUserName");
                    if (nameEl) nameEl.innerText = currentCreatorName;
                    const avatarEl =
                        document.getElementById("mobileUserAvatar");
                    if (avatarEl)
                        avatarEl.src = user.photoURL || "../images/user.webp";
                } else {
                    window.location.href = "../index.html";
                }
            }
        } catch (error) {
            console.error("Auth Guard Error:", error);
        }
    } else {
        window.location.href = "../index.html";
    }
});

function getDirectDriveLink(url) {
    let fileId = null;
    const regex1 = /\/d\/([a-zA-Z0-9_-]+)/;
    const regex2 = /id=([a-zA-Z0-9_-]+)/;

    if (url.match(regex1)) fileId = url.match(regex1)[1];
    else if (url.match(regex2)) fileId = url.match(regex2)[1];

    if (fileId)
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    return null;
}

// ==========================================
// 2. Pure Canvas Banner Engine
// ==========================================
const canvas = document.getElementById("bannerCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

const brandColors = [
    "#E53935",
    "#D81B60",
    "#8E24AA",
    "#5E35B1",
    "#3949AB",
    "#1E88E5",
    "#039BE5",
    "#00ACC1",
    "#00897B",
    "#43A047",
    "#7CB342",
    "#FDD835",
    "#FB8C00",
    "#F4511E",
    "#6D4C41",
];

const availableIcons = [
    { id: "icon-cns", preview: "../images/icons/cns.png" },
    { id: "icon-pharma", preview: "../images/icons/pharma.png" },
    { id: "icon-micro", preview: "../images/icons/micro.png" },
];

let selectedColor = brandColors[5];
let selectedIconPath = availableIcons[0]?.preview;

// Load template overlay (1920x1080 transparent PNG)
const overlayImg = new Image();
overlayImg.src = "../images/template_overlay.png";
overlayImg.onload = () => drawBanner();

// Load currently selected icon (1920x1080 transparent PNG)
let currentIconImg = new Image();
currentIconImg.src = selectedIconPath;
currentIconImg.onload = () => drawBanner();

// Ensure banner is redrawn once the custom web font is loaded
document.fonts.ready.then(() => {
    drawBanner();
});

function initPickers() {
    const colorContainer = document.getElementById("colorPicker");
    if (colorContainer) colorContainer.innerHTML = "";
    brandColors.forEach((color) => {
        const div = document.createElement("div");
        div.className = `color-swatch ${color === selectedColor ? "active" : ""}`;
        div.style.backgroundColor = color;
        div.onclick = () => {
            document
                .querySelectorAll(".color-swatch")
                .forEach((el) => el.classList.remove("active"));
            div.classList.add("active");
            selectedColor = color;
            drawBanner();
        };
        colorContainer?.appendChild(div);
    });

    const iconContainer = document.getElementById("iconPicker");
    if (iconContainer) iconContainer.innerHTML = "";
    availableIcons.forEach((iconObj) => {
        const img = document.createElement("img");
        img.src = iconObj.preview;
        img.className = `icon-option ${iconObj.preview === selectedIconPath ? "active" : ""}`;
        img.onclick = () => {
            document
                .querySelectorAll(".icon-option")
                .forEach((el) => el.classList.remove("active"));
            img.classList.add("active");
            selectedIconPath = iconObj.preview;
            currentIconImg.src = selectedIconPath;
        };
        iconContainer?.appendChild(img);
    });
}

function drawBanner() {
    if (!ctx) return;

    const titleInput =
        document.getElementById("deckTitle")?.value.trim() || "Deck Title";
    const yearFull = document.getElementById("deckYear")?.value || "5th Year";

    // Split title into two parts
    const titleWords = titleInput.split(/\s+/).filter((w) => w.length > 0);
    const part1 = titleWords[0] || "Deck";
    const part2 = titleWords.length > 1 ? titleWords[1] : "Module";

    // Extract numerical prefix from year
    const yearShort = yearFull.split(" ")[0];

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Layer 1: Base background color
    ctx.fillStyle = selectedColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Layer 2: Template overlay
    if (overlayImg.complete && overlayImg.naturalWidth > 0) {
        ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
    }

    // 🔴 3. رسم الأيقونة بمقاسها الحقيقي
    if (currentIconImg.complete && currentIconImg.naturalWidth > 0) {
        const iconWidth = currentIconImg.naturalWidth;
        const iconHeight = currentIconImg.naturalHeight;

        // الكود الآن يرسمها بحجمها الأصلي لمنع البكسلة. قم بتعديل X و Y فقط (1250 و 300).
        ctx.drawImage(currentIconImg, 1250, 220, iconWidth, iconHeight);
    }

    // ==========================================
    // Advanced Text Rendering Engine
    // ==========================================

    // Fetch values from the manual text control sliders
    const titleSize = parseInt(
        document.getElementById("ctrlTitleSize")?.value || 120,
    );

    const part1X = parseInt(
        document.getElementById("ctrlPart1X")?.value || 120,
    );
    const part1Y = parseInt(
        document.getElementById("ctrlPart1Y")?.value || 400,
    );
    const part1Angle = parseInt(
        document.getElementById("ctrlPart1Angle")?.value || 0,
    );

    const part2X = parseInt(
        document.getElementById("ctrlPart2X")?.value || 120,
    );
    const part2Y = parseInt(
        document.getElementById("ctrlPart2Y")?.value || 520,
    );
    const part2Angle = parseInt(
        document.getElementById("ctrlPart2Angle")?.value || 0,
    );

    // Helper function to render isolated, rotated text
    function writeText(
        text,
        x,
        y,
        fontSize,
        angleInDegrees = 0,
        color = "#FFFFFF",
    ) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((angleInDegrees * Math.PI) / 180);

        ctx.textAlign = "left";
        ctx.fillStyle = color;
        ctx.font = `${fontSize}px "FBWallW W34 Regular", sans-serif`;

        ctx.fillText(text, 0, 0);
        ctx.restore();
    }

    // Render Part 1
    writeText(part1, part1X, part1Y, titleSize, part1Angle, "#FFFFFF");

    // Render Part 2 (with opacity applied)
    writeText(
        part2,
        part2X,
        part2Y,
        titleSize,
        part2Angle,
        "rgba(255, 255, 255, 1)",
    );

    writeText(yearShort, 620, 800, 110, 0, "#FFFFFF");
}

// ==========================================
// 3. Sync Controls & Event Listeners
// ==========================================
const controlIds = [
    "ctrlTitleSize",
    "ctrlPart1X",
    "ctrlPart1Y",
    "ctrlPart1Angle",
    "ctrlPart2X",
    "ctrlPart2Y",
    "ctrlPart2Angle",
];

controlIds.forEach((id) => {
    const slider = document.getElementById(id);
    const numInput = document.getElementById(id + "Num");

    if (slider && numInput) {
        // Range slider -> updates number input & redraws
        slider.addEventListener("input", (e) => {
            numInput.value = e.target.value;
            drawBanner();
        });
        // Number input -> updates range slider & redraws
        numInput.addEventListener("input", (e) => {
            slider.value = e.target.value;
            drawBanner();
        });
    }
});

// Bind text inputs to instant canvas refresh
["deckTitle", "deckYear"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", drawBanner);
});

initPickers();

// ==========================================
// 4. Form Submission & Firebase Storage
// ==========================================
const submitForm = document.getElementById("submitDeckForm");
const submitBtn = document.getElementById("submitBtn");

if (submitForm) {
    submitForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("deckTitle").value.trim();
        const moduleName =
            document.getElementById("deckModule")?.value.trim() || "";
        const year = document.getElementById("deckYear").value;
        const category = document.getElementById("deckCategory").value;
        const driveLink = document.getElementById("driveLink").value.trim();
        const desc = document.getElementById("deckDesc").value.trim();

        const showCreatorCheckbox = document.getElementById("showCreatorName");
        const isNameVisible = showCreatorCheckbox
            ? showCreatorCheckbox.checked
            : true;
        const finalCreatorName = isNameVisible
            ? currentCreatorName
            : "ASU Students";

        const directLink = getDirectDriveLink(driveLink);

        if (!directLink) {
            showModal(
                "Invalid Link",
                "Please paste a valid Google Drive file link.",
            );
            return;
        }

        if (submitBtn) {
            submitBtn.innerHTML =
                'Submitting... <i class="fa-solid fa-spinner fa-spin"></i>';
            submitBtn.disabled = true;
        }

        try {
            const randomChars = Math.random().toString(36).substring(2, 7);
            const cleanTitle = title
                .toLowerCase()
                .replace(/[^a-zA-Z0-9\u0621-\u064A\s-]/g, "")
                .trim()
                .replace(/\s+/g, "-");
            const customDeckId = `${cleanTitle}-${randomChars}`;

            canvas.toBlob(
                async (blob) => {
                    const bannerRef = ref(
                        storage,
                        `banners/${customDeckId}.webp`,
                    );
                    await uploadBytes(bannerRef, blob);
                    const generatedBannerUrl = await getDownloadURL(bannerRef);

                    await setDoc(doc(db, "decks", customDeckId), {
                        title: title,
                        module: moduleName,
                        year: year,
                        category: category,
                        description: desc,
                        downloadUrl: directLink,
                        imageUrl: generatedBannerUrl,
                        version: "v1.0",
                        creator: finalCreatorName,
                        creatorId: auth.currentUser.uid,
                        status: "pending",
                        createdAt: serverTimestamp(),
                        lastUpdate: new Date().toLocaleDateString("en-GB"),
                        isDeleted: false,
                        isHidden: false,
                    });

                    showModal(
                        "Success!",
                        "Deck submitted and is now pending admin review.",
                    );
                    submitForm.reset();
                    drawBanner();

                    if (submitBtn) {
                        submitBtn.innerHTML =
                            'Submit for Review <i class="fa-solid fa-paper-plane fa-fw"></i>';
                        submitBtn.disabled = false;
                    }
                },
                "image/webp",
                0.5,
            );
        } catch (error) {
            console.error("Submission Error:", error);
            showModal("Error", "Something went wrong. Please try again.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML =
                    'Submit for Review <i class="fa-solid fa-paper-plane fa-fw"></i>';
            }
        }
    });
}
