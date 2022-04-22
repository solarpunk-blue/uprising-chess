// initialize app

var app;
app = {
    id: '',
    player: '',
    username: '',
    state: '',
    turn: '',
    chess: null,
    board: null,
    userLoggedIn: false,
    block: Block('div', 'app'),
    // initialize firebase
     firebase: (function () {
        window.firebase.initializeApp({
          apiKey: "AIzaSyBYZlamd_ysPmrtpkYKkM87049ArHkb",
          authDomain: "uprisingchess.firebaseapp.co",
          databaseURL: "https://uprisingchess-default-rtdb.firebaseio.com",
          projectId: "uprisingchess",
          storageBucket: "uprisingchess.appspot.com",
          messagingSenderId: "384461509485",
          appId: "1:384461509485:web:98de415664af0652a88064",
          measurementId: "G-3VJ7Z1XPFX"
        });
        return window.firebase;
    })(),
    database: window.firebase.database(),
    alphanum: 'abcdefghijklmnopqrstuvwxyz0123456789',
    // app functions
    key: function (length) {
    	var text = '';
    	for (var i = 0; i < length; i++)
            text += this.alphanum.charAt(Math.floor(Math.random() * this.alphanum.length));
    	return text;
    },
    validateID: function (id) {
        for (var i = 0; i < id.length; i++) {
            if (!this.alphanum.includes(id.charAt(i))) return false;
        }
        return true;
    },
    updateTurn: function (t) {
        if (t == 'w') this.turn = 'white';
        else this.turn = 'black';
        if (t == 'w') cool_turn = 'blue';
        else cool_turn = 'red';
        var str = cool_turn.toUpperCase();
        if (this.chess.fen().indexOf('K')==-1) {
            str = 'GAME OVER, CAPITALISM DEFEATED! FINAL SCORE '+ 'CAPITALIST: ' + this.chess.get_cap_score() + ', WORKER: ' + this.chess.get_work_score()
            alert(str)
            this.block.on('info', { text: 'CAPITALIST SCORE: ' + this.chess.get_cap_score() + ', WORKER SCORE: ' + this.chess.get_work_score()});
            this.block.on('turn', {
                turn: this.turn,
                text: 'GAME OVER'
            });
        } else{
            if (this.state == 'pending'){
                this.block.on('turn', {
                    turn: this.turn,
                    text: 'Waiting for opponent'
                });
            } else {
                this.block.on('turn', {
                    turn: this.turn,
                    text: 'Turn: ' + str
                });
            }
            this.block.on('info', { text: 'CAPITALIST SCORE: ' + this.chess.get_cap_score() + ', WORKER SCORE: ' + this.chess.get_work_score()});
        }
    },
    aiMove: async function(){
        // this simple AI is based on https://github.com/gautambajaj/Chess-AI/
        // the objective functions have been updated to reflect Uprising Chess
        const possibleNextMoves = app.chess.moves({verbose: true})

        var bestMove = -9999;
        var bestMoveFound;
        var bestMoveInd = -1;

        store_vals = []
        for(var tryMove = 0; tryMove < possibleNextMoves.length; tryMove++) {
            var possibleNextMove = possibleNextMoves[tryMove]

            value = app.testMove(possibleNextMove)
            store_vals.push(value)
            if(value >= bestMove) {
                bestMove = value;
                bestMoveFound = possibleNextMove;
                bestMoveInd = tryMove
            }
        }
        console.log(store_vals)
        console.log(bestMove+': '+bestMoveInd + '/'+possibleNextMoves.length)
        if (bestMoveFound){
            app.chess.move(bestMoveFound)
        } else{
            console.log('no bestMOveFound wtf?')
            app.chess.move(possibleNextMoves[0])
        }

        app.chess.updateFactories(true)
        app.updateTurn(app.chess.turn())

        app.database.ref(app.id + '/cap_score').set(app.chess.get_cap_score());
        app.database.ref(app.id + '/work_score').set(app.chess.get_work_score());
        app.database.ref(app.id + '/fen').set(app.chess.fen());
        app.database.ref(app.id + '/true_fen').set(app.chess.true_fen());

        app.board.position(app.chess.fen());
        document.getElementById('loader').style.visibility = 'hidden'
    },
    testMove: function(possibleNextMove) {
        //save all state details
        saveFen = app.chess.fen()
        saveTrueFen = app.chess.true_fen()

        // make move
        if(app.pieceMove(possibleNextMove, true)){
            //first arg is minimaxDepth (set to 2 here)
            value = minimax(2, -10000, 10000, false);

        } else{
            console.log('possibleNextMove not possible, wtf?')
            value = 0
        }

        //reset all state details
        app.chess.load(saveFen)
        app.chess.load_true(saveTrueFen)

        return value
    },
    displayLoader: function(){
        if (document.getElementById('loader')){
            document.getElementById('loader').style.visibility = 'visible'
        } else {
            var myDiv = document.createElement("div");
            myDiv.id = 'loader';
            myDiv.innerHTML = `<div style = 'position: absolute; top: 0; left; 0; width: 100%; height: 100%; display: table; text-align: center; opacity: 1; transition: opacity 0.1s ease;'>
                <div style = 'display: table-cell; vertical-align: middle; margin: 0 auto;'>
                    <img src = 'img/ripple.gif'/>
                </div>
            </div>`;
            document.body.appendChild(myDiv);
        }
    },
    pieceMove: function(move, testMove) {
      var chessMove = app.chess.move({
              from: move.from,
              to: move.to
            });
      if (chessMove !== null) {
        app.chess.updateFactories(testMove)
        if (!testMove){
          app.updateTurn(app.chess.turn());
          if (app.solo == 'yes' && app.chess.fen().indexOf('K')>-1){
              app.board.position(app.chess.fen());
              app.displayLoader()
              setTimeout(app.aiMove,1000)
          }else{
              app.database.ref(app.id + '/cap_score').set(app.chess.get_cap_score());
              app.database.ref(app.id + '/work_score').set(app.chess.get_work_score());
              app.database.ref(app.id + '/fen').set(app.chess.fen());
              app.database.ref(app.id + '/true_fen').set(app.chess.true_fen());
          }
        }
      }

      return app.chess.fen();
    },
    pieceSelected: function(notationSquare) {
      if (app.player.substring(0, 1) != app.chess.turn().substring(0, 1)){
        return null;
      }
      var i,
        movesNotation,
        movesPosition = [];
      movesNotation = app.chess.moves({square: notationSquare, verbose: true});
      for (i = 0; i < movesNotation.length; i++) {
        movesPosition.push(ChessUtils.convertNotationSquareToIndex(movesNotation[i].to));
      }
      return movesPosition;
    },
    load: function (boardID) {
        var that = this;
        this.board = new Chessboard(boardID, {position: 'pppppppp/8/8/RNB1QBNR/RNBQKBNR/8/8/pppppppp w - - 0 1',
                                  eventHandlers: {
                                    onPieceSelected: this.pieceSelected,
                                    onMove: this.pieceMove
                                  }
                                });
        var id = window.location.pathname.substring(1);
        if (id.trim() != '') {
            if (this.validateID(id)) {
                if (this.cookie('id') == id)
                    this.loadFromCookies();
                else {
                    this.database.ref(id).once('value', function (snapshot) {
            			if (snapshot.exists())
                            that.loadGame(id, snapshot.val());
                        else that.reset();
                	});
                }
            } else this.reset();
        }
    },
    loadFromCookies: function () {
        var idCookie = this.cookie('id');
        var playerCookie = this.cookie('player');
        if (Block.is.str(idCookie) && Block.is.str(playerCookie))
            this.joinGame(idCookie, playerCookie);
    },
    reset: function () {
        // window.history.pushState({ gameID: '' }, 'chessroom.ml', '/');
        // window.location.reload();
    },
    disconnect: function () {
        var that = this;
        var id = this.id;
        if (id.trim() != '' && this.player == 'spectator') {
            this.database.ref(id + '/spectators').once('value', function (snapshot) {
                var currentSpectators = -1;
                if (snapshot.exists()) currentSpectators += snapshot.val();
                that.database.ref(id + '/spectators').set(currentSpectators);
            });
        }
    },
    newGame: function () {
        var that = this;
        this.block.on('players', {
            spect: 'null',
            text: 'New Game'
        });
        this.database.ref().once('value', function (snapshot) {
    		var id = that.key(5);
    		while (snapshot.child(id).exists()) id = that.key(5);
            that.database.ref(id).set({
                state: 'new',
                fen: (new Chess()).fen(),
                messages: 0,
                spectators: 0,
                solo: 'no'
            });
            that.database.ref(id).once('value', function (snapshot) {
                that.loadGame(id, snapshot.val());
            });
    	});
    },
    newSoloGame: function () {
        document.querySelector("[block='modal']").style.visibility = "hidden"
        var that = this;
        this.block.on('players', {
            spect: 'null',
            text: 'New Game'
        });
        this.database.ref().once('value', function (snapshot) {
            var id = that.key(5);
            while (snapshot.child(id).exists()) id = that.key(5);
            that.database.ref(id).set({
                state: 'new',
                fen: (new Chess()).fen(),
                messages: 0,
                spectators: 0,
                solo: 'yes'
            });
            that.database.ref(id).once('value', function (snapshot) {
                that.loadGame(id, snapshot.val());
            });
        });
    },
    joinGame: function (id, player) {
        if (this.validateID(id)) {
            var that = this;
            this.database.ref(id).once('value', function (snapshot) {
    			if (snapshot.exists()) {
                    var game = snapshot.val();
                    if (Block.is.str(player))
                        that.loadGame(id, game, player);
                    else that.loadGame(id, game);
                }
        	});
        }
    },
    loadGame: function (id, game, player) {
        if (game.true_fen == null){
            game.true_fen = game.fen
            game.cap_score = 0
            game.work_score = 0
        }
        if (game.solo == null){
            game.solo = 'no'
        }
        var that = this;
        this.disconnect();
        this.id = id;
        this.board.start();
        this.chess = new Chess();
        this.state = game.state;
        this.solo = game.solo
        if (Block.is.str(player)) {
            if (player == 'black')
                game.state = 'pending';
            else if (player == 'white') {
                game.state = 'new';
            } else player = '';
        }
        if (game.solo == 'yes'){
            this.player = 'black';
            if (!this.userLoggedIn) this.username = 'Workers';
            this.block.on('board', {
                action: 'show',
                amount: 'full'
            })
            .on('players', {
                white: {
                    card: 'show',
                    sub: false
                },
                black: {
                    card: 'show',
                    sub: 'you'
                },
                spect: 'null'
            });
            this.database.ref(id + '/state').set('commenced');
            this.state = 'commenced';
        } else if (game.state == 'new') {
            this.player = 'white';
            if (!this.userLoggedIn) this.username = 'Capitalists';
            this.block.on('board', {
                action: 'show',
                amount: 'partial'
            })
            .on('players', {
                white: {
                    card: 'show',
                    sub: 'you'
                },
                black: {
                    card: 'waiting',
                    sub: 'waiting'
                }
            });
            var load = function () {
                that.state = 'commenced';
                that.block.on('board', {
                    action: 'show',
                    amount: 'full'
                }).on('players', {
                    black: {
                        card: 'show',
                        sub: false
                    }
                });
            };
            if (player == 'white') load();
            else {
                this.database.ref(id + '/state').set('pending');
                this.state = 'pending';
                this.block.on('info', { text: 'Waiting for Workers' });
                this.database.ref(id + '/state').on('value', function (snapshot) {
                    if (that.state != 'commenced' && snapshot.val() == 'commenced')
                        load();
                });
            }
        } else if (game.state == 'pending') {
            this.player = 'black';
    		if (!this.userLoggedIn) this.username = 'Workers';
            this.block.on('board', {
                action: 'show',
                amount: 'full'
            })
            .on('players', {
                white: {
                    card: 'show',
                    sub: false
                },
                black: {
                    card: 'show',
                    sub: 'you'
                },
                spect: 'null'
            });
            this.database.ref(id + '/state').set('commenced');
            this.state = 'commenced';
        } else if (game.state == 'commenced') {
    		this.player = 'spectator';
    		if (!this.userLoggedIn) this.username = 'Spect';
            this.block.on('board', {
                action: 'show',
                amount: 'full'
            })
            .on('players', {
                white: {
                    card: 'show',
                    sub: false
                },
                black: {
                    card: 'show',
                    sub: false
                }
            });
    		this.state = 'commenced';
    		this.database.ref(id + '/spectators').once('value', function (snapshot) {
    			var currentSpectators = 1;
    			if (snapshot.exists()) currentSpectators += snapshot.val();
    			that.database.ref(id + '/spectators').set(currentSpectators);
    			that.username += currentSpectators.toString();
                that.block.on('players', {
                    spect: currentSpectators
                });
    		});
    	} else return 'Invalid State';
    	this.board.position(game.fen);
    	this.chess.load(game.fen);
        this.chess.load_true(game.true_fen);
        this.chess.set_cap_score(game.cap_score);
        this.chess.work_score = game.work_score;
        this.updateTurn(this.chess.turn());
        this.database.ref(id + '/fen').on('value', function (snapshot) {
    		if (that.state == 'commenced' && that.chess.fen() != snapshot.val()) {
    			that.chess.load(snapshot.val());
    			that.board.position(snapshot.val());
    			that.updateTurn(that.chess.turn());
    		}
    	});
        this.database.ref(id + '/cap_score').on('value', function (snapshot) {
            if (that.state == 'commenced' && that.chess.get_cap_score() != snapshot.val()) {
                that.chess.set_cap_score(snapshot.val());
                that.updateTurn(that.chess.turn());
            }
        });
        this.database.ref(id + '/work_score').on('value', function (snapshot) {
            if (that.state == 'commenced' && that.chess.get_work_score() != snapshot.val()) {
                that.chess.set_work_score(snapshot.val());
                that.updateTurn(that.chess.turn());
            }
        });
        this.database.ref(id + '/true_fen').on('value', function (snapshot) {
            if (that.state == 'commenced' && snapshot.val() != null && that.chess.true_fen() != snapshot.val()) {
                that.chess.load_true(snapshot.val());
            }
        });
        this.database.ref(id + '/state').on('value', function (snapshot) {
            that.state = snapshot.val()
            that.updateTurn(that.chess.turn());
        });
        window.addEventListener('beforeunload', this.disconnect);
    	window.history.pushState({ gameID: id }, 'Uprising Chess ' + id, id);
    	this.block.on('id', {
            action: 'set',
            id: id
        });
        var week = (new Date(Date.now() + (1 * 7 * 24 * 60 * 60 * 1000))).toString();
        this.cookie('id', this.id, week);
        this.cookie('player', this.player, week);
    },
    cookie: function (id, val, date) {
        if (Block.is.unset(val))
            document.cookie.split('; ').forEach(function (cookie) {
                if (cookie.substring(0, id.length) == id)
                    val = cookie.substring(id.length + 1);
            });
        else document.cookie = id + '=' + val + (Block.is.set(date) ? '; expires=' + date : '');
        return (Block.is.unset(val) ? null : val);
    }
};

