const display = document.getElementById("display");
const msg_entry = document.getElementById("msg_entry");
const socket = io();

const typingIndicator = document.getElementById("typing-indicator");
const userListDiv = document.getElementById("user-list");
const chatTabs = document.getElementById("chat-tabs");
const usernameDisplay = document.getElementById("username-display");

let currentChat = 'global';
let username = null;
const chats = { global: [] };

const pendingPings = {};


msg_entry.addEventListener("input", () => {
    socket.emit(msg_entry.value.trim() ? "typing" : "stop_typing");
});

msg_entry.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && msg_entry.value.trim()) {
        const msg = msg_entry.value.trim();
        msg_entry.value = "";
        
        if (msg === '/clear') {
            chats[currentChat] = []; // 🔥 Solo borra el chat activo
            addMessage(currentChat, { msg: "[Chat limpiado]", from: 'system', username: null });
            renderMessages();
            return;
        }

        if (msg === "/ping") {
            const timestamp = Date.now();
            pendingPings[timestamp] = true;
            socket.emit("ping_request", timestamp);
            return; // No procesar como mensaje normal
        }

        if (!currentChat || currentChat === 'global') {
            socket.emit("message", msg);
        } else {
            socket.emit("private_message", { to: currentChat, msg });
        }
    }
});

document.getElementById("send-btn").addEventListener("click", () => {
    const msg = msg_entry.value.trim();
    if (!msg) return;

    msg_entry.value = "";

    if (msg === '/clear') {
        chats[currentChat] = [];
        addMessage(currentChat, { msg: "[Chat limpiado]", from: 'system', username: null });
        renderMessages();
        return;
    }

    if (msg === "/ping") {
        const timestamp = Date.now();
        pendingPings[timestamp] = true;
        socket.emit("ping_request", timestamp);
        return;
    }

    if (!currentChat || currentChat === 'global') {
        socket.emit("message", msg);
    } else {
        socket.emit("private_message", { to: currentChat, msg });
    }
});


function addMessage(chatKey, message) {
    if (!chats[chatKey]) chats[chatKey] = [];
    chats[chatKey].push(message);

    if (chatKey === currentChat) renderMessages();
}

function renderMessages() {
    display.innerHTML = "";
    const messages = chats[currentChat] || [];

    messages.forEach(({ msg, from, username: uname }) => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("message");

        const name = document.createElement("div");
        name.classList.add("name");

        const text = document.createElement("div");
        text.classList.add("text");

        if (from === 'system') {
            text.classList.add("system");
            text.innerText = msg;
            wrapper.appendChild(text);
        } else {
            if (from === socket.id) {
                text.classList.add("me");
                name.classList.add("me");
            } else {
                text.classList.add("other");
                name.classList.add("other");
            }
            name.textContent = uname || from;
            text.textContent = msg;
            wrapper.appendChild(name);
            wrapper.appendChild(text);
        }

        display.appendChild(wrapper);
    });

    display.scrollTop = display.scrollHeight;
}

function highlightUserList() {
    const blocks = userListDiv.querySelectorAll(".user-block");
    blocks.forEach(block => {
        const name = block.getAttribute("data-username");
        if ((name === "global" && currentChat === "global") || name === currentChat) {
            block.classList.add("active");
        } else {
            block.classList.remove("active");
        }
    });
}

socket.on("message", ({ msg, from, username: uname, to }) => {
    // establecer nombre del usuario si no está
    if (msg.includes("Bienvenido al chat")) {
        username = uname;
        usernameDisplay.textContent = uname;
    }

    const isPrivate = !!to && to !== 'global';
    const key =
        from === "system"
            ? currentChat  // ✅ Mostrar respuestas del sistema en el chat que el usuario tiene abierto
            : isPrivate
                ? (username === uname ? to : uname)
                : 'global';

    if (!chats[key]) chats[key] = [];
    chats[key].push({ msg, from, username: uname });

    if (isPrivate && key !== currentChat) addTab(key);
    if (key === currentChat) renderMessages();
});


socket.on("user_list", (users) => {
    userListDiv.innerHTML = "";

    const globalBlock = document.createElement("div");
    globalBlock.className = "user-block" + (currentChat === "global" ? " active" : "");
    globalBlock.textContent = "# Global";
    globalBlock.setAttribute("data-username", "global");
    globalBlock.addEventListener("click", () => {
        currentChat = "global";
        renderMessages();
        highlightUserList();
    });
    userListDiv.appendChild(globalBlock);

    if (!username) return; // aún no asignado

    users.forEach((name) => {
        if (name === username) return;

        const block = document.createElement("div");
        block.className = "user-block" + (currentChat === name ? " active" : "");
        block.textContent = name;
        block.setAttribute("data-username", name);
        block.addEventListener("click", () => {
            currentChat = name;
            if (!chats[name]) chats[name] = [];
            renderMessages();
            highlightUserList();
        });
        userListDiv.appendChild(block);
    });
});

socket.on("nickname_updated", (newNick) => {
    username = newNick;
    usernameDisplay.textContent = newNick;
});

socket.on("typing_users", (users) => {
    const filtered = users.filter(name => name !== username);
    typingIndicator.style.display = filtered.length ? 'block' : 'none';
    typingIndicator.textContent = filtered.length === 1
        ? `${filtered[0]} está escribiendo...`
        : filtered.length === 2
            ? `${filtered.join(' y ')} están escribiendo...`
            : `Varias personas están escribiendo...`;
});

socket.on("ping_response", (sentTime) => {
    if (pendingPings[sentTime]) {
        const latency = Date.now() - sentTime;
        addMessage(currentChat, {
            msg: `[Ping] Latencia: ${latency} ms`,
            from: "system",
            username: null
        });
        renderMessages();
        delete pendingPings[sentTime];
    }
});
