package main

import(
	"net/http"
	"log"
	"time"
	"strconv"
	"encoding/json"
	"github.com/gorilla/websocket"
)

type client struct {
	status string
	chanel chan bool
}

var upgrader = websocket.Upgrader{
	ReadBufferSize: 1024,
	WriteBufferSize: 1024,
}

var clients = make(map[*websocket.Conn]*client)
var gameRoom = make([][]*websocket.Conn, 0)  //[[black, white], [black, white]]

func main(){
	http.Handle("/", http.FileServer(http.Dir("./content")))
	http.HandleFunc("/ws", serveWs)

	go echo()

	log.Fatal(http.ListenAndServe(":9090", nil))
}

func serveWs(w http.ResponseWriter, r *http.Request) {
	log.Println("connecting")
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		log.Println(err)
		return
	}

	clients[conn] = &client{
		"wating",
		make(chan bool),
	}

	go receiveStatus(conn)
	log.Println("connected")
}

func echo() {
	for {
		matchingClient := make([]*websocket.Conn, 0)
		for ws, property := range clients {
			err := ws.WriteMessage(websocket.TextMessage, []byte("ping"))

			if err != nil {
				log.Printf("websocket error: %s", err)
				ws.Close()
				delete(clients, ws)
				continue
			}


			if property.status == "matching" {
				matchingClient = append(matchingClient, ws)
			}

			log.Println(property.status)
		}

		for i := 0; (i + 1) * 2 <= len(matchingClient); i++ {  //<-1してるのは1人のときに通ってしまうため(他にいい方法ありそう)
			black:= matchingClient[i * 2]
			white := matchingClient[i * 2 + 1]

			err := black.WriteMessage(websocket.TextMessage, []byte("matched!\nblack"))
			if err != nil {
				log.Printf("can not send to websocket: %s", err)
				black.Close()
				delete(clients, black)
			}

			err = white.WriteMessage(websocket.TextMessage, []byte("matched!\nwhite"))
			if err != nil {
				log.Printf("can not send to websocet: %s", err)
				white.Close()
				delete(clients, white)
			}

			gameRoom = append(gameRoom,[][]*websocket.Conn{{black, white}}...)  //<-このゲームは2人対戦なため
			go gameProcess(len(gameRoom) - 1)
			clients[black].status = "playing"
			clients[black].chanel <- true
			clients[white].status = "playing"
			clients[white].chanel <- true
			log.Println(gameRoom)
		}
		time.Sleep(1 * time.Second)
	}
}

func receiveStatus(c *websocket.Conn) {	
	for{
		_, message, err := c.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		if string(message) == "matching" {
			clients[c].status = "matching"
			end := <-clients[c].chanel
			if end == true {
				return
			}
		}
		log.Printf("%s", message)
	}
}

const BOARD_SIZE int = 5

type Xy struct {
	X,Y int
}

type GameStatus struct {
	NowTurn int `json:"nowTurn"`
	NowNum int `json:"nowNum"`
	IsBlackTurn bool `json:"isBlackTurn"`
	UseDeck bool `json:"useDeck"`
	GameEndFlag bool `json:"gameEndFlag"`
	NowBoardStatusArray [BOARD_SIZE + 2][BOARD_SIZE + 2]string `json:"nowBoardStatusArray"`
	BlackPieces [5]int `json:"blackPieces"`
	WhitePieces [5]int `json:"whitePieces"`
	Deck [5]int `json:"deck"`
	ErrStatus string `json:"errStatus"`
}

var DIRECTION = map[string]Xy {
	"up": Xy {
		0, -1,
	},

	"down": Xy {
		0, 1,
	},

	"left": Xy {
		-1, 0,
	},
	
	"right": Xy {
		1, 0,
	},
}

