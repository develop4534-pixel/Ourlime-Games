const gameCards = document.querySelectorAll(".game-card");

const ratingStorageKey = "ourlime-game-ratings";

const getSavedRatings = () => {
    try {
        return JSON.parse(localStorage.getItem(ratingStorageKey) || "{}");
    } catch (_) {
        return {};
    }
};

const savedRatings = getSavedRatings();

const setStarSelection = (ratingElement, rating) => {
    ratingElement.dataset.rating = String(rating);
    ratingElement.querySelectorAll(".game-rating__star").forEach((star, index) => {
        const selected = index < rating;
        star.classList.toggle("is-selected", selected);
        star.setAttribute("aria-checked", index === rating - 1 ? "true" : "false");
    });
};

gameCards.forEach((card, index) => {
    const front = card.querySelector(".game-card__front");
    if (!front) return;

    const gameKey = `game-${index + 1}`;
    const gameName = card.querySelector("h3")?.textContent || `Game ${index + 1}`;
    const ratingElement = document.createElement("div");
    ratingElement.className = "game-rating";
    ratingElement.setAttribute("role", "radiogroup");
    ratingElement.setAttribute("aria-label", `Rate ${gameName}`);

    for (let starIndex = 1; starIndex <= 5; starIndex++) {
        const star = document.createElement("button");
        star.type = "button";
        star.className = "game-rating__star";
        star.textContent = "★";
        star.setAttribute("role", "radio");
        star.setAttribute("aria-label", `${starIndex} out of 5 stars`);
        star.setAttribute("aria-checked", "false");
        star.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            savedRatings[gameKey] = starIndex;
            localStorage.setItem(ratingStorageKey, JSON.stringify(savedRatings));
            setStarSelection(ratingElement, starIndex);
        });
        star.addEventListener("mouseenter", () => {
            setStarSelection(ratingElement, starIndex);
        });
        star.addEventListener("keydown", (event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const direction = event.key === "ArrowRight" ? 1 : -1;
            const nextRating = Math.max(1, Math.min(5, starIndex + direction));
            const nextStar = ratingElement.querySelectorAll(".game-rating__star")[nextRating - 1];
            nextStar?.focus();
        });
        ratingElement.append(star);
    }

    ratingElement.addEventListener("mouseleave", () => {
        setStarSelection(ratingElement, Number(savedRatings[gameKey]) || 0);
    });
    const ratingPosition = front.querySelector(".game-info > div");
    if (ratingPosition) {
        ratingPosition.append(ratingElement);
    } else {
        front.append(ratingElement);
    }
    setStarSelection(ratingElement, Number(savedRatings[gameKey]) || 0);
});

