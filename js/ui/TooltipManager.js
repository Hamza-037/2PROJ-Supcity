class TooltipManager {
    constructor() {
        this.tooltip = null;
        this.setupTooltips();
    }

    setupTooltips() {
        document.addEventListener('mouseover', (e) => {
            if (e.target.hasAttribute('data-tooltip')) {
                this.show(e.target, e.target.getAttribute('data-tooltip'));
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.hasAttribute('data-tooltip')) {
                this.hide();
            }
        });
    }

    show(element, text) {
        this.hide(); // Supprime le tooltip existant
        
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tooltip-popup';
        this.tooltip.textContent = text;
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 10000;
            white-space: nowrap;
        `;
        
        document.body.appendChild(this.tooltip);
        
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        this.tooltip.style.left = (rect.left + rect.width/2 - tooltipRect.width/2) + 'px';
        this.tooltip.style.top = (rect.top - tooltipRect.height - 5) + 'px';
    }

    hide() {
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
    }
}

export { TooltipManager };