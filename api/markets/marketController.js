/**
 * Market Controller
 */

'use strict';

var Market = require('./marketModel'),
    Log = require('../logs/logModel'),
    config = require('../../config/environment'),
    _ = require('lodash'),
    async = require('async'),
    mask = require('json-mask'),
    marketMask = 'id,name,posibleOutcome,eventId,createdAt,updatedAt',
    auth = require('../../auth/authService'),
    paginationBuilder = require('../../lib/util/paginationBuilder'),
    paginationInfoBuilder = require('../../lib/util/buildPaginationInfo'),
    collection = 'markets',

    handleError = function (err, res, next, status) {
        res.responseStatus = status || 500;
        res.fiddus.info = 'Some error occured';
        res.fiddus.data = err;
        return next();
    },

    marketController = {

        create: function (req, res, next) {

            var market = req.body;

            if (!market.name || market.eventId) {
                res.responseStatus = 400;
                res.fiddus.info = 'No name or event link was provided. Please repeat request providing a name for the new market';

                return next();
            }

            market = new Market(market);

            market.save(function (err, market) {
                if (err) {
                    res.fiddus.info = err.code === 11000 ? 'This email already exists.' : 'Database error';
                    res.fiddus.data = err;
                    res.responseStatus = err.code === 11000 ? 400 : 500;
                    return next();
                }

                res.responseStatus = 201;
                res.fiddus.info = 'New market created';
                res.fiddus.data = mask(market, marketMask);

                // Logging
                Log.create({
                    userId: null,
                    action: 'Created',
                    target: {
                        collection: collection,
                        id: market._id
                    }
                });

                next();
            });
        },

        read: function (req, res, next) {
            var marketId = req.params.id,
                fields = req.query.fields;

            Market.findOne({_id: marketId}, function (err, market) {
                if (err) {
                    return handleError(err, res, next);
                }

                var marketSent = mask(market, marketMask);

                // Logging
                Log.create({
                    userId: null,
                    action: 'Read',
                    target: {
                        collection: collection,
                        id: market._id
                    }
                });

                res.fiddus.info = 'Got market ' + marketId;
                res.fiddus.data = fields ? mask(marketSent, fields) : marketSent;
                next();
            });
        },

        update: function (req, res, next) {
            var marketToBeUpdatedId = req.params.id,
                updateObject = req.body;


            async.waterfall([
                function (cb) {
                    updateObject = mask(updateObject, 'name,description,startDate,endDate');
                    cb(null);
                },
                function (cb) {
                    Market.findOne({_id: marketToBeUpdatedId}, function (err, market) {
                        if (err) {
                            cb(err);
                        }

                        cb(null, market);
                    });
                },
                function (market, cb) {
                    _.forOwn(updateObject, function (value, key) {
                        market[key] = updateObject[key];
                    });

                    market.save(function (err) {
                        if (err) {
                            cb(err);
                        }

                        // Logging
                        Log.create({
                            userId: null,
                            action: 'Update',
                            target: {
                                collection: collection,
                                id: market._id
                            }
                        });

                        res.fiddus.info = 'Updated market ' + market._id;
                        res.fiddus.data = mask(market, marketMask);
                        return next();
                    });
                }
            ], function (err) {
                return handleError(err, res, next);
            });
        },

        delete: function (req, res, next) {
            var marketToBeDeletedId = req.params.id;

            Market.remove({_id: marketToBeDeletedId}, function (err) {
                if (err) {
                    return handleError(err, res, next);
                }

                // Logging
                Log.create({
                    userId: null,
                    action: 'Delete',
                    target: {
                        collection: collection,
                        id: marketToBeDeletedId
                    }
                });

                res.status(204).send();
            });
        },

        list: function (req, res, next) {
            var fields = req.query.fields,
                paginationInfo;

            async.series([
                // function (cb) {
                //     paginationInfoBuilder(req, market, {}).done(function (info) {
                //         paginationInfo = info;
                //         cb(null);
                //     }, function (err) {
                //         cb(err);
                //     });
                // },
                function (callback) {
                    Market.find({})
                        .exec(function (err, markets) {

                            // Apply mask to all markets found, asynchronously
                            async.mapSeries(markets, function (market, cb) {
                                var marketSent = mask(market, marketMask);
                                marketSent = fields ? mask(marketSent, fields) : marketSent;
                                cb(null, marketSent);
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

                                res.fiddus.info = 'markets list';
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
    };

module.exports = marketController;
