FROM golang
WORKDIR /home/
RUN go get -u github.com/gorilla/mux
RUN go get -u github.com/gorilla/websocket
COPY ./ /home/
