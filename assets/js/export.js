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