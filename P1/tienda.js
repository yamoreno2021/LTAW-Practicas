const http = require('http');
const fs = require('fs');

const PORT = 8001;
const ROOT_DIR = __dirname + '/paginas/';
const IMG_DIR = ROOT_DIR +'img';

//-- Imprimir informacion sobre el mensaje de solicitud
function print_info_req(req) {

    console.log("");
    console.log("Mensaje de solicitud");
    console.log("====================");
    console.log("Método: " + req.method);
    console.log("Recurso: " + req.url);
    console.log("Version: " + req.httpVersion)
    console.log("Cabeceras: ");

    //-- Recorrer todas las cabeceras disponibles
    //-- imprimiendo su nombre y su valor
    for (hname in req.headers)
      console.log(`  * ${hname}: ${req.headers[hname]}`);

    //-- Construir el objeto url con la url de la solicitud
    const myURL = new URL(req.url, 'http://' + req.headers['host']);
    console.log("URL completa: " + myURL.href);
    console.log("  Ruta: " + myURL.pathname);
}

//-- Imprimir información sobre la respuesta
function print_info_res(req, res, statusCode) {
    console.log("\nMensaje de respuesta");
    console.log("====================");
    console.log("Código de estado: " + statusCode);
    console.log("Recurso: " + req.url);
    console.log("Versión: " + req.httpVersion);
    console.log("Cabeceras:");
    console.log(JSON.stringify(res.getHeaders(), null, 2));
}

const server = http.createServer((req, res) => {
    // console.log("Petición recibida!");

    print_info_req(req);

    //-- Valores de la respuesta por defecto
    let code = 200;
    let code_msg = "OK";
    // let page = 'index.html';

    const url = new URL(req.url, 'http://' + req.headers['host']);
    
    let filePath = url.pathname === '/' ? ROOT_DIR + 'index.html' : ROOT_DIR + url.pathname;
    
    if (url.pathname === '/ls') {
        fs.readdir(ROOT_DIR, (err, files) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end("<h1>Error al listar archivos</h1>");
                return;
            }
            
            let fileList = files.map(file => {
                let filePath = ROOT_DIR + file;
                if (fs.statSync(filePath).isDirectory() && file === 'img' || fs.statSync(filePath).isDirectory() && file === 'icons') {
                    let imgFiles = fs.readdirSync(IMG_DIR).map(img => `<li>img/${img}</li>`).join('');
                    return `<li><strong>${file}/</strong><ul>${imgFiles}</ul></li>`;
                }
                return `<li>${file}</li>`;
            }).join('');
            
            const html = `
                <html>
                <head><title>Listado de archivos</title></head>
                <body>
                    <h1>Archivos en ${ROOT_DIR}</h1>
                    <ul>${fileList}</ul>
                    <a href="/">Volver a inicio</a>
                </body>
                </html>
            `;
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        });
        return;
    }
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            statusCode = 404;
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('X-Custom-Error', 'Archivo no encontrado');
            res.writeHead(statusCode);
            //res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(fs.readFileSync('paginas/error.html','utf8'));
            print_info_res(req, res, 404);
            return;
        }
        else{
        let contentType = 'text/html';
        if (filePath.endsWith('.css')) contentType = 'text/css';
        else if (filePath.endsWith('.js')) contentType = 'text/javascript';
        else if (filePath.endsWith('.png')) contentType = 'image/png';
        else if (filePath.endsWith('.jpg')) contentType = 'image/jpeg';
        else if (filePath.endsWith('.ico')) contentType = 'image/x-icon';
        else if (filePath.endsWith('.webp')) contentType = 'image/webp';
        else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';
        //console.log(contentType);
        //res.writeHead(200, { 'Content-Type': contentType });

        res.statusCode = code;
        res.statusMessage = code_msg;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'max-age=3600');

        print_info_res(req, res, code);
        res.end(content);

        }

    });
});

server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

