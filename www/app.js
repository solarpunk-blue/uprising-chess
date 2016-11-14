
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
        // node('turn').innerHTML = str;
        console.log('TURN: ' + str);
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
            // node('marker1').innerHTML = '';
        	// node('marker2').innerHTML = '';
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
        // node() innerHTML - clear messages and stuff

        if (game.state == 'new') {
            this.player = 'white';
            if (!this.userLoggedIn) this.username = 'White';
            this.block.on('board', {
                action: 'show',
                amount: 'partial'
            });
            this.database.ref(id + '/state').set('pending');
            this.state = 'pending';
            this.block.on('info', { text: 'Waiting for Black' });
    		// node('marker1').innerHTML = 'YOU';
            this.database.ref(id + '/state').on('value', function (snapshot) {
                if (that.state != 'commenced' && snapshot.val() == 'commenced') {
                    that.state = 'commenced';
                    that.block.on('board', {
                        action: 'show',
                        amount: 'full'
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
            });
            this.database.ref(id + '/state').set('commenced');
            this.state = 'commenced';
            that.updateSpectators();
    		// node('marker2').innerHTML = 'YOU';
        } else if (game.state == 'commenced') {
    		this.player = 'spectator';
    		if (!this.userLoggedIn) this.username = 'Spect';
            this.block.on('board', {
                action: 'show',
                amount: 'full'
            });
    		this.state = 'commenced';
            // node('marker3').innerHTML = 'SPECTATING';
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
        // update messages
    	// this.database.ref(id + '/messages').on('child_added', function(childSnapshot, prevChildKey) {
    	// 	curMsg++;
    	// 	$('#messagesBox').append("<div class = 'message'><b>" + childSnapshot.val().username + ":</b> " + childSnapshot.val().message + "</div>");
    	// 	node('messagesBox').scrollTop = node('messagesBox').scrollHeight;
    	// });
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

// define custom blocks
(function () {
    Block('break', function () {
        var block = Block('span');
        block.add(Block('br'));
        return block;
    }, function (block, data) {
        data('val', function (val) {
            for (var i = 1; i < val; i++)
                block.add(Block('br'));
        });
    });

    Block('text', function () {
        var block = Block('span');
        return block;
    }, function (block, data) {
        data('val', function (val) {
            block.node().appendChild(document.createTextNode(val));
        });
        data('html', function (html) {
            block.html(html);
        });
    });

    Block('image', function () {
        var block = Block('div');
        return block;
    }, function (block, data) {
        var src = data('src');
        var height = data('height');
        var width = data('width');
        var alt = data('alt');
        if (src != null) {
            block.css('background-image', "url('" + src + "')")
                .css('background-repeat', 'no-repeat')
                .css('background-size', 'contain')
            ;
        }
        if (height !== null) block.css('height', height);
        else block.css('height', 'auto');
        if (width !== null) block.css('width', width);
        else block.css('width', 'auto');
        if (alt !== null) block.attribute('title', alt);
    });

    Block('mdl-button', function () {
        var block = Block('button');
        block.class('mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect');
        block.add('span', 'text');
        return block;
    }, function (block, data) {
        data('ripple', function (ripple) {
            if (ripple == 'off') {
                block.node().className = 'mdl-button mdl-js-button mdl-button--raised';
                block.html('');
                block.add('span', 'text');
            }
        });
        data('val', function () {
            block.child('text').html(data('val'));
        });
        window.componentHandler.upgradeElement(block.node());
    });

    Block('space', function () {
        var block = Block('span');
        block.node().html('&nbsp;');
        return block;
    }, function (block, data) {
        data('val', function (val) {
            for (var i = 1; i < value; i++)
                block.node().innerHTML += '&nbsp;';
        });
    });

    // Block('user');
})();

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


// var userMenu;
// var curMsg;
//
// function sendMessage(uname, msg) {
// 	if (node('textInput').value != '') {
// 		node('textInput').value = '';
// 		database.ref(id + '/messages').once('value').then(function (snapshot) {
// 			var currMsgNum = snapshot.numChildren() + 1;
// 			database.ref(id + '/messages/' + currMsgNum.toString()).set({ 'username':uname, 'message':msg });
// 		});
// 	}
// }
//
// function loadPage() {
// 	$('#umButton').click(function () {
// 		if (userMenu) {
// 			userMenu = false;
// 			node('userMenu').style.right = -310;
// 			node('arrowImg').src = './img/left.png';
// 		} else {
// 			userMenu = true;
// 			node('userMenu').style.right = 0;
// 			node('arrowImg').src = './img/right.png';
// 		}
// 	});
// 	$('#textInput').keyup(function (e) {
// 		if (e.keyCode == 13) sendMessage(username, node('textInput').value);
// 	});
// 	$('#sendButton').click(function () {
// 		sendMessage(username, node('textInput').value);
// 	});
// }
