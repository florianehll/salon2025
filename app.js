// Configuration de l'application
const DB_NAME = 'SimulatorVisitorsDB';
const DB_VERSION = 1;
const VISITORS_STORE = 'visitors';

// Initialisation de la base de données IndexedDB
let db;

const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = event => {
            console.error("Erreur d'ouverture de la base de données", event);
            reject("Impossible d'ouvrir la base de données");
        };
        
        request.onsuccess = event => {
            db = event.target.result;
            console.log("Base de données ouverte avec succès");
            resolve(db);
        };
        
        request.onupgradeneeded = event => {
            const db = event.target.result;
            
            // Créer le store pour les visiteurs s'il n'existe pas déjà
            if (!db.objectStoreNames.contains(VISITORS_STORE)) {
                const store = db.createObjectStore(VISITORS_STORE, { keyPath: 'id', autoIncrement: true });
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
        
        // Ajouter un horodatage à l'enregistrement
        visitor.timestamp = new Date().toISOString();
        
        const request = store.add(visitor);
        
        request.onsuccess = event => {
            resolve(event.target.result); // Retourne l'ID du visiteur ajouté
        };
        
        request.onerror = event => {
            // Vérifier si l'erreur est due à un email en double
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
        
        // Ajouter un horodatage de mise à jour
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

// Gérer l'interface utilisateur
let activeTab = 'registration';

// Afficher la notification
const showNotification = (message, type = 'success') => {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification notification-${type}`;
    notification.style.display = 'flex';
    
    // Masquer la notification après 3 secondes
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
};

// Changer d'onglet
const switchTab = tabId => {
    // Masquer tous les onglets
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Afficher l'onglet sélectionné
    document.getElementById(`${tabId}-tab`).style.display = 'block';
    
    // Mettre à jour les classes des boutons d'onglet
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
    
    activeTab = tabId;
    
    // Actions spécifiques à certains onglets
    if (tabId === 'data') {
        refreshDataTable();
    } else if (tabId === 'feedback') {
        refreshVisitorSelect();
    }
};

// Rafraîchir la liste déroulante des visiteurs
const refreshVisitorSelect = async () => {
    try {
        const visitors = await getAllVisitors();
        const select = document.getElementById('visitor-select');
        
        // Vider la liste déroulante sauf l'option par défaut
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Ajouter les visiteurs à la liste déroulante
        visitors.forEach(visitor => {
            const option = document.createElement('option');
            option.value = visitor.id;
            option.textContent = `${visitor.nom} ${visitor.prenom} (${visitor.email})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erreur lors du rafraîchissement de la liste des visiteurs', error);
        showNotification('Erreur lors du chargement des visiteurs', 'error');
    }
};

// Rafraîchir le tableau de données
const refreshDataTable = async () => {
    try {
        const visitors = await getAllVisitors();
        const tableBody = document.getElementById('visitors-table-body');
        const emptyState = document.getElementById('empty-state');
        const exportButton = document.getElementById('export-button');
        const visitorCount = document.getElementById('visitor-count');
        
        // Mettre à jour le compteur de visiteurs
        visitorCount.textContent = visitors.length;
        
        // Activer/désactiver le bouton d'exportation
        exportButton.disabled = visitors.length === 0;
        
        // Vider le tableau
        tableBody.innerHTML = '';
        
        // Afficher l'état vide si aucun visiteur
        if (visitors.length === 0) {
            emptyState.style.display = 'block';
            return;
        }
        
        // Masquer l'état vide
        emptyState.style.display = 'none';
        
        // Ajouter les visiteurs au tableau
        visitors.forEach(visitor => {
            const row = document.createElement('tr');
            
            // Nom / Prénom
            const nameCell = document.createElement('td');
            nameCell.textContent = `${visitor.nom} ${visitor.prenom}`;
            row.appendChild(nameCell);
            
            // Email
            const emailCell = document.createElement('td');
            emailCell.textContent = visitor.email;
            row.appendChild(emailCell);
            
            // Secteur
            const sectorCell = document.createElement('td');
            sectorCell.textContent = visitor.secteur || '-';
            row.appendChild(sectorCell);
            
            // Évaluation
            const ratingCell = document.createElement('td');
            
            if (visitor.ergonomie !== undefined) {
                const ergoBadge = document.createElement('span');
                ergoBadge.className = 'badge badge-blue';
                ergoBadge.textContent = `E: ${visitor.ergonomie}`;
                ratingCell.appendChild(ergoBadge);
            }
            
            if (visitor.simulation !== undefined) {
                const simBadge = document.createElement('span');
                simBadge.className = 'badge badge-green';
                simBadge.textContent = `S: ${visitor.simulation}`;
                ratingCell.appendChild(simBadge);
            }
            
            if (visitor.ressenti !== undefined) {
                const resBadge = document.createElement('span');
                resBadge.className = 'badge badge-purple';
                resBadge.textContent = `R: ${visitor.ressenti}`;
                ratingCell.appendChild(resBadge);
            }
            
            if (!visitor.ergonomie && !visitor.simulation && !visitor.ressenti) {
                ratingCell.textContent = '-';
            }
            
            row.appendChild(ratingCell);
            
            // Date
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(visitor.timestamp).toLocaleString();
            row.appendChild(dateCell);
            
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Erreur lors du rafraîchissement du tableau de données', error);
        showNotification('Erreur lors du chargement des données', 'error');
    }
};

// Exporter les données au format CSV
const exportToCSV = async () => {
    try {
        const visitors = await getAllVisitors();
        
        if (visitors.length === 0) {
            showNotification('Aucune donnée à exporter', 'error');
            return;
        }
        
        // Créer le contenu CSV
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Entêtes CSV
        csvContent += "ID,Nom,Prénom,Email,Secteur,Remarques,Ergonomie,Simulation,Ressenti,Date d'enregistrement\n";
        
        // Lignes de données
        visitors.forEach(visitor => {
            // Échapper les guillemets dans les champs texte
            const nom = visitor.nom ? `"${visitor.nom.replace(/"/g, '""')}"` : '""';
            const prenom = visitor.prenom ? `"${visitor.prenom.replace(/"/g, '""')}"` : '""';
            const email = visitor.email ? `"${visitor.email.replace(/"/g, '""')}"` : '""';
            const secteur = visitor.secteur ? `"${visitor.secteur.replace(/"/g, '""')}"` : '""';
            const remarques = visitor.remarques ? `"${visitor.remarques.replace(/"/g, '""')}"` : '""';
            
            const row = [
                visitor.id,
                nom,
                prenom,
                email,
                secteur,
                remarques,
                visitor.ergonomie !== undefined ? visitor.ergonomie : '',
                visitor.simulation !== undefined ? visitor.simulation : '',
                visitor.ressenti !== undefined ? visitor.ressenti : '',
                visitor.timestamp
            ].join(',');
            
            csvContent += row + '\n';
        });
        
        // Créer un lien de téléchargement
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `visiteurs-salon-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        
        // Déclencher le téléchargement
        link.click();
        
        // Nettoyer
        document.body.removeChild(link);
        
        showNotification('Données exportées avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'exportation des données', error);
        showNotification('Erreur lors de l\'exportation des données', 'error');
    }
};

// Mettre à jour le compteur de visiteurs
const refreshVisitorCount = async () => {
    try {
        const visitors = await getAllVisitors();
        document.getElementById('visitor-count').textContent = visitors.length;
    } catch (error) {
        console.error('Erreur lors de la mise à jour du compteur de visiteurs', error);
    }
};

// Gestionnaires d'événements pour les sliders de notation
const setupRatingSliders = () => {
    const sliders = ['ergonomie', 'simulation', 'ressenti'];
    
    sliders.forEach(slider => {
        const input = document.getElementById(slider);
        const value = document.getElementById(`${slider}-value`);
        
        input.addEventListener('input', () => {
            value.textContent = input.value;
        });
    });
};

// Initialiser l'application
document.addEventListener('DOMContentLoaded', async () => {
    // Initialiser la base de données
    try {
        await initDB();
        
        // Définir l'année courante dans le pied de page
        document.getElementById('current-year').textContent = new Date().getFullYear();
        
        // Initialiser le compteur de visiteurs
        refreshVisitorCount();
        
        // Configurer les sliders de notation
        setupRatingSliders();
        
        // Gestionnaire pour les onglets
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                switchTab(tabId);
            });
        });
        
        // Gestionnaire pour le formulaire d'enregistrement
        document.getElementById('registration-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const visitor = {
                nom: document.getElementById('nom').value.trim(),
                prenom: document.getElementById('prenom').value.trim(),
                email: document.getElementById('email').value.trim(),
                secteur: document.getElementById('secteur').value
            };
            
            try {
                await addVisitor(visitor);
                document.getElementById('registration-form').reset();
                showNotification('Visiteur enregistré avec succès');
                refreshVisitorCount();
            } catch (error) {
                showNotification(error, 'error');
            }
        });
        
        // Gestionnaire pour le formulaire d'avis
        document.getElementById('feedback-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const visitorId = Number(document.getElementById('visitor-select').value);
            
            if (!visitorId) {
                showNotification('Veuillez sélectionner un visiteur', 'error');
                return;
            }
            
            try {
                const visitor = await getVisitorById(visitorId);
                
                if (!visitor) {
                    showNotification('Visiteur introuvable', 'error');
                    return;
                }
                
                // Mettre à jour les données du visiteur avec l'avis
                visitor.remarques = document.getElementById('remarques').value.trim();
                visitor.ergonomie = Number(document.getElementById('ergonomie').value);
                visitor.simulation = Number(document.getElementById('simulation').value);
                visitor.ressenti = Number(document.getElementById('ressenti').value);
                
                await updateVisitor(visitor);
                
                document.getElementById('feedback-form').reset();
                document.getElementById('visitor-select').value = '';
                document.getElementById('ergonomie-value').textContent = '3';
                document.getElementById('simulation-value').textContent = '3';
                document.getElementById('ressenti-value').textContent = '3';
                
                showNotification('Avis enregistré avec succès');
            } catch (error) {
                showNotification(`Erreur: ${error}`, 'error');
            }
        });
        
        // Gestionnaire pour le bouton d'exportation
        document.getElementById('export-button').addEventListener('click', exportToCSV);
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'application', error);
        showNotification(`Erreur lors de l'initialisation: ${error}`, 'error');
    }
});