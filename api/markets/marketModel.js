/**
 * Event Model
 */

'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    moment = require('moment'),

    EventSchema = new Schema({
        name: {type: String, required: true},
        eventId: {type: Schema.Types.ObjectId, ref: 'Event'},
        posibleOutcome: [{type: String}],
        createdAt: {type: Date},
        updatedAt: {type: Date},
    });

// Virtuals:

EventSchema
    .virtual('id')
    .get(function () {
        return this._id.toHexString();
    });

EventSchema.set('toObject', {
    virtuals: true
});

EventSchema
    .pre('save', function (next) {

        if (!this.isNew) {
            this.updatedAt = moment();

            return next();
        } else {
            this.createdAt = moment();
            this.updatedAt = this.createdAt;
            next();
        }

    });

EventSchema.methods = {
};

module.exports = mongoose.model('Event', EventSchema);
