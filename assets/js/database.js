// Configuration de la base de données
const DB_NAME = 'AresiaVisitorsDB';
const DB_VERSION = 5; // Incrémenté pour les nouveaux champs
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
            console.log(`Base de données ouverte (version ${db.version})`);
            resolve(db);
        };
        
        request.onupgradeneeded = event => {
            const db = event.target.result;
            console.log(`Mise à jour de la base de données vers la version ${DB_VERSION}`);
            
            // Créer ou mettre à jour le store des visiteurs
            let store;
            
            if (!db.objectStoreNames.contains(VISITORS_STORE)) {
                // Création du store pour la première fois
                store = db.createObjectStore(VISITORS_STORE, { keyPath: 'visitorId' });
                console.log('Store des visiteurs créé');
            } else {
                // Le store existe déjà, on peut accéder aux données existantes
                store = event.target.transaction.objectStore(VISITORS_STORE);
                console.log('Store des visiteurs existant mis à jour');
            }
            
            // Création des index (suppression et recréation pour éviter les conflits)
            const indexNames = ['email', 'timestamp', 'secteur', 'missionType', 'entreprise', 'pays', 'profilVisiteur'];
            
            indexNames.forEach(indexName => {
                if (store.indexNames.contains(indexName)) {
                    store.deleteIndex(indexName);
                }
            });
            
            // Recréation des index avec les nouvelles propriétés
            store.createIndex('email', 'email', { unique: true });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('secteur', 'secteur', { unique: false });
            store.createIndex('missionType', 'missionType', { unique: false });
            store.createIndex('entreprise', 'entreprise', { unique: false });
            store.createIndex('pays', 'pays', { unique: false });
            store.createIndex('profilVisiteur', 'profilVisiteur', { unique: false });
            
            console.log('Index de la base de données créés/mis à jour');
            
            // Migration des données existantes si nécessaire
            store.openCursor().onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    const visitor = cursor.value;
                    let needsUpdate = false;
                    
                    // Supprimer l'ancien champ ageRange et ajouter missionType
                    if (visitor.ageRange !== undefined) {
                        delete visitor.ageRange;
                        needsUpdate = true;
                    }
                    
                    // Ajouter le nouveau champ missionType s'il n'existe pas
                    if (!visitor.missionType) {
                        visitor.missionType = 'AIR - AIR'; // Valeur par défaut
                        needsUpdate = true;
                    }
                    
                    if (!visitor.aircraftType) {
                        visitor.aircraftType = null;
                        needsUpdate = true;
                    }
                    
                    if (!visitor.flightHours) {
                        visitor.flightHours = null;
                        needsUpdate = true;
                    }
                    
                    // Ajouter les nouveaux champs v4
                    if (!visitor.entreprise) {
                        visitor.entreprise = null;
                        needsUpdate = true;
                    }
                    
                    if (!visitor.pays) {
                        visitor.pays = null;
                        needsUpdate = true;
                    }
                    
                    if (!visitor.profilVisiteur) {
                        visitor.profilVisiteur = null;
                        needsUpdate = true;
                    }
                    
                    // Mettre à jour l'enregistrement si nécessaire
                    if (needsUpdate) {
                        cursor.update(visitor);
                        console.log(`Visiteur ${visitor.visitorId} migré vers la nouvelle version`);
                    }
                    
                    cursor.continue();
                }
            };
        };
    });
};

