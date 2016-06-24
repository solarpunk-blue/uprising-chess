var _ = function(e) { return document.getElementById(e); };
var database;
var board;
var chess;
var turn;

var config = {
	apiKey: "AIzaSyDCCMy3TDisLZW-CHfsmxCDxMls77o_hMg",
	authDomain: "chessboard-695e5.firebaseapp.com",
	databaseURL: "https://chessboard-695e5.firebaseio.com",
	storageBucket: "",
};
firebase.initializeApp(config);
database = firebase.database();

function validateMove(source, target, piece, newPos, oldPos, orientation) {
	console.log(source + '\n' + target + '\n' + piece + '\n' + newPos + '\n' + oldPos + '\n' + orientation)
	if (piece.substring(0, 1) != turn.substring(0, 1)) return 'snapback';
	else {
		if (chess.move({ from: source, to: target }) == null) return 'snapback';
		else {
			if(turn == 'white') turn = 'black';
			else turn = 'white';
			var str = turn.toUpperCase();
			if (chess.in_check()) str += ' IN CHECK';
			if (chess.in_checkmate()) str += ' IN CHECKMATE!';
			if (chess.in_stalemate()) str += ' IN STALEMATE';
			if (chess.in_draw()) str = 'DRAW';
			_('turn').innerHTML = str;
			database.ref().set({ spBoard: chess.fen() });
		}
	}
}

function loadPage() {
	firebase.database().ref().once('value').then(function(snapshot) {
  		var fen = snapshot.val().spBoard;
		board.start();
		chess = new Chess();
		chess.load(fen);
		board.position(fen);
		if (chess.turn() == 'w') turn = 'white';
		else turn = 'black';
		_('turn').innerHTML = turn.toUpperCase();
	});
	board = ChessBoard('board1', { draggable: true, onDrop: validateMove });
	$('#start').on('click', function () {
		board.start();
		chess = new Chess();
		database.ref().set({ spBoard: chess.fen() });
		turn = 'white';
		_('turn').innerHTML = turn.toUpperCase();
	});
}

$(document).ready(loadPage);