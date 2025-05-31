class Animal {
    constructor(x, y, type = 'cow') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.age = 0;
        this.hunger = 100;
        this.happiness = 100;
        this.productionTimer = 0;
        this.maxAge = 365 * 5; // 5 ans
    }

    update(deltaTime) {
        this.age += deltaTime / 1000;
        this.hunger -= 0.01 * deltaTime / 16;
        this.productionTimer += deltaTime;

        // Production selon le type
        if (this.productionTimer > 60000) { // 1 minute
            this.productionTimer = 0;
            return this.produce();
        }
        return null;
    }

    produce() {
        if (this.hunger < 20) return null;

        switch (this.type) {
            case 'cow': return { type: 'milk', amount: 2 };
            case 'sheep': return { type: 'wool', amount: 1 };
            case 'chicken': return { type: 'eggs', amount: 3 };
            default: return null;
        }
    }

    feed(amount) {
        this.hunger = Math.min(100, this.hunger + amount);
    }
}