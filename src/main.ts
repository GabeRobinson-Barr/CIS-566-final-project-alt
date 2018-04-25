import {vec2, vec3, vec4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import {Audio} from 'three';
import Analyser from './Analyser';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  'Song': 'City Escape',
  'Load Song': loadScene, // A function pointer, essentially
  'Play/Pause': PlayPause,
  'Volume': 50,
  'Difficulty': 5,
  'BufferTime': 0.2,
  'Score': 0,
};

let starttime: number = new Date().getTime();

let audioCtx: AudioContext;
let audioSrc: AudioBufferSourceNode;
let audioBuf: AudioBuffer;
let analyser: AnalyserNode;
let delay: DelayNode;
let gain: GainNode;

let generator: Analyser;

let playing: boolean = false;
let started: boolean = false;
let lastVol = 50;

let square: Square;
let currBeats: number[];

function loadScene() {
  if (started) {
    audioSrc.stop();
  }

  controls.Score = 0;

  playing = false;
  started = false;
  let dims = vec2.fromValues(document.documentElement.clientWidth, document.documentElement.clientHeight);
  square = new Square(dims);
  square.create();

  audioCtx = new AudioContext();
  audioSrc = audioCtx.createBufferSource();
  gain = audioCtx.createGain();
  gain.gain.setValueAtTime(controls.Volume / 100, audioCtx.currentTime);

  let request = new XMLHttpRequest();
  request.open('GET', '../../Audio/' + controls.Song + '.mp3');
  request.responseType = 'arraybuffer';

  request.onload = function() {
    let data = request.response;
    audioCtx.decodeAudioData(data, function(buffer) {
      audioBuf = buffer;
      audioSrc.buffer = audioBuf;
      console.log("Loaded");
    },
    function(e) {console.log("Error decoding audio data"); });

  }

  request.send();
  //console.log(controls.Song);
  //audioSrc.buffer = audioBuf;
  
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;

  delay = audioCtx.createDelay(6); // Gives the analyzer time to create the map
  delay.delayTime.value = 6;

  // Set up node network
  audioSrc.connect(analyser);
  analyser.connect(delay);
  delay.connect(gain);
  gain.connect(audioCtx.destination);

  generator = new Analyser(analyser, dims);
  generator.generateBeat(0);
  currBeats = generator.getBeats()

  //audioSrc.playbackRate.value = 0.25;
}


function PlayPause() {
  if (!started) {
    audioSrc.start(0);
    started = true;
    playing = true;
  }
  else {
    if (playing) {
      audioCtx.suspend();
      playing = false;
    }
    else {
      audioCtx.resume();
      playing = true;
    }
  }
  console.log(playing);
}

function main() {

  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);


  // Add controls to the gui
  const gui = new DAT.GUI();
  
  gui.add(controls, 'Song', ['City Escape', 'Unknown from M.E.', 'E.G.G.M.A.N.', 'Im Blue', 'Mr Blue Sky']);
  gui.add(controls, 'Load Song');
  gui.add(controls, 'Play/Pause');
  gui.add(controls, 'Volume', 0, 100).step(1);
  gui.add(controls, 'Difficulty', 1, 10).step(1);
  gui.add(controls, 'BufferTime', 0.01, 0.5).step(0.01);
  gui.add(controls, 'Score').listen();

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 10, 20), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  const beatmap = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/beatmap-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/beatmap-frag.glsl')),
  ]);
 

  // This function will be called every frame
  function tick() {
    if (generator.guidims[0] == 0 && generator.guidims[0] == 0) { // Initialize guidims
      generator.guidims = vec2.fromValues(gui.domElement.offsetWidth, gui.domElement.offsetHeight);
    }
    if (lastVol != controls.Volume) {
      gain.gain.setValueAtTime(controls.Volume / 100, audioCtx.currentTime);
      lastVol = controls.Volume;
    }
    generator.beatFreq = 0.55 - (controls.Difficulty * 0.05);
    controls.Score = generator.score;

    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    
    let prog: ShaderProgram = beatmap;

    let currT = new Date().getTime();
    let deltaT = (currT - starttime) / 1000;
    starttime = currT;

    if (playing) {
      generator.generateBeat(deltaT);
      currBeats = generator.getBeats();
    }

    renderer.render(camera, prog, [
      square,
    ], currBeats);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  function clicked(ev: MouseEvent) {

    if (playing) {
      let x = ev.clientX;
      let y = ev.clientY;

      if (x < gui.domElement.offsetLeft && y > (gui.domElement.offsetTop + gui.domElement.offsetHeight)) {
        if (generator.beats[0][0] != -1) {
          generator.updateScore(vec2.fromValues(x, window.innerHeight - y));
        }
        else {
          // Never figured out how to score slides properly (they rarely show up anyway due to the way the algorithm interprets tones)
        }
      }
      
    }

  }
  window.addEventListener('mousedown', clicked);

  // Start the render loop
  tick();
}

main();
