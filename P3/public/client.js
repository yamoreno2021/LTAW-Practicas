const display = document.getElementById("display");
const msg_entry = document.getElementById("msg_entry");
const socket = io();

socket.on("message", ({ msg, from, username }) => {
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
