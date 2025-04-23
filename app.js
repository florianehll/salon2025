// Configuration de l'application
const DB_NAME = 'AresiaVisitorsDB';
const DB_VERSION = 2;
const VISITORS_STORE = 'visitors';

// Initialisation de la base de données IndexedDB
let db;

// Génération d'ID unique
const generateUniqueId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 6);
    return `ARESIA-${timestamp}-${randomStr}`.toUpperCase();
};

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

// Gestion de la photo
let currentPhotoData = null;
let editPhotoData = null;

const setupPhotoUpload = () => {
    const uploadButton = document.getElementById('upload-photo');
    const photoInput = document.getElementById('photo-input');
    const photoPreview = document.getElementById('photo-preview');

    // Upload photo depuis fichier
    uploadButton.addEventListener('click', () => {
        photoInput.click();
    });

    photoInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                currentPhotoData = e.target.result;
                updatePhotoPreview(currentPhotoData, 'photo-preview');
            };
            reader.readAsDataURL(file);
        }
    });

    // Configuration pour le modal d'édition
    const editUploadButton = document.getElementById('edit-upload-photo');
    const editPhotoInput = document.getElementById('edit-photo-input');

    editUploadButton.addEventListener('click', () => {
        editPhotoInput.click();
    });

    editPhotoInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                editPhotoData = e.target.result;
                updatePhotoPreview(editPhotoData, 'edit-photo-preview');
            };
            reader.readAsDataURL(file);
        }
    });
};

