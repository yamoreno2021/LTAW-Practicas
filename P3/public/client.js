const display = document.getElementById("display");
const msg_entry = document.getElementById("msg_entry");
const socket = io();

const typingIndicator = document.getElementById("typing-indicator");

const userListDiv = document.getElementById("user-list");


msg_entry.addEventListener("input", () => {
    if (msg_entry.value.trim() !== "") {
        socket.emit("typing");
    } else {
        socket.emit("stop_typing");
    }
});

socket.on("typing_users", (users) => {
    const currentUsername = document.getElementById("username-display")?.textContent;
    const filtered = users.filter(name => name !== currentUsername);
    if (filtered.length === 0) {
        typingIndicator.textContent = '';
        typingIndicator.style.display = 'none';
    } else if (filtered.length === 1) {
        typingIndicator.textContent = `${filtered[0]} está escribiendo...`;
        typingIndicator.style.display = 'block';
    } else if (filtered.length === 2){
        typingIndicator.textContent = `${filtered.join(' y ')} están escribiendo...`;
        typingIndicator.style.display = 'block';
    } else{
        typingIndicator.textContent = `Varias personas están escribiendo...`;
        typingIndicator.style.display = 'block';
    }
});

socket.on("user_list", (users) => {
    const userList = document.getElementById("user-list");
    userList.innerHTML = "";

    users.forEach((name) => {
        const block = document.createElement("div");
        block.classList.add("user-block");
        block.textContent = name;
        userList.appendChild(block);
    });
});

socket.on("nickname_updated", (newNick) => {
    document.getElementById("username-display").textContent = newNick;
});

socket.on("message", ({ msg, from, username }) => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("message");

    // Mostrar el nombre de usuario asignado por el servidor
    if (msg.includes("Bienvenido al chat")) {
        document.getElementById("username-display").textContent = username || from;
    }

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
            name.classList.add("name", "me");
        } else {
            text.classList.add("other");
            name.classList.add("name", "other");
        }
    name.textContent = username || from;
    text.textContent = msg;
    wrapper.appendChild(name);
    wrapper.appendChild(text);
    }

    display.appendChild(wrapper);
    display.scrollTop = display.scrollHeight;
});

msg_entry.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && msg_entry.value.trim() !== "") {
        socket.emit("message", msg_entry.value);
        msg_entry.value = "";
    }
});
