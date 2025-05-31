// js/core/SaveSystem.js - Système de sauvegarde simple

// Import des dépendances
import { eventSystem, GameEvents } from './EventSystem.js';
import { GameConfig } from '../systems/GameConfig.js';

class SaveSystem {
    constructor() {
        this.saveSlots = ['manual', 'autosave', 'quicksave'];
        this.maxBackups = 5;
    }

    /**
     * Sauvegarde l'état complet du jeu
     * @param {Game} game - Instance du jeu
     * @param {string} slotName - Nom de l'emplacement
     * @returns {boolean} - Succès de la sauvegarde
     */
    saveGame(game, slotName = 'manual') {
        try {
            const saveData = {
                version: GameConfig.version,
                timestamp: Date.now(),
                gameTime: game.gameTime.save(),
                resources: game.resourceManager.save(),
                citizens: game.citizens.map(c => c.save()),
                buildings: game.buildings.map(b => b.save()),
                research: game.researchSystem.save(),
                stats: game.stats,
                currentAge: game.currentAge
            };

            // Compression simple des données
            const compressed = this.compressData(saveData);
            
            // Sauvegarde dans localStorage
            localStorage.setItem(`supcity_save_${slotName}`, compressed);
            
            // Créer une sauvegarde de backup
            this.createBackup(slotName, compressed);
            
            console.log(`💾 Jeu sauvegardé: ${slotName}`);
            return true;
            
        } catch (error) {
            console.error('❌ Erreur de sauvegarde:', error);
            return false;
        }
    }

    /**
     * Charge l'état du jeu
     * @param {Game} game - Instance du jeu
     * @param {string} slotName - Nom de l'emplacement
     * @returns {boolean} - Succès du chargement
     */
    loadGame(game, slotName = 'manual') {
        try {
            const compressed = localStorage.getItem(`supcity_save_${slotName}`);
            if (!compressed) {
                throw new Error('Aucune sauvegarde trouvée');
            }

            const saveData = this.decompressData(compressed);
            
            // Vérifier la compatibilité
            if (!this.isCompatible(saveData.version)) {
                console.warn('⚠️ Version de sauvegarde différente');
            }

            // Charger les systèmes
            game.gameTime.load(saveData.gameTime);
            game.resourceManager.load(saveData.resources);
            game.researchSystem.load(saveData.research);
            
            // Charger l'état général
            game.stats = { ...game.stats, ...saveData.stats };
            game.currentAge = saveData.currentAge || 'prehistoric';

            // Recréer les entités
            this.loadEntities(game, saveData);

            console.log(`📁 Jeu chargé: ${slotName}`);
            return true;

        } catch (error) {
            console.error('❌ Erreur de chargement:', error);
            return false;
        }
    }

    /**
     * Recrée les entités depuis la sauvegarde
     * @param {Game} game - Instance du jeu
     * @param {Object} saveData - Données sauvegardées
     */
    loadEntities(game, saveData) {
        // Vider les collections actuelles
        game.citizens = [];
        game.buildings = [];

        // Recréer les bâtiments
        saveData.buildings.forEach(buildingData => {
            const building = game.createBuilding(buildingData.type, buildingData.x, buildingData.y);
            building.load(buildingData);
            game.buildings.push(building);
        });

        // Recréer les citoyens
        saveData.citizens.forEach(citizenData => {
            const citizen = new Citizen(citizenData.x, citizenData.y, game);
            citizen.load(citizenData);
            game.citizens.push(citizen);
        });

        // Reconnecter les relations
        this.reconnectRelations(game, saveData);
    }

    /**
     * Reconnecte les relations entre entités
     * @param {Game} game - Instance du jeu
     * @param {Object} saveData - Données sauvegardées
     */
    reconnectRelations(game, saveData) {
        // Simple reconnexion basée sur les IDs
        saveData.buildings.forEach((buildingData, index) => {
            const building = game.buildings[index];
            
            if (buildingData.workers) {
                buildingData.workers.forEach(workerId => {
                    const worker = game.citizens.find(c => c.id === workerId);
                    if (worker) {
                        building.addWorker(worker);
                    }
                });
            }
        });
    }

    /**
     * Compression simple des données
     * @param {Object} data - Données à compresser
     * @returns {string} - Données compressées
     */
    compressData(data) {
        // Pour la simplicité, on utilise juste JSON.stringify
        // Dans un vrai projet, on pourrait utiliser une vraie compression
        return JSON.stringify(data);
    }

