// main.js
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const os = require('os');
const path = require('path');

// Chat server setup (adaptado de webChat.js)
const express = require('express');
const http = require('http');
const socketServer = require('socket.io').Server;
const QRCode = require('qrcode');

const PORT = 8081;
const chatApp = express();
const server = http.createServer(chatApp);
const io = new socketServer(server);

const connectedUsers = new Map();
const typingUsers = new Set();

let win = null;

function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 700,
        webPreferences: {
            
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    win.loadFile('index.html');
    win.webContents.on('did-finish-load', async () => {
        const url = `http://${getLocalIP()}:${PORT}`;
        const qrDataURL = await QRCode.toDataURL(url);

        const cpus = os.cpus();
        const totalMemMB = Math.round(os.totalmem() / 1024 / 1024);
        const freeMemMB = Math.round(os.freemem() / 1024 / 1024);

        win.webContents.send('init', {
            node: process.version,
            chrome: process.versions.chrome,
            electron: process.versions.electron,
            platform: process.platform,
            arch: process.arch,
            cwd: process.cwd(),
            url,
            qr: qrDataURL,
            specs: {
                cpu: cpus[0]?.model || 'Desconocido',
                cores: cpus.length,
                totalMemMB,
                freeMemMB,
            }
        });
    });
}

// win.webContents.on('did-finish-load', async () => {
//     const url = `http://${getLocalIP()}:${PORT}`;
//     const qrDataURL = await QRCode.toDataURL(url); // ✅ generar código base64

//     win.webContents.send('init', {
//         node: process.version,                  // Version node.js
//         chrome: process.versions.chrome,        // Version chrome
//         electron: process.versions.electron,    // Version electron
//         cwd: process.cwd(),                     // Directorio actual
//         url,
//         qr: qrDataURL,

//         platform: process.platform,             // Sistema operativo
//         arch: process.arch,                     // Arquitectura CPU
//         specs: {
//             cpu: cpus[0]?.model || 'Desconocido',
//             cores: cpus.length,
//             totalMemMB,
//             freeMemMB
//         }
//     });
// });

app.whenReady().then(() => {
    createWindow();
    server.listen(PORT, () => {
        console.log("Servidor chat en:", `http://${getLocalIP()}:${PORT}`);
    });
});

// IP local para la URL
function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const iface of Object.values(nets)) {
        for (const i of iface) {
            if (i.family === 'IPv4' && !i.internal) return i.address;
        }
    }
    return 'localhost';
}

// Boton de mensaje de prueba
ipcMain.handle('test-message', () => {
    io.emit('message', {
        msg: "[Servidor] Este es un mensaje de prueba",
        from: 'system',
        username: null,
    });
});

// Abrir navegador
ipcMain.handle('open-browser', () => {
    shell.openExternal(`http://${getLocalIP()}:${PORT}`);
});

// servir pagina estatica al cliente
chatApp.use(express.static(path.join(__dirname, 'public')));
chatApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/client.html'));
});

