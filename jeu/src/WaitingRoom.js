export class WaitingRoom extends Phaser.Scene {

    constructor() {
        super({ key: 'WaitingRoom' });
        this.players = {};
    }   

    preload() {
    }

    create() {
        console.log('WaitingRoom');
        //importer le socket depuis la scène Preloader
        this.socket = this.scene.get('Preloader').data.get('socket');
        //Supprimer tous les écouteurs d'événements du socket
        this.socket.removeAllListeners();

        // Background image
        this.add.image(50, 50, "background").setOrigin(0);

        // Title text
        const titleText = this.add.text(this.sys.game.scale.width / 2, this.sys.game.scale.height / 2,
            "Memory Card Game\nClick to Play\nAttention :\nNe se joue qu'à 2 joueurs !",
            { align: "center", strokeThickness: 4, fontSize: 30, fontStyle: "bold", color: "#8c7ae6" }
        )
            .setOrigin(.5)
            .setDepth(3)
            .setInteractive();
        
        this.add.tween({
            targets: titleText,
            duration: 800,
            ease: (value) => (value > .8),
            alpha: 0,
            repeat: -1,
            yoyo: true,
        });

        titleText.on(Phaser.Input.Events.POINTER_OVER, () => {
            titleText.setColor("#9c88ff");
            this.input.setDefaultCursor("pointer");
        });
        titleText.on(Phaser.Input.Events.POINTER_OUT, () => {
            titleText.setColor("#8c7ae6");
            this.input.setDefaultCursor("default");
        });

        titleText.on(Phaser.Input.Events.POINTER_DOWN, () => {
            
            this.sound.play("whoosh", { volume: 1.3 });
            this.add.tween({
                targets: titleText,
                ease: Phaser.Math.Easing.Bounce.InOut,
                y: -1000,
                onComplete: () => {
                    if (!this.sound.get("theme-song")) {
                        this.sound.play("theme-song", { loop: true, volume: .5 });
                    }
                    // Écouteur pour mettre à jour la liste des joueurs et mettre le joueur actuel en prêt
                    this.socket.emit('playerReady');
                }
            });
        });

        // Écouteur pour mettre à jour la liste des joueurs
        this.socket.on('updatePlayers', (players) => {
            this.players = (players);
            
            const readyPlayers = Object.values(players).filter(player => player.ready);
            
            if (Object.keys(this.players).length >= 2 && readyPlayers.length === 2) {//vérifier si on a 2 joueurs prêts
                this.socket.emit('startGame');
            } else if (players[this.socket.id].ready){ //sinon, on attend, uniquement si le joueur actuel est prêt
                this.add.text(this.sys.game.scale.width / 2, this.sys.game.scale.height / 2 + 50,
                    "En attente d'un\n second joueur...\n\nLe jeu commencera\nautomatiquement\nlorsque 2 joueurs\nsont prêts.",
                    { align: "center", fontSize: 30, color: "#fff" }
                ).setOrigin(0.5);
            }
        });

        // Écouteur pour démarrer le jeu
        this.socket.on('gameStarted', (grid) => {
            //on passe le socket à la scène Play
            this.data.set('socket', this.socket);
            //on passe la grille à la scène Play
            this.data.set('grid', grid);
            //on démarre la scène Play
            this.scene.start('Play');
            //on arrête la scène WaitingRoom
            this.scene.stop('WaitingRoom');
        });
    }

    update() {}
    
}
