const http = require('http');
const fs = require('fs');

const PORT = 8007;
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

function renderHTML(filePath, replacements = {}) {
    let html = fs.readFileSync(filePath, 'utf8');
    for (const key in replacements) {
        html = html.replace(new RegExp(`<!--${key}-->`, 'g'), replacements[key]);
    }
    return html;
}

function getCarritoCount(req) {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/carrito=([^;]+)/);
    if (!match) return '';

    const carrito = decodeURIComponent(match[1]);
    const total = carrito.split('|').reduce((sum, item) => {
        const [, cant] = item.split(':');
        return sum + (parseInt(cant) || 0);
    }, 0);

    return `${total} producto${total !== 1 ? 's' : ''}`;
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
    

    if (req.method === 'POST' && url.pathname === '/login') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const user = params.get('usuario');
            const pass = params.get('password');

            // Leer tienda.json
            const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf8'));
            let encontrado = false;

            tienda.usuarios.forEach((element) => {
                if (element.nombre === user && element.password === pass) {
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
            const password = params.get('password');
            const confirmar = params.get('confirmar');
            
            const registroForm = fs.readFileSync(ROOT_DIR + 'register.html', 'utf8');

            if (password !== confirmar) {
                const formConError = registroForm.replace('<!--ERROR-->', 'X Las contraseñas no coinciden');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(formConError);
                return;
            }

            const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf8'));
            const existe = tienda.usuarios.some(u => u.nombre === nombre);
        
            if (!existe) {
                tienda.usuarios.push({ nombre, nombreReal, correo, password });
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
    
    if (req.method === 'POST' && url.pathname === '/add') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const producto = params.get('producto');
            
            // Leer cookies
            const cookie = req.headers.cookie || '';
            let carrito = '';
            cookie.split(';').forEach(pair => {
                let [k, v] = pair.trim().split('=');
                if (k === 'carrito') carrito = decodeURIComponent(v);
            });
    
            // Convertir a objeto: { "Zelda": 1, "Mario": 2 }
            let productos = {};
            
            if (carrito) {
                carrito.split('|').forEach(item => {
                    const [nombre, cantidad] = item.split(':');
                    productos[nombre] = parseInt(cantidad);
                });
            }

            // Añadir o incrementar
            if (productos[producto]) {
              productos[producto]++;
            } else {
                productos[producto] = 1;
            }

            //productos.push(producto);
    
            const nuevoValor = Object.entries(productos)
            .map(([nombre, cantidad]) => `${nombre}:${cantidad}`)
            .join('|');
          
            res.writeHead(302, {
                'Set-Cookie': `carrito=${encodeURIComponent(nuevoValor)}; Path=/`,
                'Location': '/index.html'
            });
            res.end();
        });
        return;
    }

    if (req.method === 'POST' && url.pathname === '/addcarrito') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const producto = params.get('producto');
    
            // Leer carrito
            const cookie = req.headers.cookie || '';
            let carrito = '';
            cookie.split(';').forEach(pair => {
                let [k, v] = pair.trim().split('=');
                if (k === 'carrito') carrito = decodeURIComponent(v);
            });
    
            // Convertir a objeto
            let productos = {};
            if (carrito) {
                carrito.split('|').forEach(item => {
                    const [nombre, cantidad] = item.split(':');
                    productos[nombre] = parseInt(cantidad);
                });
            }
    
            // Aumentar
            if (productos[producto]) {
                productos[producto]++;
            } else {
                productos[producto] = 1;
            }
    
            // Regenerar cookie
            const nuevoValor = Object.entries(productos)
                .map(([nombre, cantidad]) => `${nombre}:${cantidad}`)
                .join('|');
    
            res.writeHead(302, {
                'Set-Cookie': `carrito=${encodeURIComponent(nuevoValor)}; Path=/`,
                'Location': '/carrito.html'
            });
            res.end();
        });
        return;
    }
    

    if (req.method === 'POST' && url.pathname === '/remove') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const producto = params.get('producto');
    
            // Leer carrito
            const cookie = req.headers.cookie || '';
            let carrito = '';
            cookie.split(';').forEach(pair => {
                let [k, v] = pair.trim().split('=');
                if (k === 'carrito') carrito = decodeURIComponent(v);
            });
    
            // Convertir a objeto
            let productos = {};
            if (carrito) {
                carrito.split('|').forEach(item => {
                    const [nombre, cantidad] = item.split(':');
                    productos[nombre] = parseInt(cantidad);
                });
            }
    
            // Restar o eliminar
            if (productos[producto]) {
                productos[producto]--;
                if (productos[producto] <= 0) {
                    delete productos[producto];
                }
            }
    
            // Regenerar la cookie
            const nuevoValor = Object.entries(productos)
                .map(([nombre, cantidad]) => `${nombre}:${cantidad}`)
                .join('|');
    
            res.writeHead(302, {
                'Set-Cookie': `carrito=${encodeURIComponent(nuevoValor)}; Path=/`,
                'Location': '/carrito.html'
            });
            res.end();
        });
        return;
    }

    
    if (req.method === 'POST' && url.pathname === '/finalizar') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const direccion = params.get('direccion');
            const tarjeta = params.get('tarjeta');
      
            const user = get_user(req);
            if (!user) {
                res.writeHead(302, { Location: '/login.html' });
                res.end();
                return;
            }
      
            // Leer productos del carrito
            const cookie = req.headers.cookie || '';
            let carritoRaw = '';
            cookie.split(';').forEach(pair => {
                const [k, v] = pair.trim().split('=');
                if (k === 'carrito') carritoRaw = decodeURIComponent(v);
            });
      
            const productos = {};
            if (carritoRaw) {
                carritoRaw.split('|').forEach(item => {
                    const [nombre, cantidad] = item.split(':').map(s => s.trim());
                    productos[nombre] = parseInt(cantidad) || 1;
                });
            }
        
            // Guardar en tienda.json
            const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf8'));

            // Verificar stock suficiente
            let stockInsuficiente = [];

            for (let nombre in productos) {
                const cantidad = productos[nombre];
                const prod = tienda.productos.find(p => p.nombre === nombre);
                if (!prod || prod.stock < cantidad) {
                    stockInsuficiente.push(`${nombre} (quedan ${prod ? prod.stock : 0})`);
                }
            }

            // // Si no hay stock suficiente, mostrar error
            // if (stockInsuficiente.length > 0) {
            //     res.writeHead(200, { 'Content-Type': 'text/html' });
            //     res.end(`
            //         <h1>Stock insuficiente</h1>
            //         <p>No hay suficientes unidades para:</p>
            //         <ul>${stockInsuficiente.map(item => `<li>${item}</li>`).join('')}</ul>
            //         <a href="/carrito.html">Volver al carrito</a>
            // `);
            // return;
            // }
            
            tienda.pedidos.push({
                usuario: user,
                direccion,
                tarjeta,
                productos
            });

            // Restar stock por cada producto comprado
            for (let nombre in productos) {
                const cantidadComprada = productos[nombre];
                const prod = tienda.productos.find(p => p.nombre === nombre);
                if (prod) {
                    prod.stock -= cantidadComprada;
                if (prod.stock < 0) prod.stock = 0;
                }
            }
            
            // Guardar cambios en tienda.json
            fs.writeFileSync('tienda.json', JSON.stringify(tienda, null, 2));
        
            // Limpiar carrito
            res.writeHead(200, {
                'Set-Cookie': 'carrito=; Path=/; Max-Age=0',
                'Content-Type': 'text/html'
            });
            res.end(`<h1>Pedido confirmado</h1><p>Gracias por tu compra, ${user}!</p><a href="/">Volver</a>`);
            });
            return;
    }
      
    
    if (url.pathname === '/carrito.html') {
        const cookie = req.headers.cookie || '';
        let carrito = '';
        cookie.split(';').forEach(pair => {
            let [k, v] = pair.trim().split('=');
            if (k === 'carrito') carrito = decodeURIComponent(v);
        });
        
        // Convertir carrito: { "Zelda": 1, "Mario": 2 }
        //const productosNombres = carrito ? carrito.split('|') : [];
        const productos = {};
        if (carrito) {
            carrito.split('|').forEach(item => {
                const [nombre, cantidad] = item.split(':');
                productos[nombre] = parseInt(cantidad);
            });
          }
        
        // Leer productos de tienda.json
        const tienda = JSON.parse(fs.readFileSync('tienda.json'));
        let listaHTML = '<ul>';
        let total = 0;
        let advertencias = '';
        let hayProblemas = false;

        for (let nombre in productos) {
            const cantidad = productos[nombre];
            const p = tienda.productos.find(prod => prod.nombre === nombre);

            if (p) {
                const subtotal = p.precio * cantidad;
                total += subtotal;
                listaHTML += `<li>
                    <strong>${nombre}</strong> x${cantidad} - ${subtotal.toFixed(2)} €
                    <form method="POST" action="/remove" style="display:inline;">
                        <input type="hidden" name="producto" value="${nombre}">
                        <button type="submit" class="btn btn-mini" style="margin-left: 5px;">➖</button>
                    </form>
                    <form method="POST" action="/addcarrito" style="display:inline;">
                        <input type="hidden" name="producto" value="${nombre}">
                        <button type="submit" class="btn btn-mini" style="margin-left:5px;">➕</button>
                    </form>
                </li>`;

                if (cantidad > p.stock) {
                    advertencias += `<p style="color: yellow;">⚠️ ${nombre}: stock insuficiente, solo quedan ${p.stock}</p>`;
                    hayProblemas = true;
                }
                
                listaHTML += `</li>`;
            }
        }

        listaHTML += '</ul>';

        // Añadir precio total
        listaHTML += `<p><strong>Total:</strong> ${total.toFixed(2)} €</p>`;



        const user = get_user(req);

        let finalizarHTML = '';

        if (user) {
            if (hayProblemas) {
                finalizarHTML = `<p style="color:yellow;">No puedes finalizar la compra: hay productos sin stock suficiente.</p>`;
            } else {
                finalizarHTML = `<a href="/finalizar.html" class="btn-blanco">Finalizar compra</a>`;
            }
        }

        let html = renderHTML(ROOT_DIR + 'carrito.html', {
            USER: user ?? '',
            CAR: getCarritoCount(req),
            LISTA: listaHTML + advertencias,
            FINALIZAR: finalizarHTML
        });
      
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;

    }
    
    if (url.pathname === '/buscar') {
        const params = new URLSearchParams(url.search);
        const termino = (params.get('nombre') || '').toLowerCase();
    
        const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf8'));
        const resultado = tienda.productos.filter(p =>
            p.nombre.toLowerCase().includes(termino)
        );
    
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resultado));
        return;
    }
    
    fs.readFile(filePath, (err, content) => {
        if (url.pathname === '/producto.html') {
            const params = new URLSearchParams(url.search);
            const nombreProd = params.get('nombre');
        
            const tienda = JSON.parse(fs.readFileSync('tienda.json', 'utf8'));
            const producto = tienda.productos.find(p => p.nombre === nombreProd);
        
            if (!producto) {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>Producto no encontrado</h1>');
                return;
            }
        
            const user = get_user(req);
            let html = renderHTML(ROOT_DIR + 'producto.html', {
                NOMBRE: producto.nombre,
                DESCRIPCION: producto.descripcion,
                PRECIO: producto.precio,
                STOCK: producto.stock,
                IMAGEN: producto.imagen,
                USER: user ?? '',
                CAR: getCarritoCount(req)
            });

            if (user) {
                if (producto.stock > 0) {
                    html = html.replace('<!--CARRITO-->',
                      `<form method="POST" action="/add">
                        <input type="hidden" name="producto" value="${producto.nombre}">
                        <button type="submit" class="btn">Añadir al carrito</button>
                      </form>`);
                } else {
                    html = html.replace('<!--CARRITO-->',
                      `<p style="color: yellow; font-weight: bold;">Producto agotado</p>`);
                }
            } else {
                html = html.replace('<!--CARRITO-->',
                  `<p><em>Debes iniciar sesión para comprar</em></p>`);
            }
            
        
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
            return;
        }
            // Si es HTML, insertamos el usuario si existe
            if (filePath.endsWith('.html') && user) {
                let page = fs.readFileSync(filePath, 'utf8');
                content = page.replace('<!--USER-->', user);
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


            if (filePath.endsWith('.html')) {
                const user = get_user(req);
                content = renderHTML(filePath, {
                    USER: user ?? '',
                    CAR: getCarritoCount(req)
                });
            }
            res.end(content);

              
        }

    });
});

server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

