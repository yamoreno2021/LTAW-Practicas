const http = require('http');
const fs = require('fs');

const PORT = 8005;
const ROOT_DIR = __dirname + '/Pages/';
const IMG_DIR = ROOT_DIR +'img';

//-- Cargar pagina web de login
const index = fs.readFileSync(ROOT_DIR + 'index.html','utf-8');
const LOGIN = fs.readFileSync(ROOT_DIR +'login.html', 'utf-8');



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

//-- Analizar la cookie y devolver el nombre del
//-- usuario si existe, o null en caso contrario
function get_user(req) {

    //-- Leer la Cookie recibida
    const cookie = req.headers.cookie;
  
    //-- Hay cookie
    if (cookie) {
      
      //-- Obtener un array con todos los pares nombre-valor
      let pares = cookie.split(";");
      
      //-- Variable para guardar el usuario
      let user;
  
      //-- Recorrer todos los pares nombre-valor
      pares.forEach((element, index) => {
  
        //-- Obtener los nombres y valores por separado
        let [nombre, valor] = element.split('=');
  
        //-- Leer el usuario
        //-- Solo si el nombre es 'user'
        if (nombre.trim() === 'user') {
          user = valor;
        }
      });
  
      //-- Si la variable user no está asignada
      //-- se devuelve null
      return user || null;
    }
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
    
    //-- Obtener el usuario que ha accedido
    //-- null si no se ha reconocido
    let user = get_user(req);

    console.log("User: " + user);

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
    



    //-- Acceso al recurso raiz
    //if (url.pathname == '/') {

    //--- Si la variable user está asignada
    // if (user) {

    //     //-- Añadir a la página el nombre del usuario
    //     console.log("user: " + user);
    //     content = index.replace("Iniciar Sesion", "<h2>Usuario: " + user + "</h2>");
    //     //res.writeHead(200, { 'Content-Type': 'text/html' });
    //     //res.write(content)
    //     // res.end();
    // } else {
    //     //-- Mostrar el enlace a la página de login
    //     // content = EJ6_HTML.replace("HTML_EXTRA", `<a href="login">[Login]</a>`);
    // }

    //     //-- Acceso a otro recurso: Se hace login
    // if (url.pathname == '/login') {

    //     //-- Asignar la cookie de usuario Chuck
    //     res.setHeader('Set-Cookie', "user=Chuck");

    //     //-- Asignar la página web de login ok
    //     content = index;
    // }

    if (req.method === 'POST' && url.pathname === '/login') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const user = params.get('usuario');

            // Leer tienda.json
            const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf8'));
            let encontrado = false;

            tienda.usuarios.forEach((element) => {
            if (element.nombre === user) {
                encontrado = true;
            }
            });

            if (encontrado) {
                res.writeHead(302, {
                    'Set-Cookie': `user=${user}; Path=/`,
                    'Location': '/'
                });
            } else {
                const noValido = fs.readFileSync(ROOT_DIR + 'usuario_no_valido.html', 'utf8');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(noValido);
            }
            res.end();
        });
        return;
    }
    
    if (req.method === 'POST' && url.pathname === '/register') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const params = new URLSearchParams(body);
          const nombre = params.get('nombre');
          const nombreReal = params.get('nombreReal');
          const correo = params.get('correo');
      
          const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf8'));
          const existe = tienda.usuarios.some(u => u.nombre === nombre);
      
          if (!existe) {
            tienda.usuarios.push({ nombre, nombreReal, correo });
            fs.writeFileSync('tienda.json', JSON.stringify(tienda, null, 2));
          }
      
          res.writeHead(302, {
            'Set-Cookie': `user=${nombre}; Path=/`,
            'Location': '/'
          });
          res.end();
        });
        return;
      }
      
    
    fs.readFile(filePath, (err, content) => {
        if (url.pathname === '/' && filePath.endsWith('index.html')) {
            let page = fs.readFileSync(filePath, 'utf8');
            if (user) {
                page = page.replace('<!--USER-->', `${user}`);
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(page);
            return;
        }

        if (err) {
            statusCode = 404;
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('X-Custom-Error', 'Archivo no encontrado');
            res.writeHead(statusCode);
            //res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(fs.readFileSync('Pages/error.html','utf8'));
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

