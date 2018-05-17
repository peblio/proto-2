const express = require('express');
const passport = require('passport');
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');
const shortid = require('shortid');

const Router = express.Router();
const User = require('../models/user.js');
const Token = require('../models/token.js');
const UserConst = require('../userConstants.jsx');

const userRoutes = express.Router();

userRoutes.route('/login').post(loginUser);
userRoutes.route('/signup').post(createUser);
userRoutes.route('/forgot').post(forgotPassword);
userRoutes.route('/reset').post(resetPassword);
userRoutes.route('/confirmation').post(confirmUser);
userRoutes.route('/resendconfirmation').post(resendConfirmUser);

function createUser(req, res) {
  const email = req.body.mail;
  const name = req.body.name;
  const password = req.body.password;
  let user;
  User.findOne({ name }, (err, user) => {
    if (user) {
      return res.status(400).send({
        msg: UserConst.SIGN_UP_DUPLICATE_USER
      });
    }

    User.findOne({ email: req.body.mail }, (err, user) => {
      if (user) {
        return res.status(400).send({
          msg: UserConst.SIGN_UP_DUPLICATE_EMAIL
        });
      }
      user = new User({
        email,
        name,
        password
      });
      user.hashPassword(password);
      user.save((err, user) => {
        if (err) {
          res.status(422).json({
            msg: UserConst.SIGN_UP_FAILED
          });
        } else {
          const token = new Token({
            _userId: user._id,
            token: shortid.generate()
          });
          token.save((err) => {
            if (err) {
              return res.status(500).send({
                msg: UserConst.SIGN_UP_FAILED
              });
            }
            sendSignUpConfirmationMail(user.email, token.token, req);
          });
          return res.status(200).send({
            msg: UserConst.SIGN_UP_CHECK_MAIL, user
          });
        }
      });
    });
  });
}

function forgotPassword(req, res) {
  User.findOne({ email: req.body.email }, (err, user) => {
    if (user) {
      user.resetPasswordToken = shortid.generate();
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      user.save((err, user) => {
        if (err) {
          res.status(422).json({
            msg: UserConst.PASSWORD_RESET_FAILED
          });
        } else {
          sendResetMail(req.body.email, user.resetPasswordToken, req);
          return res.send({
            msg: UserConst.PASSWORD_RESET_SENT_MAIL,
            user
          });
        }
      });
    } else {
      res.status(404).send({
        msg: UserConst.PASSWORD_RESET_NO_USER
      });
    }
  });
}

function resetPassword(req, res) {
  User.findOne({ resetPasswordToken: req.body.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
    if (err || !user) {
      res.status(422).json({
        error: UserConst.PASSWORD_RESET_TOKEN_EXP
      });
    } else {
      user.hashPassword(req.body.password);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.save((err) => {
        if (err) {
          res.status(422).json({
            msg: UserConst.PASSWORD_RESET_FAILED
          });
        } else {
          sendSuccessfulResetMail(user.email);
          return res.send({
            msg: UserConst.PASSWORD_RESET_SUCCESSFUL,
            user
          });
        }
      });
    }
  });
}

function loginUser(req, res, next) {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.send({ msg: err }); // will generate a 500 error
    }
    // Generate a JSON response reflecting authentication status
    if (!user) {
      return res.status(401).send({
        msg: UserConst.LOGIN_FAILED
      });
    } else if (!user.isVerified) {
      return res.status(401).send({
        msg: UserConst.LOGIN_USER_NOT_VERIFIED
      });
    }

    req.login(user, (err) => {
      if (err) {
        return res.send({
          msg: err
        });
      }
      return res.send({
        msg: UserConst.LOGIN_SUCCESS,
        user: { name: user.name }
      });
    });
  })(req, res, next);
}

function confirmUser(req, res) {
  if (!req.body.token) {
    return res.status(400).send({
      msg: ''
    });
  }
  Token.findOne({ token: req.body.token }, (err, token) => {
    if (!token) {
      return res.status(400).send({
        msg: UserConst.CONFIRM_TOKEN_EXPIRED
      });
    }

    // If we found a token, find a matching user

    User.findOne({ _id: token._userId }, (err, user) => {
      if (!user) {
        return res.status(400).send({
          msg: UserConst.CONFIRM_NO_USER
        });
      }
      if (user.isVerified) {
        return res.status(400).send({
          msg: UserConst.CONFIRM_USER_ALREADY_VERIFIED
        });
      }

      // Verify and save the user
      user.isVerified = true;
      user.save((err) => {
        if (err) {
          return res.status(500).send({
            msg: UserConst.SIGN_UP_FAILED
          });
        }
        res.status(200).send({
          msg: UserConst.CONFIRM_USER_VERIFIED
        });
      });
    });
  });
}

function resendConfirmUser(req, res) {
  User.findOne({ email: req.body.email }, (err, user) => {
    if (!user) {
      return res.status(400).send({
        msg: UserConst.CONFIRM_NO_EMAIL
      });
    }
    if (user.isVerified) {
      return res.status(400).send({
        msg: UserConst.CONFIRM_USER_ALREADY_VERIFIED
      });
    }

    // Create a verification token, save it, and send email
    const token = new Token({
      _userId: user._id,
      token: shortid.generate()
    });

    // Save the token
    token.save((err) => {
      if (err) {
        return res.status(500).send({
          msg: UserConst.SIGN_UP_FAILED
        });
      }
      sendSignUpConfirmationMail(user.email, token.token, req);
    });
    return res.status(200).send({
      success: true,
      msg: UserConst.SIGN_UP_CHECK_MAIL,
      user
    });
  });
}

// EMAIL HELPERS

function sendMail(mailOptions) {
  const options = {
    auth: {
      api_user: process.env.PEBLIO_SENDGRID_USER,
      api_key: process.env.PEBLIO_SENDGRID_PASSWORD
    }
  };

  const client = nodemailer.createTransport(sgTransport(options));
  client.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log(`Message sent: ${info.response}`);
    }
  });
}

function sendSignUpConfirmationMail(email, token, req) {
  const mailOptions = {
    to: email,
    from: process.env.PEBLIO_SENDGRID_MAIL,
    subject: 'Peblio Confirmation',
    text: `${'You are receiving this because you have signed up for peblio.\n\n' +
    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
    'http://'}${req.headers.host}/confirmation/${token}\n\n`
  };
  sendMail(mailOptions);
}

function sendSuccessfulResetMail(email) {
  const mailOptions = {
    to: email,
    from: process.env.PEBLIO_SENDGRID_MAIL,
    subject: 'Peblio Password Reset Successful',
    text: `${'Hello,\n\n' +
    'This is a confirmation that the password for your account '}${email} has just been changed.\n`
  };
  sendMail(mailOptions);
}

function sendResetMail(email, token, req) {
  const mailOptions = {
    to: email,
    from: process.env.PEBLIO_SENDGRID_MAIL,
    subject: 'Peblio Password Reset',
    text: `${'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
    'http://'}${req.headers.host}/reset/${token}\n\n` +
    'If you did not request this, please ignore this email and your password will remain unchanged.\n'
  };
  sendMail(mailOptions);
}

module.exports = userRoutes;
