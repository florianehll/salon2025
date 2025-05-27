// Variables globales pour la gestion des photos
let currentPhotoData = null;
let editPhotoData = null;
let activeTab = 'registration';
let currentStream = null;
let isEditMode = false;

// Gestion de l'interface utilisateur
const setupPhotoUpload = () => {
    const uploadButton = document.getElementById('upload-photo');
    const takePhotoButton = document.getElementById('take-photo');
    const photoInput = document.getElementById('photo-input');

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

    // Prendre une photo avec la caméra
    takePhotoButton.addEventListener('click', () => {
        isEditMode = false;
        openCameraModal();
    });

    // Configuration pour le modal d'édition
    const editUploadButton = document.getElementById('edit-upload-photo');
    const editTakePhotoButton = document.getElementById('edit-take-photo');
    const editPhotoInput = document.getElementById('edit-photo-input');

    editUploadButton.addEventListener('click', () => {
        editPhotoInput.click();
    });

    editTakePhotoButton.addEventListener('click', () => {
        isEditMode = true;
        openCameraModal();
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

    // Configuration de la caméra
    setupCameraModal();
};

// Configuration du modal de caméra
const setupCameraModal = () => {
    const cameraModal = document.getElementById('camera-modal');
    const closeCameraButton = document.getElementById('close-camera-modal');
    const cancelCameraButton = document.getElementById('cancel-camera');
    const captureButton = document.getElementById('capture-photo');
    const video = document.getElementById('video-preview');
    const canvas = document.getElementById('photo-canvas');

    closeCameraButton.addEventListener('click', closeCameraModal);
    cancelCameraButton.addEventListener('click', closeCameraModal);

    captureButton.addEventListener('click', () => {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        
        if (isEditMode) {
            editPhotoData = photoData;
            updatePhotoPreview(editPhotoData, 'edit-photo-preview');
        } else {
            currentPhotoData = photoData;
            updatePhotoPreview(currentPhotoData, 'photo-preview');
        }
        
        closeCameraModal();
    });
};

// Ouvrir le modal de caméra
const openCameraModal = async () => {
    const cameraModal = document.getElementById('camera-modal');
    const video = document.getElementById('video-preview');
    
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user', // Préférer la caméra avant
                width: { ideal: 640 },
                height: { ideal: 480 }
            } 
        });
        
        video.srcObject = currentStream;
        cameraModal.style.display = 'flex';
    } catch (error) {
        console.error('Erreur d\'accès à la caméra:', error);
        showNotification('Impossible d\'accéder à la caméra. Vérifiez les permissions.', 'error');
    }
};

// Fermer le modal de caméra
const closeCameraModal = () => {
    const cameraModal = document.getElementById('camera-modal');
    const video = document.getElementById('video-preview');
    
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    video.srcObject = null;
    cameraModal.style.display = 'none';
};

// Mettre à jour l'aperçu de la photo
const updatePhotoPreview = (photoData, previewId) => {
    const photoPreview = document.getElementById(previewId);
    if (photoData) {
        photoPreview.innerHTML = `<img src="${photoData}" alt="Photo visiteur">`;
    } else {
        photoPreview.innerHTML = '<span>📷 Aucune photo</span>';
    }
};

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

// Gestion des champs spécifiques aux pilotes
const setupPilotFields = () => {
    const secteurInput = document.getElementById('secteur');
    const pilotFields = document.getElementById('pilot-fields');
    
    const editSecteurInput = document.getElementById('edit-secteur');
    const editPilotFields = document.getElementById('edit-pilot-fields');

    // Pour le formulaire d'enregistrement
    secteurInput.addEventListener('input', () => {
        const value = secteurInput.value.toLowerCase().trim();
        if (value === 'pilote') {
            pilotFields.classList.add('show');
        } else {
            pilotFields.classList.remove('show');
        }
    });

    // Pour le formulaire d'édition
    editSecteurInput.addEventListener('input', () => {
        const value = editSecteurInput.value.toLowerCase().trim();
        if (value === 'pilote') {
            editPilotFields.classList.add('show');
        } else {
            editPilotFields.classList.remove('show');
        }
    });
};

