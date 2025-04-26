document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const resultados = document.getElementById("resultados");

    searchInput.addEventListener("input", () => {
        const valor = searchInput.value;

        if (valor.length >= 3) {
            const ajax = new XMLHttpRequest();
            ajax.open("GET", "/buscar?nombre=" + encodeURIComponent(valor), true);
            ajax.onreadystatechange = function () {
                if (ajax.readyState === 4 && ajax.status === 200) {
                    const productos = JSON.parse(ajax.responseText);
                    resultados.innerHTML = '';

                    productos.forEach(producto => {
                        const divProducto = document.createElement("div");
                        divProducto.className = "resultado-item";

                        divProducto.innerHTML = `
                            <a href="/producto.html?nombre=${encodeURIComponent(producto.nombre)}" style="display:flex; align-items:center; gap:10px; text-decoration:none; color:black;">
                                <img src="/img/${producto.imagen}" alt="${producto.nombre}">
                                <span>${producto.nombre}</span>
                            </a>
                        `;

                        resultados.appendChild(divProducto);
                    });
                }
            };

        ajax.send();
        } else {
            resultados.innerHTML = ''; // Si borras texto, limpia resultados
        }
    });
});
  