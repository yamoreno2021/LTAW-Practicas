document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const contenedor = document.getElementById("productos-container");
  
    searchInput.addEventListener("input", () => {
      const valor = searchInput.value;
  
      if (valor.length >= 1) {
        const ajax = new XMLHttpRequest();
        ajax.onreadystatechange = () => {
          if (ajax.readyState === 4 && ajax.status === 200) {
            const productos = JSON.parse(ajax.responseText);
            contenedor.innerHTML = '';
  
            for (let prod of productos) {
              contenedor.innerHTML += `
                <div class="producto mini">
                  <img src="img/${prod.imagen}" alt="${prod.nombre}">
                  <h2>${prod.nombre}</h2>
                  <p>${prod.precio} €</p>
                  <a href="producto.html?nombre=${encodeURIComponent(prod.nombre)}" class="btn btn-mini">Ver más</a>
                </div>`;
            }
          }
        };
  
        ajax.open("GET", "/buscar?nombre=" + encodeURIComponent(valor), true);
        ajax.send();
      } else {
        contenedor.innerHTML = '';
      }
    });
  });
  