// Initialiser l'application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        
        document.getElementById('current-year').textContent = new Date().getFullYear();
        
        refreshVisitorCount();
        setupRatingSliders();
        setupPhotoUpload();
        setupPilotFields();
        
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
            
            const secteur = document.getElementById('secteur').value.trim();
            const ageRange = document.getElementById('age-range').value;
            
            // Validation de la tranche d'âge
            if (!ageRange) {
                showNotification('Veuillez sélectionner une tranche d\'âge', 'error');
                return;
            }
            
            const visitor = {
                visitorId: generateUniqueId(),
                nom: document.getElementById('nom').value.trim(),
                prenom: document.getElementById('prenom').value.trim(),
                email: document.getElementById('email').value.trim(),
                ageRange: ageRange,
                secteur: secteur,
                photo: currentPhotoData
            };
            
            // Ajouter les champs spécifiques aux pilotes si applicable
            if (secteur.toLowerCase() === 'pilote') {
                const aircraftType = document.getElementById('aircraft-type').value.trim();
                const flightHours = document.getElementById('flight-hours').value;
                
                if (aircraftType) {
                    visitor.aircraftType = aircraftType;
                }
                
                if (flightHours) {
                    visitor.flightHours = parseInt(flightHours);
                }
            }
            
            try {
                await addVisitor(visitor);
                document.getElementById('registration-form').reset();
                document.getElementById('pilot-fields').classList.remove('show');
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
                
                // Réinitialiser les sliders à leur valeur par défaut
                document.getElementById('ergonomie').value = 3;
                document.getElementById('simulation').value = 3;
                document.getElementById('ressenti').value = 3;
                
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
            const editAgeRange = document.getElementById('edit-age-range').value;
            const editSecteur = document.getElementById('edit-secteur').value.trim();
            
            // Validation de la tranche d'âge
            if (!editAgeRange) {
                showNotification('Veuillez sélectionner une tranche d\'âge', 'error');
                return;
            }
            
            try {
                const visitor = await getVisitorById(visitorId);
                
                if (!visitor) {
                    showNotification('Visiteur introuvable', 'error');
                    return;
                }
                
                visitor.nom = document.getElementById('edit-nom').value.trim();
                visitor.prenom = document.getElementById('edit-prenom').value.trim();
                visitor.email = document.getElementById('edit-email').value.trim();
                visitor.ageRange = editAgeRange;
                visitor.secteur = editSecteur;
                
                if (editPhotoData) {
                    visitor.photo = editPhotoData;
                }
                
                // Gestion des champs spécifiques aux pilotes
                if (editSecteur.toLowerCase() === 'pilote') {
                    const editAircraftType = document.getElementById('edit-aircraft-type').value.trim();
                    const editFlightHours = document.getElementById('edit-flight-hours').value;
                    
                    visitor.aircraftType = editAircraftType || null;
                    visitor.flightHours = editFlightHours ? parseInt(editFlightHours) : null;
                } else {
                    // Supprimer les champs pilote si le secteur n'est plus "pilote"
                    delete visitor.aircraftType;
                    delete visitor.flightHours;
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
        
        // Gestionnaires pour les raccourcis clavier
        document.addEventListener('keydown', (event) => {
            // Échapper pour fermer les modals
            if (event.key === 'Escape') {
                const cameraModal = document.getElementById('camera-modal');
                const editModal = document.getElementById('edit-modal');
                
                if (cameraModal.style.display === 'flex') {
                    closeCameraModal();
                } else if (editModal.style.display === 'flex') {
                    closeEditModal();
                }
            }
            
            // Raccourcis pour changer d'onglets (Ctrl + 1, 2, 3)
            if (event.ctrlKey) {
                switch (event.key) {
                    case '1':
                        event.preventDefault();
                        switchTab('registration');
                        break;
                    case '2':
                        event.preventDefault();
                        switchTab('feedback');
                        break;
                    case '3':
                        event.preventDefault();
                        switchTab('data');
                        break;
                }
            }
        });
        
        // Auto-sauvegarde périodique des données (optionnel, pour sécurité)
        setInterval(async () => {
            try {
                const visitors = await getAllVisitors();
                console.log(`Auto-check: ${visitors.length} visiteurs en base`);
            } catch (error) {
                console.warn('Erreur lors de la vérification automatique:', error);
            }
        }, 60000); // Vérification toutes les minutes
        
        console.log('Application ARESIA initialisée avec succès');
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'application', error);
        showNotification(`Erreur lors de l'initialisation: ${error}`, 'error');
        
        // Tentative de récupération en cas d'erreur d'initialisation
        setTimeout(() => {
            location.reload();
        }, 5000);
    }
});

