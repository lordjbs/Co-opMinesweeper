import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
  port: 3000,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024
  },
  maxPayload: 2097152,

});

const games: { [x: string]: any } = {}
const connections: { [x: string]: any } = {}

console.log("Minesweeper WS Server running...");

wss.on('connection', (conn) => {

  // Generate connection ID
  const connId = Array.from(Array(16), () => Math.floor(Math.random() * 36).toString(36)).join('');

  conn.on("message", (message: MessageEvent) => {
    console.log(message.toString())
    // Try to parse data, if it doesnt work close connection.
    let data: { [x: string]: any; type: any; };
    try {
      data = JSON.parse(message.toString());
    } catch (e) {
      conn.close();
      return;
    }

    switch (data["type"]) {
      case "Id":
        conn.send(JSON.stringify({ type: "Id", id: connId })); // Send id and own connectionId
        if (!connections.hasOwnProperty(connId)) connections[connId] = { conn, host: null }; // Accept the Id

        break;
      case "NewGame":
        if (!connections.hasOwnProperty(connId)) return;

        const gameId = Math.floor(Math.random() * 90000) + 10000

        games[gameId] = { host: connId }; // Create new game
        connections[connId].host = true; // Set user to host
        connections[connId].game = gameId;

        conn.send(JSON.stringify({ type: "NewGame", success: true, id: gameId }));

        break;

      // Find game in games dict
      case "FindGame":
        connections[connId].host = false; // Automatically set the client to not be a host

        const findGameId = data["id"];

        if (data["id"] == undefined) return conn.send(JSON.stringify({ type: "FindGame", success: false, message: "No game id" }));
        if (findGameId.length != 5 || !(/^\d{5}$/.test(findGameId))) return conn.send(JSON.stringify({ type: "FindGame", success: false, message: "Invalid game id" }));
        if (!games.hasOwnProperty(findGameId)) return conn.send(JSON.stringify({ type: "FindGame", success: false, message: "Game not found" }));

        connections[connId].connecting = games[findGameId].host;
        connections[games[findGameId].host].connecting = connId; // Restrict connections to those two ids

        connections[games[findGameId].host].conn.send(JSON.stringify({ type: "ReceivedConnection", clientId: connId })); // send host id to request clients offer
        conn.send(JSON.stringify({ type: "FindGame", success: true, hostId: games[findGameId].host }));

        break;

      case "HostOffer": case "ClientOffer":
        const query = data["type"];
        const clientId: string = data["id"];

        if (clientId == undefined) return conn.send(JSON.stringify({ success: false, message: "Invalid id" }));
        if (!/^(?!\d+$)\w{16}$/.test(clientId)) return conn.send(JSON.stringify({ success: false, message: "Invalid id" }));

        if (clientId != connections[connId].connecting) return conn.send(JSON.stringify({ success: false, message: "Invalid connection" }));

        console.log(`Received${query}`);
        connections[clientId].conn.send(JSON.stringify({ type: `Received${query}`, offer: data["offer"] })); // Send offer to receiver

        break;
    }
  });

  conn.on("close", () => {
    delete games[connections[connId]["game"]]
    delete connections[connId];
  });
});

// Clearing interval
setInterval(() => {
  for (var x in connections) { if (connections.hasOwnProperty(x)) delete connections[x]; }
  for (var x in games) { if (games.hasOwnProperty(x)) delete games[x]; }
}, 3.6e6)