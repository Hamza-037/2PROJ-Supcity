class GameDebugTools {
    constructor(game) {
        this.game = game;
    }

    forceSpawnTestCitizen() {
        const x = this.game.canvas.width / 2 + (Math.random() - 0.5) * 100;
        const y = this.game.canvas.height / 2 + (Math.random() - 0.5) * 100;
        return this.game.spawnCitizen(x, y, 50);
    }

    debugInfo() {
        console.group('🐛 Debug Info - SupCity1');
        console.log('État du jeu:', {
            isRunning: this.game.isRunning,
            isInitialized: this.game.isInitialized,
            speed: this.game.gameTime.speed,
            isPaused: this.game.gameTime.isPaused
        });
        console.log('Collections:', {
            citizens: this.game.citizens.length,
            buildings: this.game.buildings.length,
            attractionIntervals: this.game.attractionIntervals.size
        });
        console.log('Ressources:', this.game.resourceManager.getSummary());
        console.groupEnd();
    }

    testSpawnCitizens(count = 5) {
        const centerX = this.game.canvas.width / 2;
        const centerY = this.game.canvas.height / 2;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.game.spawnCitizen(centerX, centerY, 100);
            }, i * 200);
        }
    }

    testBuildingPlacement(type = 'hut', count = 3) {
        const centerX = this.game.canvas.width / 2;
        const centerY = this.game.canvas.height / 2;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const distance = 100 + i * 50;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            setTimeout(() => {
                this.game.placeBuilding(type, x, y);
            }, i * 300);
        }
    }
}

export { GameDebugTools };
