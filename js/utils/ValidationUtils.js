class ValidationUtils {
    static isValidCoordinate(x, y, maxX, maxY) {
        return x >= 0 && x <= maxX && y >= 0 && y <= maxY;
    }

    static isValidResource(resourceType, amount) {
        return typeof resourceType === 'string' && 
               typeof amount === 'number' && 
               amount >= 0 && 
               isFinite(amount);
    }

    static isValidSaveData(data) {
        if (!data || typeof data !== 'object') return false;
        
        const requiredFields = ['version', 'timestamp', 'resources', 'buildings', 'citizens'];
        return requiredFields.every(field => field in data);
    }

    static sanitizeInput(input, maxLength = 100) {
        if (typeof input !== 'string') return '';
        
        return input
            .trim()
            .slice(0, maxLength)
            .replace(/[<>]/g, ''); // Supprimer HTML basique
    }

    static isValidBuildingPlacement(x, y, size, existingBuildings, canvasWidth, canvasHeight) {
        // Vérifier les limites du canvas
        if (x - size/2 < 0 || x + size/2 > canvasWidth ||
            y - size/2 < 0 || y + size/2 > canvasHeight) {
            return false;
        }
        
        // Vérifier les collisions
        return !existingBuildings.some(building => {
            const distance = Math.sqrt((x - building.x) ** 2 + (y - building.y) ** 2);
            return distance < (size + building.size) / 2 + 35; // Marge de sécurité
        });
    }
}

// ====== Générateur de noms ======
class NameGenerator {
    constructor() {
        this.firstNames = [
            'Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Avery', 'Quinn',
            'Emery', 'Sage', 'River', 'Rowan', 'Phoenix', 'Blake', 'Drew', 'Hayden',
            'Jules', 'Finn', 'Sage', 'Ash', 'Lane', 'Kai', 'Eden', 'Nova'
        ];
        
        this.lastNames = [
            'Smith', 'Stone', 'Wood', 'Rivers', 'Hill', 'Forest', 'Fields', 'Brook',
            'Vale', 'Glen', 'Swift', 'Strong', 'Bright', 'Fair', 'Wild', 'Free'
        ];
    }

    generateName() {
        const firstName = RandomUtils.choice(this.firstNames);
        const lastName = RandomUtils.choice(this.lastNames);
        return `${firstName} ${lastName}`;
    }
}