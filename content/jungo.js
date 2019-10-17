'use strict';
const WEBSOCKET = new WebSocket("ws://localhost:9090/ws");
const BOARD_SIZE = 5;
let isBlackTurn = true;
let isPlayerTurnOfBlack = false; //とりあえずfalseにしてる(よくない)
let nowTurn = 1;
let nowBoardStatusArray = []
let blackPieces = [0,0,0,0,0]
let whitePieces = [0,0,0,0,0]
let deck = [5,5,5,5,5]

let onClickedBoard = (e) => {
	if (isPlayerTurnOfBlack != isBlackTurn) {
		return;
	}

	let pieceId = e.target.id || e.target.parentElement.id;
	let nowNum = numberCalculation(nowTurn);
	let pieceCoordinate = {
		y: parseInt(pieceId.slice(0, 1)),
		x: parseInt(pieceId.slice(2, 3))
	}

	if (nowBoardStatusArray[pieceCoordinate.y][pieceCoordinate.x] != "space") {
		return;
	}

	console.log(JSON.stringify(pieceCoordinate));
	WEBSOCKET.send(JSON.stringify(pieceCoordinate));

	applyArrayDataToBoard();
	applyArrayDataToPieceTable();
	applyArrayDataToDeck();
	changeTurnDisplay();
}

let onClickedBoardNoDeck = (e) => {
	if (isBlackTurn != isPlayerTurnOfBlack) {
		return;
	}

	let pieceId = e.target.id || e.target.parentElement.id;
	let nowNum = numberCalculation(nowTurn);
	let pieceCoordinate = {
		y: parseInt(pieceId.slice(0, 1)),
		x: parseInt(pieceId.slice(2, 3))
	}

	if (nowBoardStatusArray[pieceCoordinate.y][pieceCoordinate.x] != "space") {
		return;
	}

	console.log(JSON.stringify(pieceCoordinate));
	WEBSOCKET.send(JSON.stringify(pieceCoordinate));

	applyArrayDataToBoard();
	applyArrayDataToPieceTable();
	applyArrayDataToDeck();
	changeTurnDisplay();
	
	document.getElementsByClassName("selected")[0].classList.remove("selected");
}

function changeToUsePieceTable() {
	for (let y = 0; y < BOARD_SIZE; ++y) {
		for (let x = 0; x < BOARD_SIZE; ++x) {
			document.getElementById(`${y + 1}-${x + 1}`).removeEventListener("click", onClickedBoard, false);
			document.getElementById(`${y + 1}-${x + 1}`).addEventListener("click", onClickedBoardNoDeck, false);
		}
	}
}

function changeTurnDisplay() {
	if (isBlackTurn) {
		document.getElementById("turn").style.color = "#eee";
		document.getElementById("turn").style.backgroundColor = "#333";
		document.getElementById("turn").firstChild.innerHTML = `先手番:${numberCalculation(nowTurn)}<br>${nowTurn}ターン目`;
	} else {
		document.getElementById("turn").style.color = "#333";
		document.getElementById("turn").style.backgroundColor = "#eee";
		document.getElementById("turn").firstChild.innerHTML = `後手番:${numberCalculation(nowTurn)}<br>${nowTurn}ターン目`;
	}
}

function numberCalculation(num) {
	if (num % 5) {
		return num % 5;
	} else {
		return 5;
	}
}

function gameEndProcess() {
	if (isBlackTurn) {
		alert(`後手が${numberCalculation(nowTurn)}を持っていません`);
		alert("先手の勝ちです");

		document.getElementById("turn").style.color = "#eee";
		document.getElementById("turn").style.backgroundColor = "#87bdd8";
		document.getElementById("turn").firstChild.innerHTML = "勝者:先手";
		document.getElementById("next-game-button").style.display = "block";

		removeAllEvent();
		applyArrayDataToBoard();
		applyArrayDataToPieceTable();
		applyArrayDataToDeck();
		return;
	} else {
		alert(`先手が${numberCalculation(nowTurn)}を持っていません`);
		alert("後手の勝ちです");

		document.getElementById("turn").style.color = "#eee";
		document.getElementById("turn").style.backgroundColor = "#87bdd8";
		document.getElementById("turn").firstChild.innerHTML = "勝者:後手";
		document.getElementById("next-game-button").style.display = "block";

		removeAllEvent();
		applyArrayDataToBoard();
		applyArrayDataToPieceTable();
		applyArrayDataToDeck();
		return;
	}
}

function removeAllEvent() {
	for (let y = 0; y < BOARD_SIZE; ++y) {
		for (let x = 0; x < BOARD_SIZE; ++x) {
			document.getElementById(`${y + 1}-${x + 1}`).removeEventListener("click", onClickedBoardNoDeck, false);
		}
	}
}

function nextGameProcess() {
	let nextGame = confirm("次の試合をしますか？");
	if (nextGame) {
		location.href = location.href;
	}
}

function applyArrayDataToBoard() {
	for (let y = 1; y <= BOARD_SIZE; ++y) {
		for (let x = 1; x <= BOARD_SIZE; ++x) {
			let nowBoardPosition = document.getElementById(`${y}-${x}`);
			if (!(nowBoardPosition.children.length)) {
				if (nowBoardStatusArray[y][x] == "space") {
					continue;
				}

				let htmlImg = document.createElement("img");

				htmlImg.src = `number${nowBoardStatusArray[y][x]}.png`;
				nowBoardPosition.appendChild(htmlImg);
			} else {
				if (nowBoardStatusArray[y][x] == "space") {
					nowBoardPosition.removeChild(nowBoardPosition.firstChild);
				}
			}
		}
	}
}

