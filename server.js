const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

let debug = true;
let players = [];

let phraseBank = ["A CHIP OFF THE OLD BLOCK", "A CAT HAS NINE LIVES", "A FACE ONLY A MOTHER COULD LOVE", "AS SEEN ON TV", "CUTE AS A BUTTON",
    "DID YOU REMEMBER TO PACK YOUR TOOTHBRUSH?", "DONT LET THE BEDBUGS BITE", "ENJOY THE SHOW", "FAR FROM OVER", "FASHIONABLY LATE",
    "GET TO THE POINT", "GLOWS IN THE DARK", "HALT WHO GOES THERE", "HASTE MAKES WASTE", "I GET YOUR DRIFT", "I SLEPT LIKE A ROCK",
    "JUST A KID AT HEART", "KEEP IT SIMPLE", "LETTING OFF STEAM", "MAKE A MOUNTAIN OUT OF A MOLEHILL", "MY CUP OF TEA", "NEVER IN A MILLION YEARS",
    "OH NO NOT AGAIN", "ONCE IN A BLUE MOON", "PINCH ME I THINK IM DREAMING", "PLEASED TO MEET YOU", "QUIET ON THE SET", "RAKING IN THE DOUGH",
    "REMIND ME LATER", "SAY THE MAGIC WORD", "SILLY GOOSE", "STUNNING TURN OF EVENTS", "BACK IN MY DAY", "THANKS BUT NO THANKS", "THE JIG IS UP"
];

let wheelValues = ["2500", "600", "700", "600", "650", "500", "700",
    "600", "550", "500", "600", "bankrupt", "650", "700", "loseTurn",
    "800", "500", "650", "500", "900", "bankrupt"];

let availableConsonants = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z'];
let availableVowels = ['A', 'E', 'I', 'O', 'U'];

let phrase = "";
let currentBoard = [];
let turn = 0; // 0 -> p1, 1 -> p2
let wheelSelection = null;

let tempMoney = 0;
let p1Money = 0;
let p2Money = 0;