// Ajouter un visiteur à la base de données
const addVisitor = visitor => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Base de données non initialisée");
            return;
        }
        
        const transaction = db.transaction([VISITORS_STORE], 'readwrite');
        const store = transaction.objectStore(VISITORS_STORE);
        
        // Ajouter les métadonnées
        visitor.timestamp = new Date().toISOString();
        visitor.version = DB_VERSION;
        
        // Validation des données avant insertion
        if (!visitor.nom || !visitor.prenom || !visitor.email) {
            reject("Les champs nom, prénom et email sont obligatoires");
            return;
        }
        
        if (!visitor.missionType) {
            reject("Le type de mission est obligatoire");
            return;
        }
        
        if (!visitor.profilVisiteur) {
            reject("Le profil visiteur est obligatoire");
            return;
        }
        
        // Validation spécifique pour les pilotes
        if (visitor.secteur && visitor.secteur.toLowerCase() === 'pilote') {
            if (visitor.flightHours && (visitor.flightHours < 0 || visitor.flightHours > 50000)) {
                reject("Le nombre d'heures de vol doit être entre 0 et 50000");
                return;
            }
        }
        
        const request = store.add(visitor);
        
        request.onsuccess = event => {
            console.log(`Visiteur ${visitor.visitorId} ajouté avec succès`);
            resolve(event.target.result);
        };
        
        request.onerror = event => {
            console.error(`Erreur lors de l'ajout du visiteur ${visitor.visitorId}:`, event.target.error);
            if (event.target.error.name === 'ConstraintError') {
                reject("Un visiteur avec cet email existe déjà");
            } else {
                reject("Erreur lors de l'ajout du visiteur");
            }
        };
        
        transaction.onerror = event => {
            console.error("Erreur de transaction lors de l'ajout:", event.target.error);
            reject("Erreur de transaction");
        };
    });
};

// Mettre à jour un visiteur existant
const updateVisitor = visitor => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Base de données non initialisée");
            return;
        }
        
        const transaction = db.transaction([VISITORS_STORE], 'readwrite');
        const store = transaction.objectStore(VISITORS_STORE);
        
        // Ajouter les métadonnées de mise à jour
        visitor.updated = new Date().toISOString();
        visitor.version = DB_VERSION;
        
        // Validation des données avant mise à jour
        if (!visitor.nom || !visitor.prenom || !visitor.email) {
            reject("Les champs nom, prénom et email sont obligatoires");
            return;
        }
        
        if (!visitor.missionType) {
            reject("Le type de mission est obligatoire");
            return;
        }
        
        if (!visitor.profilVisiteur) {
            reject("Le profil visiteur est obligatoire");
            return;
        }
        
        // Validation spécifique pour les pilotes
        if (visitor.secteur && visitor.secteur.toLowerCase() === 'pilote') {
            if (visitor.flightHours && (visitor.flightHours < 0 || visitor.flightHours > 50000)) {
                reject("Le nombre d'heures de vol doit être entre 0 et 50000");
                return;
            }
        } else {
            // Si ce n'est plus un pilote, supprimer les champs spécifiques
            delete visitor.aircraftType;
            delete visitor.flightHours;
        }
        
        const request = store.put(visitor);
        
        request.onsuccess = () => {
            console.log(`Visiteur ${visitor.visitorId} mis à jour avec succès`);
            resolve(true);
        };
        
        request.onerror = event => {
            console.error(`Erreur lors de la mise à jour du visiteur ${visitor.visitorId}:`, event.target.error);
            reject(`Erreur lors de la mise à jour du visiteur: ${event.target.error}`);
        };
        
        transaction.onerror = event => {
            console.error("Erreur de transaction lors de la mise à jour:", event.target.error);
            reject("Erreur de transaction");
        };
    });
};

// Récupérer tous les visiteurs
const getAllVisitors = () => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Base de données non initialisée");
            return;
        }
        
        const transaction = db.transaction([VISITORS_STORE], 'readonly');
        const store = transaction.objectStore(VISITORS_STORE);
        const index = store.index('timestamp');
        
        // Récupérer tous les visiteurs triés par timestamp décroissant
        const request = index.getAll();
        
        request.onsuccess = event => {
            const visitors = event.target.result;
            // Trier par timestamp décroissant (plus récent en premier)
            visitors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            console.log(`${visitors.length} visiteurs récupérés`);
            resolve(visitors);
        };
        
        request.onerror = event => {
            console.error("Erreur lors de la récupération des visiteurs:", event.target.error);
            reject(`Erreur lors de la récupération des visiteurs: ${event.target.error}`);
        };
        
        transaction.onerror = event => {
            console.error("Erreur de transaction lors de la récupération:", event.target.error);
            reject("Erreur de transaction");
        };
    });
};