gameCards.forEach((card) => {
    card.addEventListener("pointerdown", (event) => {
        if ((event.pointerType === "touch" || event.pointerType === "pen")
            && !event.target.closest(".game-card__play")
            && !event.target.closest(".game-rating")
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

let lobbyMusicStarted = false;
let lobbyAudioContext = null;
let lobbyBassAnalyser = null;
let lobbyBassData = null;
let lobbyMusicBuffer = null;
let lobbyMusicSource = null;
let lobbyMusicGain = null;
let lobbyLastEnergy = 0;
let lobbyBeatTime = 0;
let lobbyBeatInterval = 0;
let lobbyBeatCount = 0;
let lobbyLastStrongHit = 0;
let lobbyBeatPulse = 0;
let lobbyAdaptiveBassThreshold = 0.30;
let lobbyRecentBassAverage = 0;
let lobbyBeatPhase = 0;
let lobbyMusicSetupPromise = null;
const lobbyMinimumBassEnergy = 0.18;
const lobbyCards = Array.from(document.querySelectorAll(".game-card"));
const lobbyFeatured = document.querySelector(".featured");

const setupLobbyBassEffect = async () => {
    if (lobbyBassAnalyser && lobbyMusicSource) {
        if (lobbyAudioContext && lobbyAudioContext.state === "suspended") {
            await lobbyAudioContext.resume().catch(() => {});
        }
        return;
    }
    if (lobbyMusicSetupPromise) return lobbyMusicSetupPromise;

    lobbyMusicSetupPromise = (async () => {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        lobbyAudioContext = new AudioContextClass();
        lobbyBassAnalyser = lobbyAudioContext.createAnalyser();
        lobbyBassAnalyser.fftSize = 512;
        lobbyBassAnalyser.smoothingTimeConstant = 0.72;
        lobbyBassData = new Uint8Array(lobbyBassAnalyser.frequencyBinCount);

        lobbyMusicGain = lobbyAudioContext.createGain();
        lobbyMusicGain.gain.setValueAtTime(0.0001, lobbyAudioContext.currentTime);
        lobbyMusicGain.gain.exponentialRampToValueAtTime(0.38, lobbyAudioContext.currentTime + 1.2);
        const lobbyMusicCompressor = lobbyAudioContext.createDynamicsCompressor();
        lobbyMusicCompressor.threshold.value = -18;
        lobbyMusicCompressor.knee.value = 24;
        lobbyMusicCompressor.ratio.value = 8;
        lobbyMusicCompressor.attack.value = 0.012;
        lobbyMusicCompressor.release.value = 0.25;
        lobbyMusicGain.connect(lobbyMusicCompressor);
        lobbyMusicCompressor.connect(lobbyBassAnalyser);
        lobbyBassAnalyser.connect(lobbyAudioContext.destination);
        await lobbyAudioContext.resume().catch(() => {});

        if (!lobbyMusicBuffer) {
            const response = await fetch("games/3-bounce-buddie/travi.mp3");
            if (!response.ok) throw new Error(`Lobby music load failed: ${response.status}`);
            lobbyMusicBuffer = await lobbyAudioContext.decodeAudioData(await response.arrayBuffer());
        }

        lobbyMusicSource = lobbyAudioContext.createBufferSource();
        lobbyMusicSource.buffer = lobbyMusicBuffer;
        lobbyMusicSource.loop = true;
        lobbyMusicSource.connect(lobbyMusicGain);
        lobbyMusicSource.start(0);
        lobbyMusicStarted = true;
      } catch (_) {
        lobbyBassAnalyser = null;
      }
    })();

    try {
        await lobbyMusicSetupPromise;
    } finally {
        lobbyMusicSetupPromise = null;
    }
};

const createLobbyBassWave = (card, strongHit) => {
    if (!card) return;
    const wave = document.createElement("span");
    wave.className = strongHit ? "lobby-bass-wave lobby-bass-wave--strong" : "lobby-bass-wave lobby-bass-wave--soft";
    wave.setAttribute("aria-hidden", "true");
    card.append(wave);
    wave.addEventListener("animationend", () => wave.remove(), { once: true });
};

const retriggerLobbyVibration = (element, hitClass, duration) => {
    if (!element) return;
    element.classList.remove(hitClass);
    void element.offsetWidth;
    element.classList.add(hitClass);
    window.setTimeout(() => element.classList.remove(hitClass), duration);
};

const animateLobbyBassEffect = () => {
    let energy = 0;
    let tranceEnergy = 0;

    if (lobbyBassAnalyser && lobbyBassData && lobbyAudioContext) {
        lobbyBassAnalyser.getByteFrequencyData(lobbyBassData);
        const nyquist = lobbyAudioContext.sampleRate / 2;
        const startBin = Math.floor((35 / nyquist) * lobbyBassData.length);
        const endBin = Math.min(lobbyBassData.length, Math.ceil((180 / nyquist) * lobbyBassData.length));
        const tranceStart = Math.min(lobbyBassData.length, Math.ceil((180 / nyquist) * lobbyBassData.length));
        const tranceEnd = Math.min(lobbyBassData.length, Math.ceil((2400 / nyquist) * lobbyBassData.length));
        let total = 0;
        for (let bin = startBin; bin < endBin; bin++) {
            total += lobbyBassData[bin];
        }
        let tranceTotal = 0;
        for (let bin = tranceStart; bin < tranceEnd; bin++) {
            tranceTotal += lobbyBassData[bin];
        }
        const average = endBin > startBin ? total / (endBin - startBin) / 255 : 0;
        const tranceAverage = tranceEnd > tranceStart ? tranceTotal / (tranceEnd - tranceStart) / 255 : 0;
        lobbyRecentBassAverage = lobbyRecentBassAverage * 0.96 + average * 0.04;
        lobbyAdaptiveBassThreshold = Math.max(0.22, lobbyRecentBassAverage + 0.10);
        energy = average > lobbyAdaptiveBassThreshold
            ? Math.min(1, (average - lobbyAdaptiveBassThreshold) / 0.38)
            : 0;
        tranceEnergy = tranceAverage > 0.18
            ? Math.min(1, (tranceAverage - 0.18) * 2)
            : 0;
    }

    const bassHit = energy > lobbyLastEnergy + 0.08;
    lobbyLastEnergy = lobbyLastEnergy * 0.78 + energy * 0.22;
    const displayEnergy = Math.max(energy, lobbyLastEnergy);
    const hasActiveBass = displayEnergy >= lobbyMinimumBassEnergy;
    if (!hasActiveBass) {
        lobbyBeatPulse = 0;
        document.body.classList.remove("lobby-trance", "lobby-soft-rhythm", "lobby-strong-bass");
        lobbyCards.forEach((card) => {
            card.classList.remove("is-bass-hit", "is-trance-hit");
        });
        if (lobbyFeatured) {
            lobbyFeatured.classList.remove("is-bass-hit", "is-trance-hit");
            lobbyFeatured.style.setProperty("--featured-x", "0px");
            lobbyFeatured.style.setProperty("--featured-y", "0px");
            lobbyFeatured.style.setProperty("--featured-rotate", "0deg");
            lobbyFeatured.style.setProperty("--featured-energy", "0");
            lobbyFeatured.style.setProperty("--featured-brightness", "1");
        }
        lobbyCards.forEach((card) => {
            card.style.setProperty("--bass-x", "0px");
            card.style.setProperty("--bass-y", "0px");
            card.style.setProperty("--bass-rotate", "0deg");
            card.style.setProperty("--bass-blur", "0px");
            card.style.setProperty("--bass-spread", "0px");
            card.style.setProperty("--bass-inset", "0px");
            card.style.setProperty("--bass-brightness", "1");
            card.style.setProperty("--bass-energy", "0");
        });
    }
    const now = performance.now();
    const strongBassHit = hasActiveBass && energy > 0.48 && now - lobbyLastStrongHit > 260;

    if (strongBassHit) {
        lobbyBeatPulse = 1;
        if (lobbyBeatTime > 0) {
            const interval = now - lobbyBeatTime;
            if (interval >= 250 && interval <= 1400) {
                lobbyBeatInterval = lobbyBeatInterval
                    ? lobbyBeatInterval * 0.7 + interval * 0.3
                    : interval;
            }
        }
        lobbyBeatTime = now;
        lobbyLastStrongHit = now;
        lobbyBeatCount++;

        lobbyCards.forEach((card, index) => {
            window.setTimeout(() => createLobbyBassWave(card, true), index * 18);
        });
        retriggerLobbyVibration(lobbyFeatured, "is-bass-hit", 180);
        lobbyCards.forEach((card, index) => {
            window.setTimeout(() => retriggerLobbyVibration(card, "is-bass-hit", 180), index * 12);
        });
    } else if (hasActiveBass && tranceEnergy > 0.32 && now - lobbyBeatTime > 420) {
        const card = lobbyCards[lobbyBeatCount % lobbyCards.length];
        if (card) createLobbyBassWave(card, false);
        retriggerLobbyVibration(lobbyFeatured, "is-trance-hit", 260);
        retriggerLobbyVibration(card, "is-trance-hit", 260);
        lobbyBeatTime = now;
        lobbyBeatCount++;
    }

    document.body.classList.toggle("lobby-soft-rhythm", hasActiveBass && tranceEnergy > 0.32 && !strongBassHit);
    document.body.classList.toggle("lobby-strong-bass", strongBassHit);
    lobbyBeatPulse *= 0.91;
    const tempoInterval = lobbyBeatInterval > 0
        ? lobbyBeatInterval
        : (tranceEnergy > 0.32 ? 520 : 760);
    document.body.style.setProperty("--lobby-rhythm-duration", `${Math.max(320, tempoInterval).toFixed(0)}ms`);
    lobbyBeatPhase = lobbyBeatTime > 0
        ? ((now - lobbyBeatTime) / tempoInterval) * Math.PI * 2
        : lobbyBeatPhase + (tranceEnergy > 0.32 ? 0.055 : 0.035);

    lobbyCards.forEach((card, index) => {
        const stagger = bassHit ? Math.sin(index * 1.37) * displayEnergy : 0;
        const cardEnergy = Math.max(0, displayEnergy + stagger * 0.12);
        const vibration = lobbyBeatPulse > 0.02
            ? lobbyBeatPulse * 1.25
            : cardEnergy * 0.35;
        const beatTime = lobbyBeatPhase;
        card.style.setProperty("--bass-energy", cardEnergy.toFixed(3));
        card.style.setProperty("--bass-blur", `${(12 * cardEnergy).toFixed(1)}px`);
        card.style.setProperty("--bass-spread", `${(22 * cardEnergy).toFixed(1)}px`);
        card.style.setProperty("--bass-inset", `${(14 * cardEnergy).toFixed(1)}px`);
        card.style.setProperty("--bass-brightness", (1 + cardEnergy * 0.12).toFixed(3));
        card.style.setProperty("--bass-x", `${(Math.sin(beatTime + index * 1.9) * vibration).toFixed(2)}px`);
        card.style.setProperty("--bass-y", `${(Math.cos(beatTime * 1.23 + index) * vibration * 0.55).toFixed(2)}px`);
        card.style.setProperty("--bass-rotate", `${(Math.sin(beatTime * 0.71 + index) * vibration * 0.24).toFixed(2)}deg`);
        card.style.setProperty("--trance-energy", tranceEnergy.toFixed(3));
    });
    if (lobbyFeatured) {
        const featuredPulse = lobbyBeatPulse > 0.02
            ? lobbyBeatPulse * 1.45
            : displayEnergy * 0.42;
        lobbyFeatured.style.setProperty("--featured-x", `${(Math.sin(lobbyBeatPhase * 1.18) * featuredPulse).toFixed(2)}px`);
        lobbyFeatured.style.setProperty("--featured-y", `${(Math.cos(lobbyBeatPhase * 1.31) * featuredPulse * 0.48).toFixed(2)}px`);
        lobbyFeatured.style.setProperty("--featured-rotate", `${(Math.sin(lobbyBeatPhase * 0.83) * featuredPulse * 0.18).toFixed(2)}deg`);
        lobbyFeatured.style.setProperty("--featured-energy", displayEnergy.toFixed(3));
        lobbyFeatured.style.setProperty("--featured-brightness", (1 + displayEnergy * 0.10).toFixed(3));
    }
    document.body.classList.toggle("lobby-trance", hasActiveBass && tranceEnergy > 0.32);

    window.requestAnimationFrame(animateLobbyBassEffect);
};

const playLobbyMusic = () => {
    if (lobbyMusicStarted && lobbyAudioContext) {
        lobbyAudioContext.resume().catch(() => {});
        return;
    }
    setupLobbyBassEffect();
};

const startLobbyMusic = () => {
    setupLobbyBassEffect();
};

document.addEventListener("pointerdown", startLobbyMusic, { once: true });
document.addEventListener("keydown", startLobbyMusic, { once: true });
window.addEventListener("load", () => {
    setupLobbyBassEffect();
});

document.querySelectorAll('a[href*="/games/"], a[href^="games/"]').forEach((link) => {
    link.addEventListener("click", () => {
        if (lobbyMusicSource) {
            lobbyMusicSource.stop();
            lobbyMusicSource.disconnect();
            lobbyMusicSource = null;
        }
        lobbyMusicStarted = false;
        sessionStorage.setItem("ourlimeResumeLobbyMusic", "true");
    });
});

window.addEventListener("pageshow", () => {
    if (sessionStorage.getItem("ourlimeResumeLobbyMusic") === "true") {
        sessionStorage.removeItem("ourlimeResumeLobbyMusic");
        startLobbyMusic();
    } else {
        playLobbyMusic();
    }
});
document.addEventListener("visibilitychange", () => {
    if (!document.hidden && lobbyAudioContext) {
        lobbyAudioContext.resume().catch(() => {});
    }
});
animateLobbyBassEffect();

