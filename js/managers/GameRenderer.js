import { eventSystem, GameEvents } from '../core/EventSystem.js';

class GameRenderer {
    constructor(game) {
        this.game = game;
    }

    render() {
        const { canvas, ctx } = this.game;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.3, '#98FB98');
        gradient.addColorStop(1, '#228B22');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.game.buildings.forEach(b => this.renderBuilding(b));
        this.game.citizens.forEach(c => this.renderCitizen(c));
        this.game.particleSystem.render();

        if (this.game.selectedBuildingType) {
            this.renderConstructionCursor();
        }
    }

    renderConstructionCursor() {
        const { ctx } = this.game;
        const type = this.game.selectedBuildingType;
        if (!type) return;
        const data = this.game.buildingDataManager.getBuildingData(type);
        if (!data) return;
        const x = this.game.mouseX;
        const y = this.game.mouseY;
        const size = data.size || 20;

        ctx.save();
        const canBuild = !this.game.checkBuildingCollision(x, y, size);
        const hasResources = this.game.buildingDataManager.canBuild(
            type,
            this.game.resourceManager.getSummary(),
            this.game.researchSystem.getUnlockedResearch()
        ).canBuild;
        const isValid = canBuild && hasResources;
        const strokeColor = isValid ? '#00FF00' : '#FF0000';
        const fillColor = isValid ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)';

        ctx.globalAlpha = 0.4;
        ctx.fillStyle = fillColor;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([8,4]);
        ctx.strokeRect(x - size / 2, y - size / 2, size, size);

        ctx.globalAlpha = 0.7;
        ctx.fillStyle = data.color || '#888';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, y, size/2.5, 0, Math.PI*2);
        ctx.fill();

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (data.icon) {
            ctx.globalAlpha = 1;
            ctx.font = `${Math.floor(size/2.5)}px Arial`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.strokeText(data.icon, x, y);
            ctx.fillText(data.icon, x, y);
        }

        if (this.game.config.debugMode) {
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(x-10, y);
            ctx.lineTo(x+10, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y-10);
            ctx.lineTo(x, y+10);
            ctx.stroke();
        }

        ctx.globalAlpha = 0.9;
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const name = data.name || type;
        ctx.strokeText(name, x, y + size/2 + 10);
        ctx.fillText(name, x, y + size/2 + 10);

        if (!hasResources) {
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = '#FF6666';
            const costText = this.game.buildingDataManager.getFormattedCost(type);
            if (costText) {
                ctx.strokeText(`Coût: ${costText}`, x, y + size/2 + 25);
                ctx.fillText(`Coût: ${costText}`, x, y + size/2 + 25);
            }
        }

        ctx.restore();
    }

    renderBuilding(building) {
        const { ctx } = this.game;
        const x = building.x;
        const y = building.y;
        const size = building.size;

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(x+2, y + size/2 +2, size/2, size/6, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = building.color || '#888';
        switch (building.type) {
            case 'fire':
                for (let i=0;i<5;i++) {
                    const flameHeight = size/2 + Math.sin(building.animation*4+i)*size/8;
                    const flameX = x + (i-2)*size/8;
                    ctx.fillStyle = i%2===0 ? '#FF4500' : '#FF6500';
                    ctx.beginPath();
                    ctx.ellipse(flameX, y - flameHeight/4, size/12, flameHeight, 0, 0, Math.PI*2);
                    ctx.fill();
                }
                ctx.fillStyle = '#654321';
                ctx.fillRect(x - size/3, y + size/4, size/1.5, size/6);
                break;
            case 'hut':
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x - size/2, y - size/4, size, size/2);
                ctx.fillStyle = '#654321';
                ctx.beginPath();
                ctx.moveTo(x - size/1.5, y - size/4);
                ctx.lineTo(x, y - size/1.2);
                ctx.lineTo(x + size/1.5, y - size/4);
                ctx.closePath();
                ctx.fill();
                break;
            default:
                ctx.fillRect(x - size/2, y - size/2, size, size);
                if (building.icon) {
                    ctx.font = `${size/2}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.fillStyle = 'white';
                    ctx.fillText(building.icon, x, y + size/6);
                }
        }

        if (building.maxWorkers > 0) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            const text = `${building.workers.length}/${building.maxWorkers}`;
            ctx.strokeText(text, x, y - size/2 -5);
            ctx.fillText(text, x, y - size/2 -5);
        }

        if (this.game.config.debugMode && building.attractsPeople) {
            ctx.strokeStyle = 'rgba(0,255,0,0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5,5]);
            ctx.beginPath();
            ctx.arc(x, y, building.attractionRange || 200, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();
    }

    renderCitizen(citizen) {
        const { ctx } = this.game;
        const x = citizen.x;
        const y = citizen.y;

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y+8, 6,3,0,0,Math.PI*2);
        ctx.fill();

        ctx.fillStyle = citizen.color?.cloth || '#4169E1';
        ctx.fillRect(x-4, y-3, 8,12);
        ctx.fillStyle = citizen.color?.skin || '#FDBCB4';
        ctx.beginPath();
        ctx.arc(x, y-8, 5, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.fillRect(x-2, y-9,1,1);
        ctx.fillRect(x+1, y-9,1,1);

        if (this.game.config.debugMode) {
            ctx.fillStyle = this.getCitizenStateColor(citizen.state);
            ctx.beginPath();
            ctx.arc(x, y-15,3,0,Math.PI*2);
            ctx.fill();
            ctx.fillStyle='white';
            ctx.font='bold 8px Arial';
            ctx.textAlign='center';
            ctx.strokeStyle='black';
            ctx.lineWidth=2;
            ctx.strokeText(citizen.name.split(' ')[0], x, y-20);
            ctx.fillText(citizen.name.split(' ')[0], x, y-20);
        }
        ctx.restore();
    }

    getCitizenStateColor(state){
        const colors={
            idle:'#888888',
            seeking_food:'#FF6B35',
            seeking_water:'#4169E1',
            working:'#32CD32',
            sleeping:'#9370DB',
            socializing:'#FFD700',
            wandering:'#20B2AA'
        };
        return colors[state] || '#888888';
    }
}

export { GameRenderer };
