// Global vars
// Online
// const _BASEURI = "https://wdym.azurewebsites.net/api";
// Offline dev
const _BASEURI = "http://localhost:7071/api";

let player = {}
let isJudge;
let gamePhase = null;
let alreadyPicked;

// HTML elements
let htmlPopup, htmlUsername, htmlScore, htmlImageContainer, htmlTimer, htmlCardsHolder, htmlCards, htmlPickedCard;
// MQTT Client
client = new Paho.MQTT.Client("13.81.105.139", 80, "")

// DEV

const setPlayerToHost = function() {
    let data = {}
    data.id = "9d9003d2-0d22-4994-885e-3ed3440cf410";
    data.username = "Karel";
    data.score = 0;
    data.host = true;

    showPlayer(data)
}

const setPlayerToPlayer = function() {
    let data = {}
    data.id = "468147a7-70d1-4ff1-932c-7ba8d91695fe";
    data.username = "Erik";
    data.score = 0;
    data.host = false;

    showPlayer(data)
}

//    ---
//    SHOW
//    ---
const showPlayer = function(data) {
    // Succesfully created a player, got a Player return object
    if (data.id && data.username) {
        // Save player data
        player = data;
        console.log("Player details:")
        console.log(player)

        // Display player data
        htmlUsername.innerHTML = player.username;
        htmlScore.innerHTML = player.score;

        // Display host elements
        if (player.host) {
            console.log("Player is host.")
        }
    }
}

const showImage = function(data) {
    // Show round image
    htmlImageContainer.innerHTML = `<img class="c-image__img" src="/img/images/${data.url}" alt="${data.alt}" />`;
}

const showCountdown = function(seconds) {
    htmlTimer.style.display = "block";

    let secondsLeft = seconds + 1;
    var x = setInterval(function() {
        secondsLeft--;

        if (secondsLeft == 0) {
            clearInterval(x);
            htmlTimer.style.display = "none";
            stopPhase();
        }

        htmlTimer.innerHTML = secondsLeft;
    }, 1000);
}

const showCards = function(data) {
    if (gamePhase == "start") {
        let cards = data;
        shuffleArray(cards);

        let cardsContent = "";
        for (let card of cards) {
            console.log(card.text);

            cardsContent += `<div class="c-card js-card" data-id="${card.id}" data-hot="${card.hot}">${card.text}</div>`;
        }

        htmlCardsHolder.innerHTML = cardsContent;
        htmlCards = document.querySelectorAll(".js-card");

        listenToPickcards();
    }
    else {
        console.log(data)
        let pickedcards = data;

        let cardsContent = "";
        for (let pickedCard of pickedcards) {
            console.log(pickedCard);
            let card = pickedCard.card;
            let player = pickedCard.player;

            cardsContent += `<div class="c-card js-card" data-cardid="${card.id}" data-playerid="${player.id}" data-hot="${card.hot}">${card.text}</div>`;
        }

        console.log(cardsContent);
        htmlCardsHolder.innerHTML = cardsContent;
        htmlCards = document.querySelectorAll(".js-card");

        if (isJudge) {
            listenToJudgeVote();
        }
    }
}

const showJudgeWaitingScreen = function() {
    htmlCardsHolder.innerHTML = `<div class="c-card"><strong>You are the judge!</strong><br>Please wait for others to play their cards.</div>`;;
}

//    ---
//    CALLBACK NON VISUAL
//    ---
const showPickedCard = function(data) {
    console.log("Succesfully picked card: ")
    console.log(data)
    alreadyPicked = true;
    htmlPickedCard.classList.remove("c-card--picking");
    htmlPickedCard.classList.add("c-card--picked");
}

const showWinningCard = function(data) {
    console.log("Winning card: ")
    console.log(data);

    htmlVoted.classList.remove("c-card--picking");
    htmlVoted.classList.add("c-card--picked");
}

//    ---
//    ERROR
//    ---
const errorPlayer = function(data) {
    // Could not create a player, because...
    console.log("Error picking username: " + data.status + " " + data.statusText);
}

const errorCards = function(data) {
    // Could not create a player, because...
    console.log("Error getting cards: " + data.status + " " + data.statusText);
}

const errorPickcard = function(data) {
    console.log("Error picking card: " + data.status + " " + data.statusText);
    alreadyPicked = false;
    htmlPickedCard.classList.remove("c-card--picking");
}

const errorWinningCard = function(data) {
    console.log("Error voting for card: " + data.status + " " + data.statusText);
}

//    ---
//    GET
//    ---
const getCards = function(amount) {
    handleData(`${_BASEURI}/cards`, showCards, errorCards, 'GET')
}

//

const listenToPickcards = function() {
    console.log("Adding picking capabilities...")
    for (let htmlCard of htmlCards) {
        console.log(htmlCard);
        htmlCard.addEventListener("click", function() {
            if (!alreadyPicked) {
                alreadyPicked = true;
                htmlPickedCard = htmlCard;
    
                htmlPickedCard.classList.add("c-card--picking");
    
                pickCard(htmlCard.dataset.id, htmlCard.innerHTML, htmlCard.dataset.hot);
            }
            else {
                console.log("Already picked!")
            }
        });
    }
}