function applyArrayDataToPieceTable() {
	for (let i = 0; i < 5; ++i) {
		removeChildren(`${i + 1}-black-storage`);
		removeChildren(`${i + 1}-white-storage`);

		for (let j = 0; j < 5; ++j) {
			let blackPieceImg = document.createElement("img");
			let whitePieceImg = document.createElement("img");

			blackPieceImg.src = `number${i + 1}.png`;
			whitePieceImg.src = `number${i + 1}.png`;

			if (blackPieces[i] <= j) {
				blackPieceImg.className = "noPieces";
			}

			if (whitePieces[i] <= j) {
				whitePieceImg.className = "noPieces";
			}

			document.getElementById(`${i + 1}-black-storage`).appendChild(blackPieceImg);
			document.getElementById(`${i + 1}-white-storage`).appendChild(whitePieceImg);
		}
	}
}

function removeChildren(id) {
	while (document.getElementById(id).children.length) {
		document.getElementById(id).children[0].remove();
	}
}

function applyArrayDataToDeck() {
	removeChildren("deck");

	for (let i = deck.length; i > 0; --i) {
		for (let j = deck.length; j > 0; --j) {
			let htmlImg = document.createElement("img");

			htmlImg.src = `number${j}.png`;

			if (deck[j - 1] <= (deck.length - i)) {
				htmlImg.className = "noPieces";
			}

			document.getElementById("deck").appendChild(htmlImg);
		}
	}
}

function createNowBoardStatusArray() {
	for (let y = 0; y <= BOARD_SIZE + 1; ++y) {
		let line = []
		for (let x = 0; x <= BOARD_SIZE + 1; ++x) {
			switch (y) {
				case 0:
				case BOARD_SIZE + 1:
					line.push("outzone");
					break;
				default:
					switch (x) {
						case 0:
						case BOARD_SIZE + 1:
							line.push("outzone");
							break;
						default:
							line.push("space");
							break;
					}
			}
		}
		nowBoardStatusArray.push(line);
	}
}

function initBoard() {

	for (let y = 0; y < BOARD_SIZE; ++y) {
		let htmlTr = document.createElement("tr");

		board.appendChild(htmlTr);

		for (let x = 0; x < BOARD_SIZE; ++x) {
			let htmlTd = document.createElement("td");

			htmlTd.addEventListener("click", onClickedBoard, false);
			htmlTd.id = `${y + 1}-${x + 1}`;
			htmlTr.appendChild(htmlTd);
		}
	}
}


function initPieceTable() {
	for (let y = 0; y < 5; ++y) {
		let htmlTrBlack = document.createElement("tr");
		let htmlTrWhite = document.createElement("tr");
		let htmlTdBlack = document.createElement("td");
		let htmlTdWhite = document.createElement("td");
		let htmlImgBlack = document.createElement("img");
		let htmlImgWhite = document.createElement("img");

		htmlTdBlack.id = `${y + 1}-black-storage`;
		htmlTdWhite.id = `${y + 1}-white-storage`;

		htmlTdBlack.appendChild(htmlImgBlack);
		htmlTdWhite.appendChild(htmlImgWhite);
		htmlTrBlack.appendChild(htmlTdBlack);
		htmlTrWhite.appendChild(htmlTdWhite);

		document.getElementById("black-piece-table").appendChild(htmlTrBlack);
		document.getElementById("white-piece-table").appendChild(htmlTrWhite);
	}
	applyArrayDataToPieceTable();
}

function matching() {
	WEBSOCKET.send("matching");
	WEBSOCKET.onmessage = function (evt) {
		if (isPlayerTurnOfBlack != "") {
			return;
		}

		let message = evt.data.split("\n");

		if (message[0] != "matched!") {
			return;
		}

		console.log(message);

		if (message[1] == "black") {
			isPlayerTurnOfBlack = true;
			document.getElementById("player-turn").style.color = "#eee";
			document.getElementById("player-turn").style.backgroundColor = "#333";
			document.getElementById("player-turn").firstChild.innerHTML = "あなたは<br>先手番です";
		} else if (message[1] == "white") {
			isPlayerTurnOfBlack = false;
			document.getElementById("player-turn").style.color = "#eee";
			document.getElementById("player-turn").style.backgroundColor = "#333";
			document.getElementById("player-turn").firstChild.innerHTML = "あなたは<br>後手番です";
		}

		WEBSOCKET.onmessage = applyReceiveStatusToNowStatus;

		document.getElementById("grid").style.display = "grid";
		document.getElementById("matching-button").style.display = "none";
	}
}

function applyReceiveStatusToNowStatus(evt) {
	if (evt.data == "ping") {
		return;
	}

	let receiveStatus = JSON.parse(evt.data);

	if (receiveStatus.errStatus == "cantPut") {
		alert("そこに置くことはできません");
	} else if (receiveStatus.errStatus == "wrongStatus") {
		alert("不正な値です");
	}

	console.log(receiveStatus);

	nowTurn = receiveStatus.nowTurn;
	deck = receiveStatus.deck;
	nowBoardStatusArray = receiveStatus.nowBoardStatusArray;
	blackPieces = receiveStatus.blackPieces;
	whitePieces = receiveStatus.whitePieces;

	if (receiveStatus.gameEndFlag == true) {
		gameEndProcess();
		nextGameProcess();
	} else {
		isBlackTurn = receiveStatus.isBlackTurn;
		applyArrayDataToBoard();
		applyArrayDataToPieceTable();
		applyArrayDataToDeck();
		changeTurnDisplay();
	}

}

createNowBoardStatusArray();
initBoard();
initPieceTable();
applyArrayDataToDeck();

document.getElementById("next-game-button").addEventListener("click", nextGameProcess, false);
document.getElementById("matching-button").addEventListener("click", matching, false);
