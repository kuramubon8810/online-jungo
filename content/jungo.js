'use strict';
const websocket = new WebSocket("ws://localhost:9090/ws")
const BOARD_SIZE = 5;
const DIRECTION = ["up", "left", "right", "down"];
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

let now_put_piece_number = 1;
let is_black_turn = true;
let selected_took_piece = false;
let select_took_piece_data = {};
let board_status_array = [];
let can_put_position_osero_rule = [];
let can_take_piece_go_rule_array = [];
//それぞれの数字の枚数の配列 配列での位置と一つずつずれている 0番目->1 1番目->2 ...
let deck = [5, 5, 5, 5, 5];
let black_pieces = [0, 0, 0, 0, 0];
let white_pieces = [0, 0, 0, 0, 0];

function create_board_array() {
    for (let y = 0; y <= BOARD_SIZE + 1; ++y) {
        let line = [];
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
                    };
            };
        };
        board_status_array.push(line);
    };
};

let clicked_board = (e) => {
	let piece_id = e.target.id || e.target.parentElement.id;
	let piece_coordinate = {
		y: parseInt(piece_id.slice(0, 1)),
		x: parseInt(piece_id.slice(2, 3))
	}

	websocket.send(piece_id + "");
	websocket.send(piece_coordinate);
}
/*let clicked_board = (e) => {
    let piece_id = e.target.id || e.target.parentElement.id;
    let piece_coordinate = {
        y: parseInt(piece_id.slice(0, 1)),
        x: parseInt(piece_id.slice(2, 3))
    };

    if (board_status_array[piece_coordinate.y][piece_coordinate.x] == "space") {
        let now_num = numberCalculation(now_put_piece_number);

        board_status_array[piece_coordinate.y][piece_coordinate.x] = `${now_num}`;
        search_enemy_osero_rule(now_num, piece_coordinate);
        search_enemy_go_rule(now_num, piece_coordinate);

        if (can_put_position_osero_rule.length) {
            take_piece_osero_rule(now_num, piece_coordinate);
        };

        if (can_take_piece_go_rule_array.length) {
            take_piece_go_rule();
        };

        --deck[now_num - 1];
        if (deck[4] == 0) { //5が山札からなくなったか
            for (let y = 0; y < BOARD_SIZE; ++y) {
                for (let x = 0; x < BOARD_SIZE; ++x) {
                    document.getElementById(`${y + 1}_${x + 1}`).removeEventListener("click", clicked_board, false);
                    document.getElementById(`${y + 1}_${x + 1}`).addEventListener("click", clicked_board_no_deck, false);
                };
            };

            for (let y = 0; y < 2; ++y) {
                for (let x = 0; x < 3; ++x) {
                    if (y * 3 + x + 1 != 6) {
                        document.getElementById(`${y * 3 + x + 1}_black_storage`).addEventListener("click", select_piece_process, false);
                        document.getElementById(`${y * 3 + x + 1}_white_storage`).addEventListener("click", select_piece_process, false)
                    };
                };
            };

            if (!check_next_turn(numberCalculation(now_put_piece_number + 1))) {
                if (is_black_turn) {
                    alert(`後手が${numberCalculation(now_put_piece_number + 1)}を持っていません`);
                    alert("先手の勝ちです");
                    gameend_process("先手");
                    insertion_array_data_to_board();
                    insertion_array_data_to_piece_table();
                    insertion_array_data_to_deck();

                    document.getElementById("next_game_button").style.display = "block"
                    return;
                } else {
                    alert(`先手が${numberCalculation(now_put_piece_number + 1)}を持っていません`);
                    alert("後手の勝ちです");
                    gameend_process("後手");
                    insertion_array_data_to_board();
                    insertion_array_data_to_piece_table();
                    insertion_array_data_to_deck();

                    document.getElementById("next_game_button").style.display = "block"
                    return;
                };
            };
        };

        ++now_put_piece_number;
        is_black_turn = !is_black_turn;
        insertion_array_data_to_board();
        insertion_array_data_to_piece_table();
        insertion_array_data_to_deck();
        change_turn_display();
    };
};*/

