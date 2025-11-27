// server.js

// Importa los módulos necesarios usando la sintaxis ES Module (import)
import express from 'express'; // Para crear el servidor web
import admin from 'firebase-admin'; // Para interactuar con Firestore
import dotenv from 'dotenv'; // Para cargar variables de entorno desde .env
import { Buffer } from 'buffer'; // Módulo nativo de Node.js para decodificar Base64. ¡CRUCIAL!

// Carga las variables de entorno definidas en tu archivo .env
dotenv.config();

// Crea una instancia de la aplicación Express
const app = express();
// Define el puerto en el que correrá el servidor (por defecto 3000)
const port = process.env.PORT || 3000;

// Obtiene el slug del canal de Kick y el ID de la aplicación desde las variables de entorno
const KICK_CHANNEL_SLUG = process.env.KICK_CHANNEL_SLUG;
const APP_ID = process.env.APP_ID; 

let db; // Variable global para la instancia de Firestore

// --- Inicialización de Firebase Admin SDK con Base64 ---
try {
    const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    if (!base64Key) {
        throw new Error("La variable FIREBASE_SERVICE_ACCOUNT_BASE64 no está configurada.");
    }

    // Decodificar la clave Base64.
    const jsonString = Buffer.from(base64Key, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(jsonString);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    db = admin.firestore();

    console.log("Firebase Admin SDK inicializado correctamente.");
} catch (error) {
    console.error("Error al inicializar Firebase Admin SDK:", error.message);
    console.error("Asegúrate de que la clave JSON de Firebase fue codificada en Base64 correctamente.");
    process.exit(1); 
}

// Middleware de Express para parsear cuerpos de solicitud JSON.
app.use(express.json());

// --- Función para verificar el estado del Stream de Kick ---
async function checkKickStreamStatus() {
    console.log("Verificando estado del stream de Kick...");

    if (!KICK_CHANNEL_SLUG || !APP_ID) {
        console.error("KICK_CHANNEL_SLUG o APP_ID no están definidos.");
        return; 
    }

    // --------------------------------------------------------------------------------
    // CAMBIO CRUCIAL: Uso de un proxy CORS para evitar el bloqueo 403 de Kick por IP.
    // --------------------------------------------------------------------------------
    const KICK_API_URL = `https://kick.com/api/v1/channels/${KICK_CHANNEL_SLUG}`;
    const url = `https://corsproxy.io/?${encodeURIComponent(KICK_API_URL)}`;

    try {
        // Los encabezados robustos que ya definimos.
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.109 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': `https://kick.com/${KICK_CHANNEL_SLUG}`,
            'Origin': 'https://kick.com', 
            'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
            'Connection': 'keep-alive' 
        };

        const response = await fetch(url, { headers: headers });

        if (!response.ok) {
            // El proxy devolverá 200 aunque Kick falle, pero si el proxy falla, lo reportamos.
            console.error(`Error al contactar al proxy o la API de Kick: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();

        let isOnline = false;
        let message = `¡Sigue mi canal en Kick! kick.com/${KICK_CHANNEL_SLUG}`; 

        if (data.livestream && data.livestream.is_live) {
            isOnline = true;
            const streamTitle = data.livestream.session_title || 'Sin título';
            const category = data.livestream.category ? data.livestream.category.name : 'Sin categoría';
            message = `¡Estoy en vivo en Kick! Jugando ${category}: "${streamTitle}". ¡Únete ahora! kick.com/${KICK_CHANNEL_SLUG}`;
            console.log("Stream ONLINE en Kick. Título:", streamTitle);
        } else {
            console.log("Stream OFFLINE en Kick.");
        }

        // --- Actualiza Firestore ---
        const streamStatusDocRef = db.collection(`artifacts/${APP_ID}/public/data/stream_status`).doc('current_status');
        
        await streamStatusDocRef.set({
            isOnline: isOnline,
            message: message,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log("Firestore actualizado con el estado del stream de Kick.");

    } catch (error) {
        console.error("Error al verificar el estado del stream de Kick o al actualizar Firestore:", error);
    }
}

// --------------------------------------------------------------------------------
// Endpoint para la URL raíz (/)
// --------------------------------------------------------------------------------
app.get('/', (req, res) => {
    res.status(200).send({
        status: 'OK',
        message: 'Servidor de backend de estado de stream activo y funcionando. La verificación de Kick ocurre cada 2 minutos.',
        check_status_url: '/update-stream-status'
    });
});


// --- Endpoint de prueba ---
app.get('/update-stream-status', async (req, res) => {
    await checkKickStreamStatus();
    res.send('Estado del stream de Kick verificado y Firestore actualizado.');
});

// --- Iniciar el servidor ---
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
    // Ejecuta inmediatamente y luego cada 2 minutos.
    checkKickStreamStatus();
    setInterval(checkKickStreamStatus, 2 * 60 * 1000);
});