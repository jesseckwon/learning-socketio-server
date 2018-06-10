const env = require('./env')
const server = require('http').createServer();
const _ = require('lodash')
const io = require('socket.io')(server, {
  path: '/test',
  serveClient: false,
  // below are engine.IO options
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: true,
  log: false,
  agent: false,
  // origins: '*:*',
  origins: env.acceptHost,
  transports: ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling']
});
let isValid = () => {
  return true;
}
io.use((socket, next) => {
  let token = socket.handshake.query.token;
  if (isValid(token)) {
    return next();
  }
  return next(new Error('authentication error'));
});
var objUsers = {};
io.on('connection', (socket) => {
  let userid = socket.handshake.query.userid;
  let socketId = socket.id;
  console.log('connection', socketId);
  objUsers[userid] = {
    socketId: socketId,
    callname: userid
  };
  io.emit('user connect', objUsers);
  socket.on('chat message', (data) => {
    let touser = data.touser;
    let msgsend = data.msgsend;
    let fromuser = data.fromuser;
    let callname = objUsers[fromuser]['callname']
    let sendParams = {
      fromuser: fromuser,
      callname: callname,
      msgsend: msgsend,
      touser: touser
    };
    if (touser === '') {
      io.emit('chat message', sendParams);
    } else if (typeof objUsers[touser] === 'object') {
      io.to(objUsers[touser].socketId).emit('chat message', sendParams);
    } else {
      io.to(objUsers[fromuser].socketId).emit('chat message error', sendParams);
    }
  });
  socket.on('change name', (data) => {
    let userid = data.userid;
    let newname = data.newname;
    objUsers[userid]['callname'] = newname;
    io.emit('update name', {
      userid: userid,
      newname: newname
    });
  });
  socket.on('disconnect', () => {
    // console.log(socket.id);
    let userid = _.findKey(objUsers, {
      socketId: socket.id
    });
    _.unset(objUsers, userid);
    // console.log(objUsers);
    io.emit('user disconnect', {
      user: userid
    });
  });
});
server.listen(3000);