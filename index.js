/**
 * Created by Neli Lepoeva
 * email: neli.lepoeva@gmail.com
 */
'use strict';

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var net = require('net');
var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');

var RunEntry = require('./models/RunEntry.js');
var LogEntry = require('./models/LogEntry.js');
var Solution = require('./models/Solution.js');

var logEntryNamespace = io.of('/logEntry');
var solutionNamespace = io.of('/solution');

var runEntry;

var config = JSON.parse(fs.readFileSync('config.json', 'ascii'));
var EXEC_FILE = config.tt_exec_file;
var PARALLEL_UTILITY = config.parallel_utility;
var INPUT_DIR = config.input_files_location;

app.use(express.static(__dirname));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get('/api/runs', function(req, res) {
    if (req.query.totalBest != undefined) {
        RunEntry.find({totalBest: req.query.totalBest}, function(err, obj) {//{$gte: req.params.totalBest}
            res.json(obj);
        });
    } else if (req.query.procsNum != undefined && req.query.procsNum != undefined) {
        RunEntry.find({procsNum: req.query.procsNum, threadsNum: req.query.threadsNum}, function(err, obj) {//{$gte: req.params.totalBest}
            res.json(obj);
        });
    } else if (req.query.procsNum != undefined) {
        RunEntry.find({procsNum: req.query.procsNum, threadsNum: 1}, function(err, obj) {//{$gte: req.params.totalBest}
            res.json(obj);
        });
    } else {
        RunEntry.find({}, function(err, obj) {
            res.json(obj);
        });
    }
});

app.get('/api/runs/max', function(req, res) {
    RunEntry.aggregate(
        { $group: { _id: null, minBest: { $min: '$totalBest' },
                    maxBest: { $max: '$totalBest' },
                    minTime: { $min: '$totalTime' },
                    maxTime: { $max: '$totalTime' }}},
        function (err, objs) {
            res.json(objs);
        });
});

app.get('/api/solutions/:id', function(req, res) {
    Solution.findOne({_id: req.params.id}, function(err, obj) {
        res.json(obj);
    });
});

app.get('/api/files', function(req, res) {
    var dir = path.join(__dirname + '/input');
    var files = [];
    fs.readdir(dir, function(err, files) {
        console.log(files);
        files = files;
        res.json(files);
    });
});

app.get('/api/file', function(req, res) {
    var fileName = req.query.fileName;
    if (fileName === undefined) {
        throw "The 'fileName' parameter is missing.";
    }
    var dir = path.join(__dirname + '/input');
    var file = path.join(dir + '/' + fileName);

    fs.readFile(file, 'utf8', function (err,data) {
        if (err) {
            throw err;
        } else {
            var fileString = data;
            var fileStringArray = fileString.split(/\s/g);
            var jsonResponse = parseInputFile(fileStringArray);
            res.json(jsonResponse);
        }
    });
});

app.post('/api/file', function(req, res) {
    var modifiedMatrix = req.body;
    console.log(req);
    console.log(modifiedMatrix);
    var dir = path.join(__dirname + '/input');
    var file = path.join(dir + '/easy01.tim');
    var originalMatrix = [];

    fs.readFile(file, 'utf8', function (err,data) {
        if (err) {
            throw err;
        } else {
            var fileString = data;
            var fileStringArray = fileString.split(/\s/g);
            originalMatrix = parseInputFile(fileStringArray);
        }

        for(var i = 0; i < modifiedMatrix.length; i++) {
            var currentModifiedEvs = modifiedMatrix[i];
            var currentOriginalEvs = originalMatrix[i];

            for(var ev in currentOriginalEvs) {
                if (currentModifiedEvs.hasOwnProperty(ev)) {
                    if (currentModifiedEvs[ev] !== currentOriginalEvs[ev]) {
                        console.log('Diff: student_' + (i+1) + '; event_' + ev + ': ' + currentModifiedEvs[ev] + '<>' + currentOriginalEvs[ev]);
                    }
                }
            }
        }
    });
});

