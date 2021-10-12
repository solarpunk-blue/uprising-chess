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
          apiKey: "AIzaSyA9p387gzJaMguzavE4yFo7rD7QoyOh_2E",
          authDomain: "class-warfare-chess.firebaseapp.com",
          databaseURL: "https://class-warfare-chess-default-rtdb.firebaseio.com",
          projectId: "class-warfare-chess",
          storageBucket: "class-warfare-chess.appspot.com",
          messagingSenderId: "492419721962",
          appId: "1:492419721962:web:7257bfd58678146e4c0593",
          measurementId: "G-D76LFJSEP9"
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
        if (this.chess.end_game()) {
            alert('GAME OVER, CAPITALISM DEFEATED! FINAL SCORE '+ 'CAPITALIST: ' + this.chess.get_cap_score() + ', WORKER: ' + this.chess.get_work_score())
            str = 'GAME OVER, CAPITALISM DEFEATED!'
        }
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
    },
    pieceMove: function(move) {
      var chessMove = app.chess.move({
              from: move.from,
              to: move.to
            });

      if (chessMove !== null) {
        app.chess.updateFactories()
        app.updateTurn(app.chess.turn());
        app.database.ref(app.id + '/cap_score').set(app.chess.get_cap_score());
        app.database.ref(app.id + '/work_score').set(app.chess.get_work_score());
        app.database.ref(app.id + '/fen').set(app.chess.fen());
        app.database.ref(app.id + '/true_fen').set(app.chess.true_fen());
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
        } else this.loadFromCookies();
        console.log(document.body.clientWidth)
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
    updateSpectators: function () {
        var that = this;
        this.database.ref(this.id + '/spectators').once('value', function (snapshot) {
            if (snapshot.exists())
                that.block.on('info', { text: 'Spectators: ' + snapshot.val() });
        });
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
                spectators: 0
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
        var that = this;
        this.disconnect();
        this.id = id;
        this.board.start();
        this.chess = new Chess();
        this.state = game.state;
        if (Block.is.str(player)) {
            if (player == 'black')
                game.state = 'pending';
            else if (player == 'white') {
                game.state = 'new';
            } else player = '';
        }
        if (game.state == 'new') {
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
    	window.history.pushState({ gameID: id }, 'General Strike Chess ' + id, id);
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

// load blocks
window.addEventListener('load', function () {
    setTimeout(function () {
        app.block.load(function (block) {
            block.fill(document.body);
            setTimeout(function () {
                block.css('transition', 'opacity 0.5s ease');
                block.css('opacity', '1');
            }, 20);
            Block.queries();
            app.load(block.key('boardID'));
        }, 'app', 'jQuery');
    }, 1000);
});
