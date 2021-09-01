const dotenv = require('dotenv');
dotenv.config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require('express-session');
const saltRounds = 10;

const app = express();

app.set('view engine','ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({secret:process.env.SESSION_PASS,resave:false,saveUninitialized:true}));

const uri = "mongodb+srv://"+ process.env.MONGO_USER +":"+process.env.MONGO_PASSWORD+"@cluster0.fo2dm.mongodb.net/practiceDB";
const localUri = "mongodb://localhost:27017/practiceDB";
mongoose.connect(uri,{useNewUrlParser: true, useUnifiedTopology: true});

const dataSchema = mongoose.Schema({
    Name: String,
    Age: Number
});

const userSchema = mongoose.Schema({
    UserName: String,
    Password: String,
    Data: [dataSchema]
});

const User = mongoose.model("User",userSchema);

app.get("/", (req, res) => {
    if(!req.session.name)res.render("home");
    else res.redirect('/user');
});

app.get("/register", (req, res) => {
    if(!req.session.name)res.render("register");
    else res.redirect('/user');
});

app.get("/login", (req, res) => {
    if(!req.session.name)res.render("login");
    else res.redirect('/user');
});

app.get("/user", (req, res) => {
    console.log(req.session);
    if(!req.session.name){
        res.redirect("/");
    }
    else{
        User.findOne({UserName: req.session.name},(err,found)=>{
            if(err)console.log(err);
            else{
                console.log(found.Data);
                res.render("user",{kind: "Name List",items:found.Data});
            }
        });
    }
});

app.post("/", (req, res) => {
    if(req.body['button-register']==''){
        res.redirect("/register");
    }
    if(req.body['button-login']==''){
        res.redirect("/login");
    }
});

app.post("/register", (req, res) => {
    User.findOne({UserName: req.body.newName},(err,found)=>{
        if(err)console.log(err);
        else if(found){
            console.log("User already exists!");
            res.redirect("/register");
        }
        else{
            bcrypt.hash(req.body.newPassword,saltRounds,(err,hash)=>{
                const newUser = new User({
                    UserName: req.body.newName,
                    Password: hash,
                    Data: []
                });
                newUser.save((err)=>{
                    if(err)console.log(err);
                    else{
                        req.session.name = req.body.newName;
                        res.redirect("/user");
                    }
                });
            });
        }
    });
});

app.post("/login", (req, res) => {
    User.findOne({UserName: req.body.Name},(err,found)=>{
        if(err)console.log(err);
        else if(found){
            bcrypt.compare(req.body.Password,found.Password,(err,result)=>{
                if(err)console.log(err);
                else if(result){
                    req.session.name = found.UserName;
                    res.redirect("/user");
                }
                else{
                    console.log("Wrong Password!");
                    res.redirect("/login");
                }
            });
        }
        else{
            console.log("User doesn\'t exists!");
            res.redirect("/login");
        }
    });
});

app.post("/user", (req, res) => {
    if(req.body['button-clear']==''){
        User.findOneAndUpdate({UserName:req.session.name},{$set:{Data: []}},{new:true},(err,updatedData)=>{
            if(err)console.log(err);
            else console.log(updatedData);
        });
    }
    else if(req.body['button-delete']==''){
        var temp=[];
        User.findOne({UserName: req.session.name},(err,found)=>{
            if(err)console.log(err);
            else if(found){
                for(var i=0;i<found.Data.length;i++){
                    if(found.Data[i].Name!==req.body.newName && found.Data[i].Age!==req.body.newAge){
                        temp.push(found.Data[i]);
                    }
                }
                User.findOneAndUpdate({UserName:req.session.name},{$set:{Data: temp}},{new:true},(err,updatedData)=>{
                    if(err)console.log(err);
                    else console.log(updatedData);
                });
            }
        });
    }
    else if(req.body['button-add']==''){
        if(req.body.newAge>=0 && req.body.newAge<=150){
            var t=[];
            t.push({Name: req.body.newName, Age: req.body.newAge});
            User.findOneAndUpdate({UserName:req.session.name},{$push:{Data: t}},{new:true},(err,updatedData)=>{
                if(err)console.log(err);
                else console.log(updatedData);
            });
        }
        else console.log("Really? Age?");
    }
    else if(req.body['button-logout']==''){
        req.session.name=null;
    }
    res.redirect("/user");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Our app is running on port ${ PORT }`);
});