let clicked_board_no_deck = (e) => {
    let piece_id = e.target.id || e.target.parentElement.id;
    let piece_coordinate = {
        y: parseInt(piece_id.slice(0, 1)),
        x: parseInt(piece_id.slice(2, 3))
    };

    if (board_status_array[piece_coordinate.y][piece_coordinate.x] == "space" && selected_took_piece) {
        let now_num = numberCalculation(now_put_piece_number);

        if (select_took_piece_data.number == now_num) {
            if (is_black_turn && select_took_piece_data.owner == "black") {
                --black_pieces[now_num - 1];
            } else if (!is_black_turn && select_took_piece_data.owner == "white") {
                --white_pieces[now_num - 1];
            } else {
                alert("それは敵の駒です");
                selected_took_piece = false;
                document.getElementsByClassName("selected")[0].classList.remove("selected");
                return;
            };

            board_status_array[piece_coordinate.y][piece_coordinate.x] = `${now_num}`;
            search_enemy_osero_rule(now_num, piece_coordinate);
            search_enemy_go_rule(now_num, piece_coordinate);

            if (can_put_position_osero_rule.length) {
                take_piece_osero_rule(now_num, piece_coordinate);
            };

            if (can_take_piece_go_rule_array.length) {
                take_piece_go_rule();
            };

            if (!check_next_turn(numberCalculation(now_put_piece_number + 1))) {
                if (is_black_turn) {
                    alert(`後手が${numberCalculation(now_put_piece_number + 1)}を持っていません`);
                    alert("先手の勝ちです");
                    gameend_process("先手");
                    insertion_array_data_to_board();
                    insertion_array_data_to_piece_table();

                    document.getElementsByClassName("selected")[0].classList.remove("selected");
                    document.getElementById("next_game_button").style.display = "block"
                    return;
                } else {
                    alert(`先手が${numberCalculation(now_put_piece_number + 1)}を持っていません`);
                    alert("後手の勝ちです");
                    gameend_process("後手");
                    insertion_array_data_to_board();
                    insertion_array_data_to_piece_table();

                    document.getElementsByClassName("selected")[0].classList.remove("selected");
                    document.getElementById("next_game_button").style.display = "block"
                    return;
                };
            };

            ++now_put_piece_number;
            is_black_turn = !is_black_turn;
            selected_took_piece = false;
            document.getElementsByClassName("selected")[0].classList.remove("selected");
            insertion_array_data_to_board();
            insertion_array_data_to_piece_table();
            change_turn_display();
        } else {
            alert(`今は${now_num}を置くターンです`);
            selected_took_piece = false;
            document.getElementsByClassName("selected")[0].classList.remove("selected");
        };
    };
};

let select_piece_process = (e) => {
    let piece_id = e.target.id || e.target.parentElement.id;
    select_took_piece_data = {
        number: piece_id.slice(0, 1),
        owner: piece_id.slice(2, 7)
    };

    if (selected_took_piece) {
        document.getElementsByClassName("selected")[0].classList.remove("selected");
    } else {
        document.getElementById(piece_id).classList.add("selected");
    }
    selected_took_piece = !selected_took_piece;
};

function search_enemy_osero_rule(now_num, piece_coordinate) {
    for (let y = piece_coordinate.y - 1; y <= piece_coordinate.y + 1; ++y) {
        for (let x = piece_coordinate.x - 1; x <= piece_coordinate.x + 1; ++x) {
            let y_DIRECTION = y - piece_coordinate.y;
            let x_DIRECTION = x - piece_coordinate.x;

            if (
                board_status_array[y][x] != now_num
                && board_status_array[y][x] != "space"
                && board_status_array[y][x] != "outzone"
            ) {
                let search_position = {
                    y: y,
                    x: x
                };
                let search_array_position = board_status_array[search_position.y][search_position.x]

                while (
                    search_array_position != now_num
                    && search_array_position != "space"
                    && search_array_position != "outzone"
                ) {
                    search_position = {
                        y: search_position.y + y_DIRECTION,
                        x: search_position.x + x_DIRECTION
                    };
                    search_array_position = board_status_array[search_position.y][search_position.x]
                };

                if (board_status_array[search_position.y][search_position.x] == now_num) {
                    can_put_position_osero_rule.push(search_position);
                };
            };
        };
    };
};

function object_Calculation(piece_coordinate, DIRECTION) {
    let temp = {
        y: piece_coordinate.y + DIRECTION.y,
        x: piece_coordinate.x + DIRECTION.x
    };
    return temp;
};

function can_take_piece_go_rule(now_num, piece_coordinate, searched_position, searching_group) {
    for (let i = 0; i < DIRECTION.length; ++i) {
        let position = object_Calculation(piece_coordinate, DIRECTION[DIRECTION[i]]);
        let array_position = board_status_array[position.y][position.x];
        if (array_position == "space") {
            return true;
        } else if (array_position != "outzone" && array_position != now_num) {
            let piece_id = `${position.y}_${position.x}`;
            if (!searched_position.includes(piece_id)) {
                searched_position.push(piece_id);
                if (can_take_piece_go_rule(now_num, position, searched_position, searching_group)) {
                    return true;
                };
            };
        };
    };
    searching_group.push(piece_coordinate);
    return false;
};

