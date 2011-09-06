var express = require('express')
  , fs = require('fs')
  , exec = require('child_process').exec
  , path = require('path')
  , utils = require('sys')
  , redis = require('redis')
  , colors = require('colors')
  , pwhash = require('password-hash')
  , stylus = require('stylus')
  , emailer = require(__dirname + '/utils/email.js')
  , strings = require(__dirname + '/utils/strings.js')
  , debug
  , redisClient
  , RedisStore
  , isRedisConnected = false

// Grab the app's configuration.  This is defined in app.json (maybe rename this?)
var appConfig = JSON.parse(fs.readFileSync('./app.json', 'UTF-8'))

// Set the debug flag FOR THE FUTURE!!!ONE1!
debug = appConfig.DEBUG  

// If hacking on localhost/local machine
if(appConfig.LOCALHOST){
  
  // overwrite verification url
  appConfig.URLS.verification = "http://localhost/verify/" 

}

// If we are debugging...
if(debug){

  // update port
  appConfig.PORT = 5050  // ...to nollie 360 heelflip, breaux!

  // overwrite account verification url
  appConfig.URLS.verification = "http://localhost:"+appConfig.PORT+"/verify/" 

}

// Change these at your will in the related file.
// TODO:  Eventually add error messages to strings.js so nothing is hardcoded.
var titles = strings.titles
  , errors = strings.errors

// Initialize Redis connection
initRedis()

// Configuration
var app = module.exports = express.createServer()

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.set('env', debug ? 'development' : 'production')
  app.use(express.favicon(__dirname + '/public/favicon.ico')) 
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: "Linearity isn’t the norm in the world around us, non-linearity is...", store: new RedisStore, cookie: { maxAge: 60000*5} })); // 5 minutes
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
  res.redirect('/dashboard')
});

app.get('/dashboard', function(req, res){
  
  var config = {}
  
  if(req.session.loggedIn){
    
    // Now check if the account has been verified
    var verificationKey = req.session.username + ":isVerified"
    
    redisClient.get(verificationKey, function(err,data){

      if(err) res.send(errors.redisErrorPrefix+ err)

      else{
        if(data !== 'verified'){

          config.title = titles.defaultDashboardPage
          config.version = appConfig.VERSION
          config.debugging = debug
          config.auth = {
            isLegit: false,
            message: errors.unconfirmedAccount
          }

          res.render('dashboard', config)
          
        }
        else{
          config.title = titles.defaultDashboardPage
          config.version = appConfig.VERSION
          config.debugging = debug
          config.auth = {
            isLegit: true,
          }
          res.render('dashboard', config)
          
        } // end else data verified
        
      } // end else no error

    }) // end redisGet verificationKey
    
  }
  else{

    config.title = titles.defaultDashboardPage
    config.version = appConfig.VERSION
    config.debugging = debug
    config.auth = {
      isLegit: false
    }

    res.render('dashboard', config)

  }

});

app.post('/dashboard', function(req, res){
  
  // TODO Sanitize this and send back errors if there's an issue.
  // Use the validator module (npm install validator)
  var username = req.body.username.toLowerCase()  // numbers,letters only
  var password = req.body.password                // numbers, letters only
  
  redisClient.get(username, function(err, data){
    
    // console.log( ('\n\n'+ data).red )

    if(err) res.send(errors.redisErrorPrefix + err)

    else{
      
      // If no data, then no username exists
      if(!data) {

        var config = {}

        config.title = titles.defaultDashboardPage
        config.version = appConfig.VERSION
        config.debugging = debug
        config.loggedIn = false
        config.auth = {
          isLegit: false,
          message: errors.usernameDoesNotExist 
        }

        res.render('dashboard', config)
        
      }
      // Password doesn't pass the test
      else if( !pwhash.verify(password, data) ){

        req.session.username = username
        req.session.loggedIn = false
        
        var config = {}

        config.title = titles.defaultDashboardPage
        config.version = appConfig.VERSION
        config.debugging = debug
        config.loggedIn = false
        config.auth = {
          isLegit: false,
          message: errors.incorrectPassword
        }
        
        res.render('dashboard', config)

      } 
      else{
        // Saul Good
        // stash user and loggedIn state and redirect to dashboard view.
        req.session.username = username
        req.session.loggedIn = true

        res.redirect('/dashboard')
        
      }
    }
  })
  
})

app.post('/logout', function(req,res){
  
  req.session.destroy()
  
  res.redirect('/dashboard')

})

app.get('/register', function(req,res){
  
  res.render('register', {
    title: titles.defaultRegistrationPage,
    version: appConfig.VERSION,
    debugging: debug,
    create: {}
  });
  
})

