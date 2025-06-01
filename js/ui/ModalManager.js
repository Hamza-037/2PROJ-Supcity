class ModalManager {
    constructor() {
        this.modal = document.getElementById('modal');
        this.modalBody = document.getElementById('modalBody');
        this.modalClose = this.modal?.querySelector('.modal-close');
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.modalClose) {
            this.modalClose.addEventListener('click', () => this.hide());
        }

        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.hide();
            });
        }
    }

    show(title, content) {
        if (!this.modal || !this.modalBody) return;

        this.modalBody.innerHTML = `
            <h2>${title}</h2>
            <div>${content}</div>
        `;

        this.modal.classList.add('active');
    }

    hide() {
        if (this.modal) {
            this.modal.classList.remove('active');
        }
    }

    showHelp() {
        this.show('❓ Aide - SupCity', `
            <h3>🎯 Objectif</h3>
            <p>Développez votre civilisation depuis l'âge préhistorique !</p>
            
            <h3>🏗️ Construction</h3>
            <ul>
                <li>Sélectionnez un bâtiment dans l'onglet Construction</li>
                <li>Cliquez sur la carte pour le placer</li>
                <li>Vérifiez que vous avez les ressources nécessaires</li>
            </ul>
            
            <h3>📊 Ressources</h3>
            <ul>
                <li>🥕 Nourriture: Essentielle pour la survie</li>
                <li>🪵 Bois: Matériau de construction de base</li>
                <li>🪨 Pierre: Construction avancée</li>
                <li>💧 Eau: Besoin vital des citoyens</li>
                <li>🔬 Recherche: Débloquer de nouvelles technologies</li>
            </ul>
            
            <h3>⌨️ Contrôles</h3>
            <ul>
                <li>Clic gauche: Sélectionner/Placer</li>
                <li>Molette: Zoomer</li>
                <li>Boutons de vitesse: Contrôler le temps</li>
            </ul>
        `);
    }
}