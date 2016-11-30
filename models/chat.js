var mongoose= require('mongoose');
var Schema=mongoose.Schema;

var MessageSchema=new mongoose.Schema({
    Message:{
        type:String,
        required:true
    },
    SendDate:{
        type: Date,
        required:true
    },
    SendFrom: {
        type: String,
        required: true
    },
    ViewedByReceiver:Boolean
});

var ChatSchema=new mongoose.Schema({
    PersonA:{
        type:String,
        required:true
    },
    PersonB:{
        type:String,
        required:true
    },
    RoomNumber:String,
    Messages:[MessageSchema]
});

module.exports=mongoose.model('Chat',ChatSchema);