// Récupérer un visiteur par son ID
const getVisitorById = id => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Base de données non initialisée");
            return;
        }
        
        const transaction = db.transaction([VISITORS_STORE], 'readonly');
        const store = transaction.objectStore(VISITORS_STORE);
        
        const request = store.get(id);
        
        request.onsuccess = event => {
            const visitor = event.target.result;
            if (visitor) {
                console.log(`Visiteur ${id} trouvé`);
            } else {
                console.log(`Visiteur ${id} non trouvé`);
            }
            resolve(visitor);
        };
        
        request.onerror = event => {
            console.error(`Erreur lors de la récupération du visiteur ${id}:`, event.target.error);
            reject(`Erreur lors de la récupération du visiteur: ${event.target.error}`);
        };
        
        transaction.onerror = event => {
            console.error("Erreur de transaction lors de la récupération par ID:", event.target.error);
            reject("Erreur de transaction");
        };
    });
};

// Supprimer un visiteur par son ID
const deleteVisitor = id => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Base de données non initialisée");
            return;
        }
        
        const transaction = db.transaction([VISITORS_STORE], 'readwrite');
        const store = transaction.objectStore(VISITORS_STORE);
        
        const request = store.delete(id);
        
        request.onsuccess = () => {
            console.log(`Visiteur ${id} supprimé avec succès`);
            resolve(true);
        };
        
        request.onerror = event => {
            console.error(`Erreur lors de la suppression du visiteur ${id}:`, event.target.error);
            reject(`Erreur lors de la suppression du visiteur: ${event.target.error}`);
        };
        
        transaction.onerror = event => {
            console.error("Erreur de transaction lors de la suppression:", event.target.error);
            reject("Erreur de transaction");
        };
    });
};

// Récupérer des statistiques sur les visiteurs
const getVisitorStats = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const visitors = await getAllVisitors();
            
            const stats = {
                total: visitors.length,
                withPhotos: visitors.filter(v => v.photo).length,
                withRatings: visitors.filter(v => v.ergonomie !== undefined || v.simulation !== undefined || v.ressenti !== undefined).length,
                pilots: visitors.filter(v => v.secteur && v.secteur.toLowerCase() === 'pilote').length,
                missionTypes: {},
                sectors: {},
                entreprises: {},
                pays: {},
                profilsVisiteurs: {},
                avgRatings: {
                    ergonomie: 0,
                    simulation: 0,
                    ressenti: 0
                }
            };
            
            // Statistiques par type de mission
            visitors.forEach(visitor => {
                if (visitor.missionType) {
                    stats.missionTypes[visitor.missionType] = (stats.missionTypes[visitor.missionType] || 0) + 1;
                }
            });
            
            // Statistiques par secteur
            visitors.forEach(visitor => {
                if (visitor.secteur) {
                    stats.sectors[visitor.secteur] = (stats.sectors[visitor.secteur] || 0) + 1;
                }
            });
            
            // Statistiques par entreprise
            visitors.forEach(visitor => {
                if (visitor.entreprise) {
                    stats.entreprises[visitor.entreprise] = (stats.entreprises[visitor.entreprise] || 0) + 1;
                }
            });
            
            // Statistiques par pays
            visitors.forEach(visitor => {
                if (visitor.pays) {
                    stats.pays[visitor.pays] = (stats.pays[visitor.pays] || 0) + 1;
                }
            });
            
            // Statistiques par profil visiteur
            visitors.forEach(visitor => {
                if (visitor.profilVisiteur) {
                    stats.profilsVisiteurs[visitor.profilVisiteur] = (stats.profilsVisiteurs[visitor.profilVisiteur] || 0) + 1;
                }
            });
            
            // Moyennes des évaluations
            const ratingsCount = { ergonomie: 0, simulation: 0, ressenti: 0 };
            const ratingsSum = { ergonomie: 0, simulation: 0, ressenti: 0 };
            
            visitors.forEach(visitor => {
                if (visitor.ergonomie !== undefined) {
                    ratingsSum.ergonomie += visitor.ergonomie;
                    ratingsCount.ergonomie++;
                }
                if (visitor.simulation !== undefined) {
                    ratingsSum.simulation += visitor.simulation;
                    ratingsCount.simulation++;
                }
                if (visitor.ressenti !== undefined) {
                    ratingsSum.ressenti += visitor.ressenti;
                    ratingsCount.ressenti++;
                }
            });
            
            stats.avgRatings.ergonomie = ratingsCount.ergonomie > 0 ? 
                (ratingsSum.ergonomie / ratingsCount.ergonomie).toFixed(2) : 0;
            stats.avgRatings.simulation = ratingsCount.simulation > 0 ? 
                (ratingsSum.simulation / ratingsCount.simulation).toFixed(2) : 0;
            stats.avgRatings.ressenti = ratingsCount.ressenti > 0 ? 
                (ratingsSum.ressenti / ratingsCount.ressenti).toFixed(2) : 0;
            
            console.log('Statistiques calculées:', stats);
            resolve(stats);
        } catch (error) {
            console.error('Erreur lors du calcul des statistiques:', error);
            reject(error);
        }
    });
};

