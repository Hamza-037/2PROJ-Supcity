class RandomUtils {
    static seed = 12345;

    static setSeed(seed) {
        this.seed = seed;
    }

    static seededRandom() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    static choice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    static shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    static weightedChoice(items, weights) {
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        const random = Math.random() * total;
        
        let accumulator = 0;
        for (let i = 0; i < items.length; i++) {
            accumulator += weights[i];
            if (random <= accumulator) {
                return items[i];
            }
        }
        
        return items[items.length - 1];
    }

    static gaussian(mean = 0, stdDev = 1) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        return z * stdDev + mean;
    }
}