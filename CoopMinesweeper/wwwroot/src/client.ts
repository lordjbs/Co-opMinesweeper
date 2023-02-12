Renderer.drawBackground();
FieldHelper.initializeFields();
Helpers.scrollIntoView();

let clientPeer: SimplePeer = new SimplePeer({ initiator: false, trickle: false });
let clientSignalrConnection: signalR = new signalR.HubConnectionBuilder().withUrl(baseSignalrUrl + "/gameHub", { logger: signalR.LogLevel.None }).build();
clientSignalrConnection.serverTimeoutInMilliseconds = 300000; // 5 minutes

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


overlayStatus.innerText = "Waiting for game id...";

// #region SimplePeer

clientPeer.on("signal", (data: any): void => {
    const clientSignal: string = JSON.stringify(data);

    clientSignalrConnection.invoke("ReceiveClientSignal", hostConnectionId, clientSignal).catch((err: any) => {
        // todo: implement
    });
});

clientPeer.on("connect", (): void => {
    GameHelper.hideOverlay();
    clientSignalrConnection.stop();

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

// #region SignalR

clientSignalrConnection.start().then(() => {
    overlayStatus.innerText = "Connected to server successfully, enter game id...";
    connected = true;
}).catch((err: any) => {
    // todo: implement
});

clientSignalrConnection.on("ClientSignalPrompt", (hostConnId: string, hostSignal: string) => {
    hostConnectionId = hostConnId;
    clientPeer.signal(hostSignal);
});

clientSignalrConnection.onclose((error?: Error): void => {
    // todo: implement
});

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
    document.getElementById("kbt")!!.style.display = `${toggle.checked ? "inline" : "none"}`;
});

document.addEventListener("keypress", (e: KeyboardEvent): void => {
    if(!toggle.checked) return;

    const field: Field = FieldHelper.getField(lastMousePosition.x, lastMousePosition.y);

    if(e.key == "w") {
        if (field.revealed || field.flag) return;
        clientPeer.send(JSON.stringify(new ClientDataObject(ClientEventType.Click, lastMousePosition)));
    } else if(e.key == "d") {
        if (field.revealed) return;
        clientPeer.send(JSON.stringify(new ClientDataObject(ClientEventType.Flag, lastMousePosition)));
    }
});

// #endregion

// #region Html Events

const getHostSignal: () => void = (): void => {
    const validId: boolean = /^\d{5}$/.test(gameIdInput.value);

    if (!validId) {
        return;
    }

    if (connected) {
        overlayStatus.innerText = "Looking for games for the provided game id...";

        clientSignalrConnection.invoke("GetHostSignal", gameIdInput.value).then((gameFound: boolean) => {
            if (gameFound) {
                overlayStatus.innerText = "Game found, establishing connection with other player...";
            } else {
                overlayStatus.innerText = "No game found for the provided game id...";
            }
        }).catch((err: any) => {
            // todo: implement
        });
    } else {
        // todo: implement
    }
};

gameIdInput.addEventListener("keyup", (event: KeyboardEvent) => { if (event.keyCode === 13) { getHostSignal(); } });
connectButton.addEventListener("click", getHostSignal);

newGameButton.addEventListener("click", (): void => {
    clientPeer.send(JSON.stringify(new ClientDataObject(ClientEventType.NewGame)));
});

endGameButton.addEventListener("click", (): void => {
    window.location.href = "/index.html";
});

// #endregion
