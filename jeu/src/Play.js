import { createCard } from './createCard.js';

let i = 0;

//let go = [];
/**
 * Card Memory Game by Francisco Pereira (Gammafp)
 * -----------------------------------------------
 *
 * Test your memory skills in this classic game of matching pairs.
 * Flip over cards to reveal pictures, and try to remember where each image is located.
 * Match all the pairs to win!
 *
 * Music credits:
 * "Fat Caps" by Audionautix is licensed under the Creative Commons Attribution 4.0 license. https://creativecommons.org/licenses/by/4.0/
 * Artist http://audionautix.com/
 */

export class Play extends Phaser.Scene
{
    // All cards names
    cardNames = ["card-0", "card-1", "card-2", "card-3", "card-4", "card-5"];
    // Cards Game Objects
    cards = [];

    // History of card opened
    cardOpened = undefined;

    // Can play the game
    canMove = false;

    // Game variables
    lives = 0;

    go = [];

    // Grid configuration
    gridConfiguration = {
        x: 113,
        y: 102,
        paddingX: 10,
        paddingY: 10
    }

    players = [];

    isMyTurn = false;

    constructor ()
    {
        super({
            key: 'Play'
        });
        
    }

    init ()
    {
        // Fadein camera
        this.cameras.main.fadeIn(500);
        this.lives = 10;
        this.volumeButton();
    }

    create ()
    {
        // Lancement du jeu
        this.startGame();
        
    }

    restartGame ()
    {
        // Supprime les événements de l'ancien jeu
        this.socket.off('score');
        this.socket.off('players');
        this.socket.off('endGameMessage');
        this.socket.off('cardFlip');
        this.socket.off('match');
        this.socket.off('noMatch');
        

        // Redémarre le jeu
        this.cardOpened = undefined;
        this.cameras.main.fadeOut(200 * this.cards.length);
        this.cards.reverse().map((card, index) => {
            this.add.tween({
                targets: card.gameObject,
                duration: 500,
                y: 1000,
                delay: index * 100,
                onComplete: () => {
                    card.gameObject.destroy();
                }
            })
        });

        this.time.addEvent({
            delay: 200 * this.cards.length,
            callback: () => {
                this.cards = [];
                this.canMove = false;
                this.gridCardNames = [];
                this.scene.start('WaitingRoom');
                this.sound.play("card-slide", { volume: 1.2 });
                this.scene.stop('Play');
            }
        })
    }

    createGridCards (gridCardNames)
    {
        //Crée la grille de cartes
       
        return gridCardNames.map((name, index) => {
            const newCard = createCard({
                scene: this,
                x: this.gridConfiguration.x + (98 + this.gridConfiguration.paddingX) * (index % 4),
                y: -1000,
                frontTexture: name,
                cardName: name
            });
            this.add.tween({
                targets: newCard.gameObject,
                duration: 800,
                delay: index * 100,
                onStart: () => this.sound.play("card-slide", { volume: 1.2 }),
                y: this.gridConfiguration.y + (128 + this.gridConfiguration.paddingY) * Math.floor(index / 4)
            })
            return newCard;
        });
    }

    volumeButton ()
    {
        const volumeIcon = this.add.image(25, 25, "volume-icon").setName("volume-icon");
        volumeIcon.setInteractive();

        // Mouse enter
        volumeIcon.on(Phaser.Input.Events.POINTER_OVER, () => {
            this.input.setDefaultCursor("pointer");
        });
        // Mouse leave
        volumeIcon.on(Phaser.Input.Events.POINTER_OUT, () => {
            this.input.setDefaultCursor("default");
        });


        volumeIcon.on(Phaser.Input.Events.POINTER_DOWN, () => {
            if (this.sound.volume === 0) {
                this.sound.setVolume(1);
                volumeIcon.setTexture("volume-icon");
                volumeIcon.setAlpha(1);
            } else {
                this.sound.setVolume(0);
                volumeIcon.setTexture("volume-icon_off");
                volumeIcon.setAlpha(.5)
            }
        });
    }

