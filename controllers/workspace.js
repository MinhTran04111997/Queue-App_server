const workspaceRouter = require('express').Router()
const Workflow= require('../models/workflow')
const Customer= require('../models/customer')

workspaceRouter.get('/:id', async (req,res)=>{
    const id = req.params.id
    const service= await Workflow.findOne({_id: id})
    if(!service){
        return res.status(401).json({
            error: 'Can not find service'
          })
    }
    res.status(200).json(service)
})

workspaceRouter.put('/:id', async(req,res)=>{
    const id = req.params.id
    const validator= await Workflow.findOne({_id: id})
    const name= validator.name
    console.log(name)
    const totalQueue= await Customer.count({services: name})
    console.log(totalQueue)
    if(validator.currentNumber >= totalQueue){
        return res.status(401).json({
            error: 'Current Queue can not bigger than total Queue'
          })
    }
    const service= await Workflow.findOneAndUpdate({ _id: id }, { $inc : { "currentNumber" : 1 } }, {
        new: true,
        runValidators: true,
      })
    console.log(service)
    if(!service){
        return res.status(401).json({
            error: 'Can not find service'
          })
    }
    res.status(200).json(service)
})




module.exports = workspaceRouter