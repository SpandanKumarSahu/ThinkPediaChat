var mongoose= require('mongoose');
var bcrypt=require('bcrypt-nodejs');

var UserSchema= new mongoose.Schema({
    Name:{
        type:String,
        required:true
    },
    Phone:{
        type:String,
        required:true,
        unique:true
    },
    Password:{
        type:String,
        required:true
    },
    Friends:[{
       Phone:String
    }],
    Token:String
});

UserSchema.pre('save',function (cb) {
    var user=this;
    if(!user.isModified('Password')) return cb();
    bcrypt.genSalt(5,function (err,salt) {
        if(err)
            return cb(err);
        bcrypt.hash(user.Password, salt, null, function(err, hash) {
            if (err) return callback(err);
            user.Password = hash;
            cb();
        });
    });
});

UserSchema.methods.verifyPassword=function (password,cb) {
    bcrypt.compare(password,this.Password,function (err,isMatch) {
        if(err)
            return cb(err);
        return cb(null,isMatch);
    });
};


module.exports= mongoose.model('Patient',PatientSchema);