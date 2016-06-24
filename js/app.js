var alphanum = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
var randomString = function(length) {
	var text = "";
	var possible = alphanum;
	for (var i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
var _ = function(e) { return document.getElementById(e); };
var id;
var player;
var database;
var board;
var chess;
var turn;
var state;
var userMenu;
var username;
var userLoggedIn;
var curMsg;

var a;

// Initialize Firebase
var config = {
	apiKey: "AIzaSyASLIpAxRFqU0nCCVvqFp2DxDFUKA44fAg",
	authDomain: "anuvs-chessroom-ba1fc.firebaseapp.com",
	databaseURL: "https://anuvs-chessroom-ba1fc.firebaseio.com",
	storageBucket: "anuvs-chessroom-ba1fc.appspot.com",
};
firebase.initializeApp(config);
database = firebase.database();

function validateMove(source, target, piece, newPos, oldPos, orientation) {
	console.log(source + '\n' + target + '\n' + piece + '\n' + newPos + '\n' + oldPos + '\n' + orientation)
	if (piece.substring(0, 1) != turn.substring(0, 1)) return 'snapback';
	else {
		if (turn != player) return 'snapback';
		else if (chess.move({ from: source, to: target }) == null) return 'snapback';
		else {
			updateTurn(chess.turn());
			database.ref(id + '/fen').set(chess.fen());
		}
	}
}

function updateTurn(t) {
	if (t == 'w') turn = 'white';
	else turn = 'black';
	var str = turn.toUpperCase();
	if (chess.in_check()) str += ' IN CHECK';
	if (chess.in_checkmate()) str += ' IN CHECKMATE!';
	if (chess.in_stalemate()) str += ' IN STALEMATE';
	if (chess.in_draw()) str = 'DRAW';
	_('turn').innerHTML = str;
}

function validateID(newID) {
	for (var i = 0; i < newID.length; i++) {
		if (!alphanum.includes(newID.charAt(i))) return false;
	}
	return true;
}

function sendMessage(uname, msg) {
	_('textInput').value = '';
	database.ref(id + '/messages').once('value').then(function (snapshot) {
		var currMsgNum = snapshot.numChildren() + 1;
		//database.ref(id + '/messages/' + currMsgNum.toString() + '/username').set(uname);
		//database.ref(id + '/messages/' + currMsgNum.toString() + '/message').set(msg);
		database.ref(id + '/messages/' + currMsgNum.toString()).set({ 'username':uname, 'message':msg });
	});
}

function loadGame(newID, snapshot) {
	id = newID;
	board.start();
	chess = new Chess();
	_('messagesBox').innerHTML = '';
	if (snapshot.child(id).val().state == 1) {
		player = 'spectator';
		if (!userLoggedIn) username = 'Spect';
		state = 1;
		_('start').innerHTML = 'Spectating';
		_('start').style.opacity = 0.7;
		database.ref(id + '/spectators').once('value').then(function (snapshot) {
			var currSpectNum = 1;
			if (snapshot.exists()) currSpectNum = snapshot.val() + 1;
			database.ref(id + '/spectators').set(currSpectNum);
			username += currSpectNum;
		});
	} else {
		player = 'black';
		if (!userLoggedIn) username = 'Black';
		database.ref().child(id).child('state').set(1);
		state = 1;
		_('marker2').innerHTML = 'YOU';
		_('start').innerHTML = 'Restart';
		_('start').style.opacity = 1;
		_('start').style.pointerEvents = 'auto';
		_('mainTD').style.pointerEvents = 'auto';
	}
	board.position(snapshot.child(id).val().fen);
	chess.load(snapshot.child(id).val().fen);
	updateTurn(chess.turn());
	database.ref(id + '/fen').on('value', function (snapshot) {
		if ((state == 1) && (chess.fen() != snapshot.val())) {
			chess.load(snapshot.val());
			board.position(snapshot.val());
			updateTurn(chess.turn());
		}
	});
	window.history.pushState({ gameID: id}, 'Chessroom ' + id, id);
	_('id').innerHTML = id.toString();
	_('mainTable').style.opacity = 1;
	_('mainTable').style.pointerEvents = 'auto';
	_('mainTD').style.opacity = 1;
	database.ref(id + '/messages').on('child_added', function(childSnapshot, prevChildKey) {
		a = childSnapshot;
		curMsg++;
		$('#messagesBox').append("<div class = 'message'><b>" + childSnapshot.val().username + ":</b> " + childSnapshot.val().message + "</div>");
		_('messagesBox').scrollTop = _('messagesBox').scrollHeight;
	});
	/*
		database.ref(id + '/messages').once('value', function (snapshot) {
			curMsg = 0;
			if (snapshot.val() != 0) {
				snapshot.forEach(function (childSnapshot) {
					curMsg++;
					$('#messagesBox').append("<div class = 'message'><b>" + childSnapshot.val().username + ":</b> " + childSnapshot.val().message + "</div>");
					_('messagesBox').scrollTop = _('messagesBox').scrollHeight;
				});
			}
		});
	*/
}

function loadPage() {
	userMenu = false;
	userLoggedIn = false;
	//do user stuff here
	
	board = ChessBoard('board1', { draggable: true, onDrop: validateMove });
	var url = document.URL;
	var newID = url.substr(url.length - 5);
	database.ref().once('value').then(function (snapshot) {
		if (validateID(newID)) {
			if (snapshot.child(newID).exists()) loadGame(newID, snapshot);
		}
	});
	
	$('#start').on('click', function () {
		board.start();
		chess = new Chess();
		database.ref(id + '/fen').set(chess.fen());
		turn = 'white';
		_('turn').innerHTML = turn.toUpperCase();
	});
	$('#new').on('click', function () {
		board.start();
		chess = new Chess();
		_('messagesBox').innerHTML = '';
		_('marker2').innerHTML = '';
		database.ref().once('value').then(function (snapshot) {
			var rand = randomString(5);
			while (snapshot.child(rand).exists()) rand = randomString(5);
			id = rand;
			database.ref().child(id).child('state').set(0);
			state = 0;
			database.ref().child(id).child('fen').set(chess.fen());
			player = 'white';
			updateTurn('w');
			window.history.pushState({ gameID: id}, 'Chessroom ' + id, id);
			_('mainTable').style.opacity = 1;
			_('mainTable').style.pointerEvents = 'auto';
			_('mainTD').style.opacity = 0.5;
			_('mainTD').style.pointerEvents = 'none';
			_('start').innerHTML = 'Restart';
			_('start').style.opacity = 0.5;
			_('start').style.pointerEvents = 'none';
			_('id').innerHTML = id.toString();
			_('marker1').innerHTML = 'YOU';
			if (!userLoggedIn) username = 'White';
			database.ref(id + '/messages').set(0);
			database.ref(id + '/spectators').set(0);
			database.ref(id + '/state').on('value', function (snapshot) {
				if (snapshot.val() == 1) {
					state = 1;
					_('mainTD').style.opacity = 1;
					_('mainTD').style.pointerEvents = 'auto';
					_('start').style.opacity = 1;
					_('start').style.pointerEvents = 'auto';
				}
			});
			database.ref(id + '/fen').on('value', function (snapshot) {
				if ((state == 1) && (chess.fen() != snapshot.val())) {
					chess.load(snapshot.val());
					board.position(snapshot.val());
					updateTurn(chess.turn());
				}
			});
			database.ref(id + '/messages').on('child_added', function(childSnapshot, prevChildKey) {
				curMsg++;
				$('#messagesBox').append("<div class = 'message'><b>" + childSnapshot.val().username + ":</b> " + childSnapshot.val().message + "</div>");
				_('messagesBox').scrollTop = _('messagesBox').scrollHeight;
			});
		});
	});
	$('#join').on('click', function () {
		_('marker1').innerHTML = '';
		_('marker2').innerHTML = '';
		var newID = prompt('Enter your game ID', 'Game ID');
		database.ref().once('value').then(function (snapshot) {
			if (newID != null) {
				if (snapshot.child(newID).exists()) { 
					loadGame(newID, snapshot);
				}
			}
		});
	});
	$('#umButton').click(function () {
		if (userMenu) {
			userMenu = false;
			_('userMenu').style.right = -310;
			_('arrowImg').src = './img/left.png';
		} else {
			userMenu = true;
			_('userMenu').style.right = 0;
			_('arrowImg').src = './img/right.png';
		}
	});
	$('#textInput').keyup(function (e) {
		if (e.keyCode == 13) sendMessage(username, _('textInput').value);
	});
	$('#sendButton').click(function () {
		sendMessage(username, _('textInput').value);
	});
}

$(document).ready(loadPage);