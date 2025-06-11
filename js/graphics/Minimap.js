class Minimap {
    constructor(game, canvasId = 'minimapCanvas') {
        this.game = game;
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.scale = 0.1;
        this.updateInterval = 1000; // 1 seconde
        this.lastUpdate = 0;
    }

    update(deltaTime) {
        this.lastUpdate += deltaTime;
        if (this.lastUpdate >= this.updateInterval) {
            this.render();
            this.lastUpdate = 0;
        }
    }

    render() {
        if (!this.ctx || !this.canvas) return;

        const ctx = this.ctx;
        const canvas = this.canvas;

        // Nettoyer
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fond
        ctx.fillStyle = '#228B22';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Bâtiments
        ctx.fillStyle = '#8B4513';
        this.game.buildings.forEach(building => {
            const x = building.x * this.scale;
            const y = building.y * this.scale;
            const size = Math.max(2, building.size * this.scale);

            ctx.fillRect(x - size / 2, y - size / 2, size, size);
        });

        // Citoyens (comme des points)
        ctx.fillStyle = '#FFFFFF';
        this.game.citizens.forEach(citizen => {
            const x = citizen.x * this.scale;
            const y = citizen.y * this.scale;

            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        });

        // Bordure
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    handleClick(event) {
        if (!this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / this.scale;
        const y = (event.clientY - rect.top) / this.scale;

        // Centrer la caméra principale sur ce point
        if (this.game.camera) {
            this.game.camera.x = x;
            this.game.camera.y = y;
        }
    }
}

export { Minimap }
