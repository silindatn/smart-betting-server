/**
 * event Controller
 */

'use strict';

var Event = require('./eventModel'),
    Log = require('../logs/logModel'),
    config = require('../../config/environment'),
    _ = require('lodash'),
    async = require('async'),
    mask = require('json-mask'),
    eventMask = 'id,name,description,startDate,endDate,createdAt,updatedAt',
    auth = require('../../auth/authService'),
    paginationBuilder = require('../../lib/util/paginationBuilder'),
    paginationInfoBuilder = require('../../lib/util/buildPaginationInfo'),
    collection = 'events',

    handleError = function (err, res, next, status) {
        res.responseStatus = status || 500;
        res.fiddus.info = 'Some error occured';
        res.fiddus.data = err;
        return next();
    },

    eventController = {

        create: function (req, res, next) {

            var event = req.body;

            if (!event.name) {
                res.responseStatus = 400;
                res.fiddus.info = 'No name was provided. Please repeat request providing a name for the new event';

                return next();
            }

            event = new Event(event);

            event.save(function (err, event) {
                if (err) {
                    res.fiddus.info = err.code === 11000 ? 'This email already exists.' : 'Database error';
                    res.fiddus.data = err;
                    res.responseStatus = err.code === 11000 ? 400 : 500;
                    return next();
                }

                res.responseStatus = 201;
                res.fiddus.info = 'New event created';
                res.fiddus.data = mask(event, eventMask);

                // Logging
                Log.create({
                    userId: null,
                    action: 'Created',
                    target: {
                        collection: collection,
                        id: event._id
                    }
                });
                
                next();
            });
        },

        read: function (req, res, next) {
            var eventId = req.params.id,
                fields = req.query.fields;

            Event.findOne({_id: eventId}, function (err, event) {
                if (err) {
                    return handleError(err, res, next);
                }

                var eventSent = mask(event, eventMask);

                // Logging
                Log.create({
                    userId: null,
                    action: 'Read',
                    target: {
                        collection: collection,
                        id: event._id
                    }
                });

                res.fiddus.info = 'Got event ' + eventId;
                res.fiddus.data = fields ? mask(eventSent, fields) : eventSent;
                next();
            });
        },

        update: function (req, res, next) {
            var eventToBeUpdatedId = req.params.id,
                updateObject = req.body;


            async.waterfall([
                function (cb) {
                    updateObject = mask(updateObject, 'name,description,startDate,endDate');
                    cb(null);
                },
                function (cb) {
                    Event.findOne({_id: eventToBeUpdatedId}, function (err, event) {
                        if (err) {
                            cb(err);
                        }

                        cb(null, event);
                    });
                },
                function (event, cb) {
                    _.forOwn(updateObject, function (value, key) {
                        event[key] = updateObject[key];
                    });

                    event.save(function (err) {
                        if (err) {
                            cb(err);
                        }

                        // Logging
                        Log.create({
                            userId: null,
                            action: 'Update',
                            target: {
                                collection: collection,
                                id: event._id
                            }
                        });

                        res.fiddus.info = 'Updated event ' + event._id;
                        res.fiddus.data = mask(event, eventMask);
                        return next();
                    });
                }
            ], function (err) {
                return handleError(err, res, next);
            });
        },

        delete: function (req, res, next) {
            var eventToBeDeletedId = req.params.id;

            Event.remove({_id: eventToBeDeletedId}, function (err) {
                if (err) {
                    return handleError(err, res, next);
                }

                // Logging
                Log.create({
                    userId: null,
                    action: 'Delete',
                    target: {
                        collection: collection,
                        id: eventToBeDeletedId
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
                //     paginationInfoBuilder(req, event, {}).done(function (info) {
                //         paginationInfo = info;
                //         cb(null);
                //     }, function (err) {
                //         cb(err);
                //     });
                // },
                function (callback) {
                    Event.find({})
                        .exec(function (err, events) {

                            // Apply mask to all events found, asynchronously
                            async.mapSeries(events, function (event, cb) {
                                var eventSent = mask(event, eventMask);
                                eventSent = fields ? mask(eventSent, fields) : eventSent;
                                cb(null, eventSent);
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

                                res.fiddus.info = 'events list';
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

module.exports = eventController;
