const customerRouter = require('express').Router()
const { compareSync } = require('bcrypt')
const Customer = require('../models/customer')
const Workflow = require('../models/workflow')
const Zalo_api = require('../services/zalo_service')
const {format} = require('date-fns') 
require('express-async-errors')


let serviceCount1=[]
let serviceCount2=[]
let serviceCount3=[]
let serviceListGlobal= []
const initQueue = async ()=>{
    serviceCount1=[]
    serviceCount2=[]
    serviceCount3=[]
    const service = await Workflow.find({})
    service.forEach(elem=> serviceListGlobal.push(elem.name))
    let i=0
    for (elem of serviceListGlobal){
        const count= await Customer.count({services: elem})
        if(i==0){
            serviceCount1.push(count)
        }
        if(i==1){
            serviceCount2.push(count)
        }
        if(i==2){
            serviceCount3.push(count)
        }
        i=i+1
    }
    for(let i=serviceCount1[0]; i<300;i++){
        serviceCount1.push(i+1)
    }
    for(let i=serviceCount2[0]; i<300;i++){
        serviceCount2.push(i+1)
    }
    for(let i=serviceCount3[0]; i<300;i++){
        serviceCount3.push(i+1)
    }
}
initQueue()

customerRouter.get('/api/services', async (req,res)=>{
    let serviceList=[]
    const services = await Workflow.find({})
    services.forEach(elem=> {
        serviceList.push(elem.name)
        if(serviceListGlobal.length<3){
            serviceListGlobal.push(elem.name)
        }
    })
    res.json(services)
})

const checkAvailability = async (req) => {
    const {phonenumber, services, date} = req
    const dateFormat=format(new Date(date), 'MM-dd-yyyy')
    const newDate = new Date(dateFormat)
    newDate.setDate(newDate.getDate()+1)
    const specificCustomer = await Customer.findOne({phonenumber: phonenumber, date: newDate, services: services})
    const service = await Workflow.findOne({name: services})
    if(specificCustomer && service){
        if(specificCustomer.ordernumber > service.currentNumber){
            return false
         }else{
             return true
         }
    }else{
        return true
    }
}
const checkCurrentState = (verify, services)=>{
    let checking = serviceListGlobal.find(elem => elem === services)
    if(!checking){
        if(verify ==0){
            serviceListGlobal[verify]=services
            serviceCount1=[]
            for(let i=0; i<300;i++){
                serviceCount1.push(i)
            }
        }else if(verify ==1){
            serviceCount2=[]
            serviceListGlobal[verify]=services
            for(let i=0; i<300;i++){
                serviceCount2.push(i)
            }
        }else if(verify ==2){
            serviceCount3=[]
            serviceListGlobal[verify]=services
            for(let i=0; i<300;i++){
                serviceCount3.push(i)
            }
        }
    }
}
customerRouter.post('/api/customer',async (req,res)=>{
    const {phonenumber, services, verify, date} = req.body
    let dateFormat=format(new Date(date), 'MM-dd-yyyy')
    const newDate = new Date(dateFormat)
    newDate.setDate(newDate.getDate()+1)
    dateFormat=format(newDate, 'MM-dd-yyyy')
    checkCurrentState(verify, services)
    const isEligible = await checkAvailability(req.body)
    console.log(isEligible)
    if(isEligible){
        if(verify ==0){
            ordernumber=serviceCount1.shift()+1
        }
        if(verify ==1){
            ordernumber=serviceCount2.shift()+1
        }
        if(verify ==2){
            ordernumber=serviceCount3.shift()+1
        }
        const customer = new Customer({
            phonenumber,
            ordernumber,
            services,
            date: newDate
        })
        console.log(customer)
        const data = {"phone":phonenumber}
        const test = await Zalo_api.zaloNumbercall(JSON.stringify(data))
        const savedCustomer = await customer.save()
        const yourOrder= {
            message: `register succesfully, your order number is: ${savedCustomer.ordernumber} for ${dateFormat}`
        }
        res.status(201).json(yourOrder)
    }else{
        const errorMessage = {
            message: 'Your order has already exist'
        }
        res.status(200).json(errorMessage)
    }
        
})

module.exports = customerRouter

