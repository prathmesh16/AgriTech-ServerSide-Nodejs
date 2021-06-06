const express = require('express')
const validator = require('validator')
const multer = require('multer')
const sharp = require('sharp')

const mongoose = require('../db/mongoose')
const User = require('../models/user')
const auth = require('../middleware/auth')

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
            user.generateAuthToken().then((token) => {
                res.status(201).send({message:"User successfully inserted!",data:user,token:token})
            })
        }).catch((err) => {
            res.status(400).send(err)
        })
    })

})

router.post('/users/login',(req,res) => {
    
    console.log("Incoming POST req for login user")
    const email = req.body.email
    const password = req.body.password
     
    User.findByCredentials(email,password).then((user) => {
        if(!user){
            return res.status(404).send({error:"Unable to login"})
        }
        user.generateAuthToken().then((token) => {
            res.send({message:"User successfully Logged In",data:user,token:token})
        })
    }).catch((err) => {
        res.status(400).send({error:"Unable to login"});
    })
})

router.post('/users/logout',auth,async (req,res) => {
    console.log("Incoming POST req for logout user")
    try{
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()

        res.send({message:"user logged out successfully"})
    }
    catch(e){
        res.status(500).send()
    }
})

router.post('/users/logoutAll',auth,async (req,res) => {
    console.log("Incoming POST req for logout user from all devices")
    try{
        req.user.tokens = []
        await req.user.save()

        res.send({message:"user logged out from all devices successfully"})
    }
    catch(e){
        res.status(500).send()
    }
})

router.get('/users/myProfile',auth,(req,res) => {
    
    console.log("Incoming GET request for profile")
    res.send({data:req.user})
})

router.get('/users',auth,(req,res) => {
    console.log("Incoming GET request for all users")  
  
    User.find({}).then((users) => {
        res.send({data:users})
    }).catch((err) => {
        res.status(500).send(err)
    })
})

router.get('/users/:id',auth,(req,res) => {
    
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

router.patch('/users/me',auth,async (req,res) => {

    console.log("Incoming PATCH request for updating user profile")

    const updates = Object.keys(req.body)
    const allowedUpdates = ['name','email','password','mobile']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if(!isValidOperation){
        return res.status(400).send({error:"Invalid update!"})
    }

    try {
        updates.forEach((update) => req.user[update] = req.body[update])  
        await req.user.save()
        res.send({message:"User successfully updated",data:req.user})
    }catch(e) {
        res.status(400).send({error:"Invalid data!"})
    }

})

router.patch('/users/:id',auth,(req,res) => {

    console.log("Incoming PATCH request for a user")
    const _id = req.params.id;

    if(!mongoose.Types.ObjectId.isValid(_id)){
        res.status(404).send({error:"User not found!"})
        return;
    }

    const updates = Object.keys(req.body)
    const allowedUpdates = ['name','email','password','mobile']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if(!isValidOperation){
        return res.status(400).send({error:"Invalid update!"})
    }

    User.findById(_id).then((user) => { 
            if(!user){
                return res.status(404).send({error:"User not found!"})
            }
            updates.forEach((update) => user[update] = req.body[update])  
            user.save().then((user) => {
                res.send({message:"User successfully updated",data:user})
            })
        }).catch((err) => {
            res.status(400).send({error:"Invalid data!"})
        })

})

router.delete('/users/me',auth, async(req,res) => {
    console.log("Incoming DELETE request for a current user")

    try {
        await req.user.remove()
        res.send({message:"User deleted successfully",data:req.user})
    }catch(e){
        res.status(500).send(e)
    }

})

router.delete('/users/:id',auth,(req,res) => {
  
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
        res.send({message:"User deleted successfully",data:user})
    }).catch((err) => {
        res.status(500).send(err)
    })

})

const upload = multer({
    limits:{
        fileSize:1000000
    },
    fileFilter(req,file,cb){
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
            return cb(new Error('Please an upload image'))
        }
        cb(undefined,true)
    }
})

router.post('/users/me/avatar',auth,upload.single('avatar'), async(req,res) => {
    console.log("Incoming POST request for uploading user avatar")
   
    const buffer = await sharp(req.file.buffer).resize({width:250,height:250}).png().toBuffer()

    req.user.avatar = buffer
    await req.user.save()
    res.send({message:"Avatar uploaded successfully"})
},(error,req,res,next) => {
    res.status(400).send({error:error.message})
})

router.get('/users/:id/avatar',auth,async (req,res) => {
    console.log("Incoming GET request for getting avatar of user")
    try {
        const user = await User.findById(req.params.id)

        if(!user || !user.avatar) {
            throw new Error()
        }

        res.set('Content-Type','image/png')
        res.send(user.avatar)
    } catch(e) {
        res.status(404).send({error:"Image not found"})
    }
})

router.delete('/users/me/avatar',auth,async (req,res) => {
    console.log("Incoming DELETE request for deleting user avatar")
    req.user.avatar = undefined
    await req.user.save()
    res.send({message:"Avatar deleted successfully"})
})

module.exports = router