// Gestionnaire d'erreurs globales
window.addEventListener('error', (event) => {
    console.error('Erreur JavaScript:', event.error);
    showNotification('Une erreur inattendue s\'est produite', 'error');
});

// Gestionnaire pour les erreurs non gérées des promesses
window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesse rejetée non gérée:', event.reason);
    showNotification('Erreur de traitement des données', 'error');
    event.preventDefault();
});

// Fonction utilitaire pour déboguer les données
const debugVisitorData = async () => {
    try {
        const visitors = await getAllVisitors();
        console.log('=== DEBUG VISITOR DATA ===');
        console.log(`Nombre total de visiteurs: ${visitors.length}`);
        
        visitors.forEach((visitor, index) => {
            console.log(`Visiteur ${index + 1}:`, {
                id: visitor.visitorId,
                nom: visitor.nom,
                prenom: visitor.prenom,
                email: visitor.email,
                ageRange: visitor.ageRange,
                secteur: visitor.secteur,
                aircraftType: visitor.aircraftType,
                flightHours: visitor.flightHours,
                hasPhoto: !!visitor.photo,
                hasRatings: !!(visitor.ergonomie !== undefined || visitor.simulation !== undefined || visitor.ressenti !== undefined),
                timestamp: visitor.timestamp
            });
        });
        
        console.log('=== FIN DEBUG ===');
    } catch (error) {
        console.error('Erreur lors du debug:', error);
    }
};

// Fonction pour nettoyer les données (utile pour le développement)
const clearAllData = async () => {
    if (confirm('⚠️ ATTENTION: Cette action supprimera TOUTES les données. Êtes-vous sûr ?')) {
        try {
            const db = await initDB();
            const transaction = db.transaction(['visitors'], 'readwrite');
            const store = transaction.objectStore('visitors');
            await store.clear();
            
            refreshVisitorCount();
            refreshDataTable();
            refreshVisitorSelect();
            
            showNotification('Toutes les données ont été supprimées', 'success');
            console.log('Base de données nettoyée');
        } catch (error) {
            console.error('Erreur lors du nettoyage:', error);
            showNotification('Erreur lors de la suppression des données', 'error');
        }
    }
};

// Fonction pour exporter les données de debug (format JSON)
const exportDebugData = async () => {
    try {
        const visitors = await getAllVisitors();
        const debugData = {
            exportDate: new Date().toISOString(),
            visitorCount: visitors.length,
            visitors: visitors.map(visitor => ({
                ...visitor,
                photoSize: visitor.photo ? visitor.photo.length : 0,
                photo: visitor.photo ? '[PHOTO_DATA]' : null // Masquer les données photo pour le debug
            }))
        };
        
        const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `aresia-debug-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showNotification('Données de debug exportées', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'export debug:', error);
        showNotification('Erreur lors de l\'export debug', 'error');
    }
};

// Exposer les fonctions de debug en mode développement
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugVisitorData = debugVisitorData;
    window.clearAllData = clearAllData;
    window.exportDebugData = exportDebugData;
    console.log('🔧 Mode développement: fonctions de debug disponibles');
    console.log('- debugVisitorData() : Afficher toutes les données');
    console.log('- clearAllData() : Supprimer toutes les données');
    console.log('- exportDebugData() : Exporter les données de debug');
}