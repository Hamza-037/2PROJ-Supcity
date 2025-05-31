// js/main.js - Point d'entrée principal de SupCity

// Imports des modules
import { EventSystem, GameEvents, eventSystem } from './core/EventSystem.js';
import { GameTime } from './core/GameTime.js';
import { ResourceManager } from './core/ResourceManager.js';
import { SaveSystem } from './core/SaveSystem.js';
import { BuildingDataManager } from './data/BuildingData.js';
import { Building } from './entities/Building.js';
import { Citizen } from './entities/Citizen.js';
import { Vehicle } from './entities/Vehicle.js';
import { PathfindingSystem } from './systems/PathfindingSystem.js';
import { Camera, ParticleSystem, Particle, Renderer } from './systems/ProductionSystem.js';
import { UIManager } from './ui/UIManager.js';
import { NotificationSystem } from './ui/NotificationSystem.js';
import { Game } from './Game.js';
import { AudioManager } from './core/AudioManager.js';
import { MenuManager } from './ui/MenuManager.js';

// Exposition des classes au scope global pour la compatibilité
window.EventSystem = EventSystem;
window.GameEvents = GameEvents;
window.eventSystem = eventSystem;
window.GameTime = GameTime;
window.ResourceManager = ResourceManager;
window.SaveSystem = SaveSystem;
window.BuildingDataManager = BuildingDataManager;
window.Building = Building;
window.Citizen = Citizen;
window.PathfindingSystem = PathfindingSystem;
window.Camera = Camera;
window.ParticleSystem = ParticleSystem;
window.Particle = Particle;
window.Renderer = Renderer;
window.UIManager = UIManager;
window.NotificationSystem = NotificationSystem;
window.Vehicle = Vehicle;
window.Game = Game;

/**
 * Gestionnaire principal de l'application SupCity avec menu intégré
 */
class SupCityApp {
    constructor() {
        this.game = null;
        this.menuManager = null;
        this.isGameRunning = false;
        this.isLoading = false;
        this.loadingProgress = 0;
        this.loadingSteps = [];
        this.currentStep = 0;

        // Éléments DOM
        this.loadingScreen = document.getElementById('loadingScreen');
        this.gameContainer = document.getElementById('gameContainer');
        this.loadingProgressBar = document.querySelector('.loading-progress');

        // Configuration globale
        this.config = {
            version: '1.0.0',
            debug: false
        };

        this.initializeApp();
    }

    /**
     * Initialise l'application avec menu
     */
    async initializeApp() {
        try {
            console.log('🚀 Démarrage de SupCity avec menu...');

            // Vérifier la compatibilité
            await this.checkCompatibility();

            // Initialiser le gestionnaire de menu
            this.menuManager = new MenuManager();

            // Configurer les contrôles du jeu (préparés pour quand le jeu sera lancé)
            this.setupGameControls();

            console.log('✅ SupCity initialisé avec succès');

        } catch (error) {
            console.error('❌ Erreur lors du démarrage:', error);
            this.showError(error);
        }
    }

    /**
     * Démarre le jeu (appelé par MenuManager)
     * @param {string} saveSlot - Slot de sauvegarde à charger
     * @param {Object} gameConfig - Configuration du jeu
     */
    async startGame(saveSlot = null, gameConfig = {}) {
        try {
            console.log('🎮 Démarrage du jeu...');

            // Définir les étapes de chargement
            this.defineLoadingSteps();

            // Charger l'application étape par étape
            await this.loadApplication();

            // Créer l'instance du jeu
            this.game = new Game();

            // Attendre que le jeu soit initialisé
            while (!this.game.isInitialized) {
                await this.delay(50);
            }

            // Appliquer la configuration
            this.applyGameConfig(gameConfig);

            // Charger une sauvegarde si demandé
            if (saveSlot) {
                this.game.loadGame(saveSlot);
            }

            this.isGameRunning = true;

            // Démarrer les mises à jour d'interface
            this.setupUIUpdates();

            // Mettre à jour l'interface immédiatement
            this.updateBuildingsList();

            console.log('✅ Jeu démarré avec succès');

        } catch (error) {
            console.error('❌ Erreur lors du démarrage du jeu:', error);
            throw error;
        }
    }

