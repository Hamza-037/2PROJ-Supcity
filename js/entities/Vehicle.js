class Vehicle {
    constructor(x, y, type = 'cart') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.speed = 1.2;
        this.capacity = 10;
        this.cargo = {};
        this.destination = null;
        this.shouldBeRemoved = false;
    }

    update(deltaTime) {
        if (this.destination) {
            const dx = this.destination.x - this.x;
            const dy = this.destination.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                this.x += (dx / distance) * this.speed * deltaTime / 16;
                this.y += (dy / distance) * this.speed * deltaTime / 16;
            } else {
                this.destination = null;
            }
        }
    }

    loadCargo(resource, amount) {
        this.cargo[resource] = (this.cargo[resource] || 0) + amount;
    }

    unloadCargo() {
        const cargo = { ...this.cargo };
        this.cargo = {};
        return cargo;
    }
}