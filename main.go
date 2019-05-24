package main

import(
	"net/http"
	"log"
	"time"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize: 1024,
	WriteBufferSize: 1024,
}

var clients = make(map[*websocket.Conn]string)
var gameroom = make([][]*websocket.Conn, 0)  //[[black, white], [black, white]]

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

	go receiveStatus(conn)
	clients[conn] = "wating"
	log.Println("connected")
}

func echo() {
	for{
		matchingClient := make([]*websocket.Conn, 0)
		for client, status := range clients {
			err := client.WriteMessage(websocket.TextMessage, []byte("ping"))

			if err != nil {
				log.Printf("websocket error: %s", err)
				client.Close()
				delete(clients, client)
				break
			}


			if status == "matching"{
				matchingClient = append(matchingClient, client)
			}

			log.Println(status)
		}

		for i := 0; (i + 1) * 2 <= len(matchingClient); i++ {  //<-+1してるのは1人のときに通ってしまうため(他にいい方法ありそう)
			black := matchingClient[i * 2]
			white := matchingClient[i * 2 + 1]
			gameroom = append(gameroom,[][]*websocket.Conn{{black, white}}...)  //<-このゲームは2人対戦なため
			clients[black] = "playing"
			clients[white] = "playing"

			err := black.WriteMessage(websocket.TextMessage, []byte("matched!"))
			if err != nil {
				log.Printf("can not send to websocket: %s", err)
				black.Close()
				delete(clients, black)
			}

			err = white.WriteMessage(websocket.TextMessage, []byte("matched!"))
			if err != nil {
				log.Printf("can not send to websocet: %s", err)
				white.Close()
				delete(clients, white)
			}

			log.Println(gameroom)
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
		if(string(message) == "matching") {
			clients[c] = "matching"
		}
		log.Printf("%s", message)
	}
}
