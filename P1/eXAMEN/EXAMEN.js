const http = require('http');
const server = http.createServer((req,res) => {
    res.write("Hola");
    res.end();
});

server.listen(8080);