app.post('/register', function(req,res){
  
  var username = req.body.username
    , email = req.body.email
    , password = req.body.password
    , message = {
      text: '',
      error: false
    }
    , config = {}
    
    // check Redis for username and email existence
    redisClient.get(username, function(err, data){

      if(err) res.send(errors.redisErrorPrefix+ err)
    
      if(data){
        // username exists!
        message.error = true
        message.text = errors.usernameExists
        
        config.title = titles.defaultRegistrationPage 
        config.version = appConfig.VERSION
        config.debugging = debug
        config.create = {
          isLegit: !message.error,
          message: message.text
        }
    
        res.render('register', config)
      }
      else
      {
    
        redisClient.get(email, function(err, data){

          if(err){
            res.send(errors.redisErrorPrefix + err) // TODO: this is bad and should be fixed
          }
          else{
            
            if(data) {
              // email exists!
              message.error = true
              message.text = errors.emailExists
            }
    
            // If there's something wrong, render the registration page with the error
            if(message.error)
            {
              config.title = titles.defaultRegistrationPage + ' - '+ message.text
              config.version = appConfig.VERSION
              config.debugging = debug
              config.create = {
                isLegit: !message.error,
                message: message.text
              }
    
              res.render('register', config)
            }
            else
            {
              // Add to redis
              var hashedPassword = pwhash.generate(password)

              redisClient.set(username, hashedPassword, function(err,data){
                setUsernameHandler(err,data,res,email,username)
              })

            } // end message.error else

          } // end if(err) else
      
        }) // end email check
        
      } // end else

  }) // end usename check
  
})

app.get('/success', function(req,res){

  var config = {}
  config.title = titles.successRegistrationPage
  config.version = appConfig.VERSION
  config.debugging = debug

  res.render('successful_registration', config)

})

app.get('/forgot', function(req,res){
  
  res.send('Not implemented yet! We suck :(')
  
})

app.get('/verify/:unique', function(req,res){
  // Check to see if Redis has the unique key
  var unique = req.params.unique

  redisClient.get(unique, function(err,data){
    if(err){
      // TODO:  DESIGN 404, 403, 500 PAGES.
      res.send(404)
    }
    else{
      // data is the username, so set it verified
      setVerificationState(res,null,data,'verified')
      
      // TODO: DELETE UNIQUE FROM REDIS
    }

  }) // end redisClient get unique

})

app.post('/forgot/send', function(req,res){
  // todo:  this!
})

// Helper methods and handlers

// Set username in Redis
function setUsernameHandler(err,data,res,email,username){
  
  if(err){
    var config = {}
    config.title = titles.redisErrorUsername
    config.version = appConfig.VERSION
    config.debugging = debug
    config.create = {
      isLegit: false,
      message: errors.redisPrefix + err.message
    }

    res.render('register', config)

  }
  else{
    
    redisClient.set(email, username, function(err,data){
      setEmailHandler(err,data,res,email,username)
    })

  } // end set email address
                
}

// Set email address in Redis
function setEmailHandler(err,data,res,email,username){

  var config = {}
  
  if(err){
    config.title = titles.redisErrorEmail
    config.version = appConfig.VERSION
    config.debugging = debug
    config.create = {
      isLegit: false,
      message: errors.redisPrefix + err.message
    }

    res.render('register', config)
    
  }
  else{

    // Create username:verified false in Redis
    setVerificationState(res,email,username,'unverified')
    
  }

}

// sets the value in redis to un/verified for a user account.
function setVerificationState(res,email,username,state){
  // state will either be unverified or verified
  var verificationKey = username + ":isVerified"

  redisClient.set(verificationKey, state, function(err,data){

    var config = {}
  
    if(err){
      config.title = titles.redisErrorSetVerify
      config.version = appConfig.VERSION
      config.debugging = debug
      config.create = {
        isLegit: false,
        message: errors.redisPrefix + err.message
      }

      res.render('register', config)
    
    }
    else{
      if(state === 'unverified'){
        sendRegistrationEmail(res, email, username)
      }
      else{
        
        // We are now verified so redirect immediately to login/dashboard page.
        res.redirect('/dashboard')
        
      } // end else on state is verified

    } // end else error on redis get

  }) // end redisclient set

} // end setVerficiationState

