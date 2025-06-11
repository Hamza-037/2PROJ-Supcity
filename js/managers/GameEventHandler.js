import { eventSystem, GameEvents } from '../core/EventSystem.js';

class GameEventHandler {
    constructor(game) {
        this.game = game;
    }

    setupEventListeners() {
        this.game.canvas.addEventListener('click', e => this.handleCanvasClick(e));
        this.game.canvas.addEventListener('mousemove', e => this.handleMouseMove(e));
        this.game.canvas.addEventListener('contextmenu', e => e.preventDefault());
        eventSystem.on(GameEvents.CITIZEN_DIED, e => this.onCitizenDied(e));
        eventSystem.on(GameEvents.BUILDING_PLACED, e => this.onBuildingPlaced(e));
    }

    handleCanvasClick(event) {
        const rect = this.game.canvas.getBoundingClientRect();
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        const clampedX = Math.max(0, Math.min(this.game.canvas.width, x));
        const clampedY = Math.max(0, Math.min(this.game.canvas.height, y));
        if (this.game.selectedBuildingType) {
            this.game.placeBuilding(this.game.selectedBuildingType, clampedX, clampedY);
        } else {
            this.game.selectObjectAt(clampedX, clampedY);
        }
    }

    handleMouseMove(event) {
        const rect = this.game.canvas.getBoundingClientRect();
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;
        this.game.mouseX = (event.clientX - rect.left) * scaleX;
        this.game.mouseY = (event.clientY - rect.top) * scaleY;
        this.game.mouseX = Math.max(0, Math.min(this.game.canvas.width, this.game.mouseX));
        this.game.mouseY = Math.max(0, Math.min(this.game.canvas.height, this.game.mouseY));
    }

    onCitizenDied(event) {
        const citizen = event.data.citizen;
        if (citizen.job) {
            citizen.job.removeWorker(citizen);
        }
        eventSystem.emit(GameEvents.UI_NOTIFICATION, {
            type: 'warning',
            message: `${citizen.name} est décédé`
        });
    }

    onBuildingPlaced(event) {
        const building = event.data.building;
        eventSystem.emit(GameEvents.UI_NOTIFICATION, {
            type: 'success',
            message: `${building.name || building.type} construit !`
        });
    }
}

export { GameEventHandler };
