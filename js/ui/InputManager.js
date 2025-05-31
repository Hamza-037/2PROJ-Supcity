class InputManager {
    constructor(game) {
        this.game = game;
        this.keys = {};
        this.setupKeyboardEvents();
    }

    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.handleKeyDown(e);
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    handleKeyDown(event) {
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.game.gameTime.togglePause();
                break;
            case 'Digit1':
                this.game.setSpeed(1);
                break;
            case 'Digit2':
                this.game.setSpeed(2);
                break;
            case 'Digit3':
                this.game.setSpeed(4);
                break;
            case 'KeyS':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.game.saveGame();
                }
                break;
            case 'KeyL':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.game.loadGame();
                }
                break;
            case 'Escape':
                this.game.selectedBuildingType = null;
                if (this.game.uiManager) {
                    this.game.uiManager.clearBuildingSelection();
                }
                break;
        }
    }

    isKeyPressed(keyCode) {
        return !!this.keys[keyCode];
    }
}

// Export de toutes les classes UI
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NotificationSystem, ModalManager, ChartManager, TooltipManager, InputManager
    };
} else {
    window.NotificationSystem = NotificationSystem;
    window.ModalManager = ModalManager;
    window.ChartManager = ChartManager;
    window.TooltipManager = TooltipManager;
    window.InputManager = InputManager;
}