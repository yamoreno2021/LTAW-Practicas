const socketServer = require('socket.io').Server;
const http = require('http');
const express = require('express');
const colors = require('colors');

const PUERTO = 8081;
const app = express();
const server = http.Server(app);
const io = new socketServer(server);

const connectedUsers = new Map();
const typingUsers = new Set();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/client.html');
});

app.use(express.static('public'));

io.on('connect', (socket) => {
    const defaultUsername = `Usuario-${socket.id.slice(0, 4)}`;
    connectedUsers.set(socket.id, defaultUsername);

    socket.emit('message', { msg: '[Servidor] Bienvenido al chat!', from: 'system', username: defaultUsername });
    socket.broadcast.emit('message', { msg: `[Servidor] ${defaultUsername} se ha conectado.`, from: 'system', username: null });
    emitUserList() // Luego emitimos lista global

    
    socket.on('typing', () => {
        typingUsers.add(connectedUsers.get(socket.id));
        io.emit('typing_users', Array.from(typingUsers));
    });

    socket.on('stop_typing', () => {
        typingUsers.delete(connectedUsers.get(socket.id));
        io.emit('typing_users', Array.from(typingUsers));
    });

    socket.on("ping_request", (sentTime) => {
        // ✅ Siempre eliminar de "escribiendo"
        typingUsers.delete(connectedUsers.get(socket.id));  // ✅ FIX typing bug
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
        }
    });

    socket.on('disconnect', () => {
        const username = connectedUsers.get(socket.id) || 'Un usuario';
        connectedUsers.delete(socket.id);
        typingUsers.delete(username);
        emitUserList()
        io.emit('message', { msg: `[Servidor] ${username} se ha desconectado.`, from: 'system', username: null });
    });

});

function handleCommand(socket, msg) {
    typingUsers.delete(connectedUsers.get(socket.id));  // ✅ FIX typing bug
    io.emit('typing_users', Array.from(typingUsers));   // ✅ Notify all clients
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
        typingUsers.delete(oldNick);

        connectedUsers.set(socket.id, newNick);
        io.emit('typing_users', Array.from(typingUsers));
            io.emit('message', { msg: `[Servidor] ${oldNick} ahora es ${newNick}`, from: 'system', username: null });
            socket.emit('nickname_updated', newNick);
            emitUserList()
            return;
        }

    switch (command) {
        case '/help':
            response = `[Ayuda]
            /help - Muestra esta ayuda
            /list - Lista la cantidad de usuarios conectados
            /hello - Saluda desde el servidor
            /date - Muestra la fecha y hora actual
            /nick <nuevo_nombre> - Cambia tu nombre de usuario
            /ping - Mide la latencia con el servidor
            /clear - Limpia la conversación del chat actual (solo en tu pantalla)`;
            
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

function emitUserList() {
    io.emit('user_list', Array.from(connectedUsers.values()));
}

server.listen(PUERTO);
console.log("Escuchando en puerto: " + PUERTO);


