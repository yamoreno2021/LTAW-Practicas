// document.getElementById("searchInput").addEventListener("input", function() {
//     const input = this.value.toLowerCase();
//     const productos = document.querySelectorAll(".producto");
    
//     productos.forEach(producto => {
//         const nombre = producto.getAttribute("data-name");
//         if (nombre.includes(input)) {
//             producto.style.display = "block";
//         } else {
//             producto.style.display = "none";
//         }
//     });
// });
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", function () {
        const input = searchInput.value.toLowerCase().trim();
        const productos = document.querySelectorAll(".producto");
        
        productos.forEach(producto => {
            const nombre = (producto.getAttribute("data-name") || "").toLowerCase().trim();
            producto.classList.toggle("hidden", !nombre.replace(/\s+/g, "").includes(input.replace(/\s+/g, "")));
        });
    });
});