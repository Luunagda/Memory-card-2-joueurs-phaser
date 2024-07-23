import { Preloader } from './Preloader.js';
import { Play } from './Play.js';
import { WaitingRoom } from './WaitingRoom.js';


const config = {
    title: 'Card Memory Game',
    type: Phaser.AUTO,
    width: 549,
    height: 580,
    parent: 'game-container',
    backgroundColor: '#192a56',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [
        Preloader,
        WaitingRoom,
        Play
    ]
};

new Phaser.Game(config);