function search_enemy_go_rule(now_num, piece_coordinate) {
    for (let i = 0; i < DIRECTION.length; ++i) {
        let position = object_Calculation(piece_coordinate, DIRECTION[DIRECTION[i]]);
        let array_position = board_status_array[position.y][position.x];
        let searching_group = [];
        let searched_position = [];
        if (array_position != "space" && array_position != "outzone" && array_position != now_num) {
            searched_position.push(`${position.y}_${position.x}`)
            if (!can_take_piece_go_rule(now_num, position, searched_position, searching_group)) {
                Array.prototype.push.apply(can_take_piece_go_rule_array, searching_group);
            }
        };
    };
};

//https://www.deep-rain.com/programming/javascript/755
function objectSort(obj) {
    // まずキーのみをソートする
    var keys = Object.keys(obj).sort();

    // 返却する空のオブジェクトを作る
    var map = {};

    // ソート済みのキー順に返却用のオブジェクトに値を格納する
    keys.forEach(function (key) {

        map[key] = obj[key];
    });

    return map;
};

function take_piece_osero_rule(now_num, piece_coordinate) {
    for (let i = 0; i < can_put_position_osero_rule.length; ++i) {
        let y_DIRECTION = (can_put_position_osero_rule[i].y - piece_coordinate.y) / Math.abs(can_put_position_osero_rule[i].y - piece_coordinate.y);
        let x_DIRECTION = (can_put_position_osero_rule[i].x - piece_coordinate.x) / Math.abs(can_put_position_osero_rule[i].x - piece_coordinate.x);
        let take_piece_position = {
            x: piece_coordinate.x,
            y: piece_coordinate.y
        };

        while (!(JSON.stringify(objectSort(can_put_position_osero_rule[i])) === JSON.stringify(objectSort(take_piece_position)))) {
            let take_piece = board_status_array[take_piece_position.y][take_piece_position.x];
            if (now_num != take_piece) {
                if (is_black_turn) {
                    ++black_pieces[parseInt(take_piece) - 1];
                    board_status_array[take_piece_position.y][take_piece_position.x] = "space";
                } else {
                    ++white_pieces[parseInt(take_piece) - 1];
                    board_status_array[take_piece_position.y][take_piece_position.x] = "space";
                };
            };

            if (y_DIRECTION) {
                take_piece_position.y += y_DIRECTION;
            } else {
                take_piece_position.y += 0;
            };

            if (x_DIRECTION) {
                take_piece_position.x += x_DIRECTION;
            } else {
                take_piece_position.x += 0;
            };
        };
    };
    can_put_position_osero_rule = [];
};

function take_piece_go_rule() {
    for (let i = 0; i < can_take_piece_go_rule_array.length; ++i) {
        let position = {
            y: can_take_piece_go_rule_array[i].y,
            x: can_take_piece_go_rule_array[i].x
        };
        if (board_status_array[position.y][position.x] != "space") {
            if (is_black_turn) {
                ++black_pieces[parseInt(board_status_array[position.y][position.x]) - 1];
                board_status_array[position.y][position.x] = "space";
            } else {
                ++white_pieces[parseInt(board_status_array[position.y][position.x]) - 1];
                board_status_array[position.y][position.x] = "space";
            };
        };
    };
    can_take_piece_go_rule_array = [];
};

function check_next_turn(next_num) {
    if (is_black_turn) {
        return white_pieces[next_num - 1];
    } else {
        return black_pieces[next_num - 1];
    };
};


function change_turn_display() {
    if (is_black_turn) {
        document.getElementById("turn").style.color = "#eee";
        document.getElementById("turn").style.backgroundColor = "#333";
        document.getElementById("turn").firstChild.innerHTML = `先手番:${numberCalculation(now_put_piece_number)}<br>${now_put_piece_number}ターン目`
    } else {
        document.getElementById("turn").style.color = "#333";
        document.getElementById("turn").style.backgroundColor = "#eee";
        document.getElementById("turn").firstChild.innerHTML = `後手番:${numberCalculation(now_put_piece_number)}<br>${now_put_piece_number}ターン目`
    };
};

function numberCalculation(num) {
    if (num % 5) {
        return num % 5;
    } else {
        return 5;
    };
};