server.listen(3210);
mongoose.connect('mongodb://localhost/timetabling');
console.log("Running at port 3210!");

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'Mongo DB Connection Error!'));
db.once('open', function() {

});

// TODO: replace the values in the next lines from the config file and from the input
var cmd = "./build/timetabling.ga.uk.2";
var args = ['-i', './input/easy01.tim', '-p', '1', '-p1', '1', '-p2', '1', '-p3', '1', '-c', '2'];

var populateRunEntry = function(parsedData, runEntry) {
    if (parsedData.logEntry != null) {
        var logEntry = new LogEntry({best: parsedData.logEntry.best,
                                     time: parsedData.logEntry.time,
                                     procID: parsedData.logEntry.procID,
                                     threadID: parsedData.logEntry.threadID,
                                     runEntry: runEntry._id});
        logEntry.save(function(err, logEntry) {
            if (err) console.log(err);
        });
        runEntry.logEntries.push(logEntry);
        logEntryNamespace.emit('logEntry', parsedData.logEntry);
    } else if (parsedData.solution != null) {
        var solution = new Solution({procID: parsedData.solution.procID,
                                     threadID: parsedData.solution.threadID,
                                     totalBest: parsedData.solution.totalBest,
                                     totalTime: parsedData.solution.totalTime,
                                     timeslots: parsedData.solution.timeslots,
                                     rooms: parsedData.solution.rooms,
                                     runEntry: runEntry._id});
        solution.save(function(err, solution) {
            if (err) console.log(err);
        });
        runEntry.solutions.push(solution);
        solutionNamespace.emit('solution', parsedData.solution);
    } else if (parsedData.runEntry != null) {
        if (parsedData.runEntry.totalBest != undefined) runEntry.totalBest = parsedData.runEntry.totalBest;
        if (parsedData.runEntry.feasible != undefined) runEntry.feasible = parsedData.runEntry.feasible;
        if (parsedData.runEntry.totalTime != undefined) runEntry.totalTime = parsedData.runEntry.totalTime;
        if (parsedData.runEntry.procsNum != undefined) runEntry.procsNum = parsedData.runEntry.procsNum;
        if (parsedData.runEntry.threadsNum != undefined) runEntry.threadsNum = parsedData.runEntry.threadsNum;
        io.emit('runentry');
    }
};


var executeChildProcess = function() {
    var exec = require('child_process').spawn;
    var gaProc = exec(cmd, args);// exec(command, function(error, stdout, stderr) {

    runEntry = new RunEntry({inputFile: 'easy01.tim', problemType: 1, algType: 'GA'});
    runEntry.save();

    gaProc.stdout.on('data', function(data) {
        // Do nothing here
    });

    gaProc.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    gaProc.on('close', function (code) {
        console.log("Closing the child process");
        runEntry.save(function(err) {
            if(err)
                console.log(err);
            else
                console.log(runEntry.totalBest);
        });
        if (code !== 0) {
            console.log('grep process exited with code ' + code);
        }
        io.emit('disconnect');
    });
};

var readFile = function(file, res) {
    var fs = require('fs');
    var readline = require('readline');
    var istream = fs.createReadStream(file, {encoding: 'utf8'});
    var fileString;

    istream.on("data", function(data) {
        fileString = data;
        var fileStringArray = fileString.split(/\s/g);
        parseInputFile(fileStringArray, res);
    });

    istream.once("end", function() {
        console.log("Hit end of file");
    });
};