// Rafraîchir la liste déroulante des visiteurs
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
        
        // Déterminer si nous sommes sur mobile
        const isMobile = window.innerWidth <= 768;
        
        visitors.forEach(visitor => {
            const row = document.createElement('tr');
            
            // ID - version plus courte sur mobile
            const idCell = document.createElement('td');
            idCell.textContent = isMobile 
                ? visitor.visitorId.substring(visitor.visitorId.lastIndexOf('-') + 1) 
                : visitor.visitorId;
            idCell.title = visitor.visitorId;
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
            if (isMobile && visitor.email.length > 15) {
                emailCell.textContent = visitor.email.substring(0, 12) + '...';
                emailCell.title = visitor.email;
            } else {
                emailCell.textContent = visitor.email;
            }
            row.appendChild(emailCell);
            
            // Tranche d'âge
            const ageCell = document.createElement('td');
            ageCell.textContent = visitor.ageRange || '-';
            row.appendChild(ageCell);
            
            // Secteur
            const sectorCell = document.createElement('td');
            sectorCell.textContent = visitor.secteur || '-';
            row.appendChild(sectorCell);
            
            // Informations pilote
            const pilotInfoCell = document.createElement('td');
            if (visitor.secteur && visitor.secteur.toLowerCase() === 'pilote' && 
                (visitor.aircraftType || visitor.flightHours)) {
                
                if (visitor.aircraftType) {
                    const aircraftBadge = document.createElement('span');
                    aircraftBadge.className = 'badge badge-orange';
                    aircraftBadge.textContent = visitor.aircraftType;
                    pilotInfoCell.appendChild(aircraftBadge);
                }
                
                if (visitor.flightHours) {
                    const hoursBadge = document.createElement('span');
                    hoursBadge.className = 'badge badge-blue';
                    hoursBadge.textContent = `${visitor.flightHours}h`;
                    pilotInfoCell.appendChild(hoursBadge);
                }
            } else {
                pilotInfoCell.textContent = '-';
            }
            row.appendChild(pilotInfoCell);
            
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
            
            // Date - format plus court sur mobile
            const dateCell = document.createElement('td');
            const date = new Date(visitor.timestamp);
            dateCell.textContent = isMobile 
                ? `${date.toLocaleDateString()}`
                : new Date(visitor.timestamp).toLocaleString();
            row.appendChild(dateCell);
            
            // Actions
            const actionsCell = document.createElement('td');
            const editButton = document.createElement('button');
            editButton.className = 'edit-button';
            editButton.innerHTML = isMobile ? '<span>✏️</span>' : '<span>✏️</span> Modifier';
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
    document.getElementById('edit-age-range').value = visitor.ageRange || '';
    document.getElementById('edit-secteur').value = visitor.secteur || '';
    
    // Champs spécifiques aux pilotes
    const editPilotFields = document.getElementById('edit-pilot-fields');
    const editAircraftType = document.getElementById('edit-aircraft-type');
    const editFlightHours = document.getElementById('edit-flight-hours');
    
    if (visitor.secteur && visitor.secteur.toLowerCase() === 'pilote') {
        editPilotFields.classList.add('show');
        editAircraftType.value = visitor.aircraftType || '';
        editFlightHours.value = visitor.flightHours || '';
    } else {
        editPilotFields.classList.remove('show');
        editAircraftType.value = '';
        editFlightHours.value = '';
    }
    
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
    document.getElementById('edit-pilot-fields').classList.remove('show');
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

// Écouteur pour détecter les changements de taille d'écran
window.addEventListener('resize', () => {
    if (activeTab === 'data') {
        refreshDataTable();
    }
});

// Fermer les modals en cliquant à l'extérieur
window.addEventListener('click', (event) => {
    const cameraModal = document.getElementById('camera-modal');
    const editModal = document.getElementById('edit-modal');
    
    if (event.target === cameraModal) {
        closeCameraModal();
    }
    
    if (event.target === editModal) {
        closeEditModal();
    }
});