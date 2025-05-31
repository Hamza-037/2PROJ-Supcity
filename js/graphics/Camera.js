// js/graphics/Camera.js - Gestion de la caméra et du zoom

/**
 * Classe gérant la caméra et le zoom dans le jeu
 */
class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.targetZoom = 1;
        this.minZoom = 0.5;
        this.maxZoom = 3;
    }

    update(deltaTime) {
        // Lissage du zoom
        this.zoom += (this.targetZoom - this.zoom) * 0.1;
    }

    setZoom(zoom, centerX = this.canvas.width / 2, centerY = this.canvas.height / 2) {
        const oldZoom = this.zoom;
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        
        const zoomRatio = this.targetZoom / oldZoom;
        this.x = centerX - (centerX - this.x) * zoomRatio;
        this.y = centerY - (centerY - this.y) * zoomRatio;
    }

    zoom(factor, centerX, centerY) {
        this.setZoom(this.targetZoom * factor, centerX, centerY);
    }

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.x) / this.zoom,
            y: (screenY - this.y) / this.zoom
        };
    }

    worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.zoom + this.x,
            y: worldY * this.zoom + this.y
        };
    }

    updateViewport(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }
}

export { Camera };