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

// Fonction utilitaire pour formater les heures de vol
const formatFlightHours = (hours) => {
    if (!hours || hours === 0) return '';
    return `${hours}h`;
};

// Fonction utilitaire pour formater la tranche d'âge
const formatAgeRange = (ageRange) => {
    if (!ageRange) return '';
    
    const ageRangeMap = {
        '-20': 'Moins de 20 ans',
        '20-25': '20-25 ans',
        '25-30': '25-30 ans',
        '30-35': '30-35 ans',
        '35-40': '35-40 ans',
        '40-45': '40-45 ans',
        '45-50': '45-50 ans',
        '50-55': '50-55 ans',
        '55-60': '55-60 ans',
        '60+': '60 ans et plus'
    };
    
    return ageRangeMap[ageRange] || ageRange;
};

// Fonction utilitaire pour formater le profil visiteur
const formatProfilVisiteur = (profil) => {
    if (!profil) return '';
    
    // Capitaliser la première lettre de chaque mot
    return profil.replace(/\b\w/g, l => l.toUpperCase());
};

// Exporter Excel avec photos (ZIP)
const exportExcelWithPhotos = async () => {
    try {
        const visitors = await getAllVisitors();
        
        if (visitors.length === 0) {
            showNotification('Aucune donnée à exporter', 'error');
            return;
        }
        
        showNotification('Génération de l\'export en cours...', 'success');
        
        // Créer un nouveau ZIP
        const zip = new JSZip();
        const photosFolder = zip.folder("photos");
        
        // Préparer les données pour l'exportation Excel
        const exportData = visitors.map(visitor => {
            const photoFilename = visitor.photo ? `${visitor.visitorId}.jpg` : '';
            
            // Si le visiteur a une photo, l'ajouter au ZIP
            if (visitor.photo) {
                try {
                    const photoBlob = base64ToBlob(visitor.photo, 'image/jpeg');
                    photosFolder.file(photoFilename, photoBlob);
                } catch (error) {
                    console.warn(`Erreur lors de l'ajout de la photo pour ${visitor.visitorId}:`, error);
                }
            }
            
            return {
                ID: visitor.visitorId,
                Nom: visitor.nom,
                Prénom: visitor.prenom,
                Email: visitor.email,
                Entreprise: visitor.entreprise || '',
                Pays: visitor.pays || '',
                'Tranche d\'âge': formatAgeRange(visitor.ageRange),
                'Profil visiteur': formatProfilVisiteur(visitor.profilVisiteur),
                'Secteur/Métier': visitor.secteur || '',
                'Type d\'avion': visitor.aircraftType || '',
                'Heures de vol': visitor.flightHours || '',
                'Remarques': visitor.remarques || '',
                'Ergonomie (0-5)': visitor.ergonomie !== undefined ? visitor.ergonomie : '',
                'Simulation (0-5)': visitor.simulation !== undefined ? visitor.simulation : '',
                'Ressenti (0-5)': visitor.ressenti !== undefined ? visitor.ressenti : '',
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
            { wch: 25 }, // Entreprise
            { wch: 15 }, // Pays
            { wch: 15 }, // Tranche d'âge
            { wch: 20 }, // Profil visiteur
            { wch: 25 }, // Secteur
            { wch: 20 }, // Type d'avion
            { wch: 12 }, // Heures de vol
            { wch: 50 }, // Remarques
            { wch: 12 }, // Ergonomie
            { wch: 12 }, // Simulation
            { wch: 12 }, // Ressenti
            { wch: 25 }, // Date d'enregistrement
            { wch: 25 }, // Dernière mise à jour
            { wch: 30 }  // Photo
        ];
        ws['!cols'] = columnWidths;
        
        // Ajouter des styles pour les en-têtes
        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "003366" } },
            alignment: { horizontal: "center" }
        };
        
        // Appliquer le style aux en-têtes (première ligne)
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!ws[cellAddress]) continue;
            ws[cellAddress].s = headerStyle;
        }
        
        // Ajouter la feuille au workbook
        XLSX.utils.book_append_sheet(wb, ws, "Visiteurs ARESIA");
        
        // Créer une feuille de statistiques
        const stats = await getVisitorStats();
        const statsData = [
            { 'Statistique': 'Nombre total de visiteurs', 'Valeur': stats.total },
            { 'Statistique': 'Visiteurs avec photo', 'Valeur': stats.withPhotos },
            { 'Statistique': 'Visiteurs avec évaluations', 'Valeur': stats.withRatings },
            { 'Statistique': 'Nombre de pilotes', 'Valeur': stats.pilots },
            { 'Statistique': '', 'Valeur': '' }, // Ligne vide
            { 'Statistique': 'Moyenne Ergonomie', 'Valeur': stats.avgRatings.ergonomie },
            { 'Statistique': 'Moyenne Simulation', 'Valeur': stats.avgRatings.simulation },
            { 'Statistique': 'Moyenne Ressenti', 'Valeur': stats.avgRatings.ressenti },
            { 'Statistique': '', 'Valeur': '' }, // Ligne vide
        ];
        
        // Ajouter les statistiques par tranche d'âge
        Object.entries(stats.ageRanges).forEach(([ageRange, count]) => {
            statsData.push({ 
                'Statistique': `Âge: ${formatAgeRange(ageRange)}`, 
                'Valeur': count 
            });
        });
        
        statsData.push({ 'Statistique': '', 'Valeur': '' }); // Ligne vide
        
        // Ajouter les statistiques par profil visiteur
        Object.entries(stats.profilsVisiteurs).forEach(([profil, count]) => {
            statsData.push({ 
                'Statistique': `Profil: ${formatProfilVisiteur(profil)}`, 
                'Valeur': count 
            });
        });
        
        statsData.push({ 'Statistique': '', 'Valeur': '' }); // Ligne vide
        
        // Ajouter les statistiques par secteur
        Object.entries(stats.sectors).forEach(([sector, count]) => {
            statsData.push({ 
                'Statistique': `Secteur: ${sector}`, 
                'Valeur': count 
            });
        });
        
        statsData.push({ 'Statistique': '', 'Valeur': '' }); // Ligne vide
        
        // Ajouter les statistiques par entreprise (top 10)
        const topEntreprises = Object.entries(stats.entreprises)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        if (topEntreprises.length > 0) {
            topEntreprises.forEach(([entreprise, count]) => {
                statsData.push({ 
                    'Statistique': `Entreprise: ${entreprise}`, 
                    'Valeur': count 
                });
            });
            statsData.push({ 'Statistique': '', 'Valeur': '' }); // Ligne vide
        }
        
        // Ajouter les statistiques par pays (top 10)
        const topPays = Object.entries(stats.pays)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        if (topPays.length > 0) {
            topPays.forEach(([pays, count]) => {
                statsData.push({ 
                    'Statistique': `Pays: ${pays}`, 
                    'Valeur': count 
                });
            });
        }
        
        const statsWs = XLSX.utils.json_to_sheet(statsData);
        statsWs['!cols'] = [{ wch: 30 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, statsWs, "Statistiques");
        
        // Générer le fichier Excel en buffer
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        
        // Ajouter le fichier Excel au ZIP
        zip.file("visiteurs-aresia.xlsx", excelBuffer);
        
        // Ajouter un fichier README
        const readmeContent = `ARESIA - Export des visiteurs
=====================================

Date d'export: ${new Date().toLocaleString()}
Nombre de visiteurs: ${visitors.length}

Contenu de l'archive:
- visiteurs-aresia.xlsx : Données complètes avec statistiques
- photos/ : Photos des visiteurs (format JPEG)

Les photos sont nommées selon l'ID du visiteur.
Le fichier Excel contient deux feuilles:
1. "Visiteurs ARESIA" : Toutes les données des visiteurs
2. "Statistiques" : Résumé statistique des données

Nouveaux champs ajoutés:
- Entreprise : Organisation du visiteur
- Pays : Pays de résidence
- Profil visiteur : Décideur/Opérationnel + Militaire/Industriel

Pour toute question, contactez l'équipe ARESIA.`;
        
        zip.file("README.txt", readmeContent);
        
        // Générer le fichier ZIP
        const zipBlob = await zip.generateAsync({ 
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 6 }
        });
        
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
        
        showNotification('Génération de l\'export HTML en cours...', 'success');
        
        // Créer le contenu HTML
        let htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visiteurs ARESIA - ${new Date().toISOString().slice(0, 10)}</title>
    <style>
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 20px; 
            background-color: #f5f7fa;
            line-height: 1.6;
        }
        
        .header {
            background: linear-gradient(135deg, #003366 0%, #0066cc 100%);
            color: white;
            padding: 2rem;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 2rem;
            box-shadow: 0 4px 20px rgba(0, 51, 102, 0.2);
        }
        
        .header h1 { 
            margin: 0;
            font-size: 2.5rem;
            font-weight: 300;
        }
        
        .header .subtitle {
            margin-top: 0.5rem;
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background: white;
            border-radius: 10px;
            padding: 1.5rem;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0, 51, 102, 0.1);
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #003366;
            margin-bottom: 0.5rem;
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9rem;
        }
        
        .visitor-card { 
            background: white;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0, 51, 102, 0.1);
            margin-bottom: 2rem;
            padding: 2rem;
            display: grid;
            grid-template-columns: 180px 1fr;
            gap: 2rem;
            transition: transform 0.2s ease;
        }
        
        .visitor-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(0, 51, 102, 0.15);
        }
        
        .visitor-photo { 
            width: 180px;
            height: 180px;
            object-fit: cover;
            border-radius: 12px;
            border: 3px solid #e3e8ee;
        }
        
        .visitor-info { 
            display: grid;
            gap: 1rem;
        }
        
        .visitor-id { 
            font-size: 0.85rem;
            color: #666;
            background: #f0f2f5;
            padding: 0.3rem 0.8rem;
            border-radius: 15px;
            display: inline-block;
            width: fit-content;
        }
        
        .visitor-name { 
            font-size: 1.8rem;
            color: #003366;
            font-weight: bold;
            margin: 0.5rem 0;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }
        
        .info-item {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            border-left: 4px solid #0066cc;
        }
        
        .info-label { 
            font-weight: bold;
            color: #003366;
            font-size: 0.9rem;
            margin-bottom: 0.3rem;
        }
        
        .info-value {
            color: #333;
        }
        
        .profil-badge {
            display: inline-block;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-weight: bold;
            margin-top: 0.5rem;
            font-size: 0.9rem;
        }
        
        .profil-militaire { background-color: rgba(0, 153, 102, 0.1); color: #009966; }
        .profil-industriel { background-color: rgba(255, 152, 0, 0.1); color: #ff9800; }
        .profil-decideur { border: 2px solid currentColor; }
        
        .ratings { 
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
            flex-wrap: wrap;
        }
        
        .rating-badge { 
            padding: 0.8rem 1.2rem;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .badge-blue { background-color: rgba(0, 102, 204, 0.1); color: #0066cc; }
        .badge-green { background-color: rgba(0, 153, 102, 0.1); color: #009966; }
        .badge-purple { background-color: rgba(102, 0, 204, 0.1); color: #6600cc; }
        .badge-orange { background-color: rgba(255, 152, 0, 0.1); color: #ff9800; }
        
        .remarks { 
            background-color: #f8f9fa;
            padding: 1.5rem;
            border-radius: 10px;
            margin-top: 1rem;
            border-left: 4px solid #28a745;
        }
        
        .remarks-title {
            font-weight: bold;
            color: #003366;
            margin-bottom: 0.5rem;
        }
        
        .no-photo { 
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f0f2f5 0%, #e3e8ee 100%);
            color: #666;
            font-size: 1.2rem;
            border-radius: 12px;
        }
        
        .pilot-info {
            background: linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 193, 7, 0.1) 100%);
            border: 2px solid rgba(255, 152, 0, 0.3);
            border-radius: 10px;
            padding: 1rem;
            margin-top: 1rem;
        }
        
        .pilot-title {
            color: #ff9800;
            font-weight: bold;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .footer {
            background-color: #003366;
            color: white;
            padding: 2rem;
            border-radius: 10px;
            text-align: center;
            margin-top: 3rem;
        }
        
        @media (max-width: 768px) {
            .visitor-card {
                grid-template-columns: 1fr;
                text-align: center;
            }
            
            .visitor-photo {
                width: 150px;
                height: 150px;
                margin: 0 auto;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .ratings {
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Visiteurs ARESIA</h1>
        <div class="subtitle">Salon d'exposition - ${new Date().toLocaleDateString()}</div>
    </div>
`;

        // Ajouter les statistiques
        const stats = await getVisitorStats();
        htmlContent += `
    <div class="stats">
        <div class="stat-card">
            <div class="stat-number">${stats.total}</div>
            <div class="stat-label">Visiteurs total</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.withPhotos}</div>
            <div class="stat-label">Avec photo</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.withRatings}</div>
            <div class="stat-label">Avec évaluations</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.pilots}</div>
            <div class="stat-label">Pilotes</div>
        </div>
    </div>
`;

        visitors.forEach(visitor => {
            const isPilot = visitor.secteur && visitor.secteur.toLowerCase() === 'pilote';
            
            // Déterminer les classes CSS pour le profil
            let profilClasses = 'profil-badge ';
            if (visitor.profilVisiteur) {
                if (visitor.profilVisiteur.includes('militaire')) {
                    profilClasses += 'profil-militaire ';
                } else if (visitor.profilVisiteur.includes('industriel')) {
                    profilClasses += 'profil-industriel ';
                }
                
                if (visitor.profilVisiteur.includes('décideur')) {
                    profilClasses += 'profil-decideur ';
                }
            }
            
            htmlContent += `
    <div class="visitor-card">
        ${visitor.photo 
            ? `<img src="${visitor.photo}" alt="Photo de ${visitor.nom} ${visitor.prenom}" class="visitor-photo">`
            : `<div class="visitor-photo no-photo">📷<br>Pas de photo</div>`
        }
        <div class="visitor-info">
            <div class="visitor-id">ID: ${visitor.visitorId}</div>
            <div class="visitor-name">${visitor.nom} ${visitor.prenom}</div>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">📧 Email</div>
                    <div class="info-value">${visitor.email}</div>
                </div>
                ${visitor.entreprise ? `
                <div class="info-item">
                    <div class="info-label">🏢 Entreprise</div>
                    <div class="info-value">${visitor.entreprise}</div>
                </div>
                ` : ''}
                ${visitor.pays ? `
                <div class="info-item">
                    <div class="info-label">🌍 Pays</div>
                    <div class="info-value">${visitor.pays}</div>
                </div>
                ` : ''}
                <div class="info-item">
                    <div class="info-label">🎂 Âge</div>
                    <div class="info-value">${formatAgeRange(visitor.ageRange) || 'Non spécifié'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">💼 Secteur</div>
                    <div class="info-value">${visitor.secteur || 'Non spécifié'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📅 Enregistrement</div>
                    <div class="info-value">${new Date(visitor.timestamp).toLocaleString()}</div>
                </div>
            </div>
            
            ${visitor.profilVisiteur ? `
            <div>
                <div class="info-label">👤 Profil visiteur</div>
                <span class="${profilClasses}">${formatProfilVisiteur(visitor.profilVisiteur)}</span>
            </div>
            ` : ''}
            
            ${isPilot && (visitor.aircraftType || visitor.flightHours) ? `
            <div class="pilot-info">
                <div class="pilot-title">✈️ Informations Pilote</div>
                ${visitor.aircraftType ? `<div><strong>Type d'avion:</strong> ${visitor.aircraftType}</div>` : ''}
                ${visitor.flightHours ? `<div><strong>Heures de vol:</strong> ${formatFlightHours(visitor.flightHours)}</div>` : ''}
            </div>
            ` : ''}
            
            ${visitor.updated ? `
            <div class="info-item">
                <div class="info-label">🔄 Dernière mise à jour</div>
                <div class="info-value">${new Date(visitor.updated).toLocaleString()}</div>
            </div>
            ` : ''}
            
            ${(visitor.ergonomie !== undefined || visitor.simulation !== undefined || visitor.ressenti !== undefined) ? `
            <div class="ratings">
                ${visitor.ergonomie !== undefined ? `<span class="rating-badge badge-blue">🎛️ Ergonomie: ${visitor.ergonomie}/5</span>` : ''}
                ${visitor.simulation !== undefined ? `<span class="rating-badge badge-green">🎮 Simulation: ${visitor.simulation}/5</span>` : ''}
                ${visitor.ressenti !== undefined ? `<span class="rating-badge badge-purple">❤️ Ressenti: ${visitor.ressenti}/5</span>` : ''}
            </div>
            ` : ''}
            
            ${visitor.remarques ? `
            <div class="remarks">
                <div class="remarks-title">💬 Remarques et commentaires:</div>
                <div>${visitor.remarques.replace(/\n/g, '<br>')}</div>
            </div>
            ` : ''}
        </div>
    </div>
`;
        });

        htmlContent += `
    <div class="footer">
        <h3>ARESIA - Virtual Air Combat Engagement Simulator</h3>
        <p>Export généré le ${new Date().toLocaleString()}</p>
        <p>Bolder together © ${new Date().getFullYear()}</p>
    </div>
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
        
        showNotification('Export HTML avec photos généré avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'exportation avec photos', error);
        showNotification('Erreur lors de l\'exportation avec photos', 'error');
    }
};

// Exporter uniquement les données (CSV simple)
const exportCSV = async () => {
    try {
        const visitors = await getAllVisitors();
        
        if (visitors.length === 0) {
            showNotification('Aucune donnée à exporter', 'error');
            return;
        }
        
        // Préparer les données CSV
        const csvData = visitors.map(visitor => ({
            ID: visitor.visitorId,
            Nom: visitor.nom,
            Prénom: visitor.prenom,
            Email: visitor.email,
            Entreprise: visitor.entreprise || '',
            Pays: visitor.pays || '',
            'Tranche d\'âge': formatAgeRange(visitor.ageRange),
            'Profil visiteur': formatProfilVisiteur(visitor.profilVisiteur),
            'Secteur/Métier': visitor.secteur || '',
            'Type d\'avion': visitor.aircraftType || '',
            'Heures de vol': visitor.flightHours || '',
            'Remarques': visitor.remarques || '',
            'Ergonomie': visitor.ergonomie !== undefined ? visitor.ergonomie : '',
            'Simulation': visitor.simulation !== undefined ? visitor.simulation : '',
            'Ressenti': visitor.ressenti !== undefined ? visitor.ressenti : '',
            'Date d\'enregistrement': visitor.timestamp,
            'Dernière mise à jour': visitor.updated || ''
        }));
        
        // Convertir en CSV
        const headers = Object.keys(csvData[0]);
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => 
                headers.map(header => {
                    const value = row[header];
                    // Échapper les guillemets et entourer de guillemets si nécessaire
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');
        
        // Créer le blob avec BOM pour Excel
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `visiteurs-aresia-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showNotification('Export CSV généré avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'exportation CSV', error);
        showNotification('Erreur lors de l\'exportation CSV', 'error');
    }
};