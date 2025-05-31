// js/systems/ - Systèmes de base pour SupCity1

// === CAMÉRA ===
class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.targetZoom = 1;
        this.minZoom = 0.5;
        this.maxZoom = 3;
        this.smoothing = 0.1;
        
        // Limites de la caméra
        this.bounds = {
            left: -200,
            right: canvas.width + 200,
            top: -200,
            bottom: canvas.height + 200
        };
    }

    update(deltaTime) {
        // Lissage du zoom
        this.zoom += (this.targetZoom - this.zoom) * this.smoothing;
        
        // Appliquer les limites
        this.x = Math.max(this.bounds.left, Math.min(this.bounds.right, this.x));
        this.y = Math.max(this.bounds.top, Math.min(this.bounds.bottom, this.y));
    }

    setZoom(zoom, centerX = this.canvas.width / 2, centerY = this.canvas.height / 2) {
        const oldZoom = this.zoom;
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        
        // Ajuster la position pour zoomer vers le point spécifié
        const zoomRatio = this.targetZoom / oldZoom;
        this.x = centerX - (centerX - this.x) * zoomRatio;
        this.y = centerY - (centerY - this.y) * zoomRatio;
    }

    zoom(factor, centerX, centerY) {
        this.setZoom(this.targetZoom * factor, centerX, centerY);
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }

    updateViewport(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.bounds.right = width + 200;
        this.bounds.bottom = height + 200;
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
}

// === SYSTÈME DE PARTICULES ===
class ParticleSystem {
    constructor(ctx) {
        this.ctx = ctx;
        this.particles = [];
        this.maxParticles = 500;
        this.particlePool = [];
    }

    update(deltaTime) {
        const deltaSeconds = deltaTime / 1000;
        
        // Mettre à jour les particules existantes
        this.particles = this.particles.filter(particle => {
            particle.update(deltaSeconds);
            return particle.life > 0;
        });
        
        // Recycler les particules mortes
        this.particles.forEach(particle => {
            if (particle.life <= 0) {
                this.recycleParticle(particle);
            }
        });
    }

    createParticle(x, y, options = {}) {
        if (this.particles.length >= this.maxParticles) return;
        
        const particle = this.getParticleFromPool();
        particle.reset(x, y, options);
        this.particles.push(particle);
        
        return particle;
    }

    getParticleFromPool() {
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }
        return new Particle();
    }

    recycleParticle(particle) {
        this.particlePool.push(particle);
    }

    render() {
        this.particles.forEach(particle => {
            particle.render(this.ctx);
        });
    }

    setMaxParticles(max) {
        this.maxParticles = max;
    }

    // Effets prédéfinis
    createSmoke(x, y) {
        for (let i = 0; i < 3; i++) {
            this.createParticle(x + Math.random() * 10 - 5, y, {
                type: 'smoke',
                velocityY: -20 - Math.random() * 20,
                velocityX: Math.random() * 10 - 5,
                life: 2 + Math.random(),
                color: `rgba(200, 200, 200, ${0.5 + Math.random() * 0.3})`,
                size: 3 + Math.random() * 4
            });
        }
    }

    createSparks(x, y) {
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 50;
            
            this.createParticle(x, y, {
                type: 'spark',
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.5,
                color: '#FFD700',
                size: 2
            });
        }
    }

    createResourcePop(x, y, resourceType) {
        const colors = {
            food: '#FF6B35',
            wood: '#8B4513',
            stone: '#696969',
            water: '#4169E1',
            research: '#9370DB'
        };
        
        this.createParticle(x, y, {
            type: 'resource',
            velocityY: -30,
            life: 1.5,
            color: colors[resourceType] || '#FFFFFF',
            size: 6,
            text: '+1'
        });
    }
}

// === PARTICULE ===
class Particle {
    constructor() {
        this.reset(0, 0, {});
    }

    reset(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.velocityX = options.velocityX || 0;
        this.velocityY = options.velocityY || 0;
        this.life = options.life || 1;
        this.maxLife = this.life;
        this.color = options.color || '#FFFFFF';
        this.size = options.size || 3;
        this.type = options.type || 'default';
        this.text = options.text || null;
        this.gravity = options.gravity || 0;
        this.friction = options.friction || 0.98;
    }