    startGame ()
    {
        // Récupération du socket
        if (!this.socket) {
            this.socket = this.scene.get('WaitingRoom').data.get('socket');
        }
        // Récupération de la grille de cartes
        this.grid = this.scene.get('WaitingRoom').data.get('grid');
        
        // Score Text
        this.playerScore = 0;
        this.scoreText = this.add.text(100, 490, 'Vous : \nScore: 0', { fontSize: '32px', fill: '#fff' });
        this.scoreTextTwo = this.add.text(300, 490, 'Joueur 2 : \nScore: 0', { fontSize: '32px', fill: '#fff' });

        // Turn Text
        this.turnText = this.add.text(100, 10, 'C\'est à vous de jouer', { fontSize: '20px', fill: '#fff' });

        // Affichage du score
        this.socket.on('score', (players) => {
            this.playerScore = players[this.socket.id].score;
            this.scoreText.setText('Vous : \nScore: ' + this.playerScore);
            this.scoreTextTwo.setText('Joueur 2 : \nScore: ' + players[Object.keys(players).find(player => player !== this.socket.id)].score);
        });
        
        // WinnerText and GameOverText
        const winnerText = this.add.text(this.sys.game.scale.width / 2, -1000, "YOU WIN",
            { align: "center", strokeThickness: 4, fontSize: 40, fontStyle: "bold", color: "#8c7ae6" }
        ).setOrigin(.5)
            .setDepth(3)
            .setInteractive();

        const gameOverText = this.add.text(this.sys.game.scale.width / 2, -1000,
            "GAME OVER\nClick to restart",
            { align: "center", strokeThickness: 4, fontSize: 40, fontStyle: "bold", color: "#ff0000" }
        )
            .setName("gameOverText")
            .setDepth(3)
            .setOrigin(.5)
            .setInteractive();

        const egalityText = this.add.text(this.sys.game.scale.width / 2, -1000,
            "EGALITE\nClick to restart",
            { align: "center", strokeThickness: 4, fontSize: 40, fontStyle: "bold", color: "#ff0000" }
        )
            .setName("egalityText")
            .setDepth(3)
            .setOrigin(.5)
            .setInteractive();

        // Start canMove
        this.time.addEvent({
            delay: 200 * this.cards.length,
            callback: () => {
                this.canMove = true;
            }
        });

        // Game Logic
        this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer) => {
            if (this.canMove) {
                const card = this.cards.find(card => card.gameObject.hasFaceAt(pointer.x, pointer.y));
                if (card) {
                    this.input.setDefaultCursor("pointer");
                } else {
                    if(this.go[0]) {
                        if(this.go[0].name !== "volume-icon") {
                            this.input.setDefaultCursor("pointer");
                        }
                    } else {
                        this.input.setDefaultCursor("default");
                    }
                }
            }
        });

        //Pour savoir si c'est mon tour
        this.socket.on('players', (players) => {
            this.players = players;
            this.isMyTurn = this.players[this.socket.id].turn;
            if (this.isMyTurn) {
                //mettre en vert le texte turn text
                this.turnText.setColor("#00FF00");
                this.turnText.setText('C\'est à vous de jouer');
            } else {
                this.turnText.setColor("#FF0000");
                this.turnText.setText('C\'est à l\'adversaire de jouer');
            }
        });
       

        this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer) => {
            
            //Si c'est mon tour je peux jouer
            if(this.isMyTurn) {
                if (this.canMove && this.cards.length) {
                    const card = this.cards.find(card => card.gameObject.hasFaceAt(pointer.x, pointer.y));

                    if (card) {

                        this.canMove = false;
                        this.socket.emit('cardFlipped', { cardName: card.cardName, x: card.gameObject.x, y: card.gameObject.y });

                        // Detect if there is a card opened
                        if (this.cardOpened !== undefined) {

                            // If the card is the same that the opened not do anything
                            if (this.cardOpened.gameObject.x === card.gameObject.x && this.cardOpened.gameObject.y === card.gameObject.y) {
                                this.canMove = true;
                                
                                return false;
                            }
                            

                            card.flip(() => {


                                if (this.cardOpened.cardName === card.cardName) {
                                    // ------- Match -------
                                    
                                    this.sound.play("card-match");
                                    
                                    this.socket.emit('point');
                                    
                                    // Destroy card selected and card opened from history
                                    this.cardOpened.destroy();
                                    card.destroy();

                                    // remove card destroyed from array
                                    this.cards = this.cards.filter(cardLocal => cardLocal.cardName !== card.cardName);
                                    
                                    // reset history card opened
                                    this.cardOpened = undefined;
                                    this.canMove = true;

                                } else {
                                    // ------- No match -------
                                    this.sound.play("card-mismatch");
                                   
                                    this.cameras.main.shake(600, 0.01);

                                    // Flip last card selected and flip the card opened from history and reset history
                                    card.flip();
                                    this.cardOpened.flip(() => {
                                        this.cardOpened = undefined;
                                        this.canMove = true;

                                    });
                                    this.socket.emit('turn');

                                }

                                // Check if the game is won
                                if (this.cards.length === 0) {
                                    this.socket.emit('endGame');
                                }
                            });

                        } else if (this.cardOpened === undefined && this.cards.length > 0) {
                            // If there is not a card opened save the card selected
                           
                            card.flip(() => {
                                this.canMove = true;
                            });
                            this.cardOpened = card;
                        }
                    }
                }
            }

        });

        // Creation des cartes
        this.cards = this.createGridCards(this.grid);
       
        // Envoi du premier tour
        this.socket.emit('firstTurn');

        // Evenements de fin de jeu
        this.socket.on('endGameMessage', (players) => {
            
            if (players[this.socket.id].score > players[Object.keys(players).find(player => player !== this.socket.id)].score) {
                this.sound.play("whoosh", { volume: 1.3 });
                this.sound.play("victory");

                this.add.tween({
                    targets: winnerText,
                    ease: Phaser.Math.Easing.Bounce.Out,
                    y: this.sys.game.scale.height / 2,
                });
                this.canMove = false;
            } else if(players[this.socket.id].score < players[Object.keys(players).find(player => player !== this.socket.id)].score) {
                this.sound.play("whoosh", { volume: 1.3 });
                this.add.tween({
                    targets: gameOverText,
                    ease: Phaser.Math.Easing.Bounce.Out,
                    y: this.sys.game.scale.height / 2,
                });

                this.canMove = false;
            } else {
                this.sound.play("whoosh", { volume: 1.3 });
                this.add.tween({
                    targets: egalityText,
                    ease: Phaser.Math.Easing.Bounce.Out,
                    y: this.sys.game.scale.height / 2,
                });

                this.canMove = false;
            }
            
        });

        // Evenements de retournement de cartes
        this.socket.on('cardFlip', (cardData) => {
            const card = this.cards.find(c => c.cardName === cardData.cardName && c.gameObject.x === cardData.x && c.gameObject.y === cardData.y);
            card.flip();
            
        });      

        // Evenements en cas de match
        this.socket.on('match', (cardData) => {
            // Récupération des cartes
            const card1 = this.cards.find(c => c.cardName === cardData[0].cardName && c.gameObject.x === cardData[0].x && c.gameObject.y === cardData[0].y);
            const card2 = this.cards.find(c => c.cardName === cardData[1].cardName && c.gameObject.x === cardData[1].x && c.gameObject.y === cardData[1].y);
            
            card2.flip(() => {
                if (card1 && card2) {
                    this.sound.play("card-match");
                    card1.destroy();
                    card2.destroy();
                    this.cards = this.cards.filter(cardLocal => cardLocal.cardName !== cardData[0].cardName);
                    this.canMove = true;
                }
            });
            
        });
        
        this.socket.on('noMatch', (cardData) => {
            // Récupération des cartes
            const card1 = this.cards.find(c => c.cardName === cardData[0].cardName && c.gameObject.x === cardData[0].x && c.gameObject.y === cardData[0].y);
            const card2 = this.cards.find(c => c.cardName === cardData[1].cardName && c.gameObject.x === cardData[1].x && c.gameObject.y === cardData[1].y);
            card2.flip(() => {
                this.sound.play("card-mismatch");
                this.cameras.main.shake(600, 0.01);

                // Flip les cartes retournées
                card2.flip();
                card1.flip(() => {
                    this.cardOpened = undefined;
                    this.canMove = true;

                });
            });
            
        });
        

    
        // Text events
        winnerText.on(Phaser.Input.Events.POINTER_OVER, () => {
            winnerText.setColor("#FF7F50");
            this.input.setDefaultCursor("pointer");
        });
        winnerText.on(Phaser.Input.Events.POINTER_OUT, () => {
            winnerText.setColor("#8c7ae6");
            this.input.setDefaultCursor("default");
        });
        winnerText.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.sound.play("whoosh", { volume: 1.3 });
            this.add.tween({
                targets: winnerText,
                ease: Phaser.Math.Easing.Bounce.InOut,
                y: -1000,
                onComplete: () => {
                    this.restartGame();
                }
            })
        });

        gameOverText.on(Phaser.Input.Events.POINTER_OVER, () => {
            gameOverText.setColor("#FF7F50");
            this.input.setDefaultCursor("pointer");
        });

        gameOverText.on(Phaser.Input.Events.POINTER_OUT, () => {
            gameOverText.setColor("#8c7ae6");
            this.input.setDefaultCursor("default");
        });

        gameOverText.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.add.tween({
                targets: gameOverText,
                ease: Phaser.Math.Easing.Bounce.InOut,
                y: -1000,
                onComplete: () => {
                    this.restartGame();
                }
            })
        });

        egalityText.on(Phaser.Input.Events.POINTER_OVER, () => {
            egalityText.setColor("#FF7F50");
            this.input.setDefaultCursor("pointer");
        });

        egalityText.on(Phaser.Input.Events.POINTER_OUT, () => {
            egalityText.setColor("#8c7ae6");
            this.input.setDefaultCursor("default");
        });

        egalityText.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.add.tween({
                targets: egalityText,
                ease: Phaser.Math.Easing.Bounce.InOut,
                y: -1000,
                onComplete: () => {
                    this.restartGame();
                }
            })
        });
    }

}