// --- Original webChat ---
io.on('connect', (socket) => {
    const defaultUsername = `Usuario-${socket.id.slice(0, 4)}`;
    connectedUsers.set(socket.id, defaultUsername);
    socket.emit('message', { msg: '[Servidor] Bienvenido al chat!', from: 'system', username: defaultUsername });
    socket.broadcast.emit('message', { msg: `[Servidor] ${defaultUsername} se ha conectado.`, from: 'system', username: null });
    emitUserList();

    socket.on('typing', () => {
        typingUsers.add(connectedUsers.get(socket.id));
        io.emit('typing_users', Array.from(typingUsers));
    });

    socket.on('stop_typing', () => {
        typingUsers.delete(connectedUsers.get(socket.id));
        io.emit('typing_users', Array.from(typingUsers));
    });

    socket.on("ping_request", (sentTime) => {
        typingUsers.delete(connectedUsers.get(socket.id));
        io.emit('typing_users', Array.from(typingUsers));
        socket.emit("ping_response", sentTime);
    });

    socket.on('message', (raw) => {
        if (raw.startsWith('/')) {
            handleCommand(socket, raw);
        } else {
            const username2 = connectedUsers.get(socket.id) || socket.id;
            typingUsers.delete(username2);
            io.emit('typing_users', Array.from(typingUsers));
            io.emit('message', { msg: raw, from: socket.id, username: username2 });
            
            // FIX: enviar mensaje a la GUI sin error de variables no definidas
            if (win) win.webContents.send('message-log', `[${username2 || socket.id}]: ${raw}`);


        }
    });

    socket.on('private_message', ({ to, msg }) => {
        if (msg.startsWith('/')) {
            handleCommand(socket, msg);
        } else {
            const fromUser = connectedUsers.get(socket.id);
            const targetSocket = [...connectedUsers.entries()].find(([id, name]) => name === to);
            if (!targetSocket) {
                socket.emit("message", { msg: `[Servidor] El usuario ${to} no está conectado.`, from: 'system', username: null });
                return;
            }

            const [targetId] = targetSocket;
            const payload = {
                msg,
                from: socket.id,
                username: fromUser,
                to,
            };

            typingUsers.delete(fromUser);
            io.emit('typing_users', Array.from(typingUsers));
            socket.emit("message", payload);
            io.to(targetId).emit("message", payload);
            if (win) win.webContents.send('message-log', `[Privado] [${fromUser} → ${to}]: ${msg}`);

        }
  });

    socket.on('disconnect', () => {
        const username = connectedUsers.get(socket.id) || 'Un usuario';
        connectedUsers.delete(socket.id);
        typingUsers.delete(username);
        emitUserList();
        io.emit('message', { msg: `[Servidor] ${username} se ha desconectado.`, from: 'system', username: null });
    });
});

function handleCommand(socket, msg) {
    typingUsers.delete(connectedUsers.get(socket.id));
    io.emit('typing_users', Array.from(typingUsers));
    const command = msg.trim();
    let response;
    if (win) {
        win.webContents.send('message-log', `[Comando recibido de ${connectedUsers.get(socket.id)}]: ${msg}`);
    }
    
    if (command.startsWith('/nick')) {
        const newNick = command.split(' ')[1]?.trim();
        if (!newNick) {
            socket.emit('message', { msg: '[Servidor] Uso correcto: /nick nuevo_nombre', from: 'system', username: null });
            return;
        }

        const nickInUse = [...connectedUsers.values()].includes(newNick);
        if (nickInUse) {
            socket.emit('message', { msg: `[Servidor] El nombre "${newNick}" ya está en uso.`, from: 'system', username: null });
            return;
        }

        const oldNick = connectedUsers.get(socket.id);
        typingUsers.delete(oldNick);
        connectedUsers.set(socket.id, newNick);
        io.emit('typing_users', Array.from(typingUsers));
        io.emit('message', { msg: `[Servidor] ${oldNick} ahora es ${newNick}`, from: 'system', username: null });
        
        socket.emit('nickname_updated', newNick);
        emitUserList();
        return;
    }

    switch (command) {
        case '/help':
            response = `[Ayuda]
            /help - Muestra esta ayuda
            /list - Muestra número de usuarios conectados
            /hello - Saludo del servidor
            /date - Fecha y hora actual
            /nick <nombre> - Cambia tu nombre
            /ping - Mide latencia
            /clear - Limpia tu pantalla`;
            break;
        case '/list':
            response = `[Servidor] Usuarios conectados: ${connectedUsers.size}`;
            break;
        case '/hello':
            response = '[Servidor] ¡Hola! ¿Cómo estás?';
            break;
        case '/date':
            response = `[Servidor] Fecha actual: ${new Date().toLocaleString()}`;
            break;
        default:
            response = '[Servidor] Comando no reconocido. Usa /help para ver los comandos disponibles.';
    }

    socket.emit('message', { msg: response, from: 'system', username: null });
    if (win) win.webContents.send('message-log', `[Sistema → ${connectedUsers.get(socket.id)}]: ${response}`);


}

function emitUserList() {
    const users = Array.from(connectedUsers.values());
    io.emit('user_list', users);
    if (win) {
        win.webContents.send('user-count', users.length); // ✅ Enviar al GUI
    }
}


