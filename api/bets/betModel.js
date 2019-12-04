/**
 * Bet Model
 */

'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    moment = require('moment'),

    BetSchema = new Schema({
        name: {type: String, required: false},
        eventId: {type: Schema.Types.ObjectId, ref: 'Event'},
        marketId: {type: Schema.Types.ObjectId, ref: 'Market'},
        posibleOutcome: {
            name: {type: String},
            probability: {type: Number}
        },
        result: {type: String, default: 'pending'},
        winings: {type: Number, default: 0},
        createdAt: {type: Date},
        updatedAt: {type: Date},
    });

// Virtuals:

BetSchema
    .virtual('id')
    .get(function () {
        return this._id.toHexString();
    });

BetSchema.set('toObject', {
    virtuals: true
});

BetSchema
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

BetSchema.methods = {
};

module.exports = mongoose.model('Bet', BetSchema);
