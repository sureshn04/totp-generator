const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const User = require('../config/sequelize');
const hashPassword = require('../config/hashPassword');
const totp = require('../config/totp');

exports.signin =  (req, res) => {

  User.findOne({
    where : {
      email : req.body.email
    }
  }).then(user => {
    if(!user) {
      return res.status(404).json({msg :'user is not found'});
    }

    const passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
    
    if(!passwordIsValid) {
      return res.status(401).json({auth: false, token : 'invalid', msg : 'password is incorrect'});
    }

    const token = jwt.sign({id : user.id}, process.env.SECRET, {
      expiresIn: 86400
    });

    res.status(200).json({auth : true, token});
  }).catch(err => {
    res.status(500).json({msg : "invalid email"})
  })
}

exports.signup = async (req, res) => {
  let errors = [] ;
  let body = {
    email : req.body.email,
    username : req.body.username,
    password : req.body.password,
    secret : new Date().getTime(),
  }

  if(!req.body.email || req.body.email === undefined){
    errors.push('Email is not given');
  }
  if(!req.body.username || req.body.username === undefined){
    errors.push('username is not given');
  }
  if(!req.body.password || req.body.password === undefined){
    errors.push('Password is not given')
  }

  if(errors.length > 0){
    res.json({errors})
  } else {
    body.password = await hashPassword(body.password)
      
    User
        .create(body)
        .then(user => {
          res.status(200).json({
            msg : 'Successfully created new user',
            user
          });
        })
        .catch(err => res.status(400).json(err.errors[0]));
  }
}

exports.validate = (req, res) => {
  const token = req.body.token;
  if(!token) {
    return res.status(400).json({msg: 'Token must be provided'})
  }

  User.findOne({
    where : {
      id : req.userId
    }
  }).then(user => {
    if(!user){
      return res.status(404).json({msg: 'User not found'})
    }
    const verify = totp.verifyToken(user.secret, token)

    if(!verify){
      return res.status(400).json({msg : 'Token is not valid'});
    }

    res.status(200).json({msg : "Token is verified successfully"});

  }).catch(err => {
    res.send(err)
  })
}