func createNowBoardStatusArray() (nowBoardStatusArray [BOARD_SIZE + 2][BOARD_SIZE + 2]string) {
	for y := 0; y <= BOARD_SIZE + 1; y++ {
		for x := 0; x <= BOARD_SIZE + 1; x++ {
			switch (y) {
			case 0:
				nowBoardStatusArray[y][x] = "outzone"
			case BOARD_SIZE + 1:
				nowBoardStatusArray[y][x] = "outzone"
			default:
				switch (x) {
				case 0:
					nowBoardStatusArray[y][x] = "outzone"
				case BOARD_SIZE + 1:
					nowBoardStatusArray[y][x] = "outzone"
				default:
					nowBoardStatusArray[y][x] = "space"
				}
			}
		}
	}
	return 
}

func checkNextTurn(gameStatus GameStatus) bool {
	nextNum := numberCalculation(gameStatus.NowNum + 1)
	if gameStatus.IsBlackTurn == true && gameStatus.WhitePieces[nextNum - 1] == 0 {
		return false
	} else if gameStatus.IsBlackTurn == false && gameStatus.BlackPieces[nextNum - 1] == 0 {
		return false
	}

	return true
}

func numberCalculation(num int) int {
	if num % 5 != 0 {
		return num % 5
	} else {
		return 5
	}
}

func objectCaluculation(pieceCoordinate Xy, direction Xy) Xy {
	temp := Xy{
		X: pieceCoordinate.X + direction.X,
		Y: pieceCoordinate.Y + direction.Y,
	}

	return temp
}

func searchEnemyOseroRule(gameStatus GameStatus, pieceCoordinate Xy) []Xy {
	canPutPositionOseroRule := []Xy{}

	for y := pieceCoordinate.Y - 1; y <= pieceCoordinate.Y + 1; y++ {
		for x := pieceCoordinate.X - 1; x <= pieceCoordinate.X + 1; x++ {
			if (
				gameStatus.NowBoardStatusArray[y][x] == strconv.Itoa(gameStatus.NowNum) ||
				gameStatus.NowBoardStatusArray[y][x] == "space" ||
				gameStatus.NowBoardStatusArray[y][x] == "outzone") {
				continue
			}

			yDirection := y - pieceCoordinate.Y
			xDirection := x - pieceCoordinate.X
			searchPosition := Xy{
				x,y,
			}
			searchPieceData := gameStatus.NowBoardStatusArray[searchPosition.Y][searchPosition.X]

			for
			searchPieceData != strconv.Itoa(gameStatus.NowNum) &&
			searchPieceData != "space" &&
			searchPieceData != "outzone" {
				searchPosition = Xy{
					Y: searchPosition.Y + yDirection,
					X: searchPosition.X + xDirection,
				}
				searchPieceData = gameStatus.NowBoardStatusArray[searchPosition.Y][searchPosition.X]
			}

			if gameStatus.NowBoardStatusArray[searchPosition.Y][searchPosition.X] == strconv.Itoa(gameStatus.NowNum) {
				canPutPositionOseroRule = append(canPutPositionOseroRule, searchPosition)
			}
		}
	}
	return canPutPositionOseroRule
}

func searchBreathingPointEnemyGroup(gameStatus GameStatus, pieceCoordinate Xy, searchedPosition *[BOARD_SIZE * BOARD_SIZE]Xy, searchingGroup *[BOARD_SIZE * BOARD_SIZE]Xy) bool {
	LABEL:
	for _, v := range DIRECTION {
		piecePosition := objectCaluculation(pieceCoordinate, v)
		pieceData := gameStatus.NowBoardStatusArray[piecePosition.Y][piecePosition.X]
		
		if pieceData == "space" {
			return false
		}
		
		if pieceData != "outzone" && pieceData != strconv.Itoa(gameStatus.NowNum) {	
			for i, arrayValue := range searchedPosition {
				if (arrayValue.X == piecePosition.X) && (arrayValue.Y == piecePosition.Y) {	
					continue LABEL
				} else if (arrayValue.X == 0) && (arrayValue.Y == 0) {
					searchedPosition[i] = piecePosition
					break
				}
			}

			if searchBreathingPointEnemyGroup(gameStatus, piecePosition, searchedPosition, searchingGroup) == false {
				return false
			}
		}
	}

	for i, arrayValue := range searchingGroup {
		if (arrayValue.X == 0) && (arrayValue.Y == 0) {
			searchingGroup[i] = pieceCoordinate
			break
		}
	}
	return true
}

