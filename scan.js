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


// app.get('/scan', function (req, res) {

//     var scene = new THREE.Scene();
//     var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
//     var renderer = new THREE.WebGLRenderer({ antialias: true });

//     renderer.setSize(window.innerWidth, window.innerHeight);
//     document.body.appendChild(renderer.domElement);

//     const loader = new THREE.FileLoader();
//     loader.load('../static/scene.json', function (data) {

//         const json = JSON.parse(data);

//         const geometryLoader = new THREE.BufferGeometryLoader();
//         const textureLoader = new THREE.TextureLoader();

//         const materials = json.materials.map((material) => {
//             return new THREE.MeshStandardMaterial({ map: textureLoader.load(material) });
//         });

//         const meshes = json.geometries.map((geometry) => {
//             return new THREE.Mesh(geometry, materials);
//         });

//         meshes.forEach((mesh) => {
//             scene.add(mesh);
//         })

//         loadModel();

//     });
// });

app.get('/scan', async (req, res) => {
    try {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();

        const path = './3d/male-body-scan.glb';
        const file = fs.readFileSync(path);
        const buffer = Buffer.from(file);

        const model = await loader.parse(buffer, '', (xhr) => {
            console.log((xhr.loaded / xhr.total * 100).toFixed(0) + '% loaded');
        });

        const scene = new THREE.Scene();
        scene.add(model.scene);

        const geometryLoader = new THREE.BufferGeometryLoader();
        const textureLoader = new THREE.TextureLoader();

        fs.readFile('./static/scene.json', (err, data) => {
            if (err) {
                res.status(500).send(err);
                return;
            }
            const json = JSON.parse(data);

            const materials = scene.materials.map((material) => {
                return new THREE.MeshStandardMaterial({ map: textureLoader.load(material) });
            });

            const meshes = json.geometries.map((geometry) => {
                return new THREE.Mesh(geometry, materials);
            });

            meshes.forEach((mesh) => {
                scene.add(mesh);
            })

            res.type('json');
            res.send(JSON.stringify(( scene )));
        });
    } catch (err) {
        res.status(500).send(err);
    }
});




app.get('/', (req, res) => {
    var doc = fs.readFileSync('./html/ai-training-male-body-scan-result.html', 'utf-8');
    res.send(doc);
});

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});