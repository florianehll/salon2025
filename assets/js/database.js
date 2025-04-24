// Configuration de la base de données
const DB_NAME = 'AresiaVisitorsDB';
const DB_VERSION = 2;
const VISITORS_STORE = 'visitors';

// Base de données IndexedDB
let db;

// Génération d'ID unique
const generateUniqueId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 6);
    return `ARESIA-${timestamp}-${randomStr}`.toUpperCase();
};

// Initialisation de la base de données
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = event => {
            console.error("Erreur d'ouverture de la base de données", event);
            reject("Impossible d'ouvrir la base de données");
        };
        
        request.onsuccess = event => {
            db = event.target.result;
            resolve(db);
        };
        
        request.onupgradeneeded = event => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains(VISITORS_STORE)) {
                const store = db.createObjectStore(VISITORS_STORE, { keyPath: 'visitorId' });
                store.createIndex('email', 'email', { unique: true });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
};

// Ajouter un visiteur à la base de données
const addVisitor = visitor => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VISITORS_STORE], 'readwrite');
        const store = transaction.objectStore(VISITORS_STORE);
        
        visitor.timestamp = new Date().toISOString();
        
        const request = store.add(visitor);
        
        request.onsuccess = event => {
            resolve(event.target.result);
        };
        
        request.onerror = event => {
            if (event.target.error.name === 'ConstraintError') {
                reject("Un visiteur avec cet email existe déjà");
            } else {
                reject("Erreur lors de l'ajout du visiteur");
            }
        };
    });
};

// Mettre à jour un visiteur existant
const updateVisitor = visitor => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VISITORS_STORE], 'readwrite');
        const store = transaction.objectStore(VISITORS_STORE);
        
        visitor.updated = new Date().toISOString();
        
        const request = store.put(visitor);
        
        request.onsuccess = () => {
            resolve(true);
        };
        
        request.onerror = event => {
            reject(`Erreur lors de la mise à jour du visiteur: ${event.target.error}`);
        };
    });
};

// Récupérer tous les visiteurs
const getAllVisitors = () => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VISITORS_STORE], 'readonly');
        const store = transaction.objectStore(VISITORS_STORE);
        const index = store.index('timestamp');
        
        const request = index.getAll();
        
        request.onsuccess = event => {
            resolve(event.target.result);
        };
        
        request.onerror = event => {
            reject(`Erreur lors de la récupération des visiteurs: ${event.target.error}`);
        };
    });
};

// Récupérer un visiteur par son ID
const getVisitorById = id => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VISITORS_STORE], 'readonly');
        const store = transaction.objectStore(VISITORS_STORE);
        
        const request = store.get(id);
        
        request.onsuccess = event => {
            resolve(event.target.result);
        };
        
        request.onerror = event => {
            reject(`Erreur lors de la récupération du visiteur: ${event.target.error}`);
        };
    });
};