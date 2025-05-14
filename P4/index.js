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
    const elDirectorio= document.getElementById("info_cwd");

    const elPlatform = document.getElementById("spec_platform");
    const elArch = document.getElementById("spec_arch");
    const cpu = document.getElementById("spec_cpu");
    const cores = document.getElementById("spec_cores");
    const totalMem = document.getElementById("spec_total");
    const freeMem = document.getElementById("spec_free");

    // Recibir datos de versiones
    ipcRenderer.on('init', (event, data) => {
        elNode.textContent = data.node;
        elChrome.textContent = data.chrome;
        elElectron.textContent = data.electron;
        elPlatform.textContent = data.platform;
        elArch.textContent = data.arch;
        elDirectorio.textContent = data.cwd;

        elURL.textContent = data.url;
        console.log("QR recibido:", data.qr); //  debug
        elQR.src = data.qr;

        cpu.textContent = data.specs.cpu;
        cores.textContent = data.specs.cores;
        totalMem.textContent = data.specs.totalMemMB;
        freeMem.textContent = data.specs.freeMemMB;
    });

        // ipcRenderer.on('init', (event, data) => {
    //     elNode.textContent = data.node;
    //     elChrome.textContent = data.chrome;
    //     elElectron.textContent = data.electron;

    //     elDirectorio.textContent = data.cwd;

    //     elURL.textContent = data.url;
    //     console.log("QR recibido:", data.qr); //  debug
    //     elQR.src = data.qr;

    //     elPlatform.textContent = data.platform;
    //     elArch.textContent = data.arch;
    //     cpu.textContent = data.specs.cpu;
    //     cores.textContent = data.specs.cores;
    //     totalMem.textContent = data.specs.totalMemMB;
    //     freeMem.textContent = data.specs.freeMemMB;
    // });
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

    // Abrir navegador
    document.getElementById("btn_browser").addEventListener("click", () => {
        ipcRenderer.invoke("open-browser");
    });
});
