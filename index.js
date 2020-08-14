var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var mysql = require('mysql');
server.listen(8000);

var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: ''
});

var bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ limit: '2mb', extended: true }));

app.use('/', express.static('public'));

io.sockets.on('connection', socket => {
  var act_quest = 0, timerId
  connection.query(`SELECT * FROM millionaire.questions`, function (err, rows, fields) {
    if (err) throw err
    io.sockets.emit('start', { rows, act_quest })
  })

  socket.on('start game', () => {
    let sec = 30
    // socket.emit('game is started')
    timerId = setInterval(() => {
      if (sec != 0) {
        sec--;
      } else {
        sec = 30
        act_quest++
      }
      if (act_quest < 15) {
        io.sockets.emit('update question', { act_quest })

      } else {
        io.sockets.emit('finish game')
        clearInterval(timerId)
        act_quest = 0
      }
      io.sockets.emit('game is started', { sec, isStarted: true, act_quest })
    }, 1000)


  })

  socket.on('add player', data => {
    connection.query('SELECT * FROM  millionaire.users   WHERE name = ?', [data],
      function (err, rows, fields) {
        if (err) throw err;
        rows.length ? socket.emit('username is exists', { err: 'the username is exists' }) :
          connection.query('INSERT INTO millionaire.users( name,point) VALUES (?,?)', [data, 0],
            function (err, rows, fields) {
              if (err) throw err;
              connection.query('SELECT * FROM millionaire.users ORDER BY point DESC',
                function (err, rows, fields) {
                  if (err) throw err;
                  io.sockets.emit('new player joined', { players: rows, act_user: data })
                })
            })
      })
  })


  socket.on('right answer', data => {
    setPoint(data, 'inc')
    io.sockets.emit('there is a correct answer', data)
  })

  socket.on('wrong answer', ({ user_id, answer_id }) => {
    setPoint(user_id, 'dec')
    io.sockets.emit('you wrong', answer_id)
  })

  // socket.on('answer',  user_id=>{
  //   io.sockets.emit('')
  // })


  socket.on('end', () => {
    connection.query(`SELECT * FROM millionaire.users `, function (err, rows, fields) {
      if (err) throw err
      var winer = rows[0]
      rows.forEach(user => {
        if (user.point > winer.point) {
          winer = user
        }
      });
      io.sockets.emit('finish', winer)
      connection.query(`TRUNCATE TABLE  millionaire.users `, function (err, rows, fields) {
        if (err) throw err
      })
    })
  })
})


function setPoint(data, type) {
  connection.query(`SELECT * FROM millionaire.users WHERE id = ?`, [data], function (err, rows, fields) {
    if (err) throw err

    var point = rows[0].point
    type === 'inc' ? point++ : point--
    connection.query(`UPDATE millionaire.users SET point = ? WHERE id = ?`, [point, data], function (err, rows, fields) {
      if (err) throw err

    })
    connection.query(`SELECT * FROM millionaire.users ORDER BY point DESC`, function (err, rows, fields) {
      io.sockets.emit('update points', { players: rows, act_user: data, })
    })
  })

}