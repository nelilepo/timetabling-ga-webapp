/**
 * Created by Neli Lepoeva
 * email: neli.lepoeva@gmail.com
 */
'use strict';

var mongoose = require('mongoose');

var logEntrySchema = new mongoose.Schema({
    best: Number,
    time: Number,
    procID: {type: Number, default: 0},
    threadID: {type: Number, default: 0},
    runEntry: {type: mongoose.Schema.Types.ObjectId, ref: 'RunEntry'}
});

module.exports = mongoose.model('LogEntry', logEntrySchema);