var minimax = function (depth, alpha, beta, isMaximisingPlayer) {
    if (depth === 0) {
        return -evaluateBoard(app.chess.board());
    }

    var possibleNextMoves = app.chess.moves({verbose: true});
    var numPossibleMoves = possibleNextMoves.length
    if (isMaximisingPlayer) {
        var bestMove = -9999;
        for (var i = 0; i < numPossibleMoves; i++) {
            //save state
            var saveFen_tmp = app.chess.fen()
            var saveTrueFen_tmp = app.chess.true_fen()

            // make move
            if(app.pieceMove(possibleNextMoves[i], true)){
                bestMove = Math.max(bestMove, minimax(depth - 1, alpha, beta, !isMaximisingPlayer));
                alpha = Math.max(alpha, bestMove);
            } else {
                console.log('minimax move not possible, wtf?')
            }
            // reset state
            app.chess.load(saveFen_tmp)
            app.chess.load_true(saveTrueFen_tmp)

            // possibly stop early
            if(beta <= alpha){
                return bestMove;
            }
        }
    } else {
        var bestMove = 9999;
        for (var i = 0; i < numPossibleMoves; i++) {
            //save state
            var saveFen = app.chess.fen()
            var saveTrueFen = app.chess.true_fen()

            // make move
            if(app.pieceMove(possibleNextMoves[i], true)){
                bestMove = Math.min(bestMove, minimax(depth - 1, alpha, beta, !isMaximisingPlayer));
                beta = Math.min(beta, bestMove);
            } else {
                console.log('minimax move not possible, wtf?')
            }
            // reset state
            app.chess.load(saveFen)
            app.chess.load_true(saveTrueFen)

            // possibly stop early
            if(beta <= alpha){
                return bestMove;
            }
        }
    }

    return bestMove;
};

