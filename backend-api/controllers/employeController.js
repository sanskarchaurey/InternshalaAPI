const { catchAsyncErrors } = require("../middlewares/catchAsyncErrors");
const Employe = require("../models/employeModel");
const Internship = require("../models/internshipModel");
const ErrorHandler = require("../utils/ErrorHandler");
const { sendtoken } = require("../utils/SendToken");
const { sendmail } = require("../utils/nodemailer");
const path = require("path");
const imagekit = require("../utils/imagekit").initImageKit();

// home page
exports.homepage = catchAsyncErrors(async (req, res, next) => {
    res.json({ message: "Secure Employe Homepage!" });
});

// current-employe-id
exports.currentEmploye = catchAsyncErrors(async (req, res, next) => {
    const employe = await Employe.findById(req.id).exec();
    res.json({ employe });
});

// // signup
exports.employesignup = catchAsyncErrors(async (req, res, next) => {
    const employe = await new Employe(req.body).save();
    sendtoken(employe, 201, res);
});

// signin
exports.employesignin = catchAsyncErrors(async (req, res, next) => {
    const employe = await Employe.findOne({ email: req.body.email })
        .select("+password")
        .exec();

    if (!employe)
        return next(
            new ErrorHandler("User not found with this email address", 404)
        );
    const isMatch = employe.comparepassword(req.body.password);
    if (!isMatch) return next(new ErrorHandler("Wrong Credientials!", 500));

    sendtoken(employe, 200, res);
});

// signout
exports.employesignout = catchAsyncErrors(async (req, res, next) => {
    res.clearCookie("token");
    res.json({ message: "Successfully signout!" });
});

// sendmail (forgot password)
exports.employesendmail = catchAsyncErrors(async (req, res, next) => {
    const employe = await Employe.findOne({ email: req.body.email })
        .exec();

    if (!employe)
        return next(
            new ErrorHandler("User not found with this email address", 404)
        );

    // Link Genrate
    const url = `${req.protocol}://${req.get("host")}/employe/forget-link/${employe._id}`;
    sendmail(req, res, next, url);
    employe.resetPasswordToken = "1";
    await employe.save();
    res.json({ employe, url });
});

// employeforgetlink
exports.employeforgetlink = catchAsyncErrors(async (req, res, next) => {
    const employe = await Employe.findById(req.params.id).exec();

    if (!employe)
        return next(
            new ErrorHandler("User not found with this email address", 404)
        );

    if (employe.resetPasswordToken == "1") {
        employe.resetPasswordToken = "0";
        employe.password = req.body.password;
        await employe.save();
    } else {
        return next(
            new ErrorHandler("Invalid Reset Password Link! Please try again", 500)
        );
    }

    res.status(200).json({
        message: "Password has been Successfully Changed",
    });
});

// employeresetpassword
exports.employeresetpassword = catchAsyncErrors(async (req, res, next) => {
    const employe = await Employe.findById(req.id).exec();
    employe.password = req.body.password;
    await employe.save();
    sendtoken(employe, 201, res);

    // res.status(200).json({
    //     message: "Password has been Successfully reset",
    // });
});

// employeupdate
exports.employeupdate = catchAsyncErrors(async (req, res, next) => {
    await Employe.findByIdAndUpdate(req.params.id, req.body).exec();
    res.status(200).json({
        success: true,
        message: "Employe Updated Successfully!",
    });
});

// employeavatar - photo upload krne k liye use hota hai
exports.employeavatar = catchAsyncErrors(async (req, res, next) => {
    const employe = await Employe.findById(req.params.id).exec();
    const file = req.files.organizationlogo;
    const modifiedFileName = `resumebuilder-${Date.now()}${path.extname(file.name)}`;

    if (employe.organizationlogo.fileId !== "") {
        await imagekit.deleteFile(employe.organizationlogo.fileId);
    }

    const { fileId, url } = await imagekit.upload({
        file: file.data,
        fileName: modifiedFileName,
    });
    employe.organizationlogo = { fileId, url };
    await employe.save();
    res.status(200).json({
        success: true,
        message: "Profile uploaded!",
    });
});

// --------------- Internship -------------
exports.createinternship = catchAsyncErrors(async (req, res, next) => {
    const employe = await Employe.findById(req.id).exec();
    const internship = await new Internship(req.body).save();
    employe, internship.push(internship._id);
    await employe.save();
    res.status(201).json({ success: true, internship });
});

exports.readinternship = catchAsyncErrors(async (req, res, next) => {
    const internships = await Internship.find().exec();
    res.status(200).json({ success: true, internships });
});

exports.readsingleinternship = catchAsyncErrors(async (req, res, next) => {
    const internship = await await Internship.findById(req.params.id).exec();
    res.status(200).json({ success: true, internship });
});
