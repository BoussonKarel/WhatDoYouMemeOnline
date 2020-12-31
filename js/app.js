let htmlScore, htmlStatus, htmlUsername, htmlNewImage, htmlCardsHolder, htmlImageContainer, htmlTimer;
let htmlHostControls, htmlLoadPlayers, htmlPlayers, htmlStartRound, htmlStartVoting;
let current_username = null, isJudge = false, isHost = false, score = 0;
let players, judgeIndex = 0;
let cardAmount = 7, roundTime = 60;
let htmlSelectedCard = null;
let countdownInterval;

// Online
const _BASEURI = "https://wdym.azurewebsites.net/api";
// Offline dev
// const _BASEURI = "http://localhost:7071/api";

// MQTT Client
client = new Paho.MQTT.Client("13.81.105.139", 80, "")

//    ---
//    HANDLE
//    ---
const handleMQTTData = function(data) {
    clearInterval(countdownInterval);
    switch (data.command) {
        case "whosplaying":
            console.log("Game asks who's playing")
            postUsername(current_username);
            break;
        case "roundstart":
            htmlSelectedCard = null;
            isJudge = false;
            if (data.judge.username == current_username) {
                isJudge = true;
                showStatus("You are the judge");
            }
            showImage(data.image);
            if (!isJudge) {
                showRandomCards(data.cards);
                showStatus("Pick a card that fits the image.");
            }
            else {
                htmlCardsHolder.innerHTML = `<div class="c-card"><strong>You are the judge.</strong> Wait for others to play their cards</div>`
            }
            
            showCountdown(roundTime);
            break;
        case "roundvoting":
            htmlSelectedCard = null;
            console.log("Game asks to get played cards")
            showPlayedCards(data.played_cards);
            showCountdown(roundTime);
            if (isJudge) {
                listenToCardVote();
            }
            break;
        case "roundwinner":
            htmlCardsHolder.innerHTML = "";
            htmlSelectedCard = null;
            htmlCardsHolder.innerHTML = `<div class="c-card">${data.winning_card.card.text}</div><div class="c-card"><strong>Kaartje gespeeld door:</strong> ${data.winning_card.player}</div>`
            if (data.winning_card.player == current_username) {
                console.log(data.winning_card.player.username);
                score++;
                showScore(score);
            }
        default:
            break;
    }
    
    if (data.winner) {
        showWinner(data.winner);
    }  
}

const handleCards = function(data) {
    console.log("Got these cards: ", data)
    if (data[0].text) {
        cards = data;
        shuffleArray(cards);
    }
}

const handleCardPlayed = function(data) {
    console.log("Succesfully picked card: ", data);
    htmlSelectedCard.classList.remove("c-card--picking");
    htmlSelectedCard.classList.add("c-card--picked");
}

const handleSendUsername = function(data) {
    console.log("Succesfuly sent username to backend");
}

const handlePlayers = function(data) {
    players = data;
    judgeIndex = 0;
    if (isHost) {
        showPlayers(players);
    }
}

const handlePlayersRefresh = function(data) {
    console.log("Asked players to sign up")

    sleep(2000).then(() => {
        getPlayers();
    });
}

const handleStartRound = function(data) {
    console.log("Round start command succesfully sent.");
}

const handleStartVoting = function(data) {
    console.log("Voting start command succesfully sent.");
}

const handleCardVoted = function(data) {
    console.log("Succesfully voted card: ", data);
    htmlSelectedCard.classList.remove("c-card--picking");
    htmlSelectedCard.classList.add("c-card--picked");
}

//    ---
//    SHOW
//    ---
const showHostControls = function() {
    htmlHostControls.style.display = "block";

    listenToHostControls();
}

const showImage = function(image) {
    htmlImageContainer.innerHTML = `<img src="img/images/${image.url}" alt="${image.alt}" />`;
}

const showRandomCards = function(cards) {
    shuffleArray(cards);
        
    let cardsContent = "";
    for (let i = 0; i < cardAmount; i++) {
        let card = cards[i];
        cardsContent += `<div class="c-card js-card" data-id="${card.id}" data-hot="${card.hot}">${card.text}</div>`;
    }
    htmlCardsHolder.innerHTML = cardsContent;

    listenToCardPlay();
}

const showCountdown = function(seconds) {
    htmlTimer.style.display = "block";

    let secondsLeft = seconds + 1;
    countdownInterval = setInterval(function() {
        secondsLeft--;

        if (secondsLeft <= 0) {
            clearInterval(countdownInterval);
            htmlTimer.style.display = "none";
        }

        htmlTimer.innerHTML = secondsLeft;
    }, 1000);
}

const showPlayedCards = function(playedCards) {
    console.log("Got played cards: ", playedCards);
    let cardsContent = "";

    for (let playedCard of playedCards) {
        let player = playedCard.player;
        let card = playedCard.card;
        cardsContent += `<div class="c-card c-card--played js-card" data-player="${player}" data-id="${card.id}" data-hot="${card.hot}">${card.text}</div>`;
    }
    
    htmlCardsHolder.innerHTML = cardsContent;
}

const showPlayers = function(players) {
    let playerContent = "";
    for (let player of players) {
        playerContent += player.username + ", ";
    }
    htmlPlayers.innerHTML = playerContent;
}

const showUsername = function(name) {
    htmlUsername.innerHTML = name;
}

const showScore = function(points) {
    htmlScore.innerHTML = points + " punten";
}

const showStatus = function(status) {
    htmlStatus.innerHTML = status;
}

//    ---
//    ERROR
//    ---
const errorCards = function(data) {
    console.log("Error getting cards: " + data.status + " " + data.statusText)
}

