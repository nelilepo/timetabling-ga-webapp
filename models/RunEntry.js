/**
 * Created by Neli Lepoeva
 * email: neli.lepoeva@gmail.com
 */
'use strict';

var mongoose = require('mongoose');
var LogEntry = require('./LogEntry.js');
var Solution = require('./Solution.js');

var Schema = mongoose.Schema;

var runEntrySchema = new Schema({
    inputFile: String,
    problemType: Number,
    LS_prob_type1: Number,
    LS_prob_type2: Number,
    LS_prob_type3: Number,
    procsNum: Number,
    threadsNum: Number,
    algType: String,
    logEntries: [{type: Schema.Types.ObjectId, ref: 'LogEntry'}],
    totalTime: Number,
    totalBest: Number,
    feasible: Boolean,
    solutions: [{type: Schema.Types.ObjectId, ref: 'Solution'}]
});

module.exports = mongoose.model('RunEntry', runEntrySchema);
