// Variables globales pour la gestion des photos
let currentPhotoData = null;
let editPhotoData = null;
let activeTab = 'registration';

// Gestion de l'interface utilisateur
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