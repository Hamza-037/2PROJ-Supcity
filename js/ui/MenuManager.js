// js/ui/MenuManager.js - Gestionnaire du menu principal (VERSION SIMPLE)

class MenuManager {
    constructor() {
        this.currentScreen = 'menu';
        
        // Éléments DOM
        this.mainMenu = document.getElementById('mainMenu');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.gameContainer = document.getElementById('gameContainer');
        
        this.initializeMenu();
    }

    /**
     * Initialise le menu principal
     */
    initializeMenu() {
        console.log('🎮 Initialisation du MenuManager');
        
        this.setupEventListeners();
        this.showMenu();
    }

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        // Bouton nouvelle partie
        document.getElementById('newGameBtn')?.addEventListener('click', () => {
            console.log('🚀 Nouvelle partie demandée');
            this.startNewGame();
        });

        // Bouton charger partie
        document.getElementById('loadGameBtn')?.addEventListener('click', () => {
            console.log('📁 Chargement partie demandé');
            this.loadExistingGame();
        });

        // Bouton tutoriel
        document.getElementById('tutorialBtn')?.addEventListener('click', () => {
            console.log('🎓 Tutoriel demandé');
            this.startTutorial();
        });

        // Bouton crédits
        document.getElementById('creditsBtn')?.addEventListener('click', () => {
            console.log('📋 Crédits demandés');
            this.showCredits();
        });

        // Bouton retour au menu (depuis le jeu)
        document.getElementById('menuBtn')?.addEventListener('click', () => {
            this.returnToMenu();
        });
    }

    /**
     * Affiche le menu principal
     */
    showMenu() {
        this.currentScreen = 'menu';
        this.mainMenu.style.display = 'block';
        this.loadingScreen.style.display = 'none';
        this.gameContainer.style.display = 'none';
        
        console.log('🏠 Menu principal affiché');
    }

    /**
     * Masque le menu principal
     */
    hideMenu() {
        this.mainMenu.classList.add('fade-out');
        
        setTimeout(() => {
            this.mainMenu.style.display = 'none';
        }, 500);
    }

    /**
     * Affiche l'écran de chargement
     */
    showLoadingScreen(message = 'Chargement de votre civilisation...') {
        this.currentScreen = 'loading';
        this.loadingScreen.style.display = 'flex';
        
        // Mettre à jour le message
        const statusElement = this.loadingScreen.querySelector('p');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    /**
     * Affiche le jeu
     */
    showGame() {
        this.currentScreen = 'game';
        this.loadingScreen.style.display = 'none';
        this.gameContainer.style.display = 'flex';
        
        console.log('🎮 Jeu affiché');
    }

    /**
     * Démarre une nouvelle partie
     */
    async startNewGame() {
        console.log('🚀 Démarrage d\'une nouvelle partie...');
        
        this.hideMenu();
        this.showLoadingScreen();
        
        try {
            // Attendre un peu pour l'effet visuel
            await this.delay(2000);
            
            // Démarrer le jeu
            await this.initializeGame();
            
        } catch (error) {
            console.error('❌ Erreur lors du démarrage:', error);
            this.showError('Erreur lors du démarrage du jeu');
        }
    }

    /**
     * Charge une partie existante
     */
    async loadExistingGame() {
        console.log('📁 Tentative de chargement...');
        
        // Vérifier s'il y a des sauvegardes
        const hasSave = localStorage.getItem('supcity_save_manual') || 
                       localStorage.getItem('supcity_save_autosave');
        
        if (!hasSave) {
            alert('Aucune sauvegarde trouvée ! Commencez une nouvelle partie.');
            return;
        }
        
        this.hideMenu();
        this.showLoadingScreen('Chargement de votre civilisation...');
        
        try {
            await this.delay(1500);
            await this.initializeGame('manual'); // Charger la sauvegarde manuelle
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement:', error);
            this.showError('Erreur lors du chargement de la partie');
        }
    }

    /**
     * Démarre le tutoriel
     */
    async startTutorial() {
        console.log('🎓 Démarrage du tutoriel...');
        
        this.hideMenu();
        this.showLoadingScreen('Préparation du tutoriel...');
        
        try {
            await this.delay(1500);
            await this.initializeGame(null, true); // Mode tutoriel
            
        } catch (error) {
            console.error('❌ Erreur lors du tutoriel:', error);
            this.showError('Erreur lors du démarrage du tutoriel');
        }
    }

    /**
     * Initialise le jeu
     */
    async initializeGame(saveSlot = null, isTutorial = false) {
        try {
            // Obtenir l'instance de l'app principale
            const app = window.supCityApp;
            
            if (!app) {
                throw new Error('Application principale non trouvée');
            }

            // Configuration de base
            const gameConfig = {
                difficulty: 'normal',
                startingResources: { food: 10, wood: 5, stone: 3, water: 8 }
            };

            // Démarrer le jeu via l'app
            await app.startGame(saveSlot, gameConfig);
            
            // Message de tutoriel
            if (isTutorial) {
                setTimeout(() => {
                    app.showNotification('Bienvenue dans SupCity ! Cliquez sur Construction > Feu de camp pour commencer.', 'info');
                }, 1000);
            }
            
            this.showGame();
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du jeu:', error);
            throw error;
        }
    }

    /**
     * Retourne au menu depuis le jeu
     */
    returnToMenu() {
        if (confirm('Retourner au menu principal ? (Pensez à sauvegarder votre partie)')) {
            this.gameContainer.style.display = 'none';
            this.showMenu();
        }
    }

    /**
     * Affiche les crédits
     */
    showCredits() {
        alert(`🎮 SupCity v1.0.0
        
Développé pour le projet étudiant
Technologies : JavaScript, HTML5 Canvas, CSS3
Inspiré de City Idle

Construisez, développez, prospérez !`);
    }

    /**
     * Affiche une erreur
     */
    showError(message) {
        console.error('Erreur Menu:', message);
        alert(`Erreur: ${message}`);
        this.showMenu(); // Retourner au menu en cas d'erreur
    }

    /**
     * Utilitaire de délai
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export { MenuManager };