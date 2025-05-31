class NotificationSystem {
    constructor() {
        this.container = document.getElementById('notifications');
        this.notifications = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        eventSystem.on(GameEvents.UI_NOTIFICATION, (event) => {
            this.show(event.data.message, event.data.type);
        });
    }

    show(message, type = 'info', duration = 5000) {
        if (!this.container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        this.container.appendChild(notification);
        this.notifications.push(notification);
        
        setTimeout(() => {
            notification.remove();
            const index = this.notifications.indexOf(notification);
            if (index > -1) this.notifications.splice(index, 1);
        }, duration);
    }

    clear() {
        this.notifications.forEach(notif => notif.remove());
        this.notifications = [];
    }
}