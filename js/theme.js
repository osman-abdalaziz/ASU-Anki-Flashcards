/* theme.js - manage light/dark theme and persist choice in localStorage */
(function () {
    const storageKey = "theme";
    const toggleId = "themeToggle";
    const root = document.documentElement;

    function applyTheme(theme) {
        try {
            root.setAttribute("data-theme", theme);

            // Main theme toggle button (desktop)
            const btn = document.getElementById(toggleId);
            if (btn) {
                const icon = btn.querySelector("i");
                if (theme === "light") {
                    btn.setAttribute("aria-pressed", "true");
                    if (icon) {
                        icon.classList.remove("fa-moon");
                        icon.classList.add("fa-sun");
                        icon.setAttribute("title", "Light mode");
                        icon.setAttribute("aria-hidden", "true");
                    }
                } else {
                    btn.setAttribute("aria-pressed", "false");
                    if (icon) {
                        icon.classList.remove("fa-sun");
                        icon.classList.add("fa-moon");
                        icon.setAttribute("title", "Dark mode");
                        icon.setAttribute("aria-hidden", "true");
                    }
                }
            }

            // Mobile theme button (if present) - keep in sync with main toggle
            const mobileBtn = document.getElementById("themeToggleMobile");
            if (mobileBtn) {
                const mobileIcon = mobileBtn.querySelector("i");
                if (theme === "light") {
                    mobileBtn.setAttribute("aria-pressed", "true");
                    if (mobileIcon) {
                        mobileIcon.classList.remove("fa-moon");
                        mobileIcon.classList.add("fa-sun");
                        mobileIcon.setAttribute("title", "Light mode");
                        mobileIcon.setAttribute("aria-hidden", "true");
                    }
                } else {
                    mobileBtn.setAttribute("aria-pressed", "false");
                    if (mobileIcon) {
                        mobileIcon.classList.remove("fa-sun");
                        mobileIcon.classList.add("fa-moon");
                        mobileIcon.setAttribute("title", "Dark mode");
                        mobileIcon.setAttribute("aria-hidden", "true");
                    }
                }
            }

            /* Swap header/nav logos and page logos */
            const headerLogoSrc =
                theme === "light"
                    ? "images/logo_light.webp"
                    : "images/logo.webp";
            const navLogo = document.querySelector("nav img");
            if (navLogo) navLogo.src = headerLogoSrc;

            const pageLogos = document.querySelectorAll(".logo img");
            pageLogos.forEach((img) => {
                if (img) img.src = headerLogoSrc;
            });

            /* Swap footer logo(s) - only replace images whose filename contains "mylogo" */
            const footerImgs = document.querySelectorAll("footer img");
            footerImgs.forEach((img) => {
                const src = img.getAttribute("src") || "";
                if (/mylogo/i.test(src)) {
                    img.src =
                        theme === "light"
                            ? "images/mylogo_black.webp"
                            : "images/mylogo_white.webp";
                }
            });
        } catch (err) {
            console.error("applyTheme error:", err);
        }
    }

    function initTheme() {
        try {
            const saved = localStorage.getItem(storageKey);
            const prefersDark =
                window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: dark)").matches;
            const defaultTheme =
                saved === "light" || saved === "dark"
                    ? saved
                    : prefersDark
                    ? "dark"
                    : "light";
            applyTheme(defaultTheme);
        } catch (err) {
            console.error("initTheme error:", err);
        }
    }

    function toggleTheme() {
        try {
            const current =
                root.getAttribute("data-theme") === "light" ? "light" : "dark";
            const next = current === "light" ? "dark" : "light";
            applyTheme(next);
            localStorage.setItem(storageKey, next);
        } catch (err) {
            console.error("toggleTheme error:", err);
        }
    }

    // Expose toggleTheme for other scripts (e.g., mobile menu) so they can call it directly
    try {
        window.toggleTheme = toggleTheme;
        window.applyTheme = applyTheme;
    } catch (err) {
        /* ignore if not allowed */
    }

    document.addEventListener("DOMContentLoaded", function () {
        initTheme();

        const btn = document.getElementById(toggleId);
        if (btn) {
            btn.addEventListener("click", function () {
                toggleTheme();
                try {
                    btn.animate(
                        [
                            { transform: "scale(0.97)" },
                            { transform: "scale(1)" },
                        ],
                        { duration: 160, easing: "ease" }
                    );
                } catch (e) {
                    /* animation may not be supported in all browsers */
                }
            });

            // keyboard: Enter / Space
            btn.addEventListener("keydown", function (e) {
                if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    toggleTheme();
                }
            });
        }
    });
})();