var evaluateBoard = function (board) {
    var totalEvaluation = 0;
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            totalEvaluation = totalEvaluation + getPieceValue(board[i][j], i, j);
        }
    }
    return totalEvaluation;
};


var reverseArray = function(array) {
    return array.slice().reverse();
};

var blackPawnEval =
    [
        [10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [-5.0, -5.0, -5.0, -5.0, -5.0, -5.0, -5.0, -5.0],
        [-9.0, -9.0, -9.0, -9.0, -9.0, -9.0, -9.0, -9.0],
        [-9.0, -9.0, -9.0, -9.0, -9.0, -9.0, -9.0, -9.0],
        [-5.0, -5.0, -5.0, -5.0, -5.0, -5.0, -5.0, -5.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0]
    ];

var whitePawnEval = [
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0]
    ];

var knightEval = [
        [ 2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0],
        [ 5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
        [ 5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
        [ 4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0]
    ];

var whiteBishopEval = [
        [ 2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0],
        [ 5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
        [ 5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
        [ 4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0]
    ];

var whiteRookEval = [
        [ 2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0],
        [ 5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
        [ 5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
        [ 4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0]
    ];

var evalQueen = [
        [ 2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0],
        [ 5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
        [ 5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
        [ 4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0]
    ];

var whiteKingEval = [
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0]
    ];

var getPieceValue = function (piece, x, y) {
    if (piece === null) {
        return 0;
    }

    return -getAbsoluteValue(piece, piece.color === 'w', x ,y);
};


var getAbsoluteValue = function (piece, isWhite, x ,y) {
    if (piece.type === 'p') {
        return (isWhite ? whitePawnEval[y][x] : blackPawnEval[y][x] );
    } else if (piece.type === 'r') {
        return 5//+(isWhite ? whiteRookEval[y][x] : blackRookEval[y][x] );
    } else if (piece.type === 'n') {
        return 5//+knightEval[y][x];
    } else if (piece.type === 'b') {
        return 5//+( isWhite ? whiteBishopEval[y][x] : blackBishopEval[y][x] );
    } else if (piece.type === 'q') {
        return 10//+evalQueen[y][x];
    } else if (piece.type === 'k') {
        return 100//+( isWhite ? whiteKingEval[y][x] : blackKingEval[y][x] );
    }
};

// load blocks
window.addEventListener('load', function () {
    setTimeout(function () {
        app.block.load(function (block) {
            block.fill(document.body);
            setTimeout(function () {
                block.css('transition', 'opacity 0.5s ease');
                block.css('opacity', '1');
            }, 10);
            Block.queries();
            if(window.location.pathname.substring(1)!=''){
                document.querySelector("[block='modal']").style.visibility = "hidden"
            }
            app.load(block.key('boardID'));

        }, 'app', 'jQuery');
    }, 1000);
});

