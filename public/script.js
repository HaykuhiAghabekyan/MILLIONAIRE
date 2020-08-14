$(document).ready(() => {

  var socket = io.connect();
  let questions;
  let user_id;
  let active_ques = 0;
  let isStartedGame = false

  // sockets

  socket.on('start', ({ rows, act_quest }) => {
    questions = rows
    getQuestion(questions, act_quest)

  })

  socket.on('username is exists', data => {
    $('.err').html(data.err)
    $('button').attr('disabled', false).css('cursor', 'pointer')

  })

  socket.on('game is started', ({ sec, isStarted, act_quest }) => {
    isStarted && $('.start-game').css('display', 'none')
    timer(sec, act_quest)
  })

  socket.on('new player joined', data => {
    updatePlayers(data)
    isStartedGame = true
  })

  socket.on('there is a correct answer', (data) => {
    console.log(data);

    $('.res').text('there is a correct answer');
    $('.answer').attr('disabled', 'disabled').css('background', '#d5d5db')
    $(`#${questions[active_ques].right_answer_id}`).css('background', 'green')
  })

  socket.on('you wrong', (answer_id) => {
    $('.res').text('you wrong');
    $('.answer').attr('disabled', 'disabled').css('background', '#606062')
    $(`#${questions[active_ques].right_answer_id}`).css('background', 'green')
    $(`#${answer_id}`).css('background', 'red')

  })

  socket.on('update points', data => {
    updatePlayers(data)
  })

  socket.on('update question', ({ act_quest }) => {
    if (active_ques != act_quest) {
      active_ques = act_quest
      getQuestion(questions, act_quest)
    }
  })

  socket.on('finish game', () => finishGame())

  // helper functions

  function getQuestion(questions, index) {

    $('.answer').attr('disabled', false).css('background', 'none')

    $('.question').text(`${index + 1}. ${questions[index].text}`)
    $('#1').html(`<span>a.</span> ${questions[index].variant1}`)
    $('#2').html(`<span>b.</span>  ${questions[index].variant2}`)
    $('#3').html(`<span>c.</span>  ${questions[index].variant3}`)
    $('#4').html(`<span>d.</span>  ${questions[index].variant4}`)

    $('.answer').attr('disabled', false).css('background', 'none')

  }

  function updatePlayers(data) {
    let new_player = '';
    data.players.forEach(player => {
      let cls = ''
      player.name === data.act_user ? user_id = player.id :
        // cls = player.id == user_id && 'active'
        new_player += `<li class="list-group-item ">${player.name} <span>${player.point}</span></li>`
    });

    $('.player-list').html(new_player)
  }

  function timer(sec, act_quest) {
    // let sec = +$('.sec').text();
    if (sec == 0) {
      $('.res').text('');

    }
    sec > 9 ? $('.sec').text(sec) : $('.sec').text(`0${sec}`)

  }

  function finishGame() {
    socket.emit('end')
    socket.on('finish', user => {
      $('.start-game').css('display', 'block')
      $('.left-block').css('opacity', 0)
      $('input').val('')
      $('button').attr('disabled', false)
      $('.player-list').html('')

      $('.res').text(`won by ${user.name} with ${user.point} points`)
      $('.answer').attr('disabled', false).css('background', 'none')
      setTimeout(()=> $('.res').text(''),3000)
    })
    isStartedGame = false

  }

  // events

  $('#form').submit(e => {
    e.preventDefault()
    let name = $('input').val()
    socket.emit('add player', name)
    $('.start').attr('disabled', 'disabled').css('cursor', 'not-allowed')
    $('.err').html('')
    $('.left-block').css('opacity', 1)
  })

  $('.answer').click(e => {
    answer_id = e.target.id
    socket.emit('answer', { user_id })


    if (isStartedGame) {
      if (answer_id == questions[active_ques].right_answer_id) {
        socket.emit('right answer', user_id)
      } else {
        socket.emit('wrong answer', { user_id, answer_id })
      }

    }

  })

  $('.start-game').click(() => {
    $('.main').css('opacity', 1);
    socket.emit('start game')
    $('.start-game').slideUp(200)
  })
})