    /**
     * Applique la configuration de jeu
     * @param {Object} gameConfig - Configuration
     */
    applyGameConfig(gameConfig) {
        if (!this.game || !gameConfig) return;

        // Appliquer les ressources de départ
        if (gameConfig.startingResources) {
            Object.entries(gameConfig.startingResources).forEach(([resource, amount]) => {
                this.game.resourceManager.setResource(resource, amount);
            });
        }

        // Appliquer les modificateurs
        if (gameConfig.productionBonus) {
            this.game.globalProductionModifier = gameConfig.productionBonus;
        }

        if (gameConfig.citizenPatience) {
            this.game.citizenPatienceModifier = gameConfig.citizenPatience;
        }

        console.log('⚙️ Configuration appliquée:', gameConfig);
    }

    /**
     * Définit les étapes de chargement
     */
    defineLoadingSteps() {
        this.loadingSteps = [
            { name: 'Vérification de la compatibilité', duration: 200 },
            { name: 'Chargement des ressources', duration: 500 },
            { name: 'Initialisation des systèmes', duration: 800 },
            { name: 'Configuration de l\'interface', duration: 400 },
            { name: 'Préparation du monde', duration: 300 },
            { name: 'Finalisation', duration: 200 }
        ];
    }

    /**
     * Charge l'application étape par étape
     */
    async loadApplication() {
        for (let i = 0; i < this.loadingSteps.length; i++) {
            const step = this.loadingSteps[i];
            this.currentStep = i;

            console.log(`📋 ${step.name}...`);
            this.updateLoadingStatus(step.name);

            // Exécuter l'étape
            await this.executeLoadingStep(i);

            // Mettre à jour la barre de progression
            const progress = ((i + 1) / this.loadingSteps.length) * 100;
            this.updateLoadingProgress(progress);

            // Attendre pour l'effet visuel
            await this.delay(step.duration);
        }
    }

    /**
     * Exécute une étape de chargement
     * @param {number} stepIndex - Index de l'étape
     */
    async executeLoadingStep(stepIndex) {
        switch (stepIndex) {
            case 0: // Vérification de la compatibilité
                await this.checkCompatibility();
                break;
            case 1: // Chargement des ressources
                await this.loadResources();
                break;
            case 2: // Initialisation des systèmes
                await this.initializeSystems();
                break;
            case 3: // Configuration de l'interface
                await this.setupInterface();
                break;
            case 4: // Préparation du monde
                await this.prepareWorld();
                break;
            case 5: // Finalisation
                await this.finalize();
                break;
        }
    }

    /**
     * Vérifie la compatibilité du navigateur
     */
    async checkCompatibility() {
        const requirements = {
            canvas: !!document.createElement('canvas').getContext,
            localStorage: typeof Storage !== 'undefined',
            webGL: this.checkWebGLSupport(),
            es6: this.checkES6Support()
        };

        const unsupported = Object.entries(requirements)
            .filter(([key, supported]) => !supported)
            .map(([key]) => key);

        if (unsupported.length > 0) {
            throw new Error(`Fonctionnalités non supportées: ${unsupported.join(', ')}`);
        }

        console.log('✅ Navigateur compatible');
    }

