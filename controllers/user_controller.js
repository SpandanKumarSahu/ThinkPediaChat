var User=require('../models/user');
var Chat=require('../models/chat');
var uuid=require('node-uuid');
var jwt=require('jsonwebtoken');
var config=require('../config');

exports.postUser= function(req,res){
    var user = new User();
    user.Name=req.body.Name;
    user.Phone=req.body.Phone;
    user.Password=req.body.Phone;
    var token=jwt.sign(user, config.secretKey, {
        expiresIn: 86400  //expires in 2 months.
    });
    user.Token=token;
    user.save(function (err) {
        if(err)
            res.json({
                message:'Unsuccessful'
            });
        else
            res.json({
                message:'Successful',
                token:token
            });
    });
};

exports.getUserToken= function (req,res) {
    User.findOne({
        Phone:req.body.Phone
    }, function (err, user) {
        if (err)
            throw err;
        if (!user) {
            res.json({
                success: false,
                message: 'User Not Registered'
            })
        }
        else if (user) {
            user.verifyPassword(req.body.Password, function (err, isMatch) {
                if (err)
                    res.json({
                        success: false,
                        message: 'Error'
                    });
                else if (isMatch) {
                    var token=user.Token;
                    res.json({
                        success: true,
                        message: 'Successful Login',
                        token: token
                    });
                }
                else {
                    res.json({
                        success: false,
                        message: 'Password Incorrect'
                    });
                }
            });
        }
    });
};

//Adds a phone number to the Friends list. If there isn't already a friendship there, it creates a room where they can talk.
//It is not necessary for friendship to be commutative.
exports.addFriend=function (req,res) {
    var user=req.value;
    var Phone=req.body.Phone;
    User.findOne({
        Phone:user.Phone
    }, function (err, user) {
        if(err)
            throw err;
        if(!user){
            res.json({
                success:false
            })
        }
        else if(user){
            user.Friends.push(Phone);
            user.save(function (err) {
                if(err)
                    res.send(err);
                else{
                    //Check if the friendship already exists.
                    Chat.findOne({})
                        .where('PersonA').equals(Phone)
                        .where('PersonB').equals(user.Phone)
                        .exec(function (err,chat) {
                            if(err)
                                res.send(err);
                            else if(!chat){
                                Chat.findOne({})
                                    .where('PersonA').equals(user.Phone)
                                    .where('PersonB').equals(Phone)
                                    .exec(function (err,chat) {
                                        if(err) res.send(err);
                                            //This is the initiation of a new friendship. Create a room for them.
                                        else if(!chat){
                                            var new_chat=new Chat();
                                            new_chat.PersonA=user.Phone;
                                            new_chat.PersonB=Phone;
                                            new_chat.RoomNumber='room-'+user.Phone+Phone;
                                            new_chat.save(function(err){
                                                if(err) res.json({success:false});
                                                else res.json({success:true});
                                            })
                                        }
                                        //Friendship already exists. No need to create a room anymore.
                                        else{
                                            res.json({success:true});
                                        }
                                    });
                            }
                            //Friendship already exists. No need to create a room anymore.
                            else{
                                res.json({success:true});
                            }
                        });
                    res.json({success:false});
                }
            });
        }
    });
};

exports.getFriends=function(req,res){
    var user=req.value;
    var query=User.findOne({}).where('Phone',user.Phone)
        .select('Friends');
    query.exec(function (err,users) {
        if(err)
            res.send(err);
        else {
            var result=[];
            var q=JSON.stringify(users);
            for(var i=0;i<q.length;i++){
                var obj=q[i];
                var friend=User.findOne({}).where('Phone').equals(obj.Phone).select('Name Phone').exec(function (err,friend) {
                    if(err) res.send(err);
                    else return friend;
                });
                result.push({
                    "Name":friend.Name,
                    "Phone":friend.Phone
                });
            }
            res.json(result);
        }
    });
};

exports.getMyself=function(req,res){
    var user=req.value;
    res.json({
        Name: user.Name,
        Phone: user.Phone
    });
};

exports.sendMessage=function(room, message, cb){
    Chat.findOne({})
        .where('RoomNumber').equals(room)
        .exec(function (err,chat) {
            if(err)
                throw (err);
            else if(!chat){
                cb(null);
            }
            else{
                var curr_date=new Date();
                chat.Messages.push({
                    Message:message,
                    SendDate:curr_date,
                    SendFrom:user.Phone,
                    ViewedByReceiver:false
                });
                chat.save(function (err) {
                    if(err) cb({success:false});
                    else cb({success:true});
                });
            }
        });
    cb({success:false});
};

exports.DescendingTimeSort=function (message1, message2) {
    return message1.SendDate.getTime()-message2.SendDate.getTime();
};

exports.getNewMessages=function(room, cb){
    Chat.findOne({})
        .where('RoomNumber').equals(room)
        .exec(function (err,chat) {
            if(err)
                throw (err);
            else if(!chat){
                cb(null);
            }
            else{
                var results=[];
                chat.Messages.sort(DescendingTimeSort).forEach(function (message) {
                    if(message.ViewedByReceiver==false){
                        results.push(message);
                        message.ViewedByReceiver=true;
                    }
                });
                chat.save(function (err) {
                    if(err) throw (err);
                });
                var JSON_result=JSON.stringify(results);
                cb(JSON_result);
            }
        });
    cb({success:false});
};

exports.getRoomNumber=function (user, friend, cb) {
    Chat.findOne({})
        .where('PersonA').equals(user)
        .where('PersonB').equals.(friend)
        .exec(function (err, chat) {
            if(err) throw (err);
            else if(!chat){
                Chat.findOne({})
                    .where('PersonA').equals(friend)
                    .where('PersonB').equals(user)
                    .exec(function (err, chat) {
                        if(err) throw (err);
                        else if(!chat){
                            cb(null);
                        }
                        else{
                            cb(chat.RoomNumber);
                        }
                    });
            }
            else{
                cb(chat.RoomNumber);
            }
        });
};