function gameend_process(winner) {
    for (let y = 0; y < BOARD_SIZE; ++y) {
        for (let x = 0; x < BOARD_SIZE; ++x) {
            document.getElementById(`${y + 1}_${x + 1}`).removeEventListener("click", clicked_board_no_deck, false);
        };
    };

    for (let y = 0; y < 2; ++y) {
        for (let x = 0; x < 3; ++x) {
            if (y * 3 + x + 1 != 6) {
                document.getElementById(`${y * 3 + x + 1}_black_storage`).removeEventListener("click", select_piece_process, false);
                document.getElementById(`${y * 3 + x + 1}_white_storage`).removeEventListener("click", select_piece_process, false);
            };
        };
    };

    document.getElementById("turn").style.color = "#eee";
    document.getElementById("turn").style.backgroundColor = "#87bdd8";
    document.getElementById("turn").firstChild.innerHTML = `勝者:${winner}`;
};

function next_game_process() {
    let next_game = confirm("次の試合をしますか？");
    if (next_game) {
        location.href = location.href;
    };
};

function insertion_array_data_to_board() {
    for (let y = 1; y <= BOARD_SIZE; ++y) {
        for (let x = 1; x <= BOARD_SIZE; ++x) {
            let now_board_position = document.getElementById(`${y}_${x}`);
            if (!(now_board_position.children.length)) {
                if (board_status_array[y][x] !== "space") {
                    let html_img = document.createElement("img");

                    html_img.src = `number${board_status_array[y][x]}.png`;
                    now_board_position.appendChild(html_img);
                };
            } else {
                if (board_status_array[y][x] === "space") {
                    now_board_position.removeChild(now_board_position.firstChild);
                };
            };
        };
    };
};


function insertion_array_data_to_piece_table() {
    for (let i = 0; i < 5; ++i) {
        removeChildren(`${i + 1}_black_storage`);
        removeChildren(`${i + 1}_white_storage`);

        for (let j = 0; j < 5; ++j) {
            let black_piece_img = document.createElement("img");
            let white_piece_img = document.createElement("img");

            black_piece_img.src = `number${i + 1}.png`;
            white_piece_img.src = `number${i + 1}.png`;

            if (black_pieces[i] <= j) {
                black_piece_img.className = "noPieces";
            };

            if (white_pieces[i] <= j) {
                white_piece_img.className = "noPieces";
            };

            document.getElementById(`${i + 1}_black_storage`).appendChild(black_piece_img);
            document.getElementById(`${i + 1}_white_storage`).appendChild(white_piece_img);
        }
    };
};

function removeChildren(id) {
    while (document.getElementById(id).children.length)
        document.getElementById(id).children[0].remove();
};

function insertion_array_data_to_deck() {
    removeChildren("deck");

    for (let i = deck.length; i > 0; --i) {
        for (let j = deck.length; j > 0; --j) {
            let html_img = document.createElement("img");

            html_img.src = `number${j}.png`;
            if (deck[j - 1] <= (deck.length - i)) {
                html_img.className = "noPieces"
            };
            document.getElementById("deck").appendChild(html_img);
        };
    };
};

function create_board() {

    for (let y = 0; y < BOARD_SIZE; ++y) {
        let html_tr = document.createElement("tr");
        board.appendChild(html_tr);

        for (let x = 0; x < BOARD_SIZE; ++x) {
            let html_td = document.createElement("td");

            html_td.addEventListener("click", clicked_board, false);
            html_td.id = `${y + 1}_${x + 1}`;
            html_tr.appendChild(html_td);
        };
    };
};


function create_piece_table() {
    for (let y = 0; y < 5; ++y) {

        let html_tr_black = document.createElement("tr");
        let html_tr_white = document.createElement("tr");
        let html_td_black = document.createElement("td");
        let html_td_white = document.createElement("td");
        let html_img_black = document.createElement("img");
        let html_img_white = document.createElement("img");

        html_td_black.id = `${y + 1}_black_storage`;
        html_td_white.id = `${y + 1}_white_storage`;

        html_td_black.appendChild(html_img_black);
        html_td_white.appendChild(html_img_white);
        html_tr_black.appendChild(html_td_black);
        html_tr_white.appendChild(html_td_white);
        black_piece_table.appendChild(html_tr_black);
        white_piece_table.appendChild(html_tr_white);
    };

    insertion_array_data_to_piece_table();
};

function matching(){
	websocket.send("matching");
	websocket.onmessage = function(evt){
		if(evt.data == "matched!") {
			document.getElementById("grid").style.display = "grid";
			document.getElementById("matchingButton").style.display = "none";
		}
	}
}

create_board_array();
create_board();
create_piece_table();
insertion_array_data_to_deck();

document.getElementById("next_game_button").addEventListener("click", next_game_process, false);
document.getElementById("matchingButton").addEventListener("click", matching, false);
