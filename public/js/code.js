!function(d,w){

  var debug = w.debugging || false
    , _main = d.getElementById('main')

  /*
   * @desc Lose the URL bar for mobile version by sliding screen up.
   *
   * @return void	
   */
  function scrollUp(delay){
    // via @rem
  	/mobile/i.test(navigator.userAgent) && !location.hash && setTimeout(function ()
  	{
  		window.scrollTo(0, 1);
  	}, delay || 100);
  	
  }
  
  function init(){
    
    if( _main.className.match('dashboard|register|forgot') )
    {
      
      $('#username').is(":visible") && $('#username').focus()
      
    }
    
  }
  
  function loaded(){
    
    scrollUp()    

    // can be removed, just for a nice fade-in effect
    /*
    if( _main.className.match('dashboard') ){
      $(d.body).addClass('slick')
    }
    */
    
  }
  
  $(d).ready(init)
  
  w.onload = loaded
  
}(document,window)