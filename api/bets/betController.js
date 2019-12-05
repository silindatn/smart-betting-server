/**
 * Bet Controller
 */

'use strict';

var Bet = require('./betModel'),
    Market = require('./../markets/marketModel'),
    Log = require('../logs/logModel'),
    config = require('../../config/environment'),
    _ = require('lodash'),
    async = require('async'),
    mask = require('json-mask'),
    betMask = 'id,posibleOutcome,amount,eventId,marketId,result,winings,createdAt,updatedAt',
    auth = require('../../auth/authService'),
    paginationBuilder = require('../../lib/util/paginationBuilder'),
    paginationInfoBuilder = require('../../lib/util/buildPaginationInfo'),
    collection = 'bets',

    handleError = function (err, res, next, status) {
        res.responseStatus = status || 500;
        res.fiddus.info = 'Some error occured';
        res.fiddus.data = err;
        return next();
    },

    betController = {

        create: function (req, res, next) {

            var bet = req.body;

            if (!bet.eventId || !bet.marketId) {
                res.responseStatus = 400;
                res.fiddus.info = 'No market or event link was provided. Please repeat request providing a name for the new bet';

                return next();
            }

            bet = new Bet(bet);

            bet.save(function (err, bet) {
                if (err) {
                    res.fiddus.info = err.code === 11000 ? 'This email already exists.' : 'Database error';
                    res.fiddus.data = err;
                    res.responseStatus = err.code === 11000 ? 400 : 500;
                    return next();
                }

                res.responseStatus = 201;
                res.fiddus.info = 'New bet created';
                res.fiddus.data = mask(bet, betMask);

                // Logging
                Log.create({
                    userId: null,
                    action: 'Created',
                    target: {
                        collection: collection,
                        id: bet._id
                    }
                });

                next();
            });
        },

        read: function (req, res, next) {
            var betId = req.params.id,
                fields = req.query.fields;

            Bet.findOne({_id: betId}, function (err, bet) {
                if (err) {
                    return handleError(err, res, next);
                }

                var betSent = mask(bet, betMask);

                // Logging
                Log.create({
                    userId: null,
                    action: 'Read',
                    target: {
                        collection: collection,
                        id: bet._id
                    }
                });

                res.fiddus.info = 'Got bet ' + betId;
                res.fiddus.data = fields ? mask(betSent, fields) : betSent;
                next();
            });
        },

        update: function (req, res, next) {
            var betToBeUpdatedId = req.params.id,
                updateObject = req.body;


            async.waterfall([
                function (cb) {
                    updateObject = mask(updateObject, 'name,amount,eventId,marketId,posibleOutcome');
                    cb(null);
                },
                function (cb) {
                    Bet.findOne({_id: betToBeUpdatedId}, function (err, bet) {
                        if (err) {
                            cb(err);
                        }

                        cb(null, bet);
                    });
                },
                function (bet, cb) {
                    _.forOwn(updateObject, function (value, key) {
                        bet[key] = updateObject[key];
                    });

                    bet.save(function (err) {
                        if (err) {
                            cb(err);
                        }

                        // Logging
                        Log.create({
                            userId: null,
                            action: 'Update',
                            target: {
                                collection: collection,
                                id: bet._id
                            }
                        });

                        res.fiddus.info = 'Updated bet ' + bet._id;
                        res.fiddus.data = mask(bet, betMask);
                        return next();
                    });
                }
            ], function (err) {
                return handleError(err, res, next);
            });
        },

        delete: function (req, res, next) {
            var betToBeDeletedId = req.params.id;

            Bet.remove({_id: betToBeDeletedId}, function (err) {
                if (err) {
                    return handleError(err, res, next);
                }

                // Logging
                Log.create({
                    userId: null,
                    action: 'Delete',
                    target: {
                        collection: collection,
                        id: betToBeDeletedId
                    }
                });

                res.status(204).send();
            });
        },

        list: function (req, res, next) {
            var fields = req.query.fields,
                paginationInfo;

            async.series([
                function (callback) {
                    Bet.find({})
                        .exec(function (err, bets) {

                            // Apply mask to all bets found, asynchronously
                            async.mapSeries(bets, function (bet, cb) {
                                var betSent = mask(bet, betMask);
                                betSent = fields ? mask(betSent, fields) : betSent;
                                cb(null, betSent);
                            }, function (err, results) {
                                if (err) {
                                    callback(err);
                                }

                                // Logging
                                Log.create({
                                    userId: null,
                                    action: 'List',
                                    target: {
                                        collection: collection
                                    }
                                });

                                res.fiddus.info = 'bets list';
                                res.fiddus.data = results;
                                // res.fiddus.pagination = paginationBuilder(req,
                                //     paginationInfo.limit, paginationInfo.numPages);
                                return next();
                            });
                        });
                }],
                function (err) {
                    return handleError(err, res, next);
                });
        },

        chart_report: function (req, res, next) {
            async.series([
                function (callback) {
                    Market.find({})
                        .exec(function (err, markets) {
                            async.waterfall([
                                function getMarkets(_next_) {
                                    let ids = [];
                                    async.forEachOf(markets, (market, index, cb) => {
                                        if (market.actualOutcome) {
                                            ids.push(market._id);
                                            cb();
                                        }
                                    }, function done() {
                                        _next_(null, ids, markets);
                                    })
                                },
                                function getBets(m_ids, markets, _next_) {
                                    Bet.find({marketId: {$in: m_ids}}, (error, bets) => {
                                        if (error) {
                                            _next_(error, null);
                                        } else {
                                            _next_(null, bets, markets);
                                        }
                                    });
                                },
                                function calculateWinnings(bets, markets, _next_) {
                                    let winingbets = 0;
                                    let losingbets = 0;
                                    let winings = 0;
                                    let loses = 0;
                                    async.forEachOf(bets, (bet, i, cb) => {
                                        const market = markets.find( m => {
                                            return m._id = bet.marketId;
                                        });

                                        if (market.actualOutcome && market.actualOutcome.name === bet.posibleOutcome.name) {
                                            winingbets += 1;
                                            if (bet.winingMargins === 0) {
                                                bet.winingMargins = 1 / bet.posibleOutcome.probability;
                                            }

                                            let win = bet.amount * bet.winingMargins;
                                            winings += win - bet.amount;
                                            bet.winings = win - bet.amount;
                                            bet.save();
                                            cb()
                                        } else {
                                            loses += bet.amount;
                                            losingbets += 1;
                                            cb();
                                        }
                                    }, function done () {
                                        _next_(null, bets, winings, winingbets, loses, losingbets);
                                    });

                                },
                                function chartData(bets, winings, winingbets, loses, losingbets, _next_) {
                                    let charts = [
                                        {
                                            title: 'Winning Bets vs Losing Bets',
                                            labels: [
                                                'Pay In Bets',
                                                'Pay Out Bets'
                                            ],
                                            data: [
                                                losingbets,
                                                winingbets,
                                            ]
                                        },
                                        {
                                            title: 'Pay out Amount vs Pay in Amount',
                                            labels: [
                                                'Pay In Amount',
                                                'Pay Out Amount'
                                            ],
                                            data: [
                                                loses,
                                                winings
                                            ]
                                        }
                                    ]
                                    _next_(null, {charts, data: bets});
                                }
                            ], 
                            function done (err, results) {
                                if (err) {
                                    callback(err);
                                } else {
                                    // Logging
                                    Log.create({
                                        userId: null,
                                        action: 'Charts info',
                                        target: {
                                            collection: collection
                                        }
                                    });

                                    res.fiddus.info = 'charts info';
                                    res.fiddus.data = results;

                                    return next();
                                }
                            });
                        });
                }],
                function (err) {
                    return handleError(err, res, next);
                });
        }
    };

module.exports = betController;