// Rechercher des visiteurs par critères
const searchVisitors = (criteria) => {
    return new Promise(async (resolve, reject) => {
        try {
            const allVisitors = await getAllVisitors();
            
            let filteredVisitors = allVisitors.filter(visitor => {
                let matches = true;
                
                if (criteria.nom && !visitor.nom.toLowerCase().includes(criteria.nom.toLowerCase())) {
                    matches = false;
                }
                
                if (criteria.prenom && !visitor.prenom.toLowerCase().includes(criteria.prenom.toLowerCase())) {
                    matches = false;
                }
                
                if (criteria.email && !visitor.email.toLowerCase().includes(criteria.email.toLowerCase())) {
                    matches = false;
                }
                
                if (criteria.secteur && !visitor.secteur.toLowerCase().includes(criteria.secteur.toLowerCase())) {
                    matches = false;
                }
                
                if (criteria.missionType && visitor.missionType !== criteria.missionType) {
                    matches = false;
                }
                
                if (criteria.entreprise && !visitor.entreprise.toLowerCase().includes(criteria.entreprise.toLowerCase())) {
                    matches = false;
                }
                
                if (criteria.pays && !visitor.pays.toLowerCase().includes(criteria.pays.toLowerCase())) {
                    matches = false;
                }
                
                if (criteria.profilVisiteur && visitor.profilVisiteur !== criteria.profilVisiteur) {
                    matches = false;
                }
                
                return matches;
            });
            
            console.log(`Recherche: ${filteredVisitors.length} visiteurs trouvés sur ${allVisitors.length}`);
            resolve(filteredVisitors);
        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            reject(error);
        }
    });
};

// Vérifier l'intégrité de la base de données
const checkDatabaseIntegrity = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const visitors = await getAllVisitors();
            const issues = [];
            
            visitors.forEach((visitor, index) => {
                // Vérifier les champs obligatoires
                if (!visitor.visitorId) {
                    issues.push(`Visiteur ${index}: ID manquant`);
                }
                if (!visitor.nom) {
                    issues.push(`Visiteur ${visitor.visitorId || index}: nom manquant`);
                }
                if (!visitor.prenom) {
                    issues.push(`Visiteur ${visitor.visitorId || index}: prénom manquant`);
                }
                if (!visitor.email) {
                    issues.push(`Visiteur ${visitor.visitorId || index}: email manquant`);
                }
                if (!visitor.timestamp) {
                    issues.push(`Visiteur ${visitor.visitorId || index}: timestamp manquant`);
                }
                if (!visitor.missionType) {
                    issues.push(`Visiteur ${visitor.visitorId || index}: type de mission manquant`);
                }
                if (!visitor.profilVisiteur) {
                    issues.push(`Visiteur ${visitor.visitorId || index}: profil visiteur manquant`);
                }
                
                // Vérifier la cohérence des données pilote
                if (visitor.secteur && visitor.secteur.toLowerCase() === 'pilote') {
                    if (visitor.flightHours && (visitor.flightHours < 0 || visitor.flightHours > 50000)) {
                        issues.push(`Visiteur ${visitor.visitorId}: heures de vol invalides (${visitor.flightHours})`);
                    }
                }
            });
            
            const result = {
                totalVisitors: visitors.length,
                issues: issues,
                isValid: issues.length === 0
            };
            
            console.log('Vérification d\'intégrité:', result);
            resolve(result);
        } catch (error) {
            console.error('Erreur lors de la vérification d\'intégrité:', error);
            reject(error);
        }
    });
};