const express = require('express');
const { createServer } = require('http');
const { join } = require('path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static(join(__dirname, 'jeu')));
app.use(express.static(join(__dirname, 'jeu/public')));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'jeu', 'index.html'));
});

const players = {};

const cardGrid = [];

const flipCard = [];


// Votre tableau de cartes
let cardNames = ["card-0", "card-1", "card-2", "card-3", "card-4", "card-5"];

// Dupliquer le tableau de cartes pour avoir deux exemplaires de chaque carte
let gridCardNames = [...cardNames, ...cardNames];

// Fonction de mélange de type Fisher-Yates
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Initialisation du serveur de jeu 
io.on('connection', (socket) => {

  // Créer un nouvel objet joueur et l'ajouter à la liste des joueurs
  players[socket.id] = {
    id: socket.id,
    username: `Joueur ${Object.keys(players).length + 1}`,
    score: 0,
    ready: false,
    turn: false,
    partie: 0,
  };
  
  console.log('a user connected');

  // Suppression du joueur lorsqu'il se déconnecte 
  socket.on('disconnect', () => {
    console.log('user disconnected');
    delete players[socket.id];
    io.emit('updatePlayers', players);
  });
  
  // Envoi de la liste des joueurs à tous les joueurs connectés
  socket.on('playerReady', () => {
    if (players[socket.id]) {
      players[socket.id].ready = true;
      socket.emit('updatePlayers', players);
    }
  });


  socket.on('startGame', () => {
    // Création d'une grille de cartes mélangée
    this.shuffleGrid = shuffle(gridCardNames);

    if (cardGrid.length == 0) {
      cardGrid.push(this.shuffleGrid);
    }
   
    const readyPlayers = Object.values(players).filter(player => player.ready);

    // Vérifier si le nombre de joueurs prêts est supérieur ou égal à 2 et si c'est le cas, démarrer le jeu et envoyer la grille de cartes mélangée
    if (readyPlayers.length >= 2) {
      io.emit('gameStarted', this.shuffleGrid);
    } else {
      io.emit('notEnoughPlayers');
    }
  });

  socket.on('firstTurn', () => {
    // Définir le premier joueur à jouer
    const firstPlayer = Object.keys(players)[0];
    players[firstPlayer].turn = true;
    io.emit('players', players);
    
  });

  socket.on('point', () => {
    // Ajouter un point au joueur
    players[socket.id].score ++;
    io.emit('score', players);
  });

  socket.on('turn', () => {
    // Changer le tour du joueur 
    if(players[socket.id].turn){
      const player = Object.keys(players).find(player => players[player].turn === false);
      players[player].turn = true;
      players[socket.id].turn = false;
      io.emit('players', players);
    }  
  });

  socket.on('cardFlipped', (cardData) => {
    // Envoyer les données de la carte retournée à l'autre joueur
    flipCard.push(cardData);

    if(flipCard.length == 1){
      socket.broadcast.emit('cardFlip', cardData);
    } else {
      // Vérifier si les cartes retournées correspondent
      if(flipCard[0].cardName == flipCard[1].cardName){
        socket.broadcast.emit('match', flipCard);
      } else {
        socket.broadcast.emit('noMatch', flipCard);
      }
      flipCard.length = 0;
      
    }
  });

  socket.on('endGame', () => {
    // Envoyer un message de fin de jeu à tous les joueurs et réinitialiser les scores et les états des joueurs
    io.emit('endGameMessage', players);
    Object.keys(players).forEach(key => {
      players[key].score = 0;
      players[key].ready = false;
      players[key].turn = false;
      players[key].partie ++; 
    });
    
  });

});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});