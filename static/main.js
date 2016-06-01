document.body.style.cursor = 'none';
function getDOW(d){
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
}
function getMonth(d){
    return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()];
}
function fade(target){
  while(brightness != target){
    var diff = (brightness > target) ? -5 : 5;
    var value = Math.min(Math.max(0, brightness + diff),255);
    setBrightness(value);
  }
}
function setBrightness(value){
  brightness = value;
  $.ajax({
    url:'localhost:5000/bl/' + value + '/'
  });
}
//http://stackoverflow.com/a/15528789/319618
function getCurvePoints(pts, tension, numOfSegments) {
    tension = (typeof tension != 'undefined') ? tension : 0.5;
    numOfSegments = numOfSegments ? numOfSegments : 16;
    var _pts = [], res = [],    // clone array
        x, y,           // our x,y coords
        t1x, t2x, t1y, t2y, // tension vectors
        c1, c2, c3, c4,     // cardinal points
        st, t, i;       // steps based on num. of segments
    _pts = pts.slice(0);
    _pts.unshift(pts[1]);   //copy 1. point and insert at beginning
    _pts.unshift(pts[0]);
    _pts.push(pts[pts.length - 2]); //copy last point and append
    _pts.push(pts[pts.length - 1]);
    for (i=2; i < (_pts.length - 4); i+=2) {
        for (t=0; t <= numOfSegments; t++) {
            t1x = (_pts[i+2] - _pts[i-2]) * tension;
            t2x = (_pts[i+4] - _pts[i]) * tension;
            t1y = (_pts[i+3] - _pts[i-1]) * tension;
            t2y = (_pts[i+5] - _pts[i+1]) * tension;
            st = t / numOfSegments;
            c1 =   2 * Math.pow(st, 3)  - 3 * Math.pow(st, 2) + 1;
            c2 = -(2 * Math.pow(st, 3)) + 3 * Math.pow(st, 2);
            c3 =       Math.pow(st, 3)  - 2 * Math.pow(st, 2) + st;
            c4 =       Math.pow(st, 3)  -     Math.pow(st, 2);
            x = c1 * _pts[i]    + c2 * _pts[i+2] + c3 * t1x + c4 * t2x;
            y = c1 * _pts[i+1]  + c2 * _pts[i+3] + c3 * t1y + c4 * t2y;
            res.push(x);
            res.push(y);
        }
    }
    return res;
}
function drawLines(ctx, pts) {
    ctx.moveTo(pts[0], pts[1]);
    for(i=2;i<pts.length-1;i+=2) {
      ctx.lineTo(pts[i], pts[i+1])
    };
}
function drawCurve(ctx, ptsa, tension, numOfSegments) {
    ctx.beginPath();
    drawLines(ctx, getCurvePoints(ptsa, tension, numOfSegments));
    ctx.stroke();
}
function getTime(){
  var d = new Date();
  var str = "" + d.getMinutes()
  var pad = "00"
  var minutes = pad.substring(0, pad.length - str.length) + str
  $('#time').text(d.getHours() + ':' + minutes);
  $('#date').html(getDOW(d) + '<br>' + d.getDate() + ' ' + getMonth(d));
}
function drawWeather(data){
  var canvas = document.getElementById("precip");
  var ctx = canvas.getContext("2d");
  var w = 480;
  var h = 100;
  var x = 0;
  ctx.clearRect(0, 0, w, h);
  for(var i=0; i < data.minutely.data.length; i++){ //expecting 2 hours of points -> 120
    var height = data.minutely.data[i].precipIntensity * 1000;
    var opacity = data.minutely.data[i].precipProbability;
    ctx.fillStyle = 'rgba(68,170,255,' + opacity + ')';
    ctx.fillRect(x,h-height,1,height);
    x += 1;
  }
  var counted = x / 60;
  var temp_points = [];
  var temp_max = -999;
  var temp_min = 999;
  for(var i=0; i < data.hourly.data.length; i++){
    if (x > w) { break; }
    var pt = data.hourly.data[i]
    temp_points.push(i*60);
    temp_points.push(pt.apparentTemperature);
    temp_max = Math.max(temp_max, pt.apparentTemperature);
    temp_min = Math.min(temp_min, pt.apparentTemperature);
    var dt = new Date(pt.time*1000);
    $('.lab-' + i).text(dt.getHours() + ":" + ("0" + dt.getMinutes()).substr(-2));
    if (i < counted){
      continue;
    }
    var height = pt.precipIntensity * 1000;
    var opacity = pt.precipProbability;
    ctx.fillStyle = 'rgba(68,170,255,' + opacity + ')';
    ctx.fillRect(x,h-height,60,height);
    x += 60;
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#f00';
  var temp_points_normalised = [];
  for (var i=0; i < temp_points.length; i++){
    if(i % 2 == 0){
      temp_points_normalised.push(temp_points[i]);
    }else{
      var new_val = 60 / (temp_max-temp_min) * (temp_points[i] - temp_max) + 80;
      temp_points_normalised.push(h - new_val);
    }
  }
  drawCurve(ctx, temp_points_normalised);
  $('#temp-max').text(FtoC(temp_max) + 'ºC');
  $('#temp-min').text(FtoC(temp_min) + 'ºC');
  $('#weather-now').text(data.currently.summary + ' - ' + FtoC(data.currently.temperature) + 'ºC');
}
function FtoC(t){
  return Math.round((t - 32) * 5/9)
}
function updateWeather(){
  $.ajax({
    url: 'https://api.forecast.io/forecast/' + FORECAST_KEY + '/51.5074,-0.1278?callback=?',
    method: 'get',
    dataType: 'jsonp',
    success: function(data){
      window.data = data;
      drawWeather(data);
    }
  });
}
function updateChromecast(){
  $.ajax({
    url: 'http://localhost:5000/cast/',
    method: 'get',
    success: function(data){
      for (var i=0; i<CAST_NAMES.length; i++){
        updateChromecastDisplay(data, CAST_NAMES[i]);
      }
    }
  });
}
function updateChromecastDisplay(data, name){
  d = data.casts[name];
  el = $('#' + name);
  if (d.is_stand_by || d.status.player_state == 'UNKNOWN'){
    el.find('.status').text('Standby');
    el.find('.controls').addClass('disabled');
    el.find('.play').html('<i class="fa fa-play" aria-hidden="true">');
  }else{
    var md = d.status.media_metadata;
    el.find('.status').html(d.status.player_state.toLowerCase() + '<div class="now-playing">' + md.artist + ': ' + md.title + '</div>');
    el.find('.controls').removeClass('disabled');
    if (d.status.player_state == 'PLAYING'){
      el.find('.play').html('<i class="fa fa-pause" aria-hidden="true">').attr('data-action', 'pause');
    }else{
      el.find('.play').html('<i class="fa fa-play" aria-hidden="true">').attr('data-action', 'play');
    }
  }
}
function updateNest(){
  $.ajax({
    url:'http://localhost:5000/nest/',
    success:function(data){
      var device = data.shared[NEST_DEVICE];
      $('#current-temp').text("Current: " + Math.round(device.current_temperature) + 'ºC');
      $('#nest-control').text(device.target_temperature + 'ºC');
      if(device.hvac_heater_state){
        $('#nest-control').addClass('active');
      }else{
        $('#nest-control').removeClass('active');
      }
    }
  })
}
function trelloGetList(){
  Trello.get('/lists/' + TRELLO_LIST_ID + '/cards', trelloList, trelloError);
}
function trelloList(data){
  $('#list').html('');
  for(var i=0; i < data.length; i++){
    var c = data[i];
    $('#list').append('<div class="item">' + c.name + '</div>');
  }
}
function trelloError(){
  $('#list').text('Error');
}
function trelloAuth(){
  Trello.authorize({
    type: 'popup',
    name: '',
    scope: {
      read: true,
      write: true },
    expiration: 'never',
    success: trelloGetList,
    error: trelloError
  });
}
$(document).ready(function(){
  getTime();
  updateWeather();
  updateChromecast();
  updateNest();
  trelloAuth();
  setInterval(function(){getTime();}, 1000);
  setInterval(function(){updateNest();}, 1000 * 60); // One minute
  setInterval(function(){updateChromecast();}, 5000);
  setInterval(function(){trelloGetList();}, 1000 * 60 * 5); // 5 minutes
  setInterval(function(){updateWeather();}, 1000 * 60 * 5); // 5 minutes
  var fadeout_timer = 0;
  $('body').on('click',function(){
    clearTimeout(fadeout_timer);
    fade(255);
    fadeout_timer = setTimeout(fade(40), 10000);
  });
  $('.control').on('click',function(){
    if ($(this).parent().hasClass('disabled')) return;
    var cast = $(this).attr('data-cast');
    var action = $(this).attr('data-action');
    $.ajax({
      url: 'http://localhost:5000/cast/' + cast + '/' + action + '/',
      success: function(data){
        if(action == 'play'){
          $('#' + cast).find('.' + action).html('<i class="fa fa-pause" aria-hidden="true">').attr('data-action', 'pause');
        }else if(action == 'pause'){
          $('#' + cast).find('.' + action).html('<i class="fa fa-play" aria-hidden="true">').attr('data-action', 'play');
        }else if(action == 'stop'){
          $('#' + cast).find('.controls').addClass('disabled');
        }
      }
    })
  });
});
