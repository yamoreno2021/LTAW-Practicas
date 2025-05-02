const display = document.getElementById("display");
const msg_entry = document.getElementById("msg_entry");
const socket = io();

socket.on("message", ({ msg, from }) => {
    const p = document.createElement("div");
    p.classList.add("message");

    if (from === 'system') {
        p.classList.add("system");
    } else if (from === socket.id) {
        p.classList.add("me");
    } else {
        p.classList.add("other");
    }

    p.innerText = msg;
    display.appendChild(p);
    display.scrollTop = display.scrollHeight;
});

msg_entry.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && msg_entry.value.trim() !== "") {
        socket.emit("message", msg_entry.value);
        msg_entry.value = "";
    }
});