    /**
     * Décompression des données
     * @param {string} compressed - Données compressées
     * @returns {Object} - Données décompressées
     */
    decompressData(compressed) {
        return JSON.parse(compressed);
    }

    /**
     * Vérifie la compatibilité de version
     * @param {string} version - Version de la sauvegarde
     * @returns {boolean} - Compatible ou non
     */
    isCompatible(version) {
        // Simple vérification de version
        return version === GameConfig.version;
    }

    /**
     * Crée une sauvegarde de backup
     * @param {string} slotName - Nom de l'emplacement
     * @param {string} data - Données à sauvegarder
     */
    createBackup(slotName, data) {
        try {
            const backupKey = `supcity_backup_${slotName}_${Date.now()}`;
            localStorage.setItem(backupKey, data);
            
            // Nettoyer les vieux backups
            this.cleanupBackups(slotName);
        } catch (error) {
            console.warn('⚠️ Impossible de créer un backup:', error);
        }
    }

    /**
     * Nettoie les anciens backups
     * @param {string} slotName - Nom de l'emplacement
     */
    cleanupBackups(slotName) {
        const prefix = `supcity_backup_${slotName}_`;
        const backups = [];
        
        // Trouver tous les backups pour ce slot
        for (let key in localStorage) {
            if (key.startsWith(prefix)) {
                const timestamp = parseInt(key.replace(prefix, ''));
                backups.push({ key, timestamp });
            }
        }
        
        // Trier par timestamp et supprimer les plus anciens
        backups.sort((a, b) => b.timestamp - a.timestamp);
        
        while (backups.length > this.maxBackups) {
            const oldest = backups.pop();
            localStorage.removeItem(oldest.key);
        }
    }

    /**
     * Obtient la liste des sauvegardes disponibles
     * @returns {Array} - Liste des sauvegardes
     */
    getSaveList() {
        const saves = [];
        
        this.saveSlots.forEach(slot => {
            const data = localStorage.getItem(`supcity_save_${slot}`);
            if (data) {
                try {
                    const saveData = JSON.parse(data);
                    saves.push({
                        slot,
                        timestamp: saveData.timestamp,
                        version: saveData.version,
                        date: new Date(saveData.timestamp).toLocaleString()
                    });
                } catch (error) {
                    console.warn(`Sauvegarde corrompue: ${slot}`);
                }
            }
        });
        
        return saves;
    }

    /**
     * Supprime une sauvegarde
     * @param {string} slotName - Nom de l'emplacement
     * @returns {boolean} - Succès de la suppression
     */
    deleteSave(slotName) {
        try {
            localStorage.removeItem(`supcity_save_${slotName}`);
            console.log(`🗑️ Sauvegarde supprimée: ${slotName}`);
            return true;
        } catch (error) {
            console.error('❌ Erreur de suppression:', error);
            return false;
        }
    }

    /**
     * Exporte une sauvegarde vers un fichier
     * @param {string} slotName - Nom de l'emplacement
     */
    exportSave(slotName) {
        const data = localStorage.getItem(`supcity_save_${slotName}`);
        if (!data) {
            console.error('Aucune sauvegarde à exporter');
            return;
        }

        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `supcity_${slotName}_${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Importe une sauvegarde depuis un fichier
     * @param {File} file - Fichier à importer
     * @param {string} slotName - Nom de l'emplacement de destination
     * @returns {Promise<boolean>} - Succès de l'importation
     */
    async importSave(file, slotName) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    JSON.parse(data); // Validation
                    
                    localStorage.setItem(`supcity_save_${slotName}`, data);
                    console.log(`📥 Sauvegarde importée: ${slotName}`);
                    resolve(true);
                } catch (error) {
                    console.error('❌ Fichier de sauvegarde invalide:', error);
                    reject(false);
                }
            };
            
            reader.onerror = () => {
                console.error('❌ Erreur de lecture du fichier');
                reject(false);
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Nettoie toutes les données de sauvegarde
     */
    clearAllSaves() {
        if (confirm('Êtes-vous sûr de vouloir supprimer toutes les sauvegardes ?')) {
            for (let key in localStorage) {
                if (key.startsWith('supcity_')) {
                    localStorage.removeItem(key);
                }
            }
            console.log('🧹 Toutes les sauvegardes supprimées');
        }
    }
}

// Instance globale
const saveSystem = new SaveSystem();

// Export
export { SaveSystem, saveSystem };