const updatePhotoPreview = (photoData, previewId) => {
    const photoPreview = document.getElementById(previewId);
    if (photoData) {
        photoPreview.innerHTML = `<img src="${photoData}" alt="Photo visiteur">`;
    } else {
        photoPreview.innerHTML = '<span>📷 Aucune photo</span>';
    }
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

// Gérer l'interface utilisateur
let activeTab = 'registration';

// Afficher la notification
const showNotification = (message, type = 'success') => {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification notification-${type}`;
    notification.style.display = 'flex';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
};

// Changer d'onglet
const switchTab = tabId => {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    document.getElementById(`${tabId}-tab`).style.display = 'block';
    
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
    
    activeTab = tabId;
    
    if (tabId === 'data') {
        refreshDataTable();
    } else if (tabId === 'feedback') {
        refreshVisitorSelect();
    }
};

// Rafraîchir la liste déroulante des visiteurs avec le dernier enregistré en premier
const refreshVisitorSelect = async () => {
    try {
        const visitors = await getAllVisitors();
        const select = document.getElementById('visitor-select');
        
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Trier les visiteurs par date décroissante (plus récent en premier)
        visitors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        visitors.forEach(visitor => {
            const option = document.createElement('option');
            option.value = visitor.visitorId;
            option.textContent = `${visitor.visitorId} - ${visitor.nom} ${visitor.prenom} (${visitor.email})`;
            select.appendChild(option);
        });
    } catch (error) {
        showNotification('Erreur lors du chargement des visiteurs', 'error');
    }
};

// Rafraîchir le tableau de données
const refreshDataTable = async () => {
    try {
        const visitors = await getAllVisitors();
        const tableBody = document.getElementById('visitors-table-body');
        const emptyState = document.getElementById('empty-state');
        const exportExcelPhotosButton = document.getElementById('export-excel-photos-button');
        const exportPhotosButton = document.getElementById('export-photos-button');
        const visitorCount = document.getElementById('visitor-count');
        
        visitorCount.textContent = visitors.length;
        exportExcelPhotosButton.disabled = visitors.length === 0;
        exportPhotosButton.disabled = visitors.length === 0;
        
        tableBody.innerHTML = '';
        
        if (visitors.length === 0) {
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        visitors.forEach(visitor => {
            const row = document.createElement('tr');
            
            // ID
            const idCell = document.createElement('td');
            idCell.textContent = visitor.visitorId;
            row.appendChild(idCell);
            
            // Photo
            const photoCell = document.createElement('td');
            if (visitor.photo) {
                const img = document.createElement('img');
                img.src = visitor.photo;
                img.alt = 'Photo visiteur';
                img.className = 'visitor-photo';
                photoCell.appendChild(img);
            } else {
                photoCell.textContent = 'Pas de photo';
            }
            row.appendChild(photoCell);
            
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
            
            // Actions
            const actionsCell = document.createElement('td');
            const editButton = document.createElement('button');
            editButton.className = 'edit-button';
            editButton.innerHTML = '<span>✏️</span> Modifier';
            editButton.addEventListener('click', () => openEditModal(visitor));
            actionsCell.appendChild(editButton);
            row.appendChild(actionsCell);
            
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Erreur lors du rafraîchissement du tableau de données', error);
        showNotification('Erreur lors du chargement des données', 'error');
    }
};

// Gestion du modal d'édition
const openEditModal = async (visitor) => {
    const modal = document.getElementById('edit-modal');
    const form = document.getElementById('edit-form');
    
    // Remplir le formulaire avec les données actuelles
    document.getElementById('edit-visitor-id').value = visitor.visitorId;
    document.getElementById('edit-nom').value = visitor.nom;
    document.getElementById('edit-prenom').value = visitor.prenom;
    document.getElementById('edit-email').value = visitor.email;
    document.getElementById('edit-secteur').value = visitor.secteur || '';
    
    // Afficher la photo actuelle
    editPhotoData = visitor.photo;
    updatePhotoPreview(editPhotoData, 'edit-photo-preview');
    
    modal.style.display = 'flex';
};

const closeEditModal = () => {
    const modal = document.getElementById('edit-modal');
    modal.style.display = 'none';
    editPhotoData = null;
    document.getElementById('edit-form').reset();
};

// Convertir une base64 en blob
const base64ToBlob = (base64, contentType = '') => {
    const base64WithoutHeader = base64.split(',')[1];
    const byteCharacters = atob(base64WithoutHeader);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
};

// Exporter Excel avec photos (ZIP)
const exportExcelWithPhotos = async () => {
    try {
        const visitors = await getAllVisitors();
        
        if (visitors.length === 0) {
            showNotification('Aucune donnée à exporter', 'error');
            return;
        }
        
        // Créer un nouveau ZIP
        const zip = new JSZip();
        const photosFolder = zip.folder("photos");
        
        // Préparer les données pour l'exportation Excel
        const exportData = visitors.map(visitor => {
            const photoFilename = visitor.photo ? `${visitor.visitorId}.jpg` : '';
            
            // Si le visiteur a une photo, l'ajouter au ZIP
            if (visitor.photo) {
                const photoBlob = base64ToBlob(visitor.photo, 'image/jpeg');
                photosFolder.file(photoFilename, photoBlob);
            }
            
            return {
                ID: visitor.visitorId,
                Nom: visitor.nom,
                Prénom: visitor.prenom,
                Email: visitor.email,
                'Secteur/Métier': visitor.secteur || '',
                'Remarques': visitor.remarques || '',
                'Ergonomie (0-5)': visitor.ergonomie || '',
                'Simulation (0-5)': visitor.simulation || '',
                'Ressenti (0-5)': visitor.ressenti || '',
                'Date d\'enregistrement': visitor.timestamp,
                'Dernière mise à jour': visitor.updated || '',
                'Photo': photoFilename ? `./photos/${photoFilename}` : 'Non disponible'
            };
        });
        
        // Créer le fichier Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Ajuster la largeur des colonnes
        const columnWidths = [
            { wch: 20 }, // ID
            { wch: 15 }, // Nom
            { wch: 15 }, // Prénom
            { wch: 30 }, // Email
            { wch: 25 }, // Secteur
            { wch: 50 }, // Remarques
            { wch: 15 }, // Ergonomie
            { wch: 15 }, // Simulation
            { wch: 15 }, // Ressenti
            { wch: 25 }, // Date d'enregistrement
            { wch: 25 }, // Dernière mise à jour
            { wch: 30 }  // Photo
        ];
        ws['!cols'] = columnWidths;
        
        // Ajouter la feuille au workbook
        XLSX.utils.book_append_sheet(wb, ws, "Visiteurs");
        
        // Générer le fichier Excel en buffer
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        
        // Ajouter le fichier Excel au ZIP
        zip.file("visiteurs-aresia.xlsx", excelBuffer);
        
        // Générer le fichier ZIP
        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        // Créer un lien de téléchargement pour le ZIP
        const url = window.URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `visiteurs-aresia-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showNotification('Export Excel + photos généré avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'exportation Excel + photos', error);
        showNotification('Erreur lors de l\'exportation Excel + photos', 'error');
    }
};

// Exporter les données avec photos (fichier HTML)
const exportWithPhotos = async () => {
    try {
        const visitors = await getAllVisitors();
        
        if (visitors.length === 0) {
            showNotification('Aucune donnée à exporter', 'error');
            return;
        }
        
        // Créer le contenu HTML
        let htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Visiteurs ARESIA - ${new Date().toISOString().slice(0, 10)}</title>
    <style>
        body { font-family: 'Montserrat', Arial, sans-serif; margin: 20px; background-color: #f5f7fa; }
        h1 { color: #003366; text-align: center; margin-bottom: 30px; }
        .visitor-card { 
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 51, 102, 0.1);
            margin-bottom: 20px;
            padding: 20px;
            display: grid;
            grid-template-columns: 150px 1fr;
            gap: 20px;
        }
        .visitor-photo { 
            width: 150px;
            height: 150px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid #e3e8ee;
        }
        .visitor-info { 
            display: grid;
            gap: 10px;
        }
        .visitor-id { 
            font-size: 0.9em;
            color: #666;
            margin-bottom: 10px;
        }
        .visitor-name { 
            font-size: 1.5em;
            color: #003366;
            font-weight: bold;
        }
        .info-row { 
            display: flex;
            gap: 10px;
        }
        .info-label { 
            font-weight: bold;
            color: #003366;
            min-width: 150px;
        }
        .ratings { 
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        .rating-badge { 
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.9em;
            font-weight: bold;
        }
        .badge-blue { background-color: rgba(0, 102, 204, 0.1); color: #0066cc; }
        .badge-green { background-color: rgba(0, 153, 102, 0.1); color: #009966; }
        .badge-purple { background-color: rgba(102, 0, 204, 0.1); color: #6600cc; }
        .remarks { 
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
        }
        .no-photo { 
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f0f2f5;
            color: #666;
            font-size: 1.2em;
        }
    </style>
</head>
<body>
    <h1>Visiteurs ARESIA - Salon</h1>
`;

        visitors.forEach(visitor => {
            htmlContent += `
    <div class="visitor-card">
        ${visitor.photo 
            ? `<img src="${visitor.photo}" alt="Photo de ${visitor.nom} ${visitor.prenom}" class="visitor-photo">`
            : `<div class="visitor-photo no-photo">📷 Pas de photo</div>`
        }
        <div class="visitor-info">
            <div class="visitor-id">ID: ${visitor.visitorId}</div>
            <div class="visitor-name">${visitor.nom} ${visitor.prenom}</div>
            <div class="info-row">
                <span class="info-label">Email:</span>
                <span>${visitor.email}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Secteur:</span>
                <span>${visitor.secteur || 'Non spécifié'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Date d'enregistrement:</span>
                <span>${new Date(visitor.timestamp).toLocaleString()}</span>
            </div>
            ${visitor.updated ? `
            <div class="info-row">
                <span class="info-label">Dernière mise à jour:</span>
                <span>${new Date(visitor.updated).toLocaleString()}</span>
            </div>
            ` : ''}
            ${(visitor.ergonomie !== undefined || visitor.simulation !== undefined || visitor.ressenti !== undefined) ? `
            <div class="ratings">
                ${visitor.ergonomie !== undefined ? `<span class="rating-badge badge-blue">Ergonomie: ${visitor.ergonomie}/5</span>` : ''}
                ${visitor.simulation !== undefined ? `<span class="rating-badge badge-green">Simulation: ${visitor.simulation}/5</span>` : ''}
                ${visitor.ressenti !== undefined ? `<span class="rating-badge badge-purple">Ressenti: ${visitor.ressenti}/5</span>` : ''}
            </div>
            ` : ''}
            ${visitor.remarques ? `
            <div class="remarks">
                <div class="info-label">Remarques:</div>
                <div>${visitor.remarques}</div>
            </div>
            ` : ''}
        </div>
    </div>
`;
        });

        htmlContent += `
</body>
</html>`;

        // Créer un blob et un lien de téléchargement
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `visiteurs-aresia-photos-${new Date().toISOString().slice(0, 10)}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showNotification('Export avec photos généré avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'exportation avec photos', error);
        showNotification('Erreur lors de l\'exportation avec photos', 'error');
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
    try {
        await initDB();
        
        document.getElementById('current-year').textContent = new Date().getFullYear();
        
        refreshVisitorCount();
        setupRatingSliders();
        setupPhotoUpload();
        
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
                visitorId: generateUniqueId(),
                nom: document.getElementById('nom').value.trim(),
                prenom: document.getElementById('prenom').value.trim(),
                email: document.getElementById('email').value.trim(),
                secteur: document.getElementById('secteur').value.trim(),
                photo: currentPhotoData
            };
            
            try {
                await addVisitor(visitor);
                document.getElementById('registration-form').reset();
                currentPhotoData = null;
                updatePhotoPreview(null, 'photo-preview');
                showNotification('Visiteur enregistré avec succès');
                refreshVisitorCount();
            } catch (error) {
                showNotification(error, 'error');
            }
        });
        
        // Gestionnaire pour le formulaire d'avis
        document.getElementById('feedback-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const visitorId = document.getElementById('visitor-select').value;
            
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
        
        // Gestionnaire pour le bouton d'exportation Excel + photos (ZIP)
        document.getElementById('export-excel-photos-button').addEventListener('click', exportExcelWithPhotos);
        
        // Gestionnaire pour le bouton d'exportation HTML avec photos
        document.getElementById('export-photos-button').addEventListener('click', exportWithPhotos);
        
        // Gestionnaire pour le modal d'édition
        document.getElementById('close-modal').addEventListener('click', closeEditModal);
        
        document.getElementById('edit-modal').addEventListener('click', (event) => {
            if (event.target === document.getElementById('edit-modal')) {
                closeEditModal();
            }
        });
        
        // Gestionnaire pour le formulaire d'édition
        document.getElementById('edit-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const visitorId = document.getElementById('edit-visitor-id').value;
            
            try {
                const visitor = await getVisitorById(visitorId);
                
                if (!visitor) {
                    showNotification('Visiteur introuvable', 'error');
                    return;
                }
                
                visitor.nom = document.getElementById('edit-nom').value.trim();
                visitor.prenom = document.getElementById('edit-prenom').value.trim();
                visitor.email = document.getElementById('edit-email').value.trim();
                visitor.secteur = document.getElementById('edit-secteur').value.trim();
                if (editPhotoData) {
                    visitor.photo = editPhotoData;
                }
                
                await updateVisitor(visitor);
                
                closeEditModal();
                refreshDataTable();
                refreshVisitorSelect();
                showNotification('Visiteur modifié avec succès');
            } catch (error) {
                showNotification(`Erreur: ${error}`, 'error');
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'application', error);
        showNotification(`Erreur lors de l'initialisation: ${error}`, 'error');
    }
});