func searchEnemyGoRule(gameStatus GameStatus, pieceCoordinate Xy) (canPutPositionGoRule [BOARD_SIZE*BOARD_SIZE]Xy) {
	for _, v := range DIRECTION {
		piecePosition := objectCaluculation(pieceCoordinate, v)
		pieceData := gameStatus.NowBoardStatusArray[piecePosition.Y][piecePosition.X]

		if (
			pieceData == "space" ||
			pieceData == "outzone" ||
			pieceData == strconv.Itoa(gameStatus.NowNum)) {
			continue
		}

		searchedPosition := [BOARD_SIZE*BOARD_SIZE]Xy{{piecePosition.X, piecePosition.Y}}
		searchingGroup := [BOARD_SIZE*BOARD_SIZE]Xy{}	

		if searchBreathingPointEnemyGroup(gameStatus, piecePosition, &searchedPosition, &searchingGroup) {
			for i := 0; i < len(searchingGroup); i++ {
				if (canPutPositionGoRule[i].X == 0) && (canPutPositionGoRule[i].Y == 0) {
					canPutPositionGoRule[i] = searchingGroup[i]
				}
			}
		}
	}
	return canPutPositionGoRule
}

func intAbs(x int) int {
	if x < 0 {
		return -1 * x
	}
	return x
}

func takePieceOseroRule(gameStatus GameStatus, pieceCoordinate Xy) ([BOARD_SIZE + 2][BOARD_SIZE + 2]string, [5]int, [5]int) {
	nextTurnBoardStatusArray := gameStatus.NowBoardStatusArray
	blackPiecesDif := [5]int{0,0,0,0,0}
	whitePiecesDif := [5]int{0,0,0,0,0}
	canPutPositionOseroRule := searchEnemyOseroRule(gameStatus, pieceCoordinate)
	
	for i := 0; i < len(canPutPositionOseroRule); i++ {
		var yDirection, xDirection int
		
		if canPutPositionOseroRule[i].Y == pieceCoordinate.Y {
			yDirection = 0
		} else {
			yDirection = (canPutPositionOseroRule[i].Y - pieceCoordinate.Y) / intAbs(canPutPositionOseroRule[i].Y - pieceCoordinate.Y)
		}

		if canPutPositionOseroRule[i].X == pieceCoordinate.X {
			xDirection = 0
		} else {
			xDirection = (canPutPositionOseroRule[i].X - pieceCoordinate.X) / intAbs(canPutPositionOseroRule[i].X - pieceCoordinate.X)
		}

		takePiecePosition := Xy{
			pieceCoordinate.X + xDirection,
			pieceCoordinate.Y + yDirection,
		}

		for (canPutPositionOseroRule[i] != takePiecePosition) {
			takePieceNum := nextTurnBoardStatusArray[takePiecePosition.Y][takePiecePosition.X]

			if strconv.Itoa(gameStatus.NowNum) == takePieceNum {
				continue
			}

			if gameStatus.IsBlackTurn {
				temp, _ := strconv.Atoi(takePieceNum)
				blackPiecesDif[temp - 1]++
				nextTurnBoardStatusArray[takePiecePosition.Y][takePiecePosition.X] = "space"
			} else {
				temp, _ := strconv.Atoi(takePieceNum)
				whitePiecesDif[temp - 1]++
				nextTurnBoardStatusArray[takePiecePosition.Y][takePiecePosition.X] = "space"
			}

			takePiecePosition.Y += yDirection
			takePiecePosition.X += xDirection
		}
	}
	return nextTurnBoardStatusArray, blackPiecesDif, whitePiecesDif
}

