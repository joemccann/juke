var nodemailer = require('nodemailer')
  ,  colors = require('colors')

// SET YOUR CONFIG HERE:
nodemailer.SMTP = {
    host: 'smtp.gmail.com',
    port: 465,
    ssl: true,
    use_authentication: true,
    user: 'user@domain.com',
    pass: 'password'
}

// Callback to be run after the sending is completed....can and should DEFINITELY be improved
var sendMailHandler = function(error, success){
    if(error){
        return 'Error occured while sending.'
    }
    if(success){
        return 'Message sent successfully!'
    }else{
        return'Message failed, reschedule.'
    }
}

// Catch uncaught errors
process.on('uncaughtException', function(e){
    console.log('Uncaught Exception', e.stack);
});

// Expose the send method.
exports.send = function(email_config, cb) {
    
    console.log('\n\nAttempting to send Mail...'.yellow)
    
    try{

      nodemailer.send_mail(email_config, function(err,data){
        var result = sendMailHandler(err,data)
        cb && cb(err, result)
      }) // end send_mail()

    }catch(e) {

      console.log('Caught Exception',e);

    }

} // end send