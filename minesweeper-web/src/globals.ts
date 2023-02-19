// #region Game properties

let matrix: Field[][] = new Array<Field[]>(16);
let previousActiveField: Field;

let flagsLeft: number = 99;

let elapsedTime: number = 0;
let timerIntervalId: number = 0;

const latencyTestStamps: number[] = [];
const latencyTestResults: number[] = [];
let averageLatency: number;

const baseSignalrUrl: string = location.host.indexOf("coopminesweeper.com") !== -1 ? "https://api.coopminesweeper.com" : "";
const debugSimplePeer: boolean = false;

let revealedFields: number = 0;

// #endregion Game properties

// #region Html globals

let gameCanvas: HTMLCanvasElement = document.getElementById("game-canvas") as HTMLCanvasElement;
let gameCanvasContext: CanvasRenderingContext2D = gameCanvas.getContext("2d") as CanvasRenderingContext2D;
gameCanvas.width = gameCanvas.offsetWidth;
gameCanvas.height = gameCanvas.offsetHeight;

let mouseCanvas: HTMLCanvasElement = document.getElementById("mouse-canvas") as HTMLCanvasElement;
let mouseCanvasContext: CanvasRenderingContext2D = mouseCanvas.getContext("2d") as CanvasRenderingContext2D;
mouseCanvas.width = mouseCanvas.offsetWidth;
mouseCanvas.height = mouseCanvas.offsetHeight;

let otherMouseCanvas: HTMLCanvasElement = document.getElementById("other-mouse-canvas") as HTMLCanvasElement;
let otherMouseCanvasContext: CanvasRenderingContext2D = otherMouseCanvas.getContext("2d") as CanvasRenderingContext2D;
otherMouseCanvas.width = otherMouseCanvas.offsetWidth;
otherMouseCanvas.height = otherMouseCanvas.offsetHeight;

let cursorImage: HTMLImageElement = new Image();
cursorImage.src = "img/cursor.png";

let flagImage: HTMLImageElement = new Image();
flagImage.src = "img/flag.png";

let bombImage: HTMLImageElement = new Image();
bombImage.src = "img/bomb.png";

const overlay: HTMLElement = document.getElementById("overlay") as HTMLElement;
const overlayStatus: HTMLElement = document.getElementById("overlay-status") as HTMLElement;

const newGameButton: HTMLButtonElement = document.getElementById("new-game-button") as HTMLButtonElement;
const endGameButton: HTMLButtonElement = document.getElementById("end-game-button") as HTMLButtonElement;

const testLatencyButton: HTMLButtonElement = document.getElementById("test-latency-button") as HTMLButtonElement;
let latencyInterval: ReturnType<typeof setInterval>;

let flagsElement: HTMLElement = document.getElementById("flags") as HTMLElement;
let timerElement: HTMLElement = document.getElementById("timer") as HTMLElement;

let lastMousePosition: MousePosition;
const toggle: HTMLInputElement = document.getElementById("kbtoggle") as HTMLInputElement;

// Host only
const gameIdText: HTMLElement = document.getElementById("game-id-text") as HTMLElement;
const copyToClipboardButton: HTMLButtonElement = document.getElementById("copy-to-clipboard-button") as HTMLButtonElement;

// Client only
const gameIdInput: HTMLInputElement = document.getElementById("game-id-input") as HTMLInputElement;
const connectButton: HTMLButtonElement = document.getElementById("connect-button") as HTMLButtonElement;

// #endregion Html globals

var exposePressed = false;
var flagPressed = false;
var exposeKey = localStorage.exposeKey == undefined ? "w" : localStorage.exposeKey;
var flagKey = localStorage.flagKey == undefined ? "d" : localStorage.findKey;

let exposeSpan = document.getElementById("expose_key")!!;
let flagSpan = document.getElementById("flag_key")!!;

exposeSpan.addEventListener("click", () => {
    if(flagPressed) return;

    if(exposePressed) {
        exposeSpan.textContent = exposeKey;
        exposePressed = false;
        return;
    }

    exposeSpan.textContent = "listening..."
    exposePressed = true;
});

flagSpan.addEventListener("click", () => {
    if(exposePressed) return;

    if(flagPressed) {
        flagSpan.textContent = flagKey;
        flagPressed = false;
        return;
    }

    flagSpan.textContent = "listening..."
    flagPressed = true;
});