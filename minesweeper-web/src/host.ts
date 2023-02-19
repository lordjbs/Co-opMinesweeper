Renderer.drawBackground();
FieldHelper.initializeFields();
Helpers.scrollIntoView();

let peer: SimplePeer = new SimplePeer({ initiator: true, trickle: false });

let hostWebsocket = new WebSocket("ws://localhost:3000/");

if (debugSimplePeer) {
    const originalDebug: any = peer._debug;
    peer._debug = function (): void {
        const self: SimplePeer = this;
        console.log(arguments);
        originalDebug.apply(self, arguments);
    };
}

let hostSignal: string;
let gameStarted: boolean = false;
let newGameId: string;
var waiting: boolean = false;

overlayStatus.innerText = "Waiting for signal...";

// #region SimplePeer

peer.on("signal", (data: any): void => {
    hostSignal = JSON.stringify(data);
});

peer.on("connect", (): void => {
    GameHelper.hideOverlay();
    hostWebsocket.close();
    // Receive latency
    Helpers.latencyTest(peer, "host");

    latencyInterval = setInterval(() => {Helpers.latencyTest(peer, "host");}, 15000);
});

peer.on("data", (data: any): void => {
    const dataObject: ClientDataObject = JSON.parse(data);
    if (dataObject.clientEventType === ClientEventType.LatencyTest) {
        peer.send(JSON.stringify(new ServerDataObject(ServerEventType.LatencyResponse, dataObject.stamp)));
    } else if (dataObject.clientEventType === ClientEventType.LatencyResponse) {
        Helpers.processLatency(dataObject.stamp);
    } else if (dataObject.clientEventType === ClientEventType.Move) {
        Renderer.drawMouse(dataObject.mousePosition);
    } else if (dataObject.clientEventType === ClientEventType.Click) {
        const field: Field = FieldHelper.getField(dataObject.mousePosition.x, dataObject.mousePosition.y);
        HostHelper.handleClick(field);
    } else if (dataObject.clientEventType === ClientEventType.Flag) {
        const field: Field = FieldHelper.getField(dataObject.mousePosition.x, dataObject.mousePosition.y);
        HostHelper.handleFlag(field);
    } else if (dataObject.clientEventType === ClientEventType.NewGame) {
        HostHelper.startNewGame();
    }
});

peer.on("close", () => {
    debugger;
    clearInterval(latencyInterval);
    GameHelper.showEndGameScreen();
});

peer.on("error", (err: any): void => {
    debugger;
    if (err.code === "ERR_ICE_CONNECTION_FAILURE") {
        return;
    }

    // todo: implement
});

// #endregion

// #region SignalR

let hostId;

hostWebsocket.addEventListener('open', () => {
    hostWebsocket.send(JSON.stringify({type: "Id"}));
    overlayStatus.innerText = "Connected to server successfully, creating game...";
    hostWebsocket.send(JSON.stringify({type: "NewGame"}));
});

let clientGameId;

hostWebsocket.addEventListener('message', (event: MessageEvent) => {
    const data = JSON.parse(event.data);
    console.log(data);

    switch(data.type) {
        case "Id":
            hostId = data.id;
            console.log("Received id:" + hostId)
            break;
        case "NewGame":
            if(data.success != true) {
                overlayStatus.innerText = "Unable to create a game.";
                return console.log(data)
            };

            newGameId = data.id;
            gameIdText.innerText = `Game Id: ${data.id}`;
            overlayStatus.innerText = "Give the game id to the other player. Waiting for other player to join...";
            copyToClipboardButton.style.display = "inline-block";
            break;
        case "ReceivedConnection":
            clientGameId = data.clientId;
            hostWebsocket.send(JSON.stringify({type: "HostOffer", offer: hostSignal, id: clientGameId}));

            break;
        case "ReceivedClientOffer":
            console.log("received");
            peer.signal(JSON.parse(data.offer));
            break;
    }
});
// #endregion

// #region Canvas Events

otherMouseCanvas.addEventListener("mousemove", (e: MouseEvent): void => {
    const mousePosition: MousePosition = Helpers.getMousePosition(otherMouseCanvas, e);
    lastMousePosition = mousePosition;
    peer.send(JSON.stringify(new ServerDataObject(ServerEventType.Move, mousePosition)));

    const field: Field = FieldHelper.getField(mousePosition.x, mousePosition.y);
    Renderer.renderMouseMove(field);
});

otherMouseCanvas.addEventListener("click", (e: MouseEvent): void => {
    const mousePosition: MousePosition = Helpers.getMousePosition(otherMouseCanvas, e);
    const field: Field = FieldHelper.getField(mousePosition.x, mousePosition.y);

    if (field.revealed || field.flag) {
        return;
    }

    HostHelper.handleClick(field);
});

otherMouseCanvas.addEventListener("contextmenu", (e: MouseEvent): void => {
    e.preventDefault();
    const mousePosition: MousePosition = Helpers.getMousePosition(otherMouseCanvas, e);
    const field: Field = FieldHelper.getField(mousePosition.x, mousePosition.y);

    if (field.revealed) {
        return;
    }

    HostHelper.handleFlag(field);
});

toggle.addEventListener("change", () => {
    exposeSpan.textContent = localStorage.exposeKey == undefined ? "w" : localStorage.exposeKey
    flagSpan.textContent = localStorage.flagKey == undefined ? "d" : localStorage.flagKey

    document.getElementById("kbt")!!.style.display = `${toggle.checked ? "inline" : "none"}`;
});

document.addEventListener("keypress", (e: KeyboardEvent): void => {
    if(exposePressed) {
        exposeKey = e.key == flagKey ? exposeKey : e.key;
        localStorage.exposeKey = exposeKey;
        exposeSpan.textContent = exposeKey;
        exposePressed = false;

        return;
    } else if(flagPressed) {
        flagKey = e.key == exposeKey ? flagKey : e.key;
        localStorage.flagKey = flagKey;
        flagSpan.textContent = flagKey;
        flagPressed = false;

        return;
    }

    if(!toggle.checked) return;

    const field: Field = FieldHelper.getField(lastMousePosition.x, lastMousePosition.y);

    if(e.key == exposeKey) {
        if (field.revealed || field.flag) return;
        HostHelper.handleClick(field);
    } else if(e.key == flagKey) {
        if (field.revealed) return;
        HostHelper.handleFlag(field);
    }
});


// #endregion

// #region Html Events

newGameButton.addEventListener("click", (): void => {
    HostHelper.startNewGame();
});

endGameButton.addEventListener("click", (): void => {
    window.location.href = "/index.html";
});

copyToClipboardButton.addEventListener("click", (): void => {
    Helpers.copyToClipboard(newGameId);
    copyToClipboardButton.innerText = "Copied";
    copyToClipboardButton.disabled = true;
});

// #endregion