Renderer.drawBackground();
FieldHelper.initializeFields();
Helpers.scrollIntoView();

let clientPeer: SimplePeer = new SimplePeer({ initiator: false, trickle: false });
let clientWebsocket = new WebSocket("ws://localhost:3000/");

if (debugSimplePeer) {
    const clientOriginalDebug: any = clientPeer._debug;
    clientPeer._debug = function (): void {
        const self: SimplePeer = this;
        console.log(arguments);
        clientOriginalDebug.apply(self, arguments);
    };
}

let connected: boolean = false;
let hostConnectionId: string;
let clientSignal: string;

overlayStatus.innerText = "Waiting for game id...";

// #region SimplePeer

// Creates offer
clientPeer.on("signal", (data: any): void => {
    console.log("Created offer");
    clientSignal = JSON.stringify(data);
    clientWebsocket.send(JSON.stringify({type: "ClientOffer", offer: clientSignal, id: hostGameId}));
});

clientPeer.on("connect", (): void => {
    GameHelper.hideOverlay();
    clientWebsocket.close();

    Helpers.latencyTest(clientPeer, "client");
    latencyInterval = setInterval(() => {Helpers.latencyTest(clientPeer, "client");}, 15000);
});

clientPeer.on("data", (data: any): void => {
    const serverDataObject: ServerDataObject = JSON.parse(data);
    if (serverDataObject.serverEventType === ServerEventType.LatencyTest) {
        clientPeer.send(JSON.stringify(new ClientDataObject(ClientEventType.LatencyResponse, serverDataObject.stamp)));
    } else if (serverDataObject.serverEventType === ServerEventType.LatencyResponse) {
        Helpers.processLatency(serverDataObject.stamp);
    } else if (serverDataObject.serverEventType === ServerEventType.Move) {
        Renderer.drawMouse(serverDataObject.mousePosition);
    } else if (serverDataObject.serverEventType === ServerEventType.Game) {
        ClientHelper.handleGame(serverDataObject.affectedFields, serverDataObject.flagsLeft);
    } else if (serverDataObject.serverEventType === ServerEventType.GameWon) {
        ClientHelper.handleGameWon(serverDataObject.affectedFields, serverDataObject.elapsedTime!);
    } else if (serverDataObject.serverEventType === ServerEventType.GameOver) {
        ClientHelper.handleGameOver(serverDataObject.affectedFields, serverDataObject.elapsedTime!);
    } else if (serverDataObject.serverEventType === ServerEventType.NewGame) {
        GameHelper.resetGame();
    }
});

clientPeer.on("close", () => {
    GameHelper.showEndGameScreen();
    clearInterval(latencyInterval);
});

clientPeer.on("error", (err: any): void => {
    if (err.code === "ERR_ICE_CONNECTION_FAILURE") {
        return;
    }

    // todo: implement
});

// #endregion

// #region Websocket

let clientId: string;
let hostGameId: string;

clientWebsocket.addEventListener('open', (event) => {
    overlayStatus.innerText = "Connected to server successfully, enter game id...";
    connected = true;
    clientWebsocket.send(JSON.stringify({type: "Id"}));
});

clientWebsocket.addEventListener('message', (event: MessageEvent) => {
    const data = JSON.parse(event.data);
    console.log(data);

    switch(data.type) {
        case "Id":
            clientId = data.id;
            console.log("Received id:" + clientId)
            break;
        case "FindGame":
            if(data.success != true) {
                overlayStatus.innerText = "No game found for the provided game id...";
                return console.log(data)
            };
            hostGameId = data.hostId
            overlayStatus.innerText = "Game found, establishing connection with other player...";
            break;
        case "ReceivedHostOffer":
            console.log("Received offer");
            clientPeer.signal(JSON.parse(data.offer));
            break;
    }
});

const getHostSignal: () => void = (): void => {
    const validId: boolean = /^\d{5}$/.test(gameIdInput.value);

    if (!validId) {
        return;
    }

    if (connected) {
        overlayStatus.innerText = "Looking for games for the provided game id...";
        clientWebsocket.send(JSON.stringify({type: "FindGame", id: gameIdInput.value}));
    }
};

// #endregion

// #region Canvas Events

otherMouseCanvas.addEventListener("mousemove", (e: MouseEvent): void => {
    const mousePosition: MousePosition = Helpers.getMousePosition(otherMouseCanvas, e);
    lastMousePosition = mousePosition;
    clientPeer.send(JSON.stringify(new ClientDataObject(ClientEventType.Move, mousePosition)));

    const field: Field = FieldHelper.getField(mousePosition.x, mousePosition.y);
    Renderer.renderMouseMove(field);
});

otherMouseCanvas.addEventListener("click", (e: MouseEvent): void => {
    const mousePosition: MousePosition = Helpers.getMousePosition(otherMouseCanvas, e);
    const field: Field = FieldHelper.getField(mousePosition.x, mousePosition.y);

    if (field.revealed || field.flag) {
        return;
    }

    clientPeer.send(JSON.stringify(new ClientDataObject(ClientEventType.Click, mousePosition)));
});

otherMouseCanvas.addEventListener("contextmenu", (e: MouseEvent): void => {
    e.preventDefault();
    const mousePosition: MousePosition = Helpers.getMousePosition(otherMouseCanvas, e);
    const field: Field = FieldHelper.getField(mousePosition.x, mousePosition.y);

    if (field.revealed) {
        return;
    }

    clientPeer.send(JSON.stringify(new ClientDataObject(ClientEventType.Flag, mousePosition)));
});

toggle.addEventListener("change", () => {
    exposeSpan.textContent = localStorage.exposeKey == undefined ? "w" : localStorage.exposeKey
    flagSpan.textContent = localStorage.flagKey == undefined ? "d" : localStorage.flagKey
    document.getElementById("kbt")!!.style.display = `${toggle.checked ? "inline" : "none"}`;
});

document.addEventListener("keypress", (e: KeyboardEvent): void => {
    if(!toggle.checked) return;

    if(exposePressed) {
        exposeKey = e.key == flagKey ? exposeKey : e.key;
        exposeSpan.textContent = exposeKey;
        localStorage.exposeKey = exposeKey;
        exposePressed = false;

        return;
    } else if(flagPressed) {
        flagKey = e.key == exposeKey ? flagKey : e.key;
        flagSpan.textContent = flagKey;
        localStorage.flagKey = flagKey;
        flagPressed = false;

        return;
    }

    const field: Field = FieldHelper.getField(lastMousePosition.x, lastMousePosition.y);

    if(e.key == exposeKey) {
        if (field.revealed || field.flag) return;
        clientPeer.send(JSON.stringify(new ClientDataObject(ClientEventType.Click, lastMousePosition)));
    } else if(e.key == flagKey) {
        if (field.revealed) return;
        clientPeer.send(JSON.stringify(new ClientDataObject(ClientEventType.Flag, lastMousePosition)));
    }
});

// #endregion

// #region Html Events


gameIdInput.addEventListener("keyup", (event: KeyboardEvent) => { if (event.keyCode === 13) { getHostSignal(); } });
connectButton.addEventListener("click", getHostSignal);

newGameButton.addEventListener("click", (): void => {
    clientPeer.send(JSON.stringify(new ClientDataObject(ClientEventType.NewGame)));
});

endGameButton.addEventListener("click", (): void => {
    window.location.href = "/index.html";
});

// #endregion
