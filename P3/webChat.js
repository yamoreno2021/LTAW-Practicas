const socketServer = require('socket.io').Server;
const http = require('http');
const express = require('express');
const colors = require('colors');

const PUERTO = 8080;
const app = express();
const server = http.Server(app);
const io = new socketServer(server);

const connectedUsers = new Set();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/client.html');
});

app.use(express.static('public'));

io.on('connect', (socket) => {
    connectedUsers.add(socket.id);
    socket.emit('message', { msg: '[Servidor] Bienvenido al chat!', from: 'system' });
    socket.broadcast.emit('message', { msg: '[Servidor] Un nuevo usuario se ha conectado.', from: 'system' });

    socket.on('message', (raw) => {
        if (raw.startsWith('/')) {
            handleCommand(socket, raw);
        } else {
            io.emit('message', { msg: raw, from: socket.id });
        }
    });

    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        io.emit('message', { msg: '[Servidor] Un usuario se ha desconectado.', from: 'system' });
    });
});

function handleCommand(socket, msg) {
    const command = msg.trim();
    let response;

    switch (command) {
        case '/help':
            response = '[Comandos disponibles] /help, /list, /hello, /date';
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

    socket.emit('message', { msg: response, from: 'system' });
}

server.listen(PUERTO);
console.log("Escuchando en puerto: " + PUERTO);

