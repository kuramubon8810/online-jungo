package main

import(
	"net/http"
	"log"
	"time"
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
	for{
		matchingClient := make([]*websocket.Conn, 0)
		for ws, property := range clients {
/*			err := ws.WriteMessage(websocket.TextMessage, []byte("ping"))

			if err != nil {
				log.Printf("websocket error: %s", err)
				ws.Close()
				delete(clients, ws)
				break
			}
*/

			if property.status == "matching"{
				matchingClient = append(matchingClient, ws)
			}

			log.Println(property.status)
		}

		for i := 0; (i + 1) * 2 <= len(matchingClient); i++ {  //<-1してるのは1人のときに通ってしまうため(他にいい方法ありそう)
			black := matchingClient[i * 2]
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

func gameProcess(i int) {
	log.Println(gameRoom[i])
	isBlackTurn := true
	black := gameRoom[i][0]
	white := gameRoom[i][1]
	for {
		if isBlackTurn == true {
			_, message, _ := black.ReadMessage()
			white.WriteMessage(websocket.TextMessage, []byte(message))
			isBlackTurn = !isBlackTurn
		} else {
			_, message, _ := white.ReadMessage()
			black.WriteMessage(websocket.TextMessage, []byte(message))
			isBlackTurn = !isBlackTurn
		}
	}
}