func takePieceGoRule(gameStatus GameStatus, pieceCoordinate Xy) ([BOARD_SIZE + 2][BOARD_SIZE + 2]string, [5]int, [5]int) {
	nextTurnBoardStatusArray := gameStatus.NowBoardStatusArray
	blackPiecesDif := [5]int{0,0,0,0,0}
	whitePiecesDif := [5]int{0,0,0,0,0}
	canPutPositionGoRule := searchEnemyGoRule(gameStatus, pieceCoordinate)

	for i := 0; i < len(canPutPositionGoRule); i++ {
		piecePosition := Xy{
			canPutPositionGoRule[i].X,
			canPutPositionGoRule[i].Y,
		}

		if piecePosition.X == 0 && piecePosition.Y == 0 {
			continue
		}

		if gameStatus.IsBlackTurn {
			temp, _ := strconv.Atoi(nextTurnBoardStatusArray[piecePosition.Y][piecePosition.X])
			blackPiecesDif[temp - 1]++
			nextTurnBoardStatusArray[piecePosition.Y][piecePosition.X] = "space"
		} else {
			temp, _ := strconv.Atoi(nextTurnBoardStatusArray[piecePosition.Y][piecePosition.X])
			whitePiecesDif[temp - 1]++
			nextTurnBoardStatusArray[piecePosition.Y][piecePosition.X] = "space"
		}
	}
	return nextTurnBoardStatusArray, blackPiecesDif, whitePiecesDif
}

func canPutInsertionToArray(gameStatus GameStatus, pieceCoordinate Xy) GameStatus {
	gameStatus.NowNum = numberCalculation(gameStatus.NowTurn)
	gameStatus.NowBoardStatusArray[pieceCoordinate.Y][pieceCoordinate.X] = strconv.Itoa(gameStatus.NowNum)

	nextTurnBoardStatusArrayOseroRule, oseroRuleBlackPiecesDif, oseroRuleWhitePiecesDif := takePieceOseroRule(gameStatus, pieceCoordinate)
	nextTurnBoardStatusArrayGoRule, goRuleBlackPiecesDif, goRuleWhitePiecesDif := takePieceGoRule(gameStatus, pieceCoordinate)
	
	for y := 0; y < BOARD_SIZE + 1; y++ {
		for x := 0; x < BOARD_SIZE + 1; x++ {
			if nextTurnBoardStatusArrayOseroRule[y][x] == "space" {
				gameStatus.NowBoardStatusArray[y][x] = "space"
			} else if nextTurnBoardStatusArrayGoRule[y][x] == "space" {
				gameStatus.NowBoardStatusArray[y][x] = "space"
			} else {
				gameStatus.NowBoardStatusArray[y][x] = nextTurnBoardStatusArrayGoRule[y][x]
				//オセロのを見ても囲碁のを見てもどっちでもいいので短い方
			}
		}
	}

	for i := 0; i < len(oseroRuleBlackPiecesDif); i++ {
		gameStatus.BlackPieces[i] += oseroRuleBlackPiecesDif[i] + goRuleBlackPiecesDif[i]
		gameStatus.WhitePieces[i] += oseroRuleWhitePiecesDif[i] + goRuleWhitePiecesDif[i]
	}

	return gameStatus
}

func onClickedBoard(gameStatus GameStatus, pieceCoordinate Xy) GameStatus {
	if gameStatus.NowBoardStatusArray[pieceCoordinate.Y][pieceCoordinate.X] != "space" {
		gameStatus.ErrStatus = "cantPut"
		return gameStatus
	}

	gameStatus = canPutInsertionToArray(gameStatus, pieceCoordinate)

	gameStatus.Deck[gameStatus.NowNum - 1]--
	if gameStatus.Deck[4] == 0 {
		gameStatus.UseDeck = false
		
		if checkNextTurn(gameStatus) == false {
			gameStatus.GameEndFlag = true
		}
	}

	gameStatus.NowTurn++
	gameStatus.IsBlackTurn = !gameStatus.IsBlackTurn

	return gameStatus
}

