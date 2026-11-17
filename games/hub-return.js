(() => {
    "use strict";

    const script = document.currentScript;
    if (!script) {
        throw new Error("The Games Ourlime return button could not find its script URL.");
    }

    const menuSelectors = {
        "1-colour-clash-run": "body[data-screen='welcome'], body[data-screen='menu']",
        "2-lime-link": "#ov [data-a='play']",
        "3-bounce-buddie": "#menu.on",
        "4-rift-flip": "#menu.on",
        "5-beat-bridge": "#menu.on",
        "6-doodle-duel": "#s-menu:not([hidden])",
        "8-glitch-garden": "#welcome.active, #menu.active",
        "9-switch-sprint": "#app[data-state='welcome'], #app[data-state='menu']",
        "10-challenge-caravan": "#welcome.active, #menu.active",
    };
    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    const gameSlug = lastSegment === "index.html" ? pathSegments[pathSegments.length - 2] : lastSegment;
    const menuSelector = menuSelectors[gameSlug];
    const menuScene = gameSlug === "7-tiny-planet-rescue" ? "Menu" : null;
    if (!menuSelector && !menuScene) {
        throw new Error(`The Games Ourlime return button has no menu state for "${gameSlug}".`);
    }

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("hub-return.css", script.src).href;
    document.head.append(stylesheet);

    const button = document.createElement("button");
    button.className = "ourlime-hub-return";
    button.type = "button";
    button.setAttribute("aria-label", "Return to the Games Ourlime catalog");
    button.setAttribute("aria-haspopup", "dialog");
    button.title = "Return to Games";
    button.innerHTML = '<span class="ourlime-hub-return__arrow" aria-hidden="true">←</span><span>GAMES</span>';
    button.hidden = true;

    document.body.append(button);

    const modal = document.createElement("div");
    modal.className = "ourlime-hub-modal";
    modal.hidden = true;
    modal.innerHTML = `
        <section class="ourlime-hub-modal__panel" role="dialog" aria-modal="true" aria-labelledby="ourlime-hub-title" aria-describedby="ourlime-hub-message" tabindex="-1">
            <h2 class="ourlime-hub-modal__title" id="ourlime-hub-title">Return to Games Ourlime?</h2>
            <p class="ourlime-hub-modal__message" id="ourlime-hub-message">You will return to the Games Ourlime catalog.</p>
            <div class="ourlime-hub-modal__actions">
                <button class="ourlime-hub-modal__stay" type="button">Keep Playing</button>
                <button class="ourlime-hub-modal__return" type="button">Return to Games</button>
            </div>
        </section>`;
    document.body.append(modal);

    const stayButton = modal.querySelector(".ourlime-hub-modal__stay");
    const returnButton = modal.querySelector(".ourlime-hub-modal__return");
    const isVisible = (element) => {
        if (!element || !element.isConnected || element.closest("[hidden], [aria-hidden='true']")) {
            return false;
        }
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
    };
    const isMenuVisible = () => {
        if (menuScene) {
            const game = window.__gamesOurlimeTinyPlanetRescueGame;
            return Boolean(game && game.scene && game.scene.isActive(menuScene));
        }
        return Array.from(document.querySelectorAll(menuSelector)).some(isVisible);
    };
    const positionButton = () => {
        const top = Number.parseFloat(window.getComputedStyle(button).top) || 12;
        const candidates = [
            { left: "max(12px, env(safe-area-inset-left))", right: "auto", transform: "none" },
            { left: "auto", right: "max(12px, env(safe-area-inset-right))", transform: "none" },
            { left: "25%", right: "auto", transform: "translateX(-50%)" },
            { left: "50%", right: "auto", transform: "translateX(-50%)" },
            { left: "75%", right: "auto", transform: "translateX(-50%)" },
        ].map((candidate) => ({ ...candidate, top: `${top}px` }));
        const controls = Array.from(document.querySelectorAll("button, a[href], input, select, textarea, [role='button']"))
            .filter((element) => element !== button &&
                !element.closest(".ourlime-hub-modal") &&
                isVisible(element) &&
                window.getComputedStyle(element).pointerEvents !== "none");
        let bestCandidate = candidates[0];
        let fewestOverlaps = Infinity;

        button.hidden = false;
        button.style.setProperty("visibility", "hidden", "important");
        const buttonRect = button.getBoundingClientRect();
        const maxLeft = Math.max(12, document.documentElement.clientWidth - buttonRect.width - 12);
        const maxTop = Math.min(top + 120, document.documentElement.clientHeight - buttonRect.height - 12);
        const horizontalStep = Math.max(12, Math.floor(buttonRect.width / 2));
        const verticalStep = buttonRect.height + 12;
        for (let candidateTop = top; candidateTop <= maxTop; candidateTop += verticalStep) {
            for (let left = 12; left <= maxLeft; left += horizontalStep) {
                candidates.push({ left: `${left}px`, right: "auto", transform: "none", top: `${candidateTop}px` });
            }
        }

        for (const candidate of candidates) {
            button.style.setProperty("left", candidate.left, "important");
            button.style.setProperty("right", candidate.right, "important");
            button.style.setProperty("transform", candidate.transform, "important");
            button.style.setProperty("top", candidate.top, "important");
            const rect = button.getBoundingClientRect();
            const overlaps = controls.filter((element) => {
                const control = element.getBoundingClientRect();
                return rect.left < control.right + 6 &&
                    rect.right + 6 > control.left &&
                    rect.top < control.bottom + 6 &&
                    rect.bottom + 6 > control.top;
            }).length;
            if (overlaps < fewestOverlaps) {
                bestCandidate = candidate;
                fewestOverlaps = overlaps;
            }
            if (overlaps === 0) {
                break;
            }
        }

        button.style.setProperty("left", bestCandidate.left, "important");
        button.style.setProperty("right", bestCandidate.right, "important");
        button.style.setProperty("transform", bestCandidate.transform, "important");
        button.style.setProperty("top", bestCandidate.top, "important");
        button.style.removeProperty("visibility");
    };
    let menuWasVisible = false;
    const updateButtonVisibility = () => {
        const menuVisible = isMenuVisible();
        if (menuVisible && !menuWasVisible) {
            positionButton();
        }
        button.hidden = !menuVisible;
        menuWasVisible = menuVisible;
    };
    const menuObserver = new MutationObserver((mutations) => {
        if (mutations.some(({ target }) =>
            target !== button &&
            target !== modal &&
            !button.contains(target) &&
            !modal.contains(target))) {
            updateButtonVisibility();
        }
    });
    menuObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["aria-hidden", "class", "data-screen", "data-state", "hidden", "style"],
        childList: true,
        subtree: true,
    });
    updateButtonVisibility();
    window.addEventListener("resize", () => {
        if (menuWasVisible) {
            positionButton();
        }
    });
    const menuPoll = menuScene ? window.setInterval(updateButtonVisibility, 200) : null;
    window.addEventListener("pagehide", () => {
        menuObserver.disconnect();
        if (menuPoll !== null) {
            window.clearInterval(menuPoll);
        }
    }, { once: true });

    const closeModal = () => {
        modal.hidden = true;
        button.focus();
    };

    button.addEventListener("click", () => {
        modal.hidden = false;
        stayButton.focus();
    });
    stayButton.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
    returnButton.addEventListener("click", () => {
        window.location.assign(new URL("../index.html", script.src));
    });
    modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closeModal();
        }
        if (event.key === "Tab") {
            const first = stayButton;
            const last = returnButton;
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });
})();
