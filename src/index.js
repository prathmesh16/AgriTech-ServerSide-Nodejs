const express = require('express')
const cors = require('cors')

const userRouter = require('./routers/user_router')

const app = express()
const port = process.env.PORT

app.use(cors())
app.use(express.json())
app.use(userRouter)
 
app.listen(port,()=>{
    console.log('Server is up on port '+ port)
})