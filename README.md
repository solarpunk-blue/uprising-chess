# chessroom
Chessroom is an online multiplayer chess room in which you can play games of chess in real time with your friends, on any device. You can even watch the games your friends are playing on your own screen.  
Instant messaging capabilities are soon to come.  
*Hosted at: [chessroom.anuv.me](http://chessroom.anuv.me)*  

## instructions
Visit [chessroom.anuv.me](http://chessroom.anuv.me) to play!  
Hit **New Game** on the top right to begin a new game of chess. You are the White player.  
To share the game with a friend, send them the Game ID on the top right or the link to the current page, which also contains your Game ID. Your friend must join by visiting your link, [chessroom.anuv.me/gameid](#), on their own device, or by hitting **Join Game** on the top right and entering your Game ID. When the other player joins, they are the Black player.

## spectating
To watch other players' games, join a game that already has both a white and black player. Go to [chessroom.anuv.me/gameid](#) or hit **Join Game** on the top right and enter the Game ID. (That game ID is the ID of the game you want to watch). You will be given a spectator ID.

## code
chessroom.ml uses [Firebase](http://firebase.google.com)'s database service to store game data. The code is located on [GitHub](http://github.com/anuvgupta/chessroom.ml).  
Libraries Used:  
&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;[chess.js](https://github.com/jhlywa/chess.js) - v0.10.2 - move validation  
&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;[chessboard.js](https://github.com/oakmac/chessboardjs) - v0.3.0 - chess board UI  
&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;[jQuery](https://jquery.com/) - v1.12.4 - chessboard.js support  
&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;[material-design-lite](https://github.com/google/material-design-lite) - v1.1.3 - UI theme and design  
&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;[block.js](https://github.com/anuvgupta/block.js) - v3.0 - UI development and design - (also made by me)  
