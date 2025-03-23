let debug = true;

// show the letters that have been guessed and letters that are still missing
socket.on("updateBoardDisplay", ({ currentBoard }) => {
    // clear the existing board display
    document.getElementById("wordBoard").innerHTML = "";
    if (debug) { console.log(`Updating display, board is: ${currentBoard}`); }
    // match board display to current state of currentBoard
    for (let i = 0; i < currentBoard.length; i++) {
        const letterHolder = document.createElement("h2");

        if (currentBoard[i] === null) {
            const emptySpace = document.createTextNode(" ");
            letterHolder.appendChild(emptySpace);
        } else {
            const letter = document.createTextNode(currentBoard[i]);
            letterHolder.appendChild(letter);
        }

        document.getElementById("wordBoard").appendChild(letterHolder);
    }
});

// show the spin wheel, buy vowel, and guess options
socket.on("displayButtonOptions", () => {
    var div = document.getElementById("roundOptions");
    div.style.display = "block";
});

// hide the spin wheel, buy vowel, and guess options
socket.on("hideButtonOptions", () => {
    var div = document.getElementById("roundOptions");
    div.style.display = "none";
});

// show a message in the event log on the right side of the screen
socket.on("displayMessage", ({ message, turn }) => {
    const eventLog = document.getElementById("eventLog");
    const event = document.createElement("p");
    event.innerText = message;
    event.classList.add(`player${turn + 1}`);
    eventLog.appendChild(event);
});

// update the money for player 1 and 2
socket.on("refreshMoney", ({p1, p2}) => {
    document.getElementById("p1MoneyTracker").innerText = `$: ${p1}`;
    document.getElementById("p2MoneyTracker").innerText = `$: ${p2}`;
});

// announce that the phrase has been solved
socket.on("solved", (turn) => {
    const solveContainer = document.getElementById("solveDisplay");
    if (solveContainer) {
        solveContainer.style.display = "none"; 
    }

    alert(`Player ${turn + 1} has solved the phrase!`);
    var div = document.getElementById("roundOptions");
    div.style.display = "none";
});

// show which player's turn it is
socket.on("displayTurn", (turn) => {
    if (turn == 0) {
        document.getElementById("turnText").innerText = "Player One's Turn!";
    } else {
        document.getElementById("turnText").innerText = "Player Two's Turn!";
    }
});

// 
socket.on("clearLetters", () => {
    document.getElementById("letterDisplay").innerHTML = "";
})

socket.on("displayConsonants", ({ availableConsonants }) => {
    const letterDisplay = document.getElementById("letterDisplay");
    letterDisplay.innerHTML = "";

    availableConsonants.forEach(consonant => {
        const consonantButton = document.createElement("button");
        consonantButton.innerText = consonant;
        consonantButton.classList.add("consonantButton");
        consonantButton.dataset.letter = consonant;
        letterDisplay.appendChild(consonantButton);
    });
});

socket.on("displayVowels", ({ availableVowels }) => {
    const letterDisplay = document.getElementById("letterDisplay");
    letterDisplay.innerHTML = "";

    availableVowels.forEach(vowel => {
        const vowelButton = document.createElement("button");
        vowelButton.innerText = vowel;
        vowelButton.classList.add("vowelButton");
        vowelButton.dataset.letter = vowel;
        letterDisplay.appendChild(vowelButton);
    });
});

socket.on("noConsonants", () => {
    const noConsonants = document.createElement("p");
    noConsonants.innerText = "No consonants available. Please choose a vowel or solve.";
    document.getElementById("letterDisplay").appendChild(noConsonants);
});

socket.on("noVowels", () => {
    const noVowels = document.createElement("p");
    noVowels.innerText = "No vowels available. Please choose a consonant or solve.";
    document.getElementById("letterDisplay").appendChild(noVowels);
});

socket.on("notEnoughPlayers", () => {
    // hide any letters that are showing
    const letterDisplay = document.getElementById("letterDisplay");
    letterDisplay.innerHTML = "";

    // hide button options
    var div = document.getElementById("roundOptions");
    div.style.display = "none"

    // hide solve field if showing
    const solveContainer = document.getElementById("solveDisplay");
    if (solveContainer) {
        solveContainer.style.display = "none"; 
    }

    document.getElementById("turnText").innerText = "Player One's Turn!";

    document.getElementById("wordBoard").innerHTML = "";
    const endGame = document.createElement("h2");
    endGame.innerText = "Game over.";
    document.getElementById("wordBoard").appendChild(endGame);
});

/*
    Button Actions
*/
document.addEventListener('DOMContentLoaded', () => {
    const solveContainer = document.getElementById("solveDisplay");
    if (solveContainer) {
        solveContainer.style.display = "none"; 
    }

    var div = document.getElementById("roundOptions");
    div.style.display = "none"
    
    const spinButton = document.getElementById("spinButton");
    const vowelButton = document.getElementById("vowelButton");
    const solveButton = document.getElementById("solveButton");

    if (spinButton) {
        spinButton.addEventListener("click", function () {
            console.log("Button clicked! Emitting 'spinWheel' event.");
            socket.emit("spinWheel");  // Send event to server
        });
    } 

    if (vowelButton) {
        vowelButton.addEventListener("click", function() {
            console.log("Button clicked! Emitting 'vowel' event.");
            socket.emit("vowel");
        });
    }

    if (solveButton) {
        solveButton.addEventListener("click", function() {
        
            // create input field
            solveContainer.style.display = "block";
            solveContainer.innerHTML = "";
            const solveInput = document.createElement("input");
            solveInput.type = "text";
            solveInput.id = "solveInput";
            solveInput.placeholder = "Enter your guess";

            // create submit button
            const submitButton = document.createElement("button");
            submitButton.innerText = "Submit";
            submitButton.addEventListener("click", function() {
                const solveInput = document.getElementById("solveInput");
                const guess = solveInput.value.trim();

                if (guess) {
                    console.log("Button clicked! Submitting guess:", guess);
                    socket.emit("checkSolution", { guess });
                } else {
                    console.log("Input field is empty.");
                }  
            });

            // append elements to the solve display
            solveContainer.appendChild(solveInput);
            solveContainer.appendChild(submitButton);
        });     
    }
});

document.getElementById("letterDisplay").addEventListener("click", (event) => {
    if (event.target.classList.contains("consonantButton")) {
        const selectedConsonant = event.target.dataset.letter;
        socket.emit("consonantGuessed", { guess: selectedConsonant });
    }
});

document.getElementById("letterDisplay").addEventListener("click", (event) => {
    if (event.target.classList.contains("vowelButton")) {
        const selectedVowel = event.target.dataset.letter;
        socket.emit("vowelGuessed", { guess: selectedVowel });
    }
});
