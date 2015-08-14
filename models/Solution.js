/**
 * Created by Neli Lepoeva
 * email: neli.lepoeva@gmail.com
 */
'use strict';

var mongoose = require('mongoose');

var solutionSchema = new mongoose.Schema({
    procID: Number,
    threadID: Number,
    feasible: Boolean,
    totalBest: Number,
    totalTime: Number,
    timeslots: Array,
    rooms: Array,
    runEntry: {type: mongoose.Schema.Types.ObjectId, ref: 'RunEntry'}
});

module.exports = mongoose.model('Solution', solutionSchema);
