from flask import Flask, jsonify, render_template
import pychromecast
import json
import conf
from nest_thermostat import Nest

app = Flask(__name__)
nest = Nest(conf.NEST_USERNAME, conf.NEST_PASSWORD, units='C')
nest.login()
casts = {}

def init_cast(name):
    casts[name] = pychromecast.get_chromecast(friendly_name=name)
    casts[name].wait()

[init_cast(c) for c in conf.CAST_NAMES]

@app.route('/')
def home():
    return render_template('index.html', conf=conf)

@app.route('/cast/')
def info():
    data = {'status': 'ok', 'casts': {}}
    for name in casts.keys():
        cast_info = {}
        cast = casts[name]
        cast_info.update(is_stand_by=cast.status.is_stand_by)
        mc = cast.media_controller
        cast_info.update(status=mc.status.__dict__)
        data['casts'][name]=cast_info
    response = jsonify(data)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route('/cast/<name>/<action>/')
def control(name, action):
    cast = casts[name]
    mc = cast.media_controller
    if action == 'play':
        mc.play()
    elif action == 'pause':
        mc.pause()
    elif action == 'stop':
        mc.stop()
    elif action == 'next':
        mc.skip()
    elif action == 'refresh':
        init_cast(name)
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route('/nest/')
def nest_info():
    nest.get_status()
    response = jsonify(nest.status)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response