const errorCardPlayed = function(data) {
    console.log("Error playing card: " + data.status + " " + data.statusText)
}

const errorPlayers = function(data) {
    console.log("Error getting players: " + data.status + " " + data.statusText)
}

const errorPlayersRefresh = function(data) {
    console.log("Error refreshing players: " + data.status + " " + data.statusText)
}

const errorStartRound = function(data) {
    console.log("Error starting round: " + data.status + " " + data.statusText)
}

const errorStartVoting = function(data) {
    console.log("Errors starting voting: " + data.status + " " + data.statusText)
}

const errorVoteCard = function(data) {
    console.log("Error voting for card: " + data.status + " " + data.statusText)
}

//    ---
//    GET
//    ---
const refreshPlayers = function() {
    handleData(`${_BASEURI}/players/refresh`, handlePlayersRefresh, errorPlayersRefresh, 'POST')
}

const getPlayers = function() {
    handleData(`${_BASEURI}/players`, handlePlayers, errorPlayers, 'GET')
}

//    ---
//    LISTENTO
//    ---
const listenToMQTTConnect = function() {
    console.log("Connected to MQTT");
    client.subscribe("/backup_wdym");
    console.log("Subscribed to topic");
}

client.connect({onSuccess:listenToMQTTConnect});

// called when a message arrives on the topic
const listenToMQTTMessage = function(message) {
    let topic = message.destinationName;
    let payload = message.payloadString;

    let data = JSON.parse(payload); //parse with extra double quotes
    
    console.log("MQTT Message arrived on " + topic, data);

    handleMQTTData(data);
}

client.onMessageArrived = listenToMQTTMessage;

const listenToCardPlay = function() {
    let htmlCards = document.querySelectorAll(".js-card");

    for (let htmlCard of htmlCards) {
        htmlCard.addEventListener("click", function() {
            if (!htmlSelectedCard) {
                playCard(htmlCard);
            }
        });
    }
}

const listenToCardVote = function() {
    let htmlCards = document.querySelectorAll(".js-card");

    for (let htmlCard of htmlCards) {
        htmlCard.addEventListener("click", function() {
            if (!htmlSelectedCard) {
                voteCard(htmlCard);
            }
        });
    }
}

const listenToHostControls = function() {
    htmlLoadPlayers.addEventListener("click", refreshPlayers);

    htmlStartRound.addEventListener("click", startRound);

    htmlStartVoting.addEventListener("click", startVoting);
}

//    ---
//    GAME
//    ---
const playCard = function(htmlCard) {
    if (!htmlSelectedCard) {
        htmlSelectedCard = htmlCard;
        htmlSelectedCard.classList.add("c-card--picking");

        let card = { "id": htmlCard.dataset.id, "text": htmlCard.innerHTML, "hot": htmlCard.dataset.hot };
        let playedCard = { "player": current_username, "card": card}
        let playedCardRequest = JSON.stringify(playedCard);
    
        handleData(`${_BASEURI}/playcard`, handleCardPlayed, errorCardPlayed, 'POST', playedCardRequest)
    }
}

const postUsername = function(username) {
    handleData(`${_BASEURI}/players`, handleSendUsername, null, 'POST', `{ "username": "${username}"}`)
}

const voteCard = function(htmlCard) {
    if (!htmlSelectedCard) {
        htmlSelectedCard = htmlCard;
        htmlSelectedCard.classList.add("c-card--picking");

        let card = { "id": htmlCard.dataset.id, "text": htmlCard.innerHTML, "hot": htmlCard.dataset.hot };
        let playedCard = { "player": htmlCard.dataset.player, "card": card}
        let playedCardRequest = JSON.stringify(playedCard);
    
        handleData(`${_BASEURI}/votecard`, handleCardVoted, errorVoteCard, 'POST', playedCardRequest)
    }
}

//    ---
//    HOST
//    ---
// Start game (send judge)
const startRound = function() {
    let playerCount = players.length;
    judgeIndex++;
    if (judgeIndex >= playerCount) {
        judgeIndex = 0;
    }
    
    let judge = players[judgeIndex];
    let startRequest = JSON.stringify(judge); 
    handleData(`${_BASEURI}/round/start`, handleStartRound, errorStartRound, 'POST', startRequest)
}

// Start voting (send judge)
const startVoting = function() {
    handleData(`${_BASEURI}/round/voting`, handleStartVoting, errorStartVoting, 'POST')
}

//    ---
//    HELPER
//    ---
const shuffleArray = function(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

const init = function() {
    console.log("Document loaded");

    htmlScore = document.querySelector(".js-score");
    htmlStatus = document.querySelector(".js-status");
    htmlUsername = document.querySelector(".js-username");
    htmlNewImage = document.querySelector(".js-btn-new");
    htmlImageContainer = document.querySelector(".js-image-container");
    htmlCardsHolder = document.querySelector(".js-cards");
    htmlTimer = document.querySelector(".js-timer");

    htmlHostControls = document.querySelector(".js-host-controls");
    htmlLoadPlayers = document.querySelector(".js-loadplayers");
    htmlPlayers = document.querySelector(".js-players");
    htmlStartRound = document.querySelector(".js-startround");
    htmlStartVoting = document.querySelector(".js-startvoting");

    // Check if he is admin / host
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    host = urlParams.get('host')
    current_username = urlParams.get('name')
    showUsername(current_username);
    showScore(score);
    showStatus("Game hasn't started yet.")

    if (!current_username) {
        window.location.href = "./index.html";
    }

    if (host == 1) {
        console.log("Host")
        isHost = true;
        showHostControls();
    }
}

document.addEventListener("DOMContentLoaded", init);