func onClickedBoardNoDeck(gameStatus GameStatus, pieceCoordinate Xy) GameStatus {
	if gameStatus.NowBoardStatusArray[pieceCoordinate.Y][pieceCoordinate.X] != "space" {
		gameStatus.ErrStatus = "cantPut"
		return gameStatus
	}

	gameStatus = canPutInsertionToArray(gameStatus, pieceCoordinate)

	if checkNextTurn(gameStatus) == false {
		gameStatus.GameEndFlag = true
	}

	gameStatus.NowTurn++
	gameStatus.IsBlackTurn = !gameStatus.IsBlackTurn

	return gameStatus
}

func gameProcess(i int) {
	log.Println(gameRoom[i])
	black := gameRoom[i][0]
	white := gameRoom[i][1]
	gameStatus := GameStatus{}

	gameStatus.NowTurn = 1
	gameStatus.IsBlackTurn = true
	gameStatus.UseDeck = true
	gameStatus.GameEndFlag = false
	gameStatus.Deck = [5]int{5,5,5,5,5}
	gameStatus.BlackPieces = [5]int{0,0,0,0,0}
	gameStatus.WhitePieces = [5]int{0,0,0,0,0}
	gameStatus.NowBoardStatusArray = createNowBoardStatusArray()

	for {
		gameStatus.ErrStatus = ""

		if gameStatus.IsBlackTurn == true {
			var receivePieceCoordinate Xy

			_, receiveMessage, err := black.ReadMessage()
			
			if err != nil {
				gameStatus.ErrStatus = "playerDisconnected"
				log.Printf("websocket error: %s", err)
				sendMessage, _ := json.Marshal(gameStatus)
				white.WriteMessage(websocket.TextMessage, sendMessage)

				black.Close()
				white.Close()
				delete(clients, black)
				delete(clients, white)
				gameRoom = append(gameRoom[:i], gameRoom[i+1:]...)
				return
			}

			err = json.Unmarshal(receiveMessage, &receivePieceCoordinate)

			if err != nil {
				gameStatus.ErrStatus = "wrongStatus"
				continue
			}

			if gameStatus.UseDeck == true {
				gameStatus = onClickedBoard(gameStatus, receivePieceCoordinate)
			} else {
				gameStatus = onClickedBoardNoDeck(gameStatus, receivePieceCoordinate)
				gameStatus.BlackPieces[gameStatus.NowNum - 1]--
			}

			sendMessage, _ := json.Marshal(gameStatus)
			black.WriteMessage(websocket.TextMessage, sendMessage)
			white.WriteMessage(websocket.TextMessage, sendMessage)
			
			if gameStatus.GameEndFlag == true {
				black.Close()
				white.Close()
				delete(clients, black)
				delete(clients, white)
				gameRoom = append(gameRoom[:i], gameRoom[i+1:]...)
				return
			}
		} else {	
			var receivePieceCoordinate Xy

			_, receiveMessage, err := white.ReadMessage()

			if err != nil {
				gameStatus.ErrStatus = "playerDisconnected"
				log.Printf("websocket error: %s", err)
				sendMessage, _ := json.Marshal(gameStatus)
				black.WriteMessage(websocket.TextMessage, sendMessage)

				black.Close()
				white.Close()
				delete(clients, black)
				delete(clients, white)
				gameRoom = append(gameRoom[:i], gameRoom[i+1:]...)
				return
			}

			err = json.Unmarshal(receiveMessage, &receivePieceCoordinate)

			if err != nil {
				gameStatus.ErrStatus = "wrongStatus"
				continue
			}

			if gameStatus.UseDeck == true {
				gameStatus = onClickedBoard(gameStatus, receivePieceCoordinate)
			} else {
				gameStatus = onClickedBoardNoDeck(gameStatus, receivePieceCoordinate)
				gameStatus.WhitePieces[gameStatus.NowNum - 1]--
			}

			sendMessage, _ := json.Marshal(gameStatus)
			black.WriteMessage(websocket.TextMessage, sendMessage)
			white.WriteMessage(websocket.TextMessage, sendMessage)
			
			if gameStatus.GameEndFlag == true {
				black.Close()
				white.Close()
				delete(clients, black)
				delete(clients, white)
				gameRoom = append(gameRoom[:i], gameRoom[i+1:]...)
				return
			}
		}
	}
}
