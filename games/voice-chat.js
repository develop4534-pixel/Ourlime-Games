(() => {
    "use strict";

    const script = document.currentScript;
    if (!script) return;

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("voice-chat.css?v=20261121-2", script.src).href;
    document.head.append(stylesheet);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ourlime-voice";
    button.setAttribute("aria-label", "Abrir voz multiplayer");
    button.setAttribute("aria-expanded", "false");
    button.title = "Voz multiplayer";
    button.hidden = true;
    button.innerHTML = `
        <svg class="ourlime-voice__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6A3.5 3.5 0 1 0 8.5 6v6a3.5 3.5 0 0 0 3.5 3.5Zm-1.25 2.15v2.1H7.5a1.25 1.25 0 1 0 0 2.5h9a1.25 1.25 0 1 0 0-2.5h-3.25v-2.1A7 7 0 0 0 19 11.5a1.25 1.25 0 1 0-2.5 0 4.5 4.5 0 1 1-9 0 1.25 1.25 0 1 0-2.5 0 7 7 0 0 0 5.75 6.15Z"/>
        </svg>
        <span class="ourlime-voice__badge" hidden>0</span>`;

    const panel = document.createElement("section");
    panel.className = "ourlime-voice-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Participantes en voz");
    panel.innerHTML = `
        <div class="ourlime-voice-panel__head">
            <span class="ourlime-voice-panel__title">Voz multiplayer</span>
            <span class="ourlime-voice-panel__status">Micrófono apagado</span>
        </div>
        <div class="ourlime-voice-participants"></div>`;
    document.body.append(button, panel);
    panel.hidden = true;

    const badge = button.querySelector(".ourlime-voice__badge");
    const status = panel.querySelector(".ourlime-voice-panel__status");
    const list = panel.querySelector(".ourlime-voice-participants");
    const channelName = "ourlime-multiplayer-voice";
    const peerId = sessionStorage.getItem("ourlime-voice-peer-id") ||
        (window.crypto && typeof window.crypto.randomUUID === "function"
            ? window.crypto.randomUUID()
            : Math.random().toString(36).slice(2) + Date.now().toString(36));
    sessionStorage.setItem("ourlime-voice-peer-id", peerId);

    let stream = null;
    let micEnabled = false;
    let channel = null;
    let audioContext = null;
    let analyser = null;
    let localSpeaking = false;
    const peers = new Map();
    const peerConnections = new Map();
    const participantNames = new Map();
    const remoteAnalysers = new Map();
    let multiplayerActive = false;

    const updateRoomVisibility = () => {
        const directRoomLink = /(?:^|[?&])(room|code|roomKey)=/i.test(location.search);
        const sockets = window.__ourlimeVoiceSockets
            ? Array.from(window.__ourlimeVoiceSockets)
            : [];
        multiplayerActive = directRoomLink || sockets.some((socket) =>
            socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING);
        button.hidden = !multiplayerActive;
        if (!multiplayerActive) {
            panel.hidden = true;
            button.setAttribute("aria-expanded", "false");
            stopMicrophone();
        }
    };

    const readPlayerName = () => {
        const candidates = [
            document.querySelector("[name='player-name']"),
            document.querySelector("#playerName"),
            document.querySelector("#player-name"),
        ];
        const input = candidates.find((element) => element && element.value);
        if (input) return String(input.value).trim().slice(0, 20);
        for (const key of ["playerName", "ourlimePlayerName", "nickname", "nick"]) {
            try {
                const value = localStorage.getItem(key);
                if (value) return String(value).trim().slice(0, 20);
            } catch (_) {}
        }
        try {
            const saved = JSON.parse(localStorage.getItem("dd_save") || "null");
            if (saved && typeof saved.nickA === "number" && typeof saved.nickB === "number") {
                const a = ["Lime", "Nova", "Pixel", "Captain", "Sunny", "Mighty", "Cosmic", "Lucky"];
                const b = ["Buddy", "Hero", "Racer", "Artist", "Explorer", "Ace", "Friend", "Star"];
                return `${a[saved.nickA % a.length]} ${b[saved.nickB % b.length]}`;
            }
        } catch (_) {}
        return "Jugador";
    };

    const playerName = readPlayerName();
    participantNames.set(peerId, playerName);

    const initials = (name) => name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("") || "J";

    const renderParticipants = () => {
        const entries = [{ id: peerId, name: playerName, local: true }, ...Array.from(participantNames.entries())
            .filter(([id]) => id !== peerId)
            .map(([id, name]) => ({ id, name, local: false }))];

        list.innerHTML = entries.map((entry) => `
            <div class="ourlime-voice-person${entry.local && localSpeaking ? " ourlime-voice-person--speaking" : ""}" data-peer="${entry.id}">
                <span class="ourlime-voice-avatar">${initials(entry.name)}</span>
                <span class="ourlime-voice-name">${entry.name}${entry.local ? " (tú)" : ""}</span>
                <span class="ourlime-voice-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            </div>`).join("");
        badge.hidden = entries.length < 2;
        badge.textContent = String(Math.max(0, entries.length - 1));
    };

    const ensureAudioContext = () => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === "suspended") audioContext.resume();
    };

    const setTrackEnabled = (enabled) => {
        if (stream) stream.getAudioTracks().forEach((track) => { track.enabled = enabled; });
    };

    const startLocalAnalyser = () => {
        if (!stream) return;
        ensureAudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const update = () => {
            if (!micEnabled) {
                if (localSpeaking) {
                    localSpeaking = false;
                    renderParticipants();
                }
                return;
            }
            analyser.getByteFrequencyData(data);
            let average = 0;
            for (let i = 0; i < data.length; i++) average += data[i];
            average /= data.length;
            const speaking = average > 18;
            if (speaking !== localSpeaking) {
                localSpeaking = speaking;
                renderParticipants();
            }
            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    };

    const sendSignal = (message) => {
        const signal = { ...message, from: peerId, name: playerName };
        if (channel) channel.postMessage(signal);
        document.querySelectorAll("script").forEach(() => {});
        if (window.__ourlimeVoiceSockets) {
            window.__ourlimeVoiceSockets.forEach((socket) => {
                try {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ t: "voice-signal", name: playerName, signal }));
                    }
                } catch (_) {}
            });
        }
    };

    const createPeerConnection = async (remoteId) => {
        if (peerConnections.has(remoteId)) return peerConnections.get(remoteId);
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
        });
        peerConnections.set(remoteId, pc);
        if (stream) stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.onicecandidate = ({ candidate }) => {
            if (candidate) sendSignal({ type: "ice", to: remoteId, candidate: candidate.toJSON() });
        };
        pc.ontrack = (event) => {
            const remoteStream = event.streams[0] || new MediaStream([event.track]);
            let audio = document.querySelector(`audio[data-ourlime-peer="${remoteId}"]`);
            if (!audio) {
                audio = document.createElement("audio");
                audio.dataset.ourlimePeer = remoteId;
                audio.autoplay = true;
                audio.playsInline = true;
                document.body.append(audio);
            }
            audio.srcObject = remoteStream;
            audio.play().catch(() => {});
            ensureAudioContext();
            const source = audioContext.createMediaStreamSource(remoteStream);
            const remoteAnalyser = audioContext.createAnalyser();
            remoteAnalyser.fftSize = 256;
            source.connect(remoteAnalyser);
            remoteAnalysers.set(remoteId, remoteAnalyser);
            monitorRemote(remoteId, remoteAnalyser);
        };
        pc.onconnectionstatechange = () => {
            if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
                removePeer(remoteId);
            }
        };
        return pc;
    };

    const monitorRemote = (remoteId, remoteAnalyser) => {
        const data = new Uint8Array(remoteAnalyser.frequencyBinCount);
        const element = () => list.querySelector(`[data-peer="${remoteId}"]`);
        const update = () => {
            if (!remoteAnalysers.has(remoteId)) return;
            remoteAnalyser.getByteFrequencyData(data);
            let average = 0;
            for (let i = 0; i < data.length; i++) average += data[i];
            average /= data.length;
            const row = element();
            if (row) row.classList.toggle("ourlime-voice-person--speaking", average > 18);
            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    };

    const removePeer = (remoteId) => {
        const pc = peerConnections.get(remoteId);
        if (pc) pc.close();
        peerConnections.delete(remoteId);
        participantNames.delete(remoteId);
        remoteAnalysers.delete(remoteId);
        const audio = document.querySelector(`audio[data-ourlime-peer="${remoteId}"]`);
        if (audio) audio.remove();
        renderParticipants();
    };

    const handleSignal = async (message) => {
        if (!message || message.from === peerId || (message.to && message.to !== peerId)) return;
        if (message.name) {
            participantNames.set(message.from, message.name);
            renderParticipants();
        }
        if (!micEnabled) return;

        const pc = await createPeerConnection(message.from);
        if (message.type === "hello") {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignal({ type: "offer", to: message.from, sdp: pc.localDescription });
        } else if (message.type === "offer") {
            await pc.setRemoteDescription(message.sdp);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal({ type: "answer", to: message.from, sdp: pc.localDescription });
        } else if (message.type === "answer") {
            await pc.setRemoteDescription(message.sdp);
        } else if (message.type === "ice") {
            try { await pc.addIceCandidate(message.candidate); } catch (_) {}
        }
    };

    const setupSocketRelay = () => {
        if (!window.WebSocket) return;
        const NativeSocket = window.WebSocket;
        window.__ourlimeVoiceSockets = new Set();
        const WrappedSocket = function (url, protocols) {
            const socket = protocols
                ? Reflect.construct(NativeSocket, [url, protocols])
                : Reflect.construct(NativeSocket, [url]);
            window.__ourlimeVoiceSockets.add(socket);
            socket.addEventListener("open", () => updateRoomVisibility());
            socket.addEventListener("close", () => {
                window.__ourlimeVoiceSockets.delete(socket);
                updateRoomVisibility();
            });
            socket.addEventListener("message", (event) => {
                if (typeof event.data !== "string") return;
                try {
                    const message = JSON.parse(event.data);
                    if (message.t === "voice-signal" && message.signal) {
                        handleSignal({
                            ...message.signal,
                            from: message.signal.from || message.from,
                            name: message.name || message.signal.name
                        });
                    }
                } catch (_) {}
            });
            return socket;
        };
        Object.setPrototypeOf(WrappedSocket, NativeSocket);
        WrappedSocket.prototype = NativeSocket.prototype;
        WrappedSocket.OPEN = NativeSocket.OPEN;
        WrappedSocket.CLOSED = NativeSocket.CLOSED;
        WrappedSocket.CLOSING = NativeSocket.CLOSING;
        WrappedSocket.CONNECTING = NativeSocket.CONNECTING;
        window.WebSocket = WrappedSocket;
    };

    const setupChannel = () => {
        if (!("BroadcastChannel" in window)) return;
        channel = new BroadcastChannel(channelName);
        channel.addEventListener("message", (event) => handleSignal(event.data));
        sendSignal({ type: "hello" });
    };

    const stopMicrophone = () => {
        micEnabled = false;
        setTrackEnabled(false);
        button.classList.remove("ourlime-voice--active");
        status.textContent = "Micrófono apagado";
    };

    const startMicrophone = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            status.textContent = "Audio no disponible";
            return;
        }
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: false
            });
            micEnabled = true;
            setTrackEnabled(true);
            button.classList.add("ourlime-voice--active");
            status.textContent = "Micrófono encendido";
            startLocalAnalyser();
            sendSignal({ type: "hello" });
        } catch (error) {
            micEnabled = false;
            button.classList.remove("ourlime-voice--active");
            status.textContent = error && error.name === "NotAllowedError"
                ? "Permiso del micrófono denegado"
                : "No se pudo activar el micrófono";
        }
    };

    button.addEventListener("click", (event) => {
        if (event.shiftKey || event.altKey) {
            panel.hidden = !panel.hidden;
            button.setAttribute("aria-expanded", String(!panel.hidden));
            return;
        }
        if (micEnabled) stopMicrophone();
        else startMicrophone();
    });

    button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        panel.hidden = !panel.hidden;
        button.setAttribute("aria-expanded", String(!panel.hidden));
    });

    window.addEventListener("pagehide", () => {
        stopMicrophone();
        if (stream) stream.getTracks().forEach((track) => track.stop());
        peerConnections.forEach((pc) => pc.close());
        if (channel) channel.close();
    });

    setupChannel();
    setupSocketRelay();
    renderParticipants();
    updateRoomVisibility();
    window.setInterval(updateRoomVisibility, 500);
})();
