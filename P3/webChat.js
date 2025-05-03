const socketServer = require('socket.io').Server;
const http = require('http');
const express = require('express');
const colors = require('colors');

const PUERTO = 8080;
const app = express();
const server = http.Server(app);
const io = new socketServer(server);

const connectedUsers = new Map();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/client.html');
});

app.use(express.static('public'));

io.on('connect', (socket) => {
    const defaultUsername = `Usuario-${socket.id.slice(0, 4)}`;
    connectedUsers.set(socket.id, defaultUsername);
    socket.emit('message', { msg: '[Servidor] Bienvenido al chat!', from: 'system', username: null });
    socket.broadcast.emit('message', { msg: `[Servidor] ${connectedUsers.get(socket.id)} se ha conectado.`, from: 'system', username: null });

    socket.on('message', (raw) => {
        if (raw.startsWith('/')) {
            handleCommand(socket, raw);
        } else {
            const username2 = connectedUsers.get(socket.id) || socket.id;
            io.emit('message', { msg: raw, from: socket.id, username:username2 });
        }
    });

    socket.on('disconnect', () => {
        const username = connectedUsers.get(socket.id) || 'Un usuario';
        connectedUsers.delete(socket.id);
        io.emit('message', { msg: `[Servidor] ${username} se ha desconectado.`, from: 'system', username: null });
    });
});

function handleCommand(socket, msg) {
    const command = msg.trim();
    let response;

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
        connectedUsers.set(socket.id, newNick);
        io.emit('message', { msg: `[Servidor] ${oldNick} ahora es ${newNick}`, from: 'system', username: null });
        return;
    }

    switch (command) {
        case '/help':
            response = '[Comandos disponibles] /help, /list, /hello, /date, /nick';
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
}

server.listen(PUERTO);
console.log("Escuchando en puerto: " + PUERTO);