// serve html file
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log(`player ${socket.id} connected`);
    if (players.length >= 2) {
        socket.emit("gameFull");
        socket.disconnect();
        return;
    }

    players.push(socket.id);
    
    if (players.length === 2) {
        console.log("Both players connected, generating phrase...");
        generatePhrase();
        io.to(players[0]).emit("displayButtonOptions");
        io.to(players[1]).emit("hideButtonOptions");
    }

    socket.on("spinWheel", () => {
        io.emit("hideButtonOptions");
        console.log("spinning wheel");
        const randomIndex = Math.floor(Math.random() * wheelValues.length);
        wheelSelection = wheelValues[randomIndex];
        console.log(`Wheel value: ${wheelSelection}`);

        if (wheelSelection === "bankrupt") {
            io.emit("displayMessage", {
                message: `Oh no! player${turn + 1} just went bankrupt.`,
                turn
            });
            bankrupt();
            changeTurn();

        } else if (wheelSelection === "loseTurn") {
            io.emit("displayMessage", {
                message: `Aww... player${turn + 1} lost a turn. :(`,
                turn
            });
            changeTurn();
            
        } else {
            tempMoney = parseInt(wheelSelection);
            io.emit("displayMessage", {
                message: `player${turn + 1} scored $${tempMoney}! Choose a consonant.`,
                turn
            });

            if (availableConsonants.length <= 0) {
                io.to(players[turn]).emit("displayButtonOptions");
                io.to(players[turn]).emit("noConsonants");
                return;
            }
            io.to(players[turn]).emit("displayConsonants", { availableConsonants });
        }
    });

    socket.on("consonantGuessed", ({ guess }) => {
        if (debug) {console.log(`Guess: ${guess}`);}
        let numOccurences = 0;

        for (let i = 0; i < phrase.length; i++) {
            if (guess === phrase[i]) {
                currentBoard[i] = guess;
                numOccurences++;
            }
        }

        // remove consonant from available options
        const index = availableConsonants.indexOf(guess);
        if (index > -1) { // only splice array when item is found
            availableConsonants.splice(index, 1); // remove only the one guess
        }

        // update player money based on guess
        if (turn === 0) {
            p1Money += numOccurences * tempMoney;
        } else {
            p2Money += numOccurences * tempMoney;
        }

        io.to(players[turn]).emit("clearLetters");
        io.emit("displayMessage", { message: `Player${turn + 1} guessed: ${guess}`, turn});
        io.emit("displayMessage", { message: `Player${turn + 1} earned $${numOccurences * tempMoney}`, turn});
        io.emit("updateBoardDisplay", {
            currentBoard
        });

        if (debug) { console.log(`Updating money: P1 -> ${p1Money}, P2 -> ${p2Money}`); }
        io.emit("refreshMoney", {
            p1: p1Money,
            p2: p2Money
        });

        if (!checkSolved()) {
            if (numOccurences > 0) {
                io.to(players[turn]).emit("displayButtonOptions");
            } else {
                changeTurn();
            }
        }
    });

    socket.on("vowel", () => {
        if (turn === 0 && p1Money >= 250 || turn === 1 && p2Money >= 250) {
            if (availableVowels.length <= 0) {
                io.to(players[turn]).emit("displayButtonOptions");
                io.to(players[turn]).emit("noVowels");
                return;
            }
            io.to(players[turn]).emit("displayVowels", { availableVowels });
            io.emit("hideButtonOptions");
        } else {
            io.emit("displayMessage", {
                message: `player${turn + 1}: Not enough money! You need at least $250 to purchase a vowel.`,
                turn
            });
        }    
    });

    socket.on("vowelGuessed", ({guess}) => {
        if (debug) {console.log(`Guess: ${guess}`);}
        let numOccurences = 0;

        if (turn === 0) {
            p1Money -= 250;
        } else {
            p2Money -= 250;
        }
        
        for (let i = 0; i < phrase.length; i++) {
            if (guess === phrase[i]) {
                // show letter in phrase
                currentBoard[i] = guess;
                numOccurences++;
            }
        }
    
        // remove vowel from available options
        const index = availableVowels.indexOf(guess);
        if (index > -1) { // only splice array when item is found
            availableVowels.splice(index, 1); // remove only the one guess
        }
    
        io.emit("clearLetters");
        io.emit("displayMessage", { message: `Player${turn + 1} purchased the vowel ${guess} for $250`, turn});
        io.emit("updateBoardDisplay", {
            currentBoard
        });
    
        io.emit("refreshMoney", {
            p1: p1Money,
            p2: p2Money
        });

        if (!checkSolved()) {
            if (numOccurences > 0) {
                io.to(players[turn]).emit("displayButtonOptions");
            } else {
                changeTurn();
            }
        }  
    });

    socket.on("checkSolution", ({ guess }) => {
        console.log(`Player guessed: ${guess}`);

        if (guess.toLowerCase() === phrase.toLowerCase()) {
            io.emit("displayMessage", { message: `Correct! The phrase was ${phrase}`});
            io.emit("displayMessage", {
                message: `The phrase has been solved. player${turn + 1} wins!`,
                turn
            });
        
            io.emit("solved", turn);
        } else {
            io.emit("displayMessage", { message: `Incorrect guess: ${guess}`, turn});
            changeTurn();
        }
    })

    socket.on('disconnect', () => {
        console.log(`player ${socket.id} disconnected`);

        const index = players.indexOf(socket.id);
        if (index > -1) { // only splice array when item is found
            players.splice(index, 1); // remove only the one guess
        }
        
        if (players.length <= 1) {
            io.emit("displayMessage", { message: "Only one player remains. Ending game.", turn});
            io.emit("notEnoughPlayers")

            availableConsonants = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z'];
            availableVowels = ['A', 'E', 'I', 'O', 'U'];

            phrase = "";
            currentBoard = [];
            turn = 0; // 0 -> p1, 1 -> p2
            wheelSelection = null;

            tempMoney = 0;
            p1Money = 0;
            p2Money = 0;
        }
    });
});
  
server.listen(3000, () => {
    console.log('listening on *:3000');
});

// chooses random phrase from phrase array
function generatePhrase() {
    const randomIndex = Math.floor(Math.random() * phraseBank.length);
    phrase = phraseBank[randomIndex];

    if (debug) { console.log(`Generated phrase: ${phrase}`); }
    
    currentBoard = [];

    for (let i = 0; i < phrase.length; i++) {
        if (phrase[i] === " ") {
            currentBoard[i] = null;
        } else {
            currentBoard[i] = "_";
        }
    }

    if (debug) { console.log(`Updating board display`); }
    io.emit("updateBoardDisplay", {
        currentBoard
    });
}

// reset current player's money to 0, end turn
function bankrupt() {
    if (turn === 0) {
        p1Money = 0;
    } else {
        p2Money = 0;
    }

    io.emit("refreshMoney", {
        p1: p1Money,
        p2: p2Money
    });
}

function changeTurn() {
    turn = turn === 0 ? 1 : 0;
    io.emit("displayTurn", turn);
    io.to(players[turn]).emit("displayButtonOptions");
}

function checkSolved() {
    for (let i = 0; i < currentBoard.length; i++) {
        if (currentBoard[i] === "_") {
            return false;
        }  
    }

    io.emit("displayMessage", {
        message: `The phrase has been solved. player${turn + 1} wins!`,
        turn
    });

    io.emit("solved", turn);
    return true;
}

// LATER:
// add more event logs
// add categories
// add multiple rounds
// allow for multiple rooms
// add pre-written chat phrases/emotes
// add custom backgrounds
// add custom colors to differentiate p1 and p2
// confetti animation 
// improve resizing