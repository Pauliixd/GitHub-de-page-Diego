// server.js

import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Necesario para usar __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir contenido estático desde /public
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------
// Inicializar Firebase Admin (Base64)
// -----------------------------------------
try {
    const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!base64Key) throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 no configurada.");

    const jsonString = Buffer.from(base64Key, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(jsonString);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log("Firebase Admin SDK inicializado correctamente.");
} catch (error) {
    console.error("Error al inicializar Firebase Admin SDK:", error.message);
    process.exit(1);
}

const db = admin.firestore();
const appId = process.env.APP_ID;
const KICK_CHANNEL_SLUG = process.env.KICK_CHANNEL_SLUG;

// -----------------------------------------
// Función Kick API
// -----------------------------------------
async function checkKickStreamStatus() {
    console.log("Verificando estado del stream de Kick...");

    const url = `https://kick.com/api/v1/channels/${KICK_CHANNEL_SLUG}`;

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.109 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": `https://kick.com/${KICK_CHANNEL_SLUG}`,
        "Accept-Language": "en-US,en;q=0.9"
    };

    try {
        const response = await fetch(url, { headers });

        if (!response.ok) {
            console.error(`Error HTTP al consultar Kick: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();

        let isOnline = false;
        let message = `¡Sigue mi canal en Kick! https://kick.com/${KICK_CHANNEL_SLUG}`;

        if (data.livestream && data.livestream.is_live) {
            isOnline = true;
            const title = data.livestream.session_title || "Sin título";
            const category = data.livestream.category?.name || "Sin categoría";
            message = `¡Estoy en vivo en Kick! Jugando ${category}: "${title}" https://kick.com/${KICK_CHANNEL_SLUG}`;
        }

        const docRef = db
            .collection(`artifacts/${appId}/public/data/stream_status`)
            .doc('current_status');

        await docRef.set({
            isOnline,
            message,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("Firestore actualizado.");

    } catch (error) {
        console.error("Error Kick API:", error);
    }
}

// Endpoint manual
app.get('/update-stream-status', async (req, res) => {
    await checkKickStreamStatus();
    res.send("Estado actualizado.");
});

// Ruta raíz — Render ya no mostrará "Cannot GET /"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
    checkKickStreamStatus();
    setInterval(checkKickStreamStatus, 2 * 60 * 1000);
});