var parseInputFile = function(fileStringArray) {
    var input = new Object();
    var n_of_events = 'n_of_events';
    var n_of_rooms = 'n_of_rooms';
    var n_of_features = 'n_of_features';
    var n_of_students = 'n_of_students';

    var roomSizes = 'roomSizes';
    var student_events = 'student_events';
    var room_features = 'room_features';
    var feature_events = 'feature_events';

    input[roomSizes] = []; // vector of room sizes one for each room
    input[student_events] = []; // student attendance matrix
    input[room_features] = []; // matrix keeping information on features satisfied by rooms
    input[feature_events] = []; // matrix keeping information on features required by events

    var i = 0;

    input[n_of_events] = fileStringArray[i++];
    input[n_of_rooms] = fileStringArray[i++];
    input[n_of_features] = fileStringArray[i++];
    input[n_of_students] = fileStringArray[i++];

    var size;
    var roomName;
    // read room sizes
    for(var k = 0; k < input[n_of_rooms]; k++) {
        var currentRoom = new Object();
        roomName = 'room_' + (k+1);
        size = fileStringArray[i++];
        currentRoom[roomName] = size;
        input[roomSizes].push(currentRoom);
    }

    // read student attendance and keep it in a matrix
    for (k = 0; k < input[n_of_students]; k++) {
        var currentEv = new Object();
        var studentProp = 'student';
        currentEv[studentProp] = 'student_' + (k+1);
        for (var j = 0; j < input[n_of_events]; j++) {
            var eventName = 'ev_' + (j+1);
            currentEv[eventName] = fileStringArray[i++];
        }
        input[student_events].push(currentEv);
    }

    // read features satisfied by each room and store them in a matrix
    for (k = 0; k < input[n_of_rooms]; k++) {
        var currentRoomFeats = new Object();
        var roomProp = 'room';
        currentRoomFeats[roomProp] = 'room_' + (k+1);

        for (j = 0; j < input[n_of_features]; j++) {
            var featName = 'feature_' + (j+1);
            currentRoomFeats[featName] = fileStringArray[i++];
        }
        input[room_features].push(currentRoomFeats);
    }


    var featuresArr = [];
    var featProp = 'feature';
    var currentFeatEvs = new Object();

    // read features required by events and store them in a matrix
    for (j = 0; j < input[n_of_features]; j++) {
        currentFeatEvs = new Object();
        currentFeatEvs[featProp] = 'feature_' + (j+1);
        featuresArr.push(currentFeatEvs);
    }

    for (k = 0; k < input[n_of_events]; k++) {
        eventName = 'ev_' + (k+1);
        for (j = 0; j < input[n_of_features]; j++) {
            featuresArr[j][eventName] = fileStringArray[i++];
        }
    }

    for (j = 0; j < input[n_of_features]; j++) {
        input[feature_events].push(featuresArr[j]);
    }

    return input;
};

io.on ('connection', function(socket) {
    console.log("Connected!!!");
    socket.on('execute', function(data) {
        console.log("Executing command!");
        executeChildProcess();
    });
});

var tcp_server = net.createServer(function (tcp_socket) {
}).listen(9998,'localhost');


tcp_server.on('connection', function(tcp_socket) {
    console.log('TCP connection established!');

    tcp_socket.on('data', function(data) {
        var dataString = String.fromCharCode.apply(null, data);
        console.log('DATA: ' + dataString);
        var parsedData;
        try {
            parsedData = JSON.parse(dataString);
        } catch(error) {
            console.log("FIRST parse ERROR: " + error);
            console.log(dataString);
            var splittedMultiJsonDataArr;
            try {
                splittedMultiJsonDataArr = dataString.split(/({[^}]*}})/g);
            } catch(error2) {
                console.log("SPLITTED ERROR: " + error2);
                // Do nothing here
            }

            for(var i = 1; i < splittedMultiJsonDataArr.length; i=i+2) {
                var parsedSplit = JSON.parse(splittedMultiJsonDataArr[i]);
                populateRunEntry(parsedSplit, runEntry);
            }
        }
        if (parsedData != undefined) {
            populateRunEntry(parsedData, runEntry);
        }
    });

    tcp_socket.on('error', function(err) {
        console.log(err);
    });

    tcp_socket.on('close', function() {
        console.log('TCP socket closed!');
    });
});
