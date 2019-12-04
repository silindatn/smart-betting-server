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
    betMask = 'id,posibleOutcome,eventId,marketId,result,winings,createdAt,updatedAt',
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
                    updateObject = mask(updateObject, 'name,eventId,marketId,posibleOutcome');
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
            console.log('**************************************************');
            console.log('**************************************************');
            console.log('**************************************************');
            console.log('**************************************************');
            console.log('**************************************************');
            console.log('**************************************************');
            async.series([
                function (callback) {
                    Market.find({})
                        .exec(function (err, markets) {
                            console.log('Err : ', err);
                            console.log('Markets : ', markets);
                            callback(err);
                            // async.waterfall([
                            //     function getMarkets(_next_) {
                            //         Market.find({}, function (error, markets) {
                            //             console.log('Err : ', error);
                            //             console.log('Markets : ', markets);
                            //             _next_('error - error', null);
                            //         });
                            //     }
                            // ], 
                            // function done (err, results) {
                            //     console.log('**************************************************');
                            //     console.log('**************************************************');
                            //     console.log(err);
                            //     console.log('**************************************************');
                            //     console.log('**************************************************');
                            //     if (err) {
                            //         callback(err);
                            //     } else {
                            //         // Logging
                            //         Log.create({
                            //             userId: null,
                            //             action: 'Charts info',
                            //             target: {
                            //                 collection: collection
                            //             }
                            //         });

                            //         res.fiddus.info = 'charts info';
                            //         res.fiddus.data = results;

                            //         return next();
                            //     }
                            // });
                        });
                }],
                function (err) {
                    return handleError(err, res, next);
                });
        }
    };

module.exports = betController;
