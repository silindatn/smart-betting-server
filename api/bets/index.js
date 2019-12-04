/**
 * User router configuration
 */

'use strict';

var router = require('express').Router(),
    controller = require('./betController'),
    auth = require('../../auth/authService'),
    formatResponse = require('express-format-response'),
    template = require('../../config/responseTemplate'),
    responseFormatter = formatResponse(template),
    activator = require('activator'),
    activatorConfig = require('../../config/activatorConfig');

activator.init(activatorConfig);

// Creates a new event
router.post('/', controller.create, responseFormatter);

// Reads an event
router.get('/:id', controller.read, responseFormatter);

// Updates an event
router.put('/:id', controller.update, responseFormatter);

// Deletes an event
router.delete('/:id', controller.delete);

// Lists all events
router.get('/', controller.list, responseFormatter);

router.get('/report', controller.chart_report, responseFormatter);

module.exports = router;
