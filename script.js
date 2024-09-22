
const model = poseDetection.SupportedModels.BlazePose;
const detectorConfig = {
  runtime: 'mediapipe',
  solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose'
  // or 'base/node_modules/@mediapipe/pose' in npm.
};
let detector;
let videoStream = null;
let videoPlaying = false;
let correcting = false;
let timeCorrecting = 0;

Promise.all([
  poseDetection.createDetector(model, detectorConfig),
  tf.setBackend('webgl'),
  tf.ready()
]).then(([createdDetector]) => {
  detector = createdDetector;
});

const estimationConfig = { enableSmoothing: true };

const toggleButton = document.getElementById('toggleButton');
const buttonText = document.getElementById('buttonText');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const photoContainer = document.getElementById('photoContainer');
const video = document.getElementById('video');
const cameraStatus = document.getElementById('cameraStatus');

const MSPF = 30;
let intervalId;

const audio1 = [new Audio('audio/11.mp3'), new Audio('audio/12.mp3'), new Audio('audio/13.mp3'), new Audio('audio/14.mp3')] ; // Tuck in your chin audio
const audio2 =[new Audio('audio/21.mp3'), new Audio('audio/22.mp3'), new Audio('audio/23.mp3'), new Audio('audio/24.mp3')]; // Roll back your shoulders audio
const audio3 = [new Audio('audio/31.mp3'), new Audio('audio/32.mp3'), new Audio('audio/33.mp3'), new Audio('audio/34.mp3')]; // Sit up straight audio
const audio4 = [new Audio('audio/31.mp3'), new Audio('audio/32.mp3'), new Audio('audio/33.mp3'), new Audio('audio/34.mp3')]; // keep your arms supported


function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => {
      video.srcObject = stream;
      videoStream = stream;
      //video.play();
      buttonText.textContent = '    Tracking is currently active.';
      toggleButton.textContent = 'Stop Posture Tracking';
      videoPlaying = true;
      canvas.style.display = 'block';
      cameraStatus.style.display = 'none';
      intervalId = setInterval(async () => {
        const poses = await detector.estimatePoses(video, estimationConfig);
        drawPose(poses);
        correct(poses);
      }, MSPF);
    })
    .catch(err => console.error("Error accessing media devices.", err));
}

function stopVideo() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
  }
  if (intervalId) {
    clearInterval(intervalId);
  }
  //video.srcObject = null;
  videoPlaying = false;
  //video.style.display = 'none';
  buttonText.textContent = '    Tracking is currently inactive.';
  toggleButton.textContent = 'Begin Posture Tracking';
  canvas.style.display = 'none';
  cameraStatus.style.display = 'flex';
  cameraStatus.textContent = "Camera off";
}

function toggleVideoDisplay() {
  if (videoPlaying) {
    stopVideo();
  } else {
    startVideo();
  }
}

function drawPose(poses) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  if (poses[0]) {
    const pose = poses[0];
    pose.keypoints.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x+25, point.y+40, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "blue";
      ctx.fill();
      ctx.stroke();
    });
  }
}
function ang(a, b,c){
    var ab = [ b.x - a.x, b.y - a.y, b.z - a.z ];
    var bc = [c.x - b.x, c.y - b.y, c.z - b.z  ];

    var abVec = Math.sqrt(ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2]);
    var bcVec = Math.sqrt(bc[0] * bc[0] + bc[1] * bc[1] + bc[2] * bc[2]);

    var abNorm = [ab[0] / abVec, ab[1] / abVec, ab[2] / abVec];
    var bcNorm = [bc[0] / bcVec, bc[1] / bcVec, bc[2] / bcVec];

    res = abNorm[0] * bcNorm[0] + abNorm[1] * bcNorm[1] + abNorm[2] * bcNorm[2];

    return Math.acos(res)*180.0/ 3.141592653589793;
}

function correct(poses){ 
  if (correcting && Date.now() - timeCorrecting < 5000) return;
  var fix = evaluatePosture(poses);
  if(fix ==0) {
    correcting = false;
    return;
  }
  correcting = true; 
  timeCorrecting = Date.now();
  if(fix == 1) {
    audio1[Math.floor(Math.random() * audio1.length)].play();
  } else if(fix ==2) {
    audio2[Math.floor(Math.random() * audio2.length)].play();
  }else if (fix == 3){
    audio4[Math.floor(Math.random() * audio4.length)].play();
  }
}

function evaluatePosture(poses){ 
  const pose = poses[0];
  var s1 = pose.keypoints3D[11] ;
  var s2 = pose.keypoints3D[12];
  var n = pose.keypoints3D[0];
  var h1 = pose.keypoints3D[23];
  var h2 = pose.keypoints3D[24];
  var e1 = pose.keypoints3D[13];
  var e2 = pose.keypoints3D[14];
  var w1 = pose.keypoints3D[15];
  var w2 = pose.keypoints3D[16];

  var back = {'x': (h1.x + h2.x)/2, 'y':  (h1.y + h2.y)/2, 'z': (h1.z + h2.z)/2 };
  var neck =  {'x': (s1.x + s2.x)/2, 'y':  (s1.y + s2.y)/2, 'z': (s1.z + s2.z)/2 };
  var arch = ang(back, neck, n); 
  var shoulder = ang(s1, n, s2); 
  var down = ang(pose.keypoints3D[7], n, s1);
  console.log(arch);
  if(arch > 45) return 1; 
  if(shoulder  <105) return 2;
  if((e1.y > w1.y || e2.y > w2.y ) && (w1.y < s1.y-0.1  || w2.y < s2.y - 0.1)) return 3; 
  return 0;
  // 5 things. Back to back, arms supported, neck back, shoulders back, shoulders down
}