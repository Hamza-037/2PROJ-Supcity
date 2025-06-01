// js/systems/PathfindingSystem.js - Système de pathfinding A*

/**
 * Système de pathfinding utilisant l'algorithme A*
 * Optimisé pour les performances avec mise en cache
 */
class PathfindingSystem {
    constructor(width, height, gridSize = 20) {
        this.width = width;
        this.height = height;
        this.gridSize = gridSize;
        
        // Grille de navigation
        this.gridWidth = Math.ceil(width / gridSize);
        this.gridHeight = Math.ceil(height / gridSize);
        this.grid = [];
        
        // Cache des chemins calculés
        this.pathCache = new Map();
        this.maxCacheSize = 1000;
        
        // Statistiques
        this.stats = {
            pathsCalculated: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averagePathLength: 0
        };
        
        this.initializeGrid();
    }

    /**
     * Initialise la grille de navigation
     */
    initializeGrid() {
        this.grid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                this.grid[y][x] = {
                    x: x,
                    y: y,
                    walkable: true,
                    cost: 1,
                    f: 0,
                    g: 0,
                    h: 0,
                    parent: null
                };
            }
        }
    }

    /**
     * Met à jour les dimensions de la grille
     * @param {number} width - Nouvelle largeur
     * @param {number} height - Nouvelle hauteur
     */
    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.gridWidth = Math.ceil(width / this.gridSize);
        this.gridHeight = Math.ceil(height / this.gridSize);
        
        this.initializeGrid();
        this.clearCache();
    }

    /**
     * Marque une zone comme non-traversable
     * @param {number} x - Position X (pixels)
     * @param {number} y - Position Y (pixels)
     * @param {number} radius - Rayon de la zone
     */
    setObstacle(x, y, radius = 20) {
        const gridX = Math.floor(x / this.gridSize);
        const gridY = Math.floor(y / this.gridSize);
        const gridRadius = Math.ceil(radius / this.gridSize);
        
        for (let dy = -gridRadius; dy <= gridRadius; dy++) {
            for (let dx = -gridRadius; dx <= gridRadius; dx++) {
                const nx = gridX + dx;
                const ny = gridY + dy;
                
                if (this.isValidGridPos(nx, ny)) {
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= gridRadius) {
                        this.grid[ny][nx].walkable = false;
                    }
                }
            }
        }
        
        // Invalider le cache car la grille a changé
        this.clearCache();
    }

    /**
     * Marque une zone comme traversable (route)
     * @param {number} x - Position X (pixels)
     * @param {number} y - Position Y (pixels)
     * @param {number} radius - Rayon de la zone
     * @param {number} cost - Coût de traversée (plus bas = plus rapide)
     */
    setRoad(x, y, radius = 15, cost = 0.5) {
        const gridX = Math.floor(x / this.gridSize);
        const gridY = Math.floor(y / this.gridSize);
        const gridRadius = Math.ceil(radius / this.gridSize);
        
        for (let dy = -gridRadius; dy <= gridRadius; dy++) {
            for (let dx = -gridRadius; dx <= gridRadius; dx++) {
                const nx = gridX + dx;
                const ny = gridY + dy;
                
                if (this.isValidGridPos(nx, ny)) {
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= gridRadius) {
                        this.grid[ny][nx].walkable = true;
                        this.grid[ny][nx].cost = cost;
                    }
                }
            }
        }
        
        this.clearCache();
    }

    /**
     * Trouve un chemin entre deux points
     * @param {Object} start - Point de départ {x, y}
     * @param {Object} end - Point d'arrivée {x, y}
     * @param {Object} options - Options de pathfinding
     * @returns {Array|null} - Tableau de points ou null si pas de chemin
     */
    findPath(start, end, options = {}) {
        // Convertir les coordonnées pixel en coordonnées grille
        const startGrid = {
            x: Math.floor(start.x / this.gridSize),
            y: Math.floor(start.y / this.gridSize)
        };
        
        const endGrid = {
            x: Math.floor(end.x / this.gridSize),
            y: Math.floor(end.y / this.gridSize)
        };
        
        // Vérifier la validité des positions
        if (!this.isValidGridPos(startGrid.x, startGrid.y) || 
            !this.isValidGridPos(endGrid.x, endGrid.y)) {
            return null;
        }
        
        // Vérifier le cache
        const cacheKey = this.getCacheKey(startGrid, endGrid);
        if (this.pathCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.convertGridPathToPixels(this.pathCache.get(cacheKey));
        }
        
        this.stats.cacheMisses++;
        
        // Calculer le chemin avec A*
        const gridPath = this.calculateAStar(startGrid, endGrid, options);
        
        if (gridPath) {
            // Mettre en cache si la taille le permet
            if (this.pathCache.size < this.maxCacheSize) {
                this.pathCache.set(cacheKey, [...gridPath]);
            }
            
            // Convertir en coordonnées pixel
            const pixelPath = this.convertGridPathToPixels(gridPath);
            
            // Mettre à jour les statistiques
            this.stats.pathsCalculated++;
            this.stats.averagePathLength = (this.stats.averagePathLength * (this.stats.pathsCalculated - 1) + 
                                          gridPath.length) / this.stats.pathsCalculated;
            
            return pixelPath;
        }
        
        return null;
    }

    /**
     * Calcule un chemin avec l'algorithme A*
     * @param {Object} start - Position de départ sur la grille
     * @param {Object} end - Position d'arrivée sur la grille
     * @param {Object} options - Options
     * @returns {Array|null} - Chemin sur la grille
     */
    calculateAStar(start, end, options = {}) {
        const allowDiagonal = options.allowDiagonal !== false;
        const maxIterations = options.maxIterations || 1000;
        
        // Réinitialiser la grille
        this.resetGridCalculations();
        
        const openList = [];
        const closedList = new Set();
        
        const startNode = this.grid[start.y][start.x];
        const endNode = this.grid[end.y][end.x];
        
        // Si la destination n'est pas traversable, chercher le point le plus proche
        if (!endNode.walkable) {
            const nearestWalkable = this.findNearestWalkable(end.x, end.y);
            if (!nearestWalkable) return null;
            return this.calculateAStar(start, nearestWalkable, options);
        }
        
        startNode.g = 0;
        startNode.h = this.getHeuristic(startNode, endNode);
        startNode.f = startNode.g + startNode.h;
        
        openList.push(startNode);
        
        let iterations = 0;
        
        while (openList.length > 0 && iterations < maxIterations) {
            iterations++;
            
            // Trouver le nœud avec le plus petit f
            openList.sort((a, b) => a.f - b.f);
            const currentNode = openList.shift();
            
            // Ajouter à la liste fermée
            closedList.add(this.getNodeKey(currentNode));
            
            // Vérifier si on a atteint la destination
            if (currentNode.x === end.x && currentNode.y === end.y) {
                return this.reconstructPath(currentNode);
            }
            
            // Examiner les voisins
            const neighbors = this.getNeighbors(currentNode, allowDiagonal);
            
            for (const neighbor of neighbors) {
                const neighborKey = this.getNodeKey(neighbor);
                
                if (!neighbor.walkable || closedList.has(neighborKey)) {
                    continue;
                }
                
                const tentativeG = currentNode.g + this.getMovementCost(currentNode, neighbor);
                
                const inOpenList = openList.includes(neighbor);
                
                if (!inOpenList || tentativeG < neighbor.g) {
                    neighbor.parent = currentNode;
                    neighbor.g = tentativeG;
                    neighbor.h = this.getHeuristic(neighbor, endNode);
                    neighbor.f = neighbor.g + neighbor.h;
                    
                    if (!inOpenList) {
                        openList.push(neighbor);
                    }
                }
            }
        }
        
        // Aucun chemin trouvé
        return null;
    }

    /**
     * Trouve le point traversable le plus proche
     * @param {number} x - Position X sur la grille
     * @param {number} y - Position Y sur la grille
     * @returns {Object|null} - Position la plus proche ou null
     */
    findNearestWalkable(x, y) {
        const maxRadius = 10;
        
        for (let radius = 1; radius <= maxRadius; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (this.isValidGridPos(nx, ny) && this.grid[ny][nx].walkable) {
                            return { x: nx, y: ny };
                        }
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Obtient les voisins d'un nœud
     * @param {Object} node - Nœud actuel
     * @param {boolean} allowDiagonal - Autoriser les mouvements diagonaux
     * @returns {Array} - Liste des voisins
     */
    getNeighbors(node, allowDiagonal = true) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 }, // Haut
            { x: 1, y: 0 },  // Droite
            { x: 0, y: 1 },  // Bas
            { x: -1, y: 0 }  // Gauche
        ];
        
        if (allowDiagonal) {
            directions.push(
                { x: -1, y: -1 }, // Haut-gauche
                { x: 1, y: -1 },  // Haut-droite
                { x: 1, y: 1 },   // Bas-droite
                { x: -1, y: 1 }   // Bas-gauche
            );
        }
        
        for (const dir of directions) {
            const x = node.x + dir.x;
            const y = node.y + dir.y;
            
            if (this.isValidGridPos(x, y)) {
                neighbors.push(this.grid[y][x]);
            }
        }
        
        return neighbors;
    }

    /**
     * Calcule la distance heuristique entre deux nœuds
     * @param {Object} nodeA - Premier nœud
     * @param {Object} nodeB - Deuxième nœud
     * @returns {number} - Distance heuristique
     */
    getHeuristic(nodeA, nodeB) {
        // Distance de Manhattan avec ajustement diagonal
        const dx = Math.abs(nodeA.x - nodeB.x);
        const dy = Math.abs(nodeA.y - nodeB.y);
        
        // Heuristique octile (plus précise pour les mouvements diagonaux)
        return Math.max(dx, dy) + (Math.sqrt(2) - 1) * Math.min(dx, dy);
    }

    /**
     * Calcule le coût de mouvement entre deux nœuds
     * @param {Object} nodeA - Premier nœud
     * @param {Object} nodeB - Deuxième nœud
     * @returns {number} - Coût de mouvement
     */
    getMovementCost(nodeA, nodeB) {
        const dx = Math.abs(nodeA.x - nodeB.x);
        const dy = Math.abs(nodeA.y - nodeB.y);
        
        // Mouvement diagonal coûte sqrt(2), mouvement cardinal coûte 1
        const baseCost = (dx === 1 && dy === 1) ? Math.sqrt(2) : 1;
        
        // Appliquer le coût du terrain de destination
        return baseCost * nodeB.cost;
    }

    /**
     * Reconstruit le chemin depuis le nœud de destination
     * @param {Object} endNode - Nœud de destination
     * @returns {Array} - Chemin reconstruit
     */
    reconstructPath(endNode) {
        const path = [];
        let currentNode = endNode;
        
        while (currentNode) {
            path.unshift({ x: currentNode.x, y: currentNode.y });
            currentNode = currentNode.parent;
        }
        
        return path;
    }

    /**
     * Convertit un chemin de grille en coordonnées pixel
     * @param {Array} gridPath - Chemin sur la grille
     * @returns {Array} - Chemin en pixels
     */
    convertGridPathToPixels(gridPath) {
        return gridPath.map(point => ({
            x: point.x * this.gridSize + this.gridSize / 2,
            y: point.y * this.gridSize + this.gridSize / 2
        }));
    }

    /**
     * Vérifie si une position sur la grille est valide
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {boolean} - True si valide
     */
    isValidGridPos(x, y) {
        return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
    }

    /**
     * Génère une clé de cache pour deux positions
     * @param {Object} start - Position de départ
     * @param {Object} end - Position d'arrivée
     * @returns {string} - Clé de cache
     */
    getCacheKey(start, end) {
        return `${start.x},${start.y}-${end.x},${end.y}`;
    }

    /**
     * Génère une clé unique pour un nœud
     * @param {Object} node - Nœud
     * @returns {string} - Clé du nœud
     */
    getNodeKey(node) {
        return `${node.x},${node.y}`;
    }

    /**
     * Réinitialise les calculs de la grille
     */
    resetGridCalculations() {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const node = this.grid[y][x];
                node.f = 0;
                node.g = 0;
                node.h = 0;
                node.parent = null;
            }
        }
    }

    /**
     * Vide le cache des chemins
     */
    clearCache() {
        this.pathCache.clear();
    }

    /**
     * Optimise le chemin en supprimant les points inutiles
     * @param {Array} path - Chemin à optimiser
     * @returns {Array} - Chemin optimisé
     */
    optimizePath(path) {
        if (path.length <= 2) return path;
        
        const optimized = [path[0]];
        
        for (let i = 1; i < path.length - 1; i++) {
            const prev = optimized[optimized.length - 1];
            const curr = path[i];
            const next = path[i + 1];
            
            // Vérifier si on peut aller directement du point précédent au suivant
            if (!this.hasLineOfSight(prev, next)) {
                optimized.push(curr);
            }
        }
        
        optimized.push(path[path.length - 1]);
        return optimized;
    }

    /**
     * Vérifie s'il y a une ligne de vue entre deux points
     * @param {Object} start - Point de départ
     * @param {Object} end - Point d'arrivée
     * @returns {boolean} - True s'il y a une ligne de vue
     */
    hasLineOfSight(start, end) {
        const startGrid = {
            x: Math.floor(start.x / this.gridSize),
            y: Math.floor(start.y / this.gridSize)
        };
        const endGrid = {
            x: Math.floor(end.x / this.gridSize),
            y: Math.floor(end.y / this.gridSize)
        };
        
        // Algorithme de Bresenham pour tracer une ligne
        const dx = Math.abs(endGrid.x - startGrid.x);
        const dy = Math.abs(endGrid.y - startGrid.y);
        const sx = startGrid.x < endGrid.x ? 1 : -1;
        const sy = startGrid.y < endGrid.y ? 1 : -1;
        let err = dx - dy;
        
        let x = startGrid.x;
        let y = startGrid.y;
        
        while (true) {
            // Vérifier si le point actuel est traversable
            if (!this.isValidGridPos(x, y) || !this.grid[y][x].walkable) {
                return false;
            }
            
            if (x === endGrid.x && y === endGrid.y) break;
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
        
        return true;
    }

    /**
     * Obtient les statistiques du système de pathfinding
     * @returns {Object} - Statistiques
     */
    getStatistics() {
        return {
            ...this.stats,
            cacheSize: this.pathCache.size,
            gridSize: `${this.gridWidth}x${this.gridHeight}`,
            hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100
        };
    }

    /**
     * Dessine la grille de navigation (debug)
     * @param {CanvasRenderingContext2D} ctx - Contexte de rendu
     */
    debugDraw(ctx) {
        ctx.save();
        
        // Dessiner la grille
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const node = this.grid[y][x];
                const pixelX = x * this.gridSize;
                const pixelY = y * this.gridSize;
                
                if (!node.walkable) {
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                    ctx.fillRect(pixelX, pixelY, this.gridSize, this.gridSize);
                } else if (node.cost < 1) {
                    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
                    ctx.fillRect(pixelX, pixelY, this.gridSize, this.gridSize);
                }
                
                // Grille
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.strokeRect(pixelX, pixelY, this.gridSize, this.gridSize);
            }
        }
        
        ctx.restore();
    }

    /**
     * Dessine un chemin (debug)
     * @param {CanvasRenderingContext2D} ctx - Contexte de rendu
     * @param {Array} path - Chemin à dessiner
     */
    debugDrawPath(ctx, path) {
        if (!path || path.length < 2) return;
        
        ctx.save();
        ctx.strokeStyle = '#FF6B35';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        
        ctx.stroke();
        
        // Dessiner les points du chemin
        ctx.fillStyle = '#FF6B35';
        for (const point of path) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

export { PathfindingSystem };