var express=require('express');
var app=express();
var mongoose=require('mongoose');
var bodyParser=require('body-parser');
var jwt=require('jsonwebtoken');
var config=require('./config');
var passport=require('passport');
var UserController=require('/controllers/user_controller');
var io=require('socket.io')(app.HttpServer);
var socketioJwt=require('socketio-jwt');
var fs = require("fs");
var siofu = require("socketio-file-upload");


var port= process.env.PORT || 7000;
app.use(bodyParser.urlencoded({
    extended:false
}));
// app.use(express.static(__dirname + '/'));
app.use(bodyParser.json());
var router=express.Router();

//Connecting ans setting up.
mongoose.connect(config.database);

app.use(siofu.router).listen(port);
app.use('/api/chat',router);

router.get('/',function(req,res){
    res.json({
        message: 'Connected'
    });
});

router.route('/signup').post(UserController.postUser);
router.route('/signin').get(UserController.getUserToken);

var UserRouter=new express.Router();
app.use('/authenticate/user',UserRouter);

var connected_users=[];

var auth=function (req,res,next) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'] || req.param('Token');
    if(token){
        jwt.verify(token, config.secretKey, function(err, decoded) {
            if (err) {
                return res.json({ success: false, message: 'Failed to authenticate token.' });
            } else {
                req.value=decoded._doc;
                next();
            }
        });
    } else {
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
};
UserRouter.use(auth);

UserRouter.route('/addFriend').post(UserController.addFriend);
UserRouter.route('/getFriends').post(UserController.getFriends);
UserRouter.route('/getMyself').get(UserController.getMyself);
UserRouter.route('/getMyFileList').post(UserController.getMyFileList);
UserRouter.route('/getFriendsFileList').post(UserController.getFriendsFileList);
UserRouter.route('/getAllFileList').post(UserController.getAllFileList);



// Authenticate tokens. For how to use client side, refer this site: https://www.npmjs.com/package/socketio-jwt-decoder
/*
* For dynamic authentication, i.e. using a different secretKey for each person, follow the steps in :-
* https://github.com/auth0/socketio-jwt
* */

io.use(socketioJwt.authorize({
    secret:config.secretKey,
    handshake:true
}));

/*
* For Client Side use:
* socket.on("unauthorized", function(error) {
 if (error.data.type == "UnauthorizedError" || error.data.code == "invalid_token") {
 // redirect user to login page perhaps?
 console.log("User's token has expired");
 }
 });
* */

//Using default namespace. Can't find reasons to use custom namespaces.

/*
* Every user has a room number of his own. Then there are different rooms for each pair of two friends.
* When connected and authenticated, the user gets a JSON file of all unviewed messages, with their sender and time of sending.
* Use Postman to know how it returns.
* */

io.sockets.on('connection', function (socket) {
    var user;
    var global_room;

    /* Please Please go through this page before writing the front-end code for uploading files and see the client side code.
    *  https://www.npmjs.com/package/socketio-file-upload
    * */

    var uploader = new siofu();
    var upload_str="uploads/";
    uploader.listen(socket);
    uploader.on("saved",function () {

    });

    if (socket.decoded_token) {
        //Authentication successful
        if (connected_users.indexOf(socket.decoded_token.Phone) < 0)
            connected_users.push(socket.decoded_token.Phone, 'connected');
        user = socket.decoded_token;
    }
    // Once a client has connected, we expect to get a ping from them saying with which friend they wanna contact.
    // Visit https://gist.github.com/crtr0/2896891 for more info.

    socket.on('room', function (friend) {
        UserController.getRoomNumber(user.Phone, friend, function (room) {
            global_room = room;
            socket.join(room);

            //Create a directory for storing the uploads
            upload_str="uploads/"+room+user.Phone;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
        })
    });

    // Once you are connected to a friend, you can only send to him. To connect to another friend, make a new room request.

    socket.on('send_message', function (message) {
        try {
            UserController.sendMessage(global_room, message, function (report) {
                if (!report) {
                    io.sockets.in(global_room).emit('message', message);
                    if (socket.sockets.length > 1) {
                        UserController.getNewMessages(global_room, function (messages) {
                            if (!messages) {
                                //Do nothing. And please implement the try and catch clauses.
                                // I wonder why IntelliJ hasn't provided code completion.
                            }

                        });
                    }
                }
            });
        } catch (err) {
            //Do something later with the error codes that get caught here.
        }

    });

    socket.on('get_new_messages', function () {
        try {
            UserController.getNewMessages(global_room, function (messages) {
                for (var m in messages) {
                    socket.emit('new_message', m);
                }
            });
        } catch (err) {
            //Do something with the error.
        }
    });


    socket.on('disconnect', function () {
        var index = connected_users.indexOf(user);
        if (index > -1) {
            connected_users.splice(index, 1);
        }
    });

});