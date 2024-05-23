
const express = require('express');
const fs = require('fs');
const app = express();
const { URL } = require('url');
const http = require('http');

var THREE = require('three');
var OBJLoader = require('three-obj-loader');
const { FileLoader } = require('three');
const exp = require('constants');

app.use(express.static('.'));

// const axios = require('axios');
// require('dotenv').config();

// // Retrieve Kaggle API credentials from environment variables
// const kaggleUsername = process.env.KAGGLE_USER_NAME;
// const kaggleKey = process.env.KAGGLE_API_KEY;

// // Set up axios instance with Kaggle API key
// const kaggleApi = axios.create({
//   baseURL: 'https://www.kaggle.com/api/v1',
//   headers: {
//     'X-Kaggle-Username': kaggleUsername,
//     'X-Kaggle-Key': kaggleKey,
//   },
// });

// // Download the TensorFlow Lite model
// const modelId = 'google/movenet/tfJs/multipose-lightning';
// const downloadUrl = `https://www.kaggle.com/api/v1/models/google/movenet/tfJs/multipose-lightning/1/downloa`;
// const outputPath = './movenet_model';

// axios({
//   method: 'GET',
//   url: downloadUrl,
//   responseType: 'stream',
// })
//   .then(response => {
//     response.data.pipe(fs.createWriteStream(outputPath));
//     console.log('Model downloaded successfully.');
//   })
//   .catch(error => {
//     console.error('Error downloading model:', error);
//   });

// const { poseDetection } = require('@tensorflow-models/pose-detection');
// const tf = require('@tensorflow/tfjs-core');
// // Register one of the TF.js backends.
// require('@tensorflow/tfjs-backend-webgl');

// // import '@tensorflow/tfjs-backend-wasm';
// const tar = require('tar');
// // const fs = require('fs');

// const detectorConfig = {
//     modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
//     enableTracking: true,
//     trackerType: poseDetection.TrackerType.BoundingBox
// };
// const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);

// const poses = await detector.estimatePoses(image);

// // Path to the downloaded tar.gz file
// const tarFilePath = 'C:\\Users\\linho\\movenet.tar.gz';
// // Output directory where the files will be extracted
// const outputDir = './img/movenet_model';

// // Create output directory if it doesn't exist
// if (!fs.existsSync(outputDir)) {
//     fs.mkdirSync(outputDir);
// }

// // Extract the tar.gz file
// tar.x({ file: tarFilePath, cwd: outputDir })
//     .then(() => {
//         console.log('Model files extracted successfully.');
//     })
//     .catch(error => {
//         console.error('Error extracting model files:', error);
//     });


// const poseDetection = require('@tensorflow-models/pose-detection');
// const tf = require('@tensorflow/tfjs-node');
// // Register one of the TF.js backends.
// require('@tensorflow/tfjs-backend-webgl');
// const { loadGraphModel } = require('@tensorflow/tfjs-converter');

// // console.log(tf);
// const model = tf.loadGraphModel("/kaggle/input/movenet/tfjs/multipose-lightning/1", { fromTFHub: true });

// require( '@tensorflow/tfjs-backend-wasm');
// const tar = require('tar');

// // Define an async function to use await
// async function main() {
//     // console.log("pose Detection",poseDetection);

//     const model = poseDetection.SupportedModels.BlazePose;
//     const detectorConfig = {modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING};
//     const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
//     detector = await poseDetection.createDetector(model, detectorConfig);

//     const estimationConfig = { flipHorizontal: true };
//     const timestamp = performance.now();
//     const poses = await detector.estimatePoses(image, estimationConfig, timestamp);

//     // Path to the downloaded tar.gz file
//     const tarFilePath = 'C:\\Users\\linho\\movenet.tar.gz';
//     // Output directory where the files will be extracted
//     const outputDir = './img/movenet_model';

//     // Create output directory if it doesn't exist
//     if (!fs.existsSync(outputDir)) {
//         fs.mkdirSync(outputDir);
//     }

//     // Extract the tar.gz file
//     tar.x({ file: tarFilePath, cwd: outputDir })
//         .then(() => {
//             console.log('Model files extracted successfully.');
//         })
//         .catch(error => {
//             console.error('Error extracting model files:', error);
//         });

//     // Example code to serve HTML content
//     app.get('/', (req, res) => {
//         var doc = fs.readFileSync('./html/test-tsf-model.html', 'utf-8');
//         res.send(doc);
//     });

//     app.listen(3000, () => {
//         console.log('Server listening on port 3000');
//     });
// }

// // Call the async function
// main().catch(err => console.error(err));


// Use `tfjs`.
// const tf = require('@tensorflow/tfjs');

// // Define a simple model.
// const model = tf.sequential();
// model.add(tf.layers.dense({units: 100, activation: 'relu', inputShape: [10]}));
// model.add(tf.layers.dense({units: 1, activation: 'linear'}));
// model.compile({optimizer: 'sgd', loss: 'meanSquaredError'});

// const xs = tf.randomNormal([100, 10]);
// const ys = tf.randomNormal([100, 1]);

// // Train the model.
// model.fit(xs, ys, {
//   epochs: 100,
//   callbacks: {
//     onEpochEnd: (epoch, log) => console.log(`Epoch ${epoch}: loss = ${log.loss}`)
//   }
// });

app.get('/', (req, res) => {
    var doc = fs.readFileSync('./html/test-tsf-model copy.html', 'utf-8');
    res.send(doc);
});


app.listen(3000, () => {
    console.log('Server listening on port 3000');
});