// sends a registration email with a unique link
function sendRegistrationEmail(res,email,username){
  
  // Create a unique link
  var unique = randomString()
  var uniqueLink = appConfig.URLS.verification + unique
  
  // Add unique link in Redis
  redisClient.set(unique, username, function(err,data){
    
    var config = {}
  
    if(err){
      config.title = titles.redisErrorSetUnique
      config.version = appConfig.VERSION
      config.debugging = debug
      config.create = {
        isLegit: false,
        message: errors.redisPrefix + err.message
      }

      res && res.render('register', config)
    
    }
    else{
      
      // It is set so send email.
      // The config for the message.
      var email_config = {
            sender: 'Sup Bro <no-reply@dude.com>',
            to: email,
            subject: '[Test] Click To Verify Your Account ✔',
            body: 'Nice work.  Click the link below to verify your account: '+ uniqueLink,
            html: '<p>Nice work.  Click the link below to verify your account:</p>'+
                  '<p><a href="'+ uniqueLink + '">' + uniqueLink +'</a></p>',
            debug: false,
            attachments:[]
          }
          
          
      emailer.send(email_config, function(err, data){
        
        var config = {}

        if(err){
        
          config.title = titles.emailErrorSend
          config.version = appConfig.VERSION
          config.debugging = debug
          config.create = {
            isLegit: false,
            message: errors.redisPrefix + err.message
          }

          res && res.render('register', config)

        }
        else{

          config.title = titles.successRegistrationPage
          config.version = appConfig.VERSION
          config.debugging = debug

          res && res.render('successful_registration', config)

        }
        
      }) // email.send()
          
    } // end else set unique to username in redis
    
  }) // end redis set

} // end sendRegistrationEmail

// Method that reads in the main stylus file and rewrites it with either the cdn or local (debug) prefix
// for background images.  It's pretty ugly so make it pretty.
// @param {String}  the path to the production (single) stylus file
// TODO:  Expose this to command line?  smoosh?
function setStylusImagePrefix(productionFile){

  // Read in the stylus file that has the img prefix.
  fs.readFile(__dirname + appConfig.STYLUS_FILE, 'UTF-8', function(err,data){

    // Now we update the path of the image prefix, local or CDN...
    if(err) throw err
    else{
      // must be: imagePrefix="../img" or imagePrefix="http://cdn.foo.com/" in the stylus file.
      var d = data.replace(/imagePrefix=[A-Za-z0-9-:"'\.\/\\]+/i, debug 
                            ? 'imagePrefix="' + appConfig.IMAGE_PREFIX_DEBUG + '"'  
                            : 'imagePrefix="' + appConfig.IMAGE_PREFIX_PRODUCTION + '"')

       // write the file with the proper prefix.
       fs.writeFile(__dirname + appConfig.STYLUS_FILE, d, function(err,data){
        if(err) throw err
        else{
          
          console.log(appConfig.STYLUS_FILE + " file images prefixes written successfully written for %s environment.", debug ? 'debugging' : 'production')
          // console.log(d)

          // We need to compile the main stylus file for production
          var str = fs.readFileSync(productionFile, 'utf8');

          stylus(str)
            .set('filename', productionFile)
            .render(function(err, css){
              
              if (err) throw err

              // Write the style.css file...
              fs.writeFile( productionFile.replace('.styl', '.css'), css, function(err, data){
                
                if(err) throw err
                
                else{
                  console.log(productionFile.replace('.styl', '.css') + " file written successfully written for %s environment.", debug ? 'debugging' : 'production')
                }

              }) // end write style.css file

          }) // end stylus.render()

        } // end writeFile else 
      
       }) // end writeFile()

    } // end readFile else

  }) // end readFile()

}

// Collisions may happen so use something else if truly necessary. I believe @substack wrote a module
// for unique strings.
// @return {String} of length 16
function randomString(){
	
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz"
	  , random = ''
	  , i = 0
	
	for (; i<16; i++) {
		var rnum = Math.floor(Math.random() * chars.length)
		random += chars.substring(rnum,rnum+1)
	}

	return random
}

function initRedis(){
  
  redisClient = redis.createClient()

  redisClient.on("error", function (err) {
      console.log("Redis connection error to " + redisClient.host + ":" + redisClient.port + " - " + err);
  });

  redisClient.on("connect", function (err) {
  
    !isRedisConnected && console.log("\nRedis is connected.\n")
  
    isRedisConnected = true
    
  });

  RedisStore = require('connect-redis')(express);
  
}

function init(){
  
  // This should be the filename that is the single stylus file for production.
  // Maybe add this to the app.json config?
  var productionStylusFile = __dirname + "/public/css/style.styl"
  
  setStylusImagePrefix( productionStylusFile )
  
}

init()

app.listen(appConfig.PORT)

console.log("\n\nExpress server listening on port %d in %s mode.".cyan, app.address().port, app.settings.env);
