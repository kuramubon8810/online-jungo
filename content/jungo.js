'use strict';
const WEBSOCKET = new WebSocket("ws://localhost:9090/ws");
const BOARD_SIZE = 5;
const DIRECTION = ["up", "left", "right", "down"]
DIRECTION["up"] = {
	y: -1,
	x: 0
}
DIRECTION["left"] = {
	y: 0,
	x: -1
}
DIRECTION["right"] = {
	y: 0,
	x: +1
}
DIRECTION["down"] = {
	y: +1,
	x: 0
}

let nowTurn = 1;
let isBlackTurn = true;
let isPlayerTurnOfBlack = "";
let selectedTookPiece = false;
let selectTookPieceData = {}
let nowBoardStatusArray = []
let deck = [5, 5, 5, 5, 5]  //それぞれの数字の枚数の配列 配列での位置と一つずつずれている 0番目->1 1番目->2 ...
let blackPieces = [0, 0, 0, 0, 0]
let whitePieces = [0, 0, 0, 0, 0]

function createBoardArray() {
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

let onClickedBoard = (e) => {
	if (isBlackTurn != isPlayerTurnOfBlack) {
		return;
	}

	let pieceId = e.target.id || e.target.parentElement.id;
	let pieceCoordinate = {
		y: parseInt(pieceId.slice(0, 1)),
		x: parseInt(pieceId.slice(2, 3))
	}

	if (nowBoardStatusArray[pieceCoordinate.y][pieceCoordinate.x] != "space") {
		return;
	}

	applyOperationToNowBoardData(canPutInsertionToArray(nowBoardStatusArray, pieceCoordinate));

	--deck[nowNum - 1];
	if (deck[4] == 0) { //5が山札からなくなったか
		changeToUsePieceTable();
	}

	++nowTurn;
	isBlackTurn = !isBlackTurn;
	applyArrayDataToBoard();
	applyArrayDataToPieceTable();
	applyArrayDataToDeck();
	changeTurnDisplay();

	let toServerMessage =
		JSON.stringify(
			{
				"pieceId": pieceId,
				"nowBoardStatusArray": nowBoardStatusArray,
				"deck": deck,
				"blackPieces": blackPieces,
				"whitePieces": whitePieces
			}
		);

	console.log(toServerMessage);
	WEBSOCKET.send(toServerMessage);
}

let onClickedBoardNoDeck = (e) => {
	if (isBlackTurn != isPlayerTurnOfBlack) {
		return;
	}

	let pieceId = e.target.id || e.target.parentElement.id;
	let pieceCoordinate = {
		y: parseInt(pieceId.slice(0, 1)),
		x: parseInt(pieceId.slice(2, 3))
	}

	if (nowBoardStatusArray[pieceCoordinate.y][pieceCoordinate.x] != "space" || !selectedTookPiece) {
		return;
	}

	if (selectTookPieceData.number != numberCalculation(nowTurn)) {
		alert(`今は${nowNum}を置くターンです`);
		selectedTookPiece = false;
		document.getElementsByClassName("selected")[0].classList.remove("selected");
		return;
	}

	if (isBlackTurn && selectTookPieceData.owner == "black") {
		--blackPieces[nowNum - 1];
	} else if (!isBlackTurn && selectTookPieceData.owner == "white") {
		--whitePieces[nowNum - 1];
	} else {
		alert("それは敵の駒です");
		selectedTookPiece = false;
		document.getElementsByClassName("selected")[0].classList.remove("selected");
		return;
	}

	if (!checkNextTurn(numberCalculation(nowTurn + 1))) {
		gameEndProcess();
	}

	++nowTurn;
	isBlackTurn = !isBlackTurn;
	selectedTookPiece = false;
	applyArrayDataToBoard();
	applyArrayDataToPieceTable();
	changeTurnDisplay();

	let toServerMessage =
		JSON.stringify(
			{
				"pieceId": pieceId,
				"nowBoardStatusArray": nowBoardStatusArray,
				"deck": deck,
				"blackPieces": blackPieces,
				"whitePieces": whitePieces
			}
		);

	console.log(toServerMessage);
	WEBSOCKET.send(toServerMessage);

	document.getElementsByClassName("selected")[0].classList.remove("selected");
	//document.getElementById("next-game-button").style.display = "block"
}

let onSelectPieceProcess = (e) => {
	let pieceId = e.target.id || e.target.parentElement.id;

	selectTookPieceData = {
		number: pieceId.slice(0, 1),
		owner: pieceId.slice(2, 7)
	}

	if (selectedTookPiece) {
		document.getElementsByClassName("selected")[0].classList.remove("selected");
	} else {
		document.getElementById(pieceId).classList.add("selected");
	}

	selectedTookPiece = !selectedTookPiece;
}

function canPutInsertionToArray(nowBoardStatusArray, pieceCoordinate) {
	let nowNum = numberCalculation(nowTurn);
	let nextTurnBoardStatusArray = JSON.parse(JSON.stringify(nowBoardStatusArray));

	nextTurnBoardStatusArray[pieceCoordinate.y][pieceCoordinate.x] = `${nowNum}`;

	let returnValues = takePieceOseroRule(nowNum, pieceCoordinate, nextTurnBoardStatusArray);
	let tempReturnValues = takePieceGoRule(nowNum, pieceCoordinate, returnValues.nextTurnBoardStatusArray);

	returnValues.nextTurnBoardStatusArray = tempReturnValues.nextTurnBoardStatusArray;

	for (let i = 0; i < blackPieces.length; ++i) {  //黒と白の持ち駒の数は1～5で変わらないためとりあえず黒の長さ
		returnValues.blackPiecesDif[i] += tempReturnValues.blackPiecesDif[i];
		returnValues.whitePiecesDif[i] += tempReturnValues.whitePiecesDif[i];
	}

	return returnValues;
	/*
	returnValuesの中身
		{
		"nextTurnBoardStatusArray": nextTurnBoardStatusArray, 次のターンの盤面のデータ
		"blackPiecesDif": blackPiecesDif, 今のターンの黒の持ち駒と次のターンの黒の持ち駒の差
		"whitePiecesDif": whitePiecesDif  今のターンの白の持ち駒と次のターンの白の持ち駒の差
		}
	*/
}

function searchEnemyOseroRule(nowNum, pieceCoordinate, boardStatusArray) {
	let canPutPositionOseroRule = []

	for (let y = pieceCoordinate.y - 1; y <= pieceCoordinate.y + 1; ++y) {
		for (let x = pieceCoordinate.x - 1; x <= pieceCoordinate.x + 1; ++x) {
			if (
				boardStatusArray[y][x] == nowNum
				|| boardStatusArray[y][x] == "space"
				|| boardStatusArray[y][x] == "outzone"
			) {
				continue;
			}

			let yDirection = y - pieceCoordinate.y;
			let xDirection = x - pieceCoordinate.x;
			let searchPosition = {
				y: y,
				x: x
			}
			let searchPieceData = boardStatusArray[searchPosition.y][searchPosition.x];

			while (
				searchPieceData != nowNum
				&& searchPieceData != "space"
				&& searchPieceData != "outzone"
			) {
				searchPosition = {
					y: searchPosition.y + yDirection,
					x: searchPosition.x + xDirection
				}
				searchPieceData = boardStatusArray[searchPosition.y][searchPosition.x];
			}

			if (boardStatusArray[searchPosition.y][searchPosition.x] == nowNum) {
				canPutPositionOseroRule.push(searchPosition);
			}
		}
	}
	return canPutPositionOseroRule;
}

function objectCalculation(pieceCoordinate, DIRECTION) {
	let temp = {
		y: pieceCoordinate.y + DIRECTION.y,
		x: pieceCoordinate.x + DIRECTION.x
	}

	return temp;
}

function applyOperationToNowBoardData(operationData) {
	nowBoardStatusArray = returnValues.nextTurnBoardStatusArray;

	for (let i = 0; i < blackPieces.length; ++i) {  //黒と白の持ち駒の数は1～5で変わらないためとりあえず黒の長さ
		blackPieces[i] += returnValues.blackPieces[i];
		whitePieces[i] += returnValues.whitePieces[i];
	}
}

function searchBreathingPointEnemyGroup(nowNum, pieceCoordinate, searchedPosition, searchingGroup, boardStatusArray) {
	for (let i = 0; i < DIRECTION.length; ++i) {
		let piecePosition = objectCalculation(pieceCoordinate, DIRECTION[DIRECTION[i]]);
		let pieceData = boardStatusArray[piecePosition.y][piecePosition.x];

		if (pieceData == "space") {
			return false;
		} else if (pieceData != "outzone" && pieceData != nowNum) {
			let pieceId = `${piecePosition.y}-${piecePosition.x}`;

			if (searchedPosition.includes(pieceId)) {
				continue;
			}

			searchedPosition.push(pieceId);

			if (!searchBreathingPointEnemyGroup(nowNum, piecePosition, searchedPosition, searchingGroup, boardStatusArray)) {
				return false;
			}
		}
	}
	searchingGroup.push(pieceCoordinate);
	return true;
}

function searchEnemyGoRule(nowNum, pieceCoordinate, boardStatusArray) {
	let canPutPositionGoRule = []
	let searchedPosition = []
	let searchingGroup = []

	for (let i = 0; i < DIRECTION.length; ++i) {
		let piecePosition = objectCalculation(pieceCoordinate, DIRECTION[DIRECTION[i]]);
		let pieceData = boardStatusArray[piecePosition.y][piecePosition.x];

		if (
			pieceData == "space" 
			|| pieceData == "outzone" 
			|| pieceData == nowNum
		) {
			continue;
		}

		searchedPosition.push(`${piecePosition.y}-${piecePosition.x}`);

		if (searchBreathingPointEnemyGroup(nowNum, piecePosition, searchedPosition, searchingGroup, boardStatusArray)) {
			Array.prototype.push.apply(canPutPositionGoRule, searchingGroup);
		}
	}
	return canPutPositionGoRule;
}

//https://www.deep-rain.com/programming/javascript/755
function objectSort(obj) {
	// まずキーのみをソートする
	var keys = Object.keys(obj).sort();

	// 返却する空のオブジェクトを作る
	var map = {}

	// ソート済みのキー順に返却用のオブジェクトに値を格納する
	keys.forEach(
		function (key) {
			map[key] = obj[key];
		}
	);

	return map;
}

function takePieceOseroRule(nowNum, pieceCoordinate, nextTurnBoardStatusArray) {
	let blackPiecesDif = [0, 0, 0, 0, 0];
	let whitePiecesDif = [0, 0, 0, 0, 0];

	let canPutPositionOseroRule = searchEnemyOseroRule(nowNum, pieceCoordinate, nextTurnBoardStatusArray);
	for (let i = 0; i < canPutPositionOseroRule.length; ++i) {
		let yDirection = (canPutPositionOseroRule[i].y - pieceCoordinate.y) / Math.abs(canPutPositionOseroRule[i].y - pieceCoordinate.y);
		let xDirection = (canPutPositionOseroRule[i].x - pieceCoordinate.x) / Math.abs(canPutPositionOseroRule[i].x - pieceCoordinate.x);
		let takePiecePosition = {
			x: pieceCoordinate.x,
			y: pieceCoordinate.y
		}

		while (!(JSON.stringify(objectSort(canPutPositionOseroRule[i])) === JSON.stringify(objectSort(takePiecePosition)))) {
			let takePiece = nextTurnBoardStatusArray[takePiecePosition.y][takePiecePosition.x];

			if (nowNum == takePiece) {
				continue;
			}

			if (isBlackTurn) {
				++blackPiecesDif[parseInt(takePiece) - 1];
				nextTurnBoardStatusArray[takePiecePosition.y][takePiecePosition.x] = "space";
			} else {
				++whitePiecesDif[parseInt(takePiece) - 1];
				nextTurnBoardStatusArray[takePiecePosition.y][takePiecePosition.x] = "space";
			}

			if (yDirection) {
				takePiecePosition.y += yDirection;
			} else {
				takePiecePosition.y += 0;
			}

			if (xDirection) {
				takePiecePosition.x += xDirection;
			} else {
				takePiecePosition.x += 0;
			}
		}
	}

	return {
		"nextTurnBoardStatusArray": nextTurnBoardStatusArray,
		"blackPiecesDif": blackPiecesDif,
		"whitePiecesDif": whitePiecesDif
	}
}

function takePieceGoRule(nowNum, pieceCoordinate, nextTurnBoardStatusArray) {
	let blackPiecesDif = [0, 0, 0, 0, 0];
	let whitePiecesDif = [0, 0, 0, 0, 0];
	let canPutPositionGoRule = searchEnemyGoRule(nowNum, pieceCoordinate, nextTurnBoardStatusArray);

	for (let i = 0; i < canPutPositionGoRule.length; ++i) {
		let piecePosition = {
			y: canPutPositionGoRule[i].y,
			x: canPutPositionGoRule[i].x
		}

		if (nextTurnBoardStatusArray[piecePosition.y][piecePosition.x] == "space") {
			continue;
		}

		if (isBlackTurn) {
			++blackPiecesDif[parseInt(nextTurnBoardStatusArray[piecePosition.y][piecePosition.x]) - 1];
			nextTurnBoardStatusArray[piecePosition.y][piecePosition.x] = "space";
		} else {
			++whitePiecesDif[parseInt(nextTurnBoardStatusArray[piecePosition.y][piecePosition.x]) - 1];
			nextTurnBoardStatusArray[piecePosition.y][piecePosition.x] = "space";
		}
	}

	return {
		"nextTurnBoardStatusArray": nextTurnBoardStatusArray,
		"blackPiecesDif": blackPiecesDif,
		"whitePiecesDif": whitePiecesDif
	}
}

function checkNextTurn(nextNum) {
	if (isBlackTurn) {
		return whitePieces[nextNum - 1];
	} else {
		return blackPieces[nextNum - 1];
	}
}

function changeToUsePieceTable() {
	for (let y = 0; y < BOARD_SIZE; ++y) {
		for (let x = 0; x < BOARD_SIZE; ++x) {
			document.getElementById(`${y + 1}-${x + 1}`).removeEventListener("click", onClickedBoard, false);
			document.getElementById(`${y + 1}-${x + 1}`).addEventListener("click", onClickedBoardNoDeck, false);
		}
	}

	for (let y = 0; y < 2; ++y) {
		for (let x = 0; x < 3; ++x) {
			if (y * 3 + x + 1 == 6) {
				continue;
			}

			document.getElementById(`${y * 3 + x + 1}-black-storage`).addEventListener("click", onSelectPieceProcess, false);
			document.getElementById(`${y * 3 + x + 1}-white-storage`).addEventListener("click", onSelectPieceProcess, false);

		}
	}

	if (!checkNextTurn(numberCalculation(nowTurn + 1))) {
		gameEndProcess();
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
		alert(`後手が${numberCalculation(nowTurn + 1)}を持っていません`);
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
		alert(`先手が${numberCalculation(nowTurn + 1)}を持っていません`);
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

	for (let y = 0; y < 2; ++y) {
		for (let x = 0; x < 3; ++x) {
			if (y * 3 + x + 1 == 6) {
				continue;
			}

			document.getElementById(`${y * 3 + x + 1}-black-storage`).removeEventListener("click", onSelectPieceProcess, false);
			document.getElementById(`${y * 3 + x + 1}-white-storage`).removeEventListener("click", onSelectPieceProcess, false);
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
				if (nowBoardStatusArray[y][x] != "space") {
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
	while (document.getElementById(id).children.length);
		document.getElementById(id).children[0].remove();
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
		} else if (message[1] == "white") {
			isPlayerTurnOfBlack = false;
		}

		WEBSOCKET.onmessage = function (evt) {
			if (isPlayerTurnOfBlack != isBlackTurn || evt.data == "ping") {
				return;
			}

			let message = JSON.parse(evt.data);

			applyReceiveStatusToNowStatus(message);
			isBlackTurn = !isBlackTurn;
			console.log(message);
		}

		document.getElementById("grid").style.display = "grid";
		document.getElementById("matchingButton").style.display = "none";
	}
}

/* 送られてくるステータス
	"pieceId": pieceId,
	"nowBoardStatusArray": nowBoardStatusArray,
	"deck": deck,
	"blackPieces": blackPieces,
	"whitePieces": whitePieces
*/

function applyReceiveStatusToNowStatus(message) {
	let nowNum = numberCalculation(nowTurn);
	let pieceCoordinate = {
		y: parseInt(pieceId.slice(0, 1)),
		x: parseInt(pieceId.slice(2, 3))
	}
	let receiveStatus = JSON.parse(message);

	if(checkReceivedIncorrectValue(nowBoardStatusArray, pieceCoordinate, receiveStatus)) {
		WEBSOCKET.send("usedCheating");
		return;
	}

	nowBoardStatusArray = receiveStatus.nowBoardStatusArray;
	blackPieces = receiveStatus.blackPieces;
	whitePieces = receiveStatus.whitePieces;
}

function checkReceivedIncorrectValue(nowBoardStatusArray, pieceCoordinate, receiveStatus) {
	if (nowBoardStatusArray[pieceCoordinate.y][pieceCoordinate.x] != "space") {
		return true;
	}

	let correctStatus = canPutInsertionToArray(nowBoardStatusArray, pieceCoordinate);

	receiveStatus.blackPiecesDif = []
	receiveStatus.whitePiecesDif = []
	
	for (let i = 0; i < blackPieces.length; ++i) {
		receiveStatus.blackPiecesDif[i] = receiveStatus.blackPieces[i] - blackPieces[i];
		receiveStatus.whitePiecesDif[i] = receiveStatus.whitePieces[i] - whitePieces[i];
	}

	if (deck[4].length) {
		if (JSON.stringify(objectSort(receiveStatus.nowBoardStatusArray)) !== JSON.stringify(objectSort(correctStatus.nowBoardStatusArray))) {
			return true;
		}

		if (JSON.stringify(objectSort(receiveStatus.blackPiecesDif)) !== JSON.stringify(objectSort(correctStatus.blackPiecesDif))) {
			return true;
		}

		if (JSON.stringify(objectSort(receiveStatus.whitePiecesDif)) !== JSON.stringify(objectSort(correctStatus.whitePiecesDif))) {
			return true;
		}

		return false;
	} else {
		return false;
	}
}

createBoardArray();
initBoard();
initPieceTable();
applyArrayDataToDeck();

document.getElementById("next-game-button").addEventListener("click", nextGameProcess, false);
document.getElementById("matchingButton").addEventListener("click", matching, false);
