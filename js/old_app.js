let htmlPopup, htmlName;
let player = {};
player.username = "";
player.score = 0;
// let htmlButtonShuffle, htmlCards, htmlPopup, htmlName, htmlScore, username;

const _BASEURI = "http://localhost:7071/api";

//    ---
//    MQTT
//    ---

// Create a client instance
client = new Paho.MQTT.Client("localhost", 9001, "")

// set callback handlers
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

// connect the client
client.connect({onSuccess:onConnect});


// called when the client connects
function onConnect() {
    console.log("onConnect");
    client.subscribe("/wdym");
    message = new Paho.MQTT.Message("Hello");
    message.destinationName = "/wdym";
    client.send(message);
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
    message = new Paho.MQTT.Message("Disconnect");
    message.destinationName = "/wdym";
    client.send(message);
  }
}

// called when a message arrives
function onMessageArrived(message) {
  console.log("onMessageArrived:"+message.payloadString);
}

//    ---
//    HELPER FUNCTIONS
//    ---

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function isNullOrWhitespace( input ) {
    return !input || !input.trim();
}

//    ---
//    VISUAL - SHOW
//    ---

const showPlayer = function(jsonObject) {
    console.log(jsonObject);
}

const errorPlayer = function(jsonObject) {
    console.log(jsonObject);
}

// const showCards = function(jsonObject) {
//     shuffleArray(jsonObject);
//     cards = jsonObject.slice(0,7);

//     let card_content = "";
//     for (let card of cards) {
//         card_content += `<div class="c-card">${card.text}</div>`
//     }
//     htmlCards.innerHTML = card_content;
// }

//    ---
//    DATA - GET
//    ---

// const getCards = function() {
//     handleData(`${_BASEURI}/cards`, showCards);
// }

const getUsername = function() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    username = urlParams.get('name')



    if (isNullOrWhitespace(username)) {
        htmlPopup.style.display = "block";
    }
    else {
        usernameRequest = {}
        usernameRequest.username = username;
        console.log(usernameRequest);

        handleData(`${_BASEURI}/join`, showPlayer, errorPlayer, 'POST', JSON.stringify(usernameRequest))

        player.username = username;
        htmlName.innerHTML = username;
    }
}

//    ---
//    LISTENTO - EVENTS
//    ---

// const listenToShuffle = function() {
//     htmlButtonShuffle.addEventListener("click", function() {
//         getCards();
//     });
// }

//    ---
//    INIT
//    ---

const init = function() {
    console.log("Document loaded");
    
    htmlPopup = document.querySelector(".js-popup");
    htmlName = document.querySelector(".js-name");

    // htmlButtonShuffle = document.querySelector(".js-shuffle");
    // htmlCards = document.querySelector(".js-cards");
    // htmlScore = document.querySelector(".js-score");

    // if (htmlButtonShuffle) {
    //     if (htmlCards) {
    //         listenToShuffle();
    //     }
    //     else {
    //         htmlButtonShuffle.disabled = true;
    //     }
    // }

    getUsername();

    // getCards();
}

document.addEventListener("DOMContentLoaded", init);