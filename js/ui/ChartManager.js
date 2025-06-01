class ChartManager {
    constructor() {
        this.charts = {};
    }

    createResourceChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        this.drawSimpleLineChart(ctx, data, canvas.width, canvas.height);
    }

    drawSimpleLineChart(ctx, data, width, height) {
        ctx.clearRect(0, 0, width, height);
        
        if (!data || data.length < 2) return;
        
        const margin = 20;
        const chartWidth = width - 2 * margin;
        const chartHeight = height - 2 * margin;
        
        // Trouve min/max pour l'échelle
        const values = data.map(d => d.value);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const range = maxValue - minValue || 1;
        
        // Dessine les axes
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin, margin);
        ctx.lineTo(margin, height - margin);
        ctx.lineTo(width - margin, height - margin);
        ctx.stroke();
        
        // Dessine la ligne
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = margin + (index / (data.length - 1)) * chartWidth;
            const y = height - margin - ((point.value - minValue) / range) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }

    updateChart(chartId, newData) {
        if (this.charts[chartId]) {
            this.charts[chartId].data = newData;
            this.charts[chartId].render();
        }
    }
}

export { ChartManager };