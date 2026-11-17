const gameCards = document.querySelectorAll(".game-card");

gameCards.forEach((card) => {
    card.addEventListener("pointerdown", (event) => {
        if ((event.pointerType === "touch" || event.pointerType === "pen")
            && !event.target.closest(".game-card__play")
            && !card.classList.contains("is-flipped")) {
            event.preventDefault();
            card.classList.add("is-flipped");
        }
    });
});

document.addEventListener("pointerdown", (event) => {
    gameCards.forEach((card) => {
        if (card.classList.contains("is-flipped") && !card.contains(event.target)) {
            card.classList.remove("is-flipped");
        }
    });
});
