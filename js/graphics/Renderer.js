// js/graphics/Renderer.js - Système de rendu graphique

/**
 * Classe gérant le rendu graphique du jeu
 */
class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
        this.showDebugInfo = false;
    }

    render() {
        // Fond
        this.renderBackground();
        
        // Entités
        this.renderBuildings();
        this.renderCitizens();
        this.renderVehicles();
        this.renderEffects();
        
        // UI Overlay
        this.renderUIOverlay();
        
        // Debug
        if (this.showDebugInfo) {
            this.renderDebugInfo();
        }
    }

    renderBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.3, '#98FB98');
        gradient.addColorStop(1, '#228B22');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderBuildings() {
        this.game.buildings.forEach(building => {
            this.renderBuilding(building);
        });
    }

    renderCitizens() {
        this.game.citizens.forEach(citizen => {
            this.renderCitizen(citizen);
        });
    }

    renderVehicles() {
        if (this.game.vehicles) {
            this.game.vehicles.forEach(vehicle => {
                this.renderVehicle(vehicle);
            });
        }
    }

    renderEffects() {
        if (this.game.particleSystem) {
            this.game.particleSystem.render();
        }
    }

    renderBuilding(building) {
        // Utilise la méthode déjà définie dans Game.js
        if (this.game.renderBuilding) {
            this.game.renderBuilding(building);
        }
    }

    renderCitizen(citizen) {
        // Utilise la méthode déjà définie dans Game.js
        if (this.game.renderCitizen) {
            this.game.renderCitizen(citizen);
        }
    }

    renderVehicle(vehicle) {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(vehicle.x - 8, vehicle.y - 4, 16, 8);
        
        // Roues
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(vehicle.x - 6, vehicle.y + 4, 3, 0, Math.PI * 2);
        ctx.arc(vehicle.x + 6, vehicle.y + 4, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    renderUIOverlay() {
        // Curseur de construction
        if (this.game.selectedBuildingType && this.game.renderConstructionCursor) {
            this.game.renderConstructionCursor();
        }
    }

    renderDebugInfo() {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, this.canvas.height - 100, 200, 90);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px monospace';
        ctx.fillText(`FPS: ${this.game.gameTime.fps}`, 20, this.canvas.height - 80);
        ctx.fillText(`Citizens: ${this.game.citizens.length}`, 20, this.canvas.height - 65);
        ctx.fillText(`Buildings: ${this.game.buildings.length}`, 20, this.canvas.height - 50);
        
        ctx.restore();
    }

    toggleDebugInfo() {
        this.showDebugInfo = !this.showDebugInfo;
    }
}

export { Renderer };