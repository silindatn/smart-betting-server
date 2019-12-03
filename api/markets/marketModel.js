/**
 * Market Model
 */

'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    moment = require('moment'),

    MarketSchema = new Schema({
        name: {type: String, required: true},
        eventId: {type: Schema.Types.ObjectId, ref: 'Event'},
        posibleOutcome: [{type: String}],
        createdAt: {type: Date},
        updatedAt: {type: Date},
    });

// Virtuals:

MarketSchema
    .virtual('id')
    .get(function () {
        return this._id.toHexString();
    });

MarketSchema.set('toObject', {
    virtuals: true
});

MarketSchema
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

MarketSchema.methods = {
};

module.exports = mongoose.model('Market', MarketSchema);
