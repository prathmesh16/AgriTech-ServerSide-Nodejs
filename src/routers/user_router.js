const express = require('express')
const validator = require('validator')

const mongoose = require('../db/mongoose')
const User = require('../models/user')

const router = new express.Router()

const validateData = (user) => {
    
    if(user.name == null || user.email == null || user.password == null || user.mobile == null)
        return false;
    if(user.name == "" || user.email == "" || user.password == "" || user.mobile == "")
        return false;
    if(!validator.isEmail(user.email))
        return false;
    if(user.password.length < 7)
        return false;
    if(user.mobile.length != 10)
        return false;    
    return true;            
}

router.post('/users', (req,res) => {
    console.log("Incoming POST req for add user")
    const user  = new User(req.body)
    if(!validateData(user)){
        res.status(400).send({
            error:"Invalid Data!"
        })
        return;
    }

    User.exists({email:user.email}).then((exists)=>{
        if(exists){
            res.status(400).send({
                error:"Email already registered!"
            })
            return;
        }
        user.save().then(() => {
            res.status(201).send({message:"User successfully inserted!",data:user})
        }).catch((err) => {
            res.status(400).send(err)
        })
    })

})

router.get('/users/email=:email&password=:password',(req,res) => {
    const email = req.params.email
    const password = req.params.password
    
    User.findOne({email:email,password:password}).then((user) => {
        if(!user){
            return res.status(404).send({error:"Incorrect email or password!"})
        }
        res.send({data:user})
    }).catch((err) => {
        res.status(500).send(err);
    })
})

router.get('/users',(req,res) => {
    
    console.log("Incoming GET request for all users")
    
    User.find({}).then((users) => {
        res.send({data:users})
    }).catch((err) => {
        res.status(500).send(err)
    })
})

router.get('/users/:id',(req,res) => {
    
    console.log("Incoming GET request for a user")
    const _id = req.params.id;

    if(!mongoose.Types.ObjectId.isValid(_id)){
        res.status(404).send({error:"User not found!"})
        return;
    }
    User.findById(_id).then((user) => {
        if(!user){
            return res.status(404).send({error:"User not found!"})
        }
        res.send({data:user})
    }).catch((err) => {
        res.status(500).send(err)
    })
})


router.patch('/users/:id',(req,res) => {

    console.log("Incoming PATCH request for a user")
    const _id = req.params.id;

    if(!mongoose.Types.ObjectId.isValid(_id)){
        res.status(404).send({error:"User not found!"})
        return;
    }

    User.findByIdAndUpdate(_id,req.body,{new:true,runValidators:true})
        .then((user) => {
            if(!user){
                return res.status(404).send({error:"User not found!"})
            }
            res.send({data:user})
        }).catch((err) => {
            res.status(400).send({error:"Invalid data!"})
        })
})

router.delete('/users/:id',(req,res) => {
    console.log("Incoming DELETE request for a user")
    const _id = req.params.id;

    if(!mongoose.Types.ObjectId.isValid(_id)){
        res.status(404).send({error:"User not found!"})
        return;
    }

    User.findByIdAndDelete(_id).then((user) => {
        if(!user){
            res.status(404).send({error:"User not found!"})
        }
        res.send(user)
    }).catch((err) => {
        res.status(500).send(err)
    })

})

module.exports = router