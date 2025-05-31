// js/data/GameConfig.js - Configuration générale du jeu

const GameConfig = {
    // Version du jeu
    version: '1.0.0',
    
    // Limites du jeu
    limits: {
        maxCitizens: 500,
        maxBuildings: 200,
        maxVehicles: 50,
        maxParticles: 300
    },
    
    // Configuration de la simulation
    simulation: {
        targetFPS: 60,
        tickRate: 60,
        autosaveInterval: 300000, // 5 minutes
        citizenSpawnRate: 0.003,
        resourceDecayRate: 1.0
    },
    
    // Configuration de l'affichage
    graphics: {
        defaultCanvasWidth: 1200,
        defaultCanvasHeight: 800,
        minZoom: 0.5,
        maxZoom: 3.0,
        gridSize: 20
    },
    
    // Configuration des ressources
    resources: {
        startingResources: {
            food: 10,
            wood: 5,
            stone: 3,
            water: 8,
            research: 0
        },
        
        initialCapacity: {
            food: 1000,
            wood: 1000,
            stone: 1000,
            water: 1000,
            research: 1000
        }
    },
    
    // Configuration des citoyens
    citizens: {
        maxAge: 80,
        baseSpeed: 0.8,
        workEfficiency: 0.5,
        needsDecayRate: {
            hunger: 0.02,
            thirst: 0.03,
            sleep: 0.015,
            social: 0.01,
            safety: 0.005,
            comfort: 0.008
        }
    },
    
    // Configuration du pathfinding
    pathfinding: {
        gridSize: 20,
        maxIterations: 1000,
        maxCacheSize: 1000,
        allowDiagonal: true
    },
    
    // Messages et textes
    messages: {
        welcome: 'Bienvenue dans SupCity1 ! Placez un feu de camp pour commencer.',
        citizenDied: 'Un citoyen est décédé',
        buildingPlaced: 'Bâtiment construit avec succès',
        researchComplete: 'Recherche terminée',
        ageAdvanced: 'Vous avez progressé vers un nouvel âge !'
    },
    
    // Configuration du debug
    debug: {
        enabled: false,
        showGrid: false,
        showPaths: false,
        showRanges: false,
        logEvents: false
    }
};

// Fonction pour charger la configuration depuis localStorage
function loadConfig() {
    const saved = localStorage.getItem('supcity_config');
    if (saved) {
        try {
            const savedConfig = JSON.parse(saved);
            Object.assign(GameConfig, savedConfig);
        } catch (e) {
            console.warn('Configuration sauvegardée corrompue, utilisation des valeurs par défaut');
        }
    }
}

// Fonction pour sauvegarder la configuration
function saveConfig() {
    localStorage.setItem('supcity_config', JSON.stringify(GameConfig));
}

// Charger la configuration au démarrage
loadConfig();

// Export avec ES6
export { GameConfig, loadConfig, saveConfig };