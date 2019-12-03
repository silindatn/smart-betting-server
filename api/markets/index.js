/**
 * User router configuration
 */

'use strict';

var router = require('express').Router(),
    controller = require('./marketController'),
    auth = require('../../auth/authService'),
    formatResponse = require('express-format-response'),
    template = require('../../config/responseTemplate'),
    responseFormatter = formatResponse(template),
    activator = require('activator'),
    activatorConfig = require('../../config/activatorConfig');

activator.init(activatorConfig);

router.post('/', controller.create, responseFormatter);

router.get('/:id', controller.read, responseFormatter);

router.get('by-eventid/:id', controller.readByEventId, responseFormatter);

router.put('/:id', controller.update, responseFormatter);

router.delete('/:id', controller.delete);

router.get('/', controller.list, responseFormatter);

module.exports = router;
