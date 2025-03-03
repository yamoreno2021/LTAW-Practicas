const http = require('http');
const fs = require('fs');

const PORT = 8001;
const ROOT_DIR = __dirname + '/paginas/';

const server = http.createServer((req, res) => {
    console.log("Petición recibida!");

    //-- Valores de la respuesta por defecto
    let code = 200;
    let code_msg = "OK";
    let page = 'index.html';

    const url = new URL(req.url, 'http://' + req.headers['host']);
    
    let filePath = url.pathname === '/' ? ROOT_DIR + 'index.html' : ROOT_DIR + url.pathname;
    
    // if (url.pathname === '/ls') {
    //     fs.readdir(ROOT_DIR, (err, files) => {
    //         if (err) {
    //             res.writeHead(500, { 'Content-Type': 'text/html' });
    //             res.end(fs.readFileSync(ROOT_DIR + 'error.html'));
    //             return;
    //         }
    //         res.writeHead(200, { 'Content-Type': 'text/html' });
    //         res.end(`<html><body><h1>Lista de archivos</h1><ul>${files.map(file => `<li>${file}</li>`).join('')}</ul></body></html>`);
    //     });
    //     return;
    // }
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(fs.readFileSync('paginas/error.html','utf8'));
            return;
        }
        
        let contentType = 'text/html';
        if (filePath.endsWith('.css')) contentType = 'text/css';
        else if (filePath.endsWith('.js')) contentType = 'text/javascript';
        else if (filePath.endsWith('.png')) contentType = 'image/png';
        else if (filePath.endsWith('.jpg')) contentType = 'image/jpeg';
        else if (filePath.endsWith('.ico')) contentType = 'image/x-icon';
        else if (filePath.endsWith('.webp')) contentType = 'image/webp';
        else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';
        
        console.log(contentType);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

