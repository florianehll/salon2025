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