    update(deltaTime) {
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        this.velocityY += this.gravity * deltaTime;
        this.velocityX *= this.friction;
        this.velocityY *= this.friction;
        this.life -= deltaTime;
    }

    render(ctx) {
        if (this.life <= 0) return;
        
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        
        switch (this.type) {
            case 'smoke':
                this.renderSmoke(ctx);
                break;
            case 'spark':
                this.renderSpark(ctx);
                break;
            case 'resource':
                this.renderResource(ctx);
                break;
            default:
                this.renderDefault(ctx);
        }
        
        ctx.restore();
    }

    renderSmoke(ctx) {
        const currentSize = this.size * (2 - this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
    }

    renderSpark(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    }

    renderResource(ctx) {
        if (this.text) {
            ctx.fillStyle = this.color;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.text, this.x, this.y);
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderDefault(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// === RENDERER PRINCIPAL ===
class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
        this.showDebugInfo = false;
        this.renderLayers = {
            background: 0,
            terrain: 1,
            buildings: 2,
            citizens: 3,
            effects: 4,
            ui: 5
        };
    }

    render() {
        // Sauvegarder l'état du contexte
        this.ctx.save();
        
        // Appliquer la transformation de la caméra
        this.applyCamera();
        
        // Rendu par couches
        this.renderBackground();
        this.renderTerrain();
        this.renderBuildings();
        this.renderCitizens();
        this.renderEffects();
        
        // Restaurer l'état pour l'UI
        this.ctx.restore();
        
        // Rendu de l'interface (sans transformation caméra)
        this.renderUI();
        this.renderDebugInfo();
    }

    applyCamera() {
        if (this.game.camera) {
            this.ctx.translate(this.game.camera.x, this.game.camera.y);
            this.ctx.scale(this.game.camera.zoom, this.game.camera.zoom);
        }
    }

    renderBackground() {
        // Gradient de fond (ciel vers herbe)
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.3, '#98FB98');
        gradient.addColorStop(1, '#228B22');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(-this.canvas.width, -this.canvas.height, this.canvas.width * 3, this.canvas.height * 3);
    }

    renderTerrain() {
        // Texture d'herbe simple
        this.ctx.fillStyle = 'rgba(34, 139, 34, 0.3)';
        for (let x = -200; x < this.canvas.width + 200; x += 25) {
            for (let y = 300; y < this.canvas.height + 200; y += 25) {
                if (Math.random() > 0.7) {
                    this.ctx.fillRect(x + Math.random() * 10, y + Math.random() * 10, 2, 8);
                }
            }
        }
    }

    renderBuildings() {
        this.game.buildings.forEach(building => {
            this.renderBuilding(building);
        });
    }

    renderBuilding(building) {
        const ctx = this.ctx;
        const x = building.x;
        const y = building.y;
        const size = building.size;
        
        ctx.save();
        
        // Ombre
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(x + 2, y + size/2 + 2, size/2, size/6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Bâtiment principal
        ctx.fillStyle = building.color || '#888888';
        
        switch (building.type) {
            case 'fire':
                this.renderFire(building);
                break;
            case 'hut':
                this.renderHut(building);
                break;
            case 'berry_bush':
                this.renderBerryBush(building);
                break;
            default:
                // Bâtiment générique
                ctx.fillRect(x - size/2, y - size/2, size, size);
                
                // Icône du bâtiment
                if (building.icon) {
                    ctx.font = `${size/2}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.fillStyle = 'white';
                    ctx.fillText(building.icon, x, y + size/6);
                }
        }
        
        // Indicateur de santé
        if (building.healthPoints < 100) {
            this.renderHealthBar(building);
        }
        
        // Indicateur de travailleurs
        if (building.maxWorkers > 0) {
            this.renderWorkerIndicator(building);
        }
        
        // Range en mode debug
        if (this.showDebugInfo && building.range > 0) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(x, y, building.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        ctx.restore();
    }

    renderFire(building) {
        const ctx = this.ctx;
        const x = building.x;
        const y = building.y;
        const size = building.size;
        const anim = building.animation;
        
        // Base (bûches)
        ctx.fillStyle = '#654321';
        ctx.fillRect(x - size/3, y + size/4, size/1.5, size/6);
        
        // Flammes animées
        for (let i = 0; i < 5; i++) {
            const flameX = x + (i - 2) * size/8;
            const flameHeight = size/2 + Math.sin(anim * 4 + i) * size/8;
            const flameWidth = size/6 + Math.cos(anim * 3 + i) * size/12;
            
            ctx.fillStyle = i % 2 === 0 ? '#FF4500' : '#FF6500';
            ctx.beginPath();
            ctx.ellipse(flameX, y - flameHeight/4, flameWidth, flameHeight, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Particules occasionnelles
        if (Math.random() < 0.1) {
            this.game.particleSystem.createSparks(x, y - size/2);
        }
    }

    renderHut(building) {
        const ctx = this.ctx;
        const x = building.x;
        const y = building.y;
        const size = building.size;
        
        // Base
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x - size/2, y - size/4, size, size/2);
        
        // Toit
        ctx.fillStyle = '#654321';
        ctx.beginPath();
        ctx.moveTo(x - size/1.5, y - size/4);
        ctx.lineTo(x, y - size/1.2);
        ctx.lineTo(x + size/1.5, y - size/4);
        ctx.closePath();
        ctx.fill();
        
        // Porte
        ctx.fillStyle = '#2F1B14';
        ctx.fillRect(x - size/8, y - size/8, size/4, size/3);
    }

    renderBerryBush(building) {
        const ctx = this.ctx;
        const x = building.x;
        const y = building.y;
        const size = building.size;
        const anim = building.animation;
        
        // Buisson principal
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(x, y, size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Baies
        ctx.fillStyle = '#8B0000';
        for (let i = 0; i < 8; i++) {
            const berryX = x + Math.cos(i * 0.8 + anim * 0.1) * size/4;
            const berryY = y + Math.sin(i * 0.8 + anim * 0.1) * size/4;
            ctx.beginPath();
            ctx.arc(berryX, berryY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderHealthBar(building) {
        const ctx = this.ctx;
        const x = building.x;
        const y = building.y - building.size/2 - 10;
        const width = building.size;
        const height = 4;
        
        // Fond
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillRect(x - width/2, y, width, height);
        
        // Santé
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillRect(x - width/2, y, width * (building.healthPoints / 100), height);
    }

    renderWorkerIndicator(building) {
        const ctx = this.ctx;
        const x = building.x;
        const y = building.y - building.size/2 - 20;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 2;
        
        const text = `👷 ${building.workers.length}/${building.maxWorkers}`;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
    }

    renderCitizens() {
        this.game.citizens.forEach(citizen => {
            this.renderCitizen(citizen);
        });
    }

    renderCitizen(citizen) {
        const ctx = this.ctx;
        const x = citizen.x;
        const y = citizen.y;
        
        ctx.save();
        
        // Ombre
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(x, y + 6, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Corps
        ctx.fillStyle = citizen.color?.cloth || '#4169E1';
        ctx.fillRect(x - 3, y - 2, 6, 8);
        
        // Tête
        ctx.fillStyle = citizen.color?.skin || '#FDBCB4';
        ctx.beginPath();
        ctx.arc(x, y - 6, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Yeux
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 2, y - 7, 1, 1);
        ctx.fillRect(x + 1, y - 7, 1, 1);
        
        // Indicateur d'état
        this.renderCitizenState(citizen);
        
        ctx.restore();
    }

    renderCitizenState(citizen) {
        const ctx = this.ctx;
        const x = citizen.x;
        const y = citizen.y - 15;
        
        let stateColor = '#00FF00';
        let stateIcon = '😊';
        
        switch (citizen.state) {
            case 'seeking_food':
                stateColor = '#FF6B35';
                stateIcon = '🍞';
                break;
            case 'seeking_water':
                stateColor = '#4169E1';
                stateIcon = '💧';
                break;
            case 'working':
                stateColor = '#32CD32';
                stateIcon = '⚒️';
                break;
            case 'sleeping':
                stateColor = '#9370DB';
                stateIcon = '😴';
                break;
        }
        
        if (this.showDebugInfo) {
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(stateIcon, x, y);
        }
    }

    renderEffects() {
        this.game.particleSystem.render();
        
        // Effets des bâtiments
        this.game.effects.forEach(effect => {
            this.renderEffect(effect);
        });
    }

    renderEffect(effect) {
        // Rendu des effets personnalisés
        const ctx = this.ctx;
        
        switch (effect.type) {
            case 'construction':
                this.renderConstructionEffect(effect);
                break;
            case 'production':
                this.renderProductionEffect(effect);
                break;
        }
    }

    renderConstructionEffect(effect) {
        const ctx = this.ctx;
        const progress = 1 - (effect.time / effect.duration);
        
        ctx.save();
        ctx.globalAlpha = progress;
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius * progress, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    renderUI() {
        // L'interface est gérée par le HTML/CSS
        // Ici on pourrait ajouter des overlays canvas si nécessaire
    }

    renderDebugInfo() {
        if (!this.showDebugInfo) return;
        
        const ctx = this.ctx;
        
        // Grille de pathfinding
        if (this.game.pathfindingSystem) {
            this.game.pathfindingSystem.debugDraw(ctx);
        }
        
        // Informations de performance
        this.renderPerformanceInfo();
    }

    renderPerformanceInfo() {
        const ctx = this.ctx;
        const stats = this.game.getGameStats();
        
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, this.canvas.height - 100, 200, 90);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px monospace';
        ctx.fillText(`FPS: ${stats.fps}`, 20, this.canvas.height - 80);
        ctx.fillText(`Citizens: ${stats.population}`, 20, this.canvas.height - 65);
        ctx.fillText(`Buildings: ${stats.buildings}`, 20, this.canvas.height - 50);
        ctx.fillText(`Frame: ${stats.performance.frameTime.toFixed(1)}ms`, 20, this.canvas.height - 35);
        ctx.fillText(`Update: ${stats.performance.updateTime.toFixed(1)}ms`, 20, this.canvas.height - 20);
        
        ctx.restore();
    }

    toggleDebugInfo() {
        this.showDebugInfo = !this.showDebugInfo;
    }
}

// Export des classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ProductionSystem, 
        TransportSystem, 
        ResearchSystem, 
        WeatherSystem, 
        AIManager, 
        Camera, 
        ParticleSystem, 
        Particle, 
        Renderer 
    };
} else {
    window.ProductionSystem = ProductionSystem;
    window.TransportSystem = TransportSystem;
    window.ResearchSystem = ResearchSystem;
    window.WeatherSystem = WeatherSystem;
    window.AIManager = AIManager;
    window.Camera = Camera;
    window.ParticleSystem = ParticleSystem;
    window.Particle = Particle;
    window.Renderer = Renderer;
}
    }

    getWeatherEffect() {
        return this.weatherTypes[this.currentWeather] || { productionMod: 1.0, happinessMod: 1.0 };
    }
}

// === GESTIONNAIRE D'IA ===
class AIManager {
    constructor(game) {
        this.game = game;
        this.lastJobAssignment = 0;
        this.lastNeedsCheck = 0;
    }

    update(deltaTime) {
        const now = Date.now();
        
        // Assigner des emplois toutes les 5 secondes
        if (now - this.lastJobAssignment > 5000) {
            this.assignJobs();
            this.lastJobAssignment = now;
        }
        
        // Vérifier les besoins toutes les 3 secondes
        if (now - this.lastNeedsCheck > 3000) {
            this.checkCitizenNeeds();
            this.lastNeedsCheck = now;
        }
    }

    assignJobs() {
        const unemployed = this.game.citizens.filter(c => !c.job);
        const jobsAvailable = this.game.buildings.filter(b => b.needsWorkers());
        
        unemployed.forEach(citizen => {
            const nearbyJobs = jobsAvailable.filter(building => 
                citizen.getDistanceTo(building.x, building.y) < 200
            );
            
            if (nearbyJobs.length > 0) {
                const closestJob = nearbyJobs.reduce((closest, building) => {
                    const distToCurrent = citizen.getDistanceTo(building.x, building.y);
                    const distToClosest = citizen.getDistanceTo(closest.x, closest.y);
                    return distToCurrent < distToClosest ? building : closest;
                });
                
                citizen.assignJob(closestJob);
            }
        });
    }

    checkCitizenNeeds() {
        this.game.citizens.forEach(citizen => {
            // Priorité aux besoins critiques
            if (citizen.needs.hunger < 30 || citizen.needs.thirst < 30) {
                citizen.state = citizen.needs.hunger < citizen.needs.thirst ? 'seeking_food' : 'seeking_water';
            }
        });
    }
}

// ===