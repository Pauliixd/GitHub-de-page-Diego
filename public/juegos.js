// ======================= FIREBASE =======================
import { getFirestore, doc, getDoc }
    from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { initializeApp }
    from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

const firebaseConfig = {
    apiKey: "AIzaSyD7o2Nam_oBXSsT7QRGMudpwRl5Z5DTjpA",
    authDomain: "moaixd.firebaseapp.com",
    projectId: "moaixd",
    storageBucket: "moaixd.firebasestorage.app",
    messagingSenderId: "498764551600",
    appId: "1:498764551600:web:e03e02d06679e0d5007275",
    measurementId: "G-W0LVF5RVDR",
};

initializeApp(firebaseConfig);
const db = getFirestore();
const refPalabra = doc(db, "juegos", "ahorcado");

// ======================= DOM =======================
const tablero = document.getElementById("tablero");
const inputIntento = document.getElementById("inputIntento");
const btnIntentar = document.getElementById("btnIntentar");
const mensajeWordle = document.getElementById("mensajeWordle");

// ======================= VARIABLES =======================
let palabraSecreta = "";
let intentosMax = 6;
let intentosRealizados = 0;
let juegoTerminado = false;

// ======================= CARGAR PALABRA =======================
async function cargarPalabra() {
     if (verificarJuegoPrevio()) return;

    const snap = await getDoc(refPalabra);

    palabraSecreta = snap.exists()
        ? snap.data().palabra.toLowerCase().trim()
        : "moaixd";

    crearFilaIntento();
}

function verificarJuegoPrevio() {
    const jugado = localStorage.getItem("wordleJugado");
    const fecha = localStorage.getItem("wordleFecha");

    const hoy = new Date().toLocaleDateString("es-AR");

    if (jugado === "true" && fecha === hoy) {
        juegoTerminado = true;
        mensajeWordle.textContent = "⚠️ Ya jugaste hoy. Volvé mañana 👀";
        btnIntentar.disabled = true;
        inputIntento.disabled = true;
        return true;
    }

    return false;
}

// ======================= CREAR UNA FILA VACÍA =======================
function crearFilaIntento() {
    const fila = document.createElement("div");
    fila.className = "flex gap-2 justify-center";

    for (let i = 0; i < palabraSecreta.length; i++) {
        const celda = document.createElement("div");
        celda.className = `
            w-12 h-12 border border-gray-600 
            flex items-center justify-center 
            text-2xl font-bold bg-gray-800 text-white rounded
        `;
        fila.appendChild(celda);
    }

    tablero.appendChild(fila);
}

// ======================= EFECTO "LETRA POR LETRA" =======================
function animarTexto(elemento, texto, velocidad = 40) {
    elemento.textContent = "";
    let i = 0;

    const intervalo = setInterval(() => {
        elemento.textContent += texto.charAt(i);
        i++;
        if (i >= texto.length) clearInterval(intervalo);
    }, velocidad);
}

// ======================= PROCESAR INTENTO =======================
async function procesarIntento() {
    if (juegoTerminado) return;
    mensajeWordle.textContent = "";

    const intento = inputIntento.value.toLowerCase().trim();

    if (intento.length == 0) {
        animarTexto(mensajeWordle, "La palabra debe tener al menos una letra");
        return;
    }

    const fila = tablero.children[intentosRealizados];
    const celdas = fila.children;

    // Animación letra por letra
    for (let i = 0; i < palabraSecreta.length; i++) {
        await new Promise((res) => setTimeout(res, 120)); // velocidad

        celdas[i].textContent = intento[i] ?? "";

        if (intento[i] === palabraSecreta[i]) {
            celdas[i].style.background = "#22c55e"; // verde
        } else if (palabraSecreta.includes(intento[i])) {
            celdas[i].style.background = "#eab308"; // amarillo
        } else {
            celdas[i].style.background = "#374151"; // gris
        }
    }

    intentosRealizados++;

    if (intento === palabraSecreta) {
        animarTexto(mensajeWordle, "🎉 Ya,weon,ganaste,ganaste,toma,toma,todo");

        localStorage.setItem("wordleJugado", "true");
        localStorage.setItem("wordleFecha", new Date().toLocaleDateString("es-AR"));

        return;
    }

    if (intentosRealizados >= intentosMax) {
        animarTexto(mensajeWordle, "💀 El,weon,nefasto,chala,culia,anda,acostarte");

        juegoTerminado = true;

        localStorage.setItem("wordleJugado", "true");
        localStorage.setItem("wordleFecha", new Date().toLocaleDateString("es-AR"));

        return;
    }

    crearFilaIntento();
    inputIntento.value = "";
}


btnIntentar.addEventListener("click", procesarIntento);

inputIntento.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        procesarIntento();
    }
})

// ======================= INICIAR =======================
cargarPalabra();


// ======================= EFECTO 3D =======================
const card = document.getElementById("ahorcadoSection");

card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateX = ((y - rect.height / 2) / rect.height) * 15;
    const rotateY = ((x - rect.width / 2) / rect.width) * -15;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});

card.addEventListener("mouseleave", () => {
    card.style.transform = "rotateX(0) rotateY(0)";
});

