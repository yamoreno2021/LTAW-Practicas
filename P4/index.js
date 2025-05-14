const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM
    const elNode = document.getElementById("ver_node");
    const elChrome = document.getElementById("ver_chrome");
    const elElectron = document.getElementById("ver_electron");
    const elURL = document.getElementById("ver_url");
    const elBox = document.getElementById("messages");
    const btnTest = document.getElementById("btn_test");
    const elQR = document.getElementById("qr_img");

    // Recibir datos de versiones
    ipcRenderer.on('init', (event, data) => {
        elNode.textContent = data.node;
        elChrome.textContent = data.chrome;
        elElectron.textContent = data.electron;
        elURL.textContent = data.url;
        elQR.src = data.qr;
    });

    // Recibir mensajes
    ipcRenderer.on('message-log', (event, msg) => {
        elBox.textContent += msg + "\n";
        elBox.scrollTop = elBox.scrollHeight;
    });

    // Contador de usuarios
    ipcRenderer.on('user-count', (event, count) => {
        document.getElementById("user_count").textContent = count;
    });

    // Enviar mensaje de prueba
    btnTest.addEventListener("click", () => {
        ipcRenderer.invoke('test-message');
    });
});
