# Juke


Flossy way to build a user registration app/component with Express, Redis and Stylus.  It's also a decent starting point for any Express app.


## Requirements


- Redis
- Node.js 0.4.11+
	- Express
	- EJS 
	- Redis
	- Stylus
	- Smoosh
	- Colors
	- Nodemailer
	- Node-Password-Hash
- Google Apps Account/SMTP Access (or your own SMTP server) 



## How-To #

Make sure Redis is installed and running on the server.

<pre>
wget http://redis.googlecode.com/files/redis-2.2.12.tar.gz
tar xzf redis-2.2.12.tar.gz
cd redis-2.2.12
make
sudo make install
</pre>

To start the redis-server type:


<pre>
redis-server
</pre>

This will use default config.
In order to specify a config file use `redis-server /path/to/redis.conf'`



To enter the redis CLI type:


<pre>
redis-cli
</pre>


Now you can `GET` and `SET` keys and values.  To remove all keys type `FLUSHALL`.


<br>
Grab the necessary modules (this is a shitty hack, but works for now):


<pre>
npm install express stylus ejs redis password-hash colors nodemailer && sudo npm install smoosh -g
</pre>


To fire up your Juke joint, type:


<pre>
node app.js
</pre>


By default, the `app.json` file has configuration options set for debugging, on `localhost` at port `5050`.  This can all be configured by simply changing the values.


If you want to change to `localhost` but on a production port like `80`, change  

<pre>"DEBUG"</pre> 


to  


<pre>false</pre>  


Before you restart the app, you'll need to compress/concat the files with smoosh:


<pre>smoosh -c app.json</pre>


This will create you minified and concatenated CSS and JS files.


Now, restart the app, `node app.js`, and navigate to `http://localhost/`.


<br>
If you want to actually run this on a production server there are a few things you should do. 


First, change the `"LOCALHOST"` and `"DEBUG"` values to `false` and update your CDN values and the verification link to your live site URLs.



Next, start and stop the node app.  This will update the stylus file and image prefix for production (we should change this so you can just call the method inside the app.js file, but lazy for now):

Start (and capture process id):
<pre>sudo node app.js &; echo $! > node.pid</pre>


Stop:
<pre>cat node.pid | sudo xargs kill && rm -f node.pid</pre>



Now that the proper asset/image prefix is set, let's smoosh it.



<pre>
smoosh -c app.json
</pre>


<br>
Now, your app is primed and ready for production.

<br><br>
For email configuration, open the `email.js` file in the `utils` directory.


There is a configuration hash there.  Update it with your credentials.



## Redis Keys

Key 										| 	Value											|	Comment
****

joe				 							|	hashedPassw0rdHere!11				|	username and hashed password


joe@RAD.com 						|	joe													| email address and associated username


joe:isVerified			 		|	(un)verified								|	account verification check 


adfs8922dfsa2300				| joe													|	random, one-time key for account verification





## LICENSE #

MIT


## TODO #


- Create package.json
- Validate incoming inputs.
- Lots moar (see the inline code comments)


## CREDITS #

Background pattern for the `<body>` tag: [dinpattern.com](http://dinpattern.com/category/patterns/)