    /**
     * Vérifie le support WebGL
     * @returns {boolean}
     */
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }

    /**
     * Vérifie le support ES6
     * @returns {boolean}
     */
    checkES6Support() {
        try {
            new Function('() => {}');
            return typeof Symbol !== 'undefined';
        } catch (e) {
            return false;
        }
    }

    /**
     * Charge les ressources nécessaires
     */
    async loadResources() {
        // Précharger les images si nécessaire
        // Pour l'instant, on utilise des émojis, donc pas de chargement nécessaire

        // Initialiser l'audio si disponible
        if ('AudioContext' in window || 'webkitAudioContext' in window) {
            console.log('🔊 Audio disponible');
        }

        console.log('📦 Ressources chargées');
    }

    /**
     * Initialise les systèmes de base
     */
    async initializeSystems() {
        // Vérifier que tous les systèmes sont disponibles
        const requiredClasses = [
            'EventSystem', 'ResourceManager', 'GameTime',
            'Citizen', 'Building', 'Game'
        ];

        for (const className of requiredClasses) {
            if (typeof window[className] === 'undefined') {
                throw new Error(`Classe manquante: ${className}`);
            }
        }

        console.log('⚙️ Systèmes initialisés');
    }

    /**
     * Configure l'interface utilisateur
     */
    async setupInterface() {
        // Configurer les contrôles de vitesse
        this.setupSpeedControls();

        // Configurer les contrôles principaux
        this.setupMainControls();

        // Configurer les onglets
        this.setupTabs();

        // Configurer les paramètres
        this.setupSettings();

        console.log('🖥️ Interface configurée');
    }

    /**
     * Prépare le monde de jeu (SANS le démarrer automatiquement)
     */
    async prepareWorld() {
        // Ne plus créer automatiquement le jeu ici
        // Le jeu sera créé quand l'utilisateur clique sur "Nouvelle Partie"
        console.log('🌍 Système prêt pour le démarrage');
    }

    /**
     * Finalise l'initialisation
     */
    async finalize() {
        // Configuration finale si nécessaire
        console.log('🎯 Initialisation terminée');
    }

    /**
     * Configure les contrôles du jeu
     */
    setupGameControls() {
        // Ces contrôles ne seront actifs que quand le jeu est lancé
        this.setupSpeedControls();
        this.setupMainControls();
        this.setupTabs();
        this.setupSettings();
    }

    /**
     * Configure les contrôles de vitesse
     */
    setupSpeedControls() {
        document.getElementById('pauseBtn')?.addEventListener('click', () => {
            if (this.game) {
                this.game.setSpeed(0);
                this.updateSpeedButtons(0);
            }
        });

        document.getElementById('speed1Btn')?.addEventListener('click', () => {
            if (this.game) {
                this.game.setSpeed(1);
                this.updateSpeedButtons(1);
            }
        });

        document.getElementById('speed2Btn')?.addEventListener('click', () => {
            if (this.game) {
                this.game.setSpeed(2);
                this.updateSpeedButtons(2);
            }
        });

        document.getElementById('speed4Btn')?.addEventListener('click', () => {
            if (this.game) {
                this.game.setSpeed(4);
                this.updateSpeedButtons(4);
            }
        });
    }

    /**
     * Met à jour l'apparence des boutons de vitesse
     * @param {number} activeSpeed - Vitesse active
     */
    updateSpeedButtons(activeSpeed) {
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const buttonMap = {
            0: 'pauseBtn',
            1: 'speed1Btn',
            2: 'speed2Btn',
            4: 'speed4Btn'
        };

        const activeButton = document.getElementById(buttonMap[activeSpeed]);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    /**
     * Configure les contrôles principaux
     */
    setupMainControls() {
        document.getElementById('saveBtn')?.addEventListener('click', () => {
            if (this.game) {
                this.game.saveGame();
                this.showNotification('Jeu sauvegardé!', 'success');
            }
        });
    
        document.getElementById('loadBtn')?.addEventListener('click', () => {
            if (this.game) {
                if (this.game.loadGame()) {
                    this.showNotification('Jeu chargé!', 'success');
                } else {
                    this.showNotification('Échec du chargement', 'error');
                }
            }
        });
    
        document.getElementById('resetBtn')?.addEventListener('click', () => {
            if (this.game) {
                this.game.resetGame();
            }
        });

        document.getElementById('menuBtn')?.addEventListener('click', () => {
            if (confirm('Retourner au menu principal ? (Pensez à sauvegarder votre partie)')) {
                // Arrêter le jeu proprement
                this.isGameRunning = false;
                if (this.game) {
                    this.game.isRunning = false;
                }
                
                // Masquer le jeu
                this.gameContainer.style.display = 'none';
                
                // Réafficher le menu
                const mainMenu = document.getElementById('mainMenu');
                if (mainMenu) {
                    mainMenu.style.display = 'block';
                    mainMenu.classList.remove('fade-out');
                }
                
                // Masquer loading et autres
                const loadingScreen = document.getElementById('loadingScreen');
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                }
                
                console.log('🏠 Retour au menu principal');
            }
        });

        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.openSettingsModal();
        });

        document.getElementById('helpBtn')?.addEventListener('click', () => {
            this.openHelpModal();
        });

        // UI Toggle pour mobile
        document.getElementById('toggleUI')?.addEventListener('click', () => {
            document.getElementById('gameUI')?.classList.toggle('active');
        });
    }

    /**
     * Configure les onglets
     */
    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Configurer les catégories de construction
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                this.switchBuildingCategory(category);
            });
        });
    }

    /**
     * Change d'onglet
     * @param {string} tabName - Nom de l'onglet
     */
    switchTab(tabName) {
        // Désactiver tous les onglets et contenus
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Activer le nouvel onglet
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(`${tabName}Tab`)?.classList.add('active');

        // Mettre à jour le contenu si nécessaire
        if (tabName === 'construction') {
            this.updateBuildingsList();
        } else if (tabName === 'research') {
            this.updateResearchTree();
        } else if (tabName === 'statistics') {
            this.updateStatistics();
        }
    }

    /**
     * Change de catégorie de bâtiments
     * @param {string} category - Catégorie sélectionnée
     */
    switchBuildingCategory(category) {
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-category="${category}"]`)?.classList.add('active');

        this.updateBuildingsList(category);
    }

    /**
     * Met à jour la liste des bâtiments
     * @param {string} category - Catégorie à afficher
     */
    updateBuildingsList(category = 'basic') {
        const grid = document.getElementById('buildingsGrid');
        if (!grid || !this.game) return;

        const buildings = this.game.buildingDataManager.getBuildingsByCategory(category);
        const unlockedResearch = this.game.researchSystem ? this.game.researchSystem.getUnlockedResearch() : [];
        const availableBuildings = buildings.filter(building =>
            this.game.buildingDataManager.isUnlocked(building, unlockedResearch)
        );

        grid.innerHTML = '';

        availableBuildings.forEach(building => {
            const button = document.createElement('button');
            button.className = 'building-btn';
            button.dataset.building = building.type;

            const canBuild = this.game.buildingDataManager.canBuild(
                building.type,
                this.game.resourceManager.getSummary(),
                unlockedResearch
            );

            if (!canBuild.canBuild) {
                button.disabled = true;
                button.title = canBuild.reason;
            }

            button.innerHTML = `
                <div class="building-info">
                    <div class="building-name">${building.icon} ${building.name}</div>
                    <div class="building-cost">${this.game.buildingDataManager.getFormattedCost(building.type)}</div>
                </div>
            `;

            button.addEventListener('click', () => {
                if (!button.disabled) {
                    this.game.selectBuilding(building.type);
                    document.querySelectorAll('.building-btn').forEach(b => b.classList.remove('active'));
                    button.classList.add('active');
                }
            });

            grid.appendChild(button);
        });
    }

    /**
     * Met à jour l'arbre de recherche
     */
    updateResearchTree() {
        console.log('🔬 Mise à jour de l\'arbre de recherche (à implémenter)');
    }

    /**
     * Met à jour les statistiques
     */
    updateStatistics() {
        if (!this.game) return;

        const stats = this.game.getGameStats();
        const detailedStats = document.getElementById('detailedStats');

        if (detailedStats) {
            detailedStats.innerHTML = `
                <div class="stat-row">
                    <span class="stat-name">Temps de jeu:</span>
                    <span class="stat-data">${this.formatTime(stats.runtime)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-name">Population:</span>
                    <span class="stat-data">${stats.population}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-name">Bâtiments:</span>
                    <span class="stat-data">${stats.buildings}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-name">FPS:</span>
                    <span class="stat-data">${stats.fps}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-name">Âge actuel:</span>
                    <span class="stat-data">${stats.currentAge}</span>
                </div>
            `;

            // Ajouter les stats de pathfinding si disponibles
            if (this.game.pathfindingSystem) {
                const pathStats = this.game.pathfindingSystem.getStatistics();
                detailedStats.innerHTML += `
                    <div class="stat-row">
                        <span class="stat-name">Chemins calculés:</span>
                        <span class="stat-data">${pathStats.pathsCalculated}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-name">Cache pathfinding:</span>
                        <span class="stat-data">${pathStats.cacheSize}</span>
                    </div>
                `;
            }
        }
    }

    /**
     * Configure les paramètres
     */
    setupSettings() {
        // Volume des effets
        const sfxVolume = document.getElementById('sfxVolume');
        if (sfxVolume) {
            sfxVolume.addEventListener('change', (e) => {
                console.log('Volume SFX:', e.target.value);
            });
        }

        // Mode debug
        const debugMode = document.getElementById('debugMode');
        if (debugMode) {
            debugMode.addEventListener('change', (e) => {
                if (this.game) {
                    this.game.config.debugMode = e.target.checked;
                    this.updateDebugDisplay(e.target.checked);
                }
            });
        }

        // Affichage du pathfinding
        const showPathfinding = document.getElementById('showPathfinding');
        if (showPathfinding) {
            showPathfinding.addEventListener('change', (e) => {
                if (this.game) {
                    this.game.config.showPathfinding = e.target.checked;
                    console.log('🗺️ Affichage pathfinding:', e.target.checked);
                }
            });
        }

        // Tests de pathfinding
        document.getElementById('testPathfinding')?.addEventListener('click', () => {
            if (this.game) {
                this.game.testPathfinding();
                this.showNotification('Test de pathfinding lancé', 'info');
            }
        });

        document.getElementById('spawnTestCitizens')?.addEventListener('click', () => {
            if (this.game) {
                this.game.testSpawnCitizens(5);
                this.showNotification('5 citoyens ajoutés', 'info');
            }
        });
    }

    /**
     * Configure les mises à jour d'interface
     */
    setupUIUpdates() {
        // Mettre à jour l'interface toutes les secondes
        setInterval(() => {
            if (this.game && this.game.isRunning && this.isGameRunning) {
                this.updateResourcesDisplay();
                this.updatePopulationDisplay();
                this.updateDebugInfo();
            }
        }, 1000);

        // Mettre à jour les statistiques moins fréquemment
        setInterval(() => {
            if (this.game && this.game.isRunning && this.isGameRunning) {
                this.updateStatistics();
            }
        }, 5000);
    }

    /**
     * Met à jour l'affichage des ressources
     */
    updateResourcesDisplay() {
        if (!this.game) return;

        const resources = this.game.resourceManager.getSummary();

        Object.entries(resources).forEach(([type, data]) => {
            const element = document.getElementById(type);
            const trendElement = document.getElementById(`${type}Trend`);

            if (element) {
                element.textContent = data.amount;
            }

            if (trendElement) {
                const trend = data.trend > 0 ? '+' : '';
                trendElement.textContent = `${trend}${data.trend}/min`;
                trendElement.className = `resource-trend ${data.trend >= 0 ? 'positive' : 'negative'}`;
            }
        });
    }

    /**
     * Met à jour l'affichage de la population
     */
    updatePopulationDisplay() {
        if (!this.game) return;

        const totalPop = this.game.citizens.length;
        const employed = this.game.citizens.filter(c => c.job).length;
        const unemployed = totalPop - employed;
        const avgHappiness = totalPop > 0 ?
            Math.round(this.game.citizens.reduce((sum, c) => sum + c.happiness, 0) / totalPop) : 100;

        document.getElementById('totalPopulation').textContent = totalPop;
        document.getElementById('employedPopulation').textContent = employed;
        document.getElementById('unemployedPopulation').textContent = unemployed;
        document.getElementById('avgHappiness').textContent = `${avgHappiness}%`;

        const happinessFill = document.getElementById('happinessFill');
        if (happinessFill) {
            happinessFill.style.width = `${avgHappiness}%`;
        }
    }

    /**
     * Met à jour les informations de debug
     */
    updateDebugInfo() {
        if (!this.game) return;

        document.getElementById('fps').textContent = this.game.gameTime.fps;
        document.getElementById('citizenCount').textContent = this.game.citizens.length;
        document.getElementById('buildingCount').textContent = this.game.buildings.length;
        document.getElementById('gameTime').textContent = Math.floor(this.game.gameTime.currentTime / 1000);
    }

    /**
     * Met à jour l'affichage du debug
     */
    updateDebugDisplay(enabled) {
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) {
            debugInfo.style.display = enabled ? 'block' : 'none';
        }
    }

    /**
     * Ouvre la modale des paramètres
     */
    openSettingsModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');

        modalBody.innerHTML = `
            <h2>⚙️ Paramètres</h2>
            <p>Configurez votre expérience de jeu :</p>
            
            <h3>Audio</h3>
            <div class="setting-item">
                <label>Volume des effets: <input type="range" id="modalSfxVolume" min="0" max="100" value="50"></label>
            </div>
            
            <h3>Affichage</h3>
            <div class="setting-item">
                <label>Mode debug: <input type="checkbox" id="modalDebugMode"></label>
            </div>
            <div class="setting-item">
                <label>Afficher pathfinding: <input type="checkbox" id="modalShowPathfinding"></label>
            </div>
            
            <h3>Jeu</h3>
            <div class="setting-item">
                <label>Sauvegarde automatique: <input type="checkbox" checked disabled> (5 min)</label>
            </div>
        `;

        this.showModal();
    }

    /**
     * Ouvre la modale d'aide
     */
    openHelpModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');

        modalBody.innerHTML = `
            <h2>❓ Aide - SupCity</h2>
            
            <h3>🎯 Objectif</h3>
            <p>Développez votre civilisation depuis l'âge préhistorique jusqu'aux temps modernes !</p>
            
            <h3>🏗️ Construction</h3>
            <ul>
                <li>Sélectionnez un bâtiment dans l'onglet Construction</li>
                <li>Cliquez sur la carte pour le placer</li>
                <li>Vérifiez que vous avez les ressources nécessaires</li>
            </ul>
            
            <h3>👥 Citoyens</h3>
            <ul>
                <li>Les citoyens apparaissent près des feux de camp</li>
                <li>Ils ont besoin de nourriture, d'eau et de logement</li>
                <li>Assignez-leur des emplois dans vos bâtiments</li>
            </ul>
            
            <h3>📊 Ressources</h3>
            <ul>
                <li>🥕 Nourriture: Nécessaire pour la survie</li>
                <li>🪵 Bois: Matériau de construction de base</li>
                <li>🪨 Pierre: Construction avancée</li>
                <li>💧 Eau: Besoin vital des citoyens</li>
                <li>🔬 Recherche: Débloquer de nouvelles technologies</li>
            </ul>
            
            <h3>⌨️ Contrôles</h3>
            <ul>
                <li>Clic gauche: Sélectionner/Placer</li>
                <li>Boutons de vitesse: Contrôler le temps</li>
                <li>Menu: Retourner au menu principal</li>
            </ul>
        `;

        this.showModal();
    }

    /**
     * Affiche la modale
     */
    showModal() {
        const modal = document.getElementById('modal');
        modal.classList.add('active');

        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.onclick = () => this.hideModal();

        modal.onclick = (e) => {
            if (e.target === modal) this.hideModal();
        };
    }

    /**
     * Masque la modale
     */
    hideModal() {
        const modal = document.getElementById('modal');
        modal.classList.remove('active');
    }

    /**
     * Met à jour l'état de chargement
     * @param {string} status - État actuel
     */
    updateLoadingStatus(status) {
        const statusElement = this.loadingScreen?.querySelector('p');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    /**
     * Met à jour la barre de progression
     * @param {number} progress - Progression (0-100)
     */
    updateLoadingProgress(progress) {
        if (this.loadingProgressBar) {
            this.loadingProgressBar.style.width = `${progress}%`;
        }
    }

    /**
     * Affiche une notification
     * @param {string} message - Message à afficher
     * @param {string} type - Type de notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        const container = document.getElementById('notifications');
        if (container) {
            container.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
    }

    /**
     * Affiche une erreur
     * @param {Error} error - Erreur à afficher
     */
    showError(error) {
        console.error('Erreur SupCity:', error);

        // Afficher dans l'écran de chargement si possible
        if (this.loadingScreen) {
            this.loadingScreen.innerHTML = `
                <div class="loading-content">
                    <h1>❌ Erreur</h1>
                    <p>Impossible de démarrer SupCity:</p>
                    <pre style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; font-size: 0.9em;">${error.message}</pre>
                    <button onclick="location.reload()" style="padding: 12px 24px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1em;">
                        Recharger la page
                    </button>
                </div>
            `;
        }
    }

    /**
     * Formate un temps en millisecondes
     * @param {number} ms - Temps en millisecondes
     * @returns {string} - Temps formaté
     */
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Crée un délai
     * @param {number} ms - Délai en millisecondes
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Démarrage de l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    window.supCityApp = new SupCityApp();
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('Erreur globale:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesse rejetée:', event.reason);
});

// Export pour utilisation dans d'autres modules
export { SupCityApp };

// Initialisation de l'audio
const audioManager = new AudioManager();

// Gestion de l'UI toggle pour mobile
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('toggleUI')?.addEventListener('click', () => {
        document.getElementById('gameUI')?.classList.toggle('active');
    });
});

// Gestion de l'audio (démarrage au premier clic utilisateur)
window.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', () => {
        if (audioManager && audioManager.playMusic) {
            // audioManager.playMusic('bgm'); // À décommenter quand vous aurez des fichiers audio
        }
    }, { once: true });
});