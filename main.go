package main

import(
	"net/http"
	"log"
	"time"
	"github.com/gorilla/websocket"
)

type client struct {
	status string
	channel chan string
}

var upgrader = websocket.Upgrader{
	ReadBufferSize: 1024,
	WriteBufferSize: 1024,
}

var clients = make(map[*websocket.Conn]*client)
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
	clients[conn] = &client{
		"wating",
		make(chan string),
	}
	log.Println("connected")
}

func echo() {
	for{
		matchingClient := make([]*websocket.Conn, 0)
		for ws, property := range clients {
			err := ws.WriteMessage(websocket.TextMessage, []byte("ping"))

			if err != nil {
				log.Printf("websocket error: %s", err)
				ws.Close()
				delete(clients, ws)
				break
			}


			if property.status == "matching"{
				matchingClient = append(matchingClient, ws)
			}

			log.Println(property.status)
		}

		for i := 0; (i + 1) * 2 <= len(matchingClient); i++ {  //<-+1してるのは1人のときに通ってしまうため(他にいい方法ありそう)
			black := matchingClient[i * 2]
			white := matchingClient[i * 2 + 1]

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

			gameroom = append(gameroom,[][]*websocket.Conn{{black, white}}...)  //<-このゲームは2人対戦なため
			clients[black].status = "playing"
			clients[black].channel <- "close"
			clients[white].status = "playing"
			clients[white].channel <- "close"
			log.Println(gameroom)
		}
		time.Sleep(1 * time.Second)
	}
}

func receiveStatus(c *websocket.Conn) {
	ch := clients[c].channel
	for{
		select{
		case <- ch:
			return
		default :
			_, message, err := c.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("error: %v", err)
				}
				break
			}
			if(string(message) == "matching") {
				clients[c].status = "matching"
			}
			log.Printf("%s", message)
		}
	}
}
