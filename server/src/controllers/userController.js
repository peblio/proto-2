const express = require('express');
const User = require('../models/user.js');

function getUserProfile(req, res) {
  User.findOne({ name: req.params.userName }, (err, user) => {
    if (err) {
      res.send(err);
    } else {
      res.send({
        name: user.name,
        type: user.type,
        image: user.image,
        blurb: user.blurb,
        isOwner: !!(req.user && req.user.name && req.user.name === user.name)
      });
    }
  });
}

const userRoutes = express.Router();

userRoutes.route('/:userName/profile').get(getUserProfile);
module.exports = userRoutes;