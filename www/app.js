
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
        	apiKey: "AIzaSyASLIpAxRFqU0nCCVvqFp2DxDFUKA44fAg",
        	authDomain: "anuvs-chessroom-ba1fc.firebaseapp.com",
        	databaseURL: "https://anuvs-chessroom-ba1fc.firebaseio.com",
        	storageBucket: "anuvs-chessroom-ba1fc.appspot.com",
        });
        return window.firebase;
    })(),
    database: window.firebase.database(),
    alphanum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
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
        var str = this.turn.toUpperCase();
        if (this.chess.in_check()) str += ' IN CHECK';
        if (this.chess.in_checkmate()) str += ' IN CHECKMATE!';
        if (this.chess.in_stalemate()) str += ' IN STALEMATE';
        if (this.chess.in_draw()) str = 'DRAW';
        console.log('TURN: ' + str);
        this.block.on('turn', {
            turn: this.turn,
            text: str
        });
    },
    validateMove: function (source, target, piece, newPos, oldPos, orientation) {
        if (piece.substring(0, 1) != app.turn.substring(0, 1) || app.turn != app.player || app.chess.move({ from: source, to: target }) == null)
            return 'snapback';
        else {
            app.updateTurn(app.chess.turn());
            app.database.ref(app.id + '/fen').set(app.chess.fen());
        }
    },
    load: function (id) {
        this.board = ChessBoard(id, { draggable: true, onDrop: this.validateMove });
        var urlID = window.location.pathname.substring(1);
        if (urlID.trim() != '' && this.validateID(urlID)) {
            var that = this;
            this.database.ref(urlID).once('value', function (snapshot) {
        		if (snapshot.exists())
        			that.loadGame(urlID, snapshot);
        	});
        }
    },
    updateSpectators: function () {
        var that = this;
        this.database.ref(this.id + '/spectators').once('value', function (snapshot) {
            if (snapshot.exists())
                that.block.on('info', { text: 'Spectators: ' + snapshot.val() });
        });
    },
    joinGame: function (id) {
        if (this.validateID(id)) {
            var that = this;
            this.database.ref(id).once('value', function (snapshot) {
    			if (snapshot.exists())
    				that.loadGame(id, snapshot);
        	});
        }
    },
    loadGame: function (id, snapshot) {
        var that = this;
        this.id = id;
        this.board.start();
        this.chess = new Chess();
        var game = snapshot.val();
        this.state = game.state;
        if (game.state == 'new') {
            this.player = 'white';
            if (!this.userLoggedIn) this.username = 'White';
            this.block.on('board', {
                action: 'show',
                amount: 'partial'
            }).on('players', {
                white: 'show',
                black: 'hide',
                player: 'white'
            });
            this.database.ref(id + '/state').set('pending');
            this.state = 'pending';
            this.block.on('info', { text: 'Waiting for Black' });
            this.database.ref(id + '/state').on('value', function (snapshot) {
                if (that.state != 'commenced' && snapshot.val() == 'commenced') {
                    that.state = 'commenced';
                    that.block.on('board', {
                        action: 'show',
                        amount: 'full'
                    }).on('players', {
                        white: 'show',
                        black: 'show'
                    });
                    that.updateSpectators();
                }
            });
        } else if (game.state == 'pending') {
            this.player = 'black';
    		if (!this.userLoggedIn) this.username = 'Black';
            this.block.on('board', {
                action: 'show',
                amount: 'full'
            }).on('players', {
                black: 'show',
                white: 'show',
                player: 'black'
            });
            this.database.ref(id + '/state').set('commenced');
            this.state = 'commenced';
            that.updateSpectators();
        } else if (game.state == 'commenced') {
    		this.player = 'spectator';
    		if (!this.userLoggedIn) this.username = 'Spect';
            this.block.on('board', {
                action: 'show',
                amount: 'full'
            }).on('players', {
                white: 'show',
                black: 'show',
                player: 'spect'
            });
    		this.state = 'commenced';
    		this.database.ref(id + '/spectators').once('value', function (snapshot) {
    			var currentSpectators = 1;
    			if (snapshot.exists()) currentSpectators += snapshot.val();
    			that.database.ref(id + '/spectators').set(currentSpectators);
    			that.username += currentSpectators.toString();
                that.updateSpectators();
    		});
            window.addEventListener('beforeunload', function () {
                that.database.ref(id + '/spectators').once('value', function (snapshot) {
        			var currentSpectators = -1;
        			if (snapshot.exists()) currentSpectators += snapshot.val();
        			that.database.ref(id + '/spectators').set(currentSpectators);
        		});
            });
    	} else return 'Invalid State';
    	this.board.position(game.fen);
    	this.chess.load(game.fen);
    	this.updateTurn(this.chess.turn());
        this.database.ref(id + '/fen').on('value', function (snapshot) {
    		if (that.state == 'commenced' && that.chess.fen() != snapshot.val()) {
    			that.chess.load(snapshot.val());
    			that.board.position(snapshot.val());
    			that.updateTurn(that.chess.turn());
    		}
    	});
        this.database.ref(id + '/spectators').on('value', function (snapshot) {
            if (that.state == 'commenced' && snapshot.exists())
                that.block.on('info', { text: 'Spectators: ' + snapshot.val() });
        });
    	window.history.pushState({ gameID: id }, 'chessroom.ml ' + id, id);
    	this.block.on('id', {
            action: 'set',
            id: id
        });
    },
    newGame: function () {
        var that = this;
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
                that.loadGame(id, snapshot);
            });
    	});
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
            app.load(block.child('main/chessboard/board').id());
        }, 'app', true);
    }, 1000);
});
