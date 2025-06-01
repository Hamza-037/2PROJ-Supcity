// js/ui/UIManager.js - Gestionnaire d'interface utilisateur simple

// Import des dépendances
import { eventSystem, GameEvents } from '../core/EventSystem.js';
import { Vehicle } from '../entities/Vehicle.js';

class UIManager {
    constructor(game) {
        this.game = game;
        this.selectedBuildingType = null;
        this.selectedObject = null;
    }

    async initialize() {
        try {
            this.setupEventListeners();
            console.log('💻 UIManager initialisé');
            return Promise.resolve(); // Assure que la promesse est correctement résolue
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de UIManager:', error);
            return Promise.reject(error);
        }
    }

    setupEventListeners() {
        // Gestion des onglets
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Gestion des catégories de bâtiments
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchCategory(e.target.dataset.category);
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');

        if (tabName === 'construction') {
            this.updateBuildingsList();
        }
    }

    switchCategory(category) {
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        this.updateBuildingsList(category);
    }

    updateBuildingsList(category = 'basic') {
        const grid = document.getElementById('buildingsGrid');
        if (!grid) return;

        const buildings = this.game.buildingDataManager.getBuildingsByCategory(category);
        const unlockedResearch = this.game.researchSystem.getUnlockedResearch();
        
        grid.innerHTML = '';

        buildings.forEach(building => {
            if (!this.game.buildingDataManager.isUnlocked(building, unlockedResearch)) return;

            const button = document.createElement('button');
            button.className = 'building-btn';
            
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
                    this.selectBuilding(building.type, button);
                }
            });

            grid.appendChild(button);
        });
    }

    selectBuilding(type, button) {
        this.clearBuildingSelection();
        this.selectedBuildingType = type;
        button.classList.add('active');
        this.game.selectBuilding(type);
    }

    clearBuildingSelection() {
        document.querySelectorAll('.building-btn').forEach(btn => btn.classList.remove('active'));
        this.selectedBuildingType = null;
    }

    setBuildingSelection(type) {
        this.selectedBuildingType = type;
    }

    updateConstructionPreview(x, y) {
        // Simple preview - sera amélioré plus tard
    }

    showBuildingInfo(building) {
        // Affichage simple des infos
        console.log('Bâtiment sélectionné:', building.name);
    }

    showCitizenInfo(citizen) {
        // Affichage simple des infos
        console.log('Citoyen sélectionné:', citizen.name);
    }

    clearSelection() {
        this.selectedObject = null;
    }

    updateDebugDisplay(enabled) {
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) {
            debugInfo.style.display = enabled ? 'block' : 'none';
        }
    }
}

// Système de notifications simple
class NotificationSystem {
    constructor() {
        this.container = document.getElementById('notifications');
        this.setupEventListeners();
    }

    setupEventListeners() {
        eventSystem.on(GameEvents.UI_NOTIFICATION, (event) => {
            this.show(event.data.message, event.data.type);
        });
    }

    show(message, type = 'info') {
        if (!this.container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        this.container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

export { UIManager };