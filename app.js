const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const gridFsStorage = require('multer-gridfs-storage');
const grid = require('gridfs-stream');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs')

//mongo uri
const mongoURI = 'mongodb://localhost/video_upload';

//mongo connection
const conn = mongoose.createConnection(mongoURI);

//Init GFS
let gfs;
conn.once('open', () => {
    //Init stream
    gfs = grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
})

//create storage engine
const storage = new gridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({ storage });


//loading form
app.get('/', (req, res) => {
    res.render('index');
})

//upload
app.post('/upload', upload.single('file'), (req, res) => {
    console.log('upload hit');

    res.json({
        file: req.file
    })
})

//display all files
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        if (err) {
            console.log(err);

        }
        else {
            if (files.length == 0) {
                return (res.status(404).json({
                    Error: 'No files'
                }))
            }
            else {
                return (res.json(files));
            }
        }
    })
})

//get particular file
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (err) {
            console.log(err);

        }
        else {
            console.log('file', file);

            if (!file || file.length == 0) {
                return (res.status(404).json({
                    Error: 'No file of that name'
                }))
            }
            else {
                return (res.json(file));
            }
        }
    })
})

//read file
app.get('/video/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (err) {
            console.log(err);

        }
        else {
            console.log('file', file);

            if (!file || file.length == 0) {
                return (res.status(404).json({
                    Error: 'No file of that name'
                }))
            }
            else {
                const readStream = gfs.createReadStream(file.filename);
                readStream.pipe(res);
            }
        }
    })
})

//play a file
app.get('/play', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        if (err) {
            console.log(err);

        }
        else {
            console.log(files);

            if (files.length == 0) {
                return (res.status(404).json({
                    Error: 'No files'
                }))
            }
            else {
                const readStream = gfs.createReadStream(files[0].filename);
                readStream.pipe(res);
            }
        }
    })

})

//delete files
app.delete('/files/:id', (req, res) => {
    gfs.remove({
        _id: req.params.id,
        root: 'uploads'
    }, (err, gridStore) => {
        if (err) {
            console.log(err);
            return (res.status(404).json({
                err: err
            }))
        }
    })
})

app.listen(3000, () => {
    console.log('listening to 3000....');

})