const listenToJudgeVote = function() {
    console.log("Adding voting powers...");
    for (let htmlCard of htmlCards) {
        console.log(htmlCard);
        htmlCard.addEventListener("click", function() {
            if (!alreadyPicked) {
                alreadyPicked = true;
                htmlVoted = htmlCard;
    
                htmlVoted.classList.add("c-card--picking");
    
                voteCard(htmlCard.dataset.playerid, htmlCard.dataset.cardid, htmlCard.innerHTML, htmlCard.dataset.hot);
            }
            else {
                console.log("Already picked!")
            }
        });
    }
}

//    ---
//    GAME
//    ---
const pickUsername = function() {
    // Is there a username in ?name=
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    username = urlParams.get('name')

    // Is it null or ''?
    if (isNullOrWhitespace(username)) {
        // Show the popup form
        htmlPopup.style.display = "block";
    }
    else {
        // Setup a request: Player with property username filled in
        let usernameRequest = {}
        usernameRequest.username = username;
        let requestBody = JSON.stringify(usernameRequest)

        // Send request, handle succes in showPlayer, error in errorPlayer
        handleData(`${_BASEURI}/players`, showPlayer, errorPlayer, 'POST', requestBody)
    }
}

const startRound = function(event) {
    console.log("Starting round...")

    // is judge?
    isJudge = false;
    let judgePlayer = event.judge;
    console.log(event.judge, player)
    if (judgePlayer.id == player.id) {
        isJudge = true;
    }
    console.log("Is judge?", isJudge)

    alreadyPicked = false;

    // show round image
    showImage(event.image);

    // set countdown timer
    showCountdown(event.time);

    // load cards (not for judge)
    if (!isJudge) {
        getCards(7);
        console.log("Tried to get cards")
    }
    else {
        showJudgeWaitingScreen();
    }
}

const pickCard = function(id, text, hot) {
    let card = {}
    card.id = id;
    card.text = text;
    card.hot = hot;

    if (card && player.username) {
        let pickedCard = {}
        pickedCard.player = player;
        pickedCard.card = card;
    
        let requestBody = JSON.stringify(pickedCard)
    
        // Send request, handle succes in showPlayer, error in errorPlayer
        handleData(`${_BASEURI}/pickedcards`, showPickedCard, errorPickcard, 'POST', requestBody)
    }
    else {
        let error = {};
        error.status = "-"
        error.statusText = "Either there is no player or no card"
        errorPickcard(error);
    }
}

const stopPhase = function() {
    if (gamePhase == "start") {
        // End picking
        htmlCardsHolder.innerHTML = "";
        if (htmlPickedCard) {
            htmlCardsHolder.appendChild(htmlPickedCard);
        }
    }
    else if (gamePhase == "voting") {
        // End voting
    }
}

const votingPhase = function(event) {
    console.log("Voting phase...")

    // set countdown timer
    showCountdown(event.time);

    // load cards (not for judge)
    showCards(event.cards);
}

const voteCard = function(playerid, cardid, text, hot) {
    let card = {}
    card.id = cardid;
    card.text = text;
    card.hot = hot;

    if (card && player.host) {
        let winningCard = {}
        winningCard.player = {}
        winningCard.player.id = playerid;
        winningCard.card = card;
    
        let requestBody = JSON.stringify(winningCard)
    
        // Send request, handle succes in showPlayer, error in errorPlayer
        handleData(`${_BASEURI}/game/pick`, showWinningCard, errorWinningCard, 'POST', requestBody)
    }
    else {
        let error = {};
        error.status = "-"
        error.statusText = "Either there is no host player or no card"
        errorWinningCard(error);
    }
}

const endRound = function(event) {
    console.log("Ending round...")

}

const endGame = function(event) {
    console.log("Ending game...")

}

//    ---
//    HANDLE
//    ---
const handleMQTTData = function(data) {
    if (data.type) {
        console.log("Received game event")

        gamePhase = data.type;

        switch (data.type) {
            case "start":
                startRound(data)
                break;
            case "voting":
                votingPhase(data)
                break;
            case "end":
                endRound(data)
                break;
            case "winner":
                endGame(data)
                break;
            default:
                gamePhase = null;
                console.log("Don't know what to do...")
                break;
        }
    }
}

//    ---
//    LISTENTO
//    ---
const listenToMQTTConnect = function() {
    console.log("Connected to MQTT");
    client.subscribe("/wdym");
    console.log("Subscribed to topic");
}

client.connect({onSuccess:listenToMQTTConnect});

// called when a message arrives on the topic
const listenToMQTTMessage = function(message) {
    let topic = message.destinationName;
    let payload = message.payloadString;

    let data = JSON.parse(payload); //parse with extra double quotes
    
    console.log("MQTT Message arrived on " + topic);
    console.log(data);

    handleMQTTData(data);
}

client.onMessageArrived = listenToMQTTMessage;

//    ---
//    MQTT
//    ---

// called when the client connects

const sendMQTTMessage = function(message) {
    message = new Paho.MQTT.Message(message);
    message.destinationName = "/wdym";
    client.send(message);
    console.log("Sent MQTT message");
}

//    ---
//    HELPER FUNCTIONS
//    ---

const shuffleArray = function(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

const isNullOrWhitespace = function(input) {
    return !input || !input.trim();
}


const init = function() {
    console.log("Document loaded");

    htmlPopup = document.querySelector(".js-popup");
    htmlUsername = document.querySelector(".js-username");
    htmlScore = document.querySelector(".js-score");
    htmlImageContainer = document.querySelector(".js-image-container");
    htmlTimer = document.querySelector(".js-timer");
    htmlCardsHolder = document.querySelector(".js-cards");

    pickUsername();
}

document.addEventListener("DOMContentLoaded", init);