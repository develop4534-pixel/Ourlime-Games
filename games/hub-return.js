(() => {
    "use strict";

    const script = document.currentScript;
    if (!script) {
        throw new Error("The Games Ourlime return button could not find its script URL.");
    }

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("hub-return.css", script.src).href;
    document.head.append(stylesheet);

    const button = document.createElement("button");
    button.className = "ourlime-hub-return";
    button.type = "button";
    button.setAttribute("aria-label", "Return to Games Ourlime hub");
    button.setAttribute("aria-haspopup", "dialog");
    button.title = "Return to Hub";
    button.innerHTML = '<span class="ourlime-hub-return__arrow" aria-hidden="true">←</span><span>HUB</span>';

    document.body.append(button);

    const modal = document.createElement("div");
    modal.className = "ourlime-hub-modal";
    modal.hidden = true;
    modal.innerHTML = `
        <section class="ourlime-hub-modal__panel" role="dialog" aria-modal="true" aria-labelledby="ourlime-hub-title" aria-describedby="ourlime-hub-message" tabindex="-1">
            <h2 class="ourlime-hub-modal__title" id="ourlime-hub-title">Return to the Hub?</h2>
            <p class="ourlime-hub-modal__message" id="ourlime-hub-message">Your current game progress may be lost.</p>
            <div class="ourlime-hub-modal__actions">
                <button class="ourlime-hub-modal__stay" type="button">Keep Playing</button>
                <button class="ourlime-hub-modal__return" type="button">Return to Hub</button>
            </div>
        </section>`;
    document.body.append(modal);

    const stayButton = modal.querySelector(".ourlime-hub-modal__stay");
    const returnButton = modal.querySelector(".ourlime-hub-modal__return");
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
