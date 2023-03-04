const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const User = require('../model/user');
const Otp = require('../model/otp');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator')
const api_key = require('../config/config');

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: api_key.Sendgrid
    }
}))
exports.signup = (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    let otp = null;
    console.log(name)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validación fallida')
        error.statusCode = 422;
        error.data = errors.array();
        console.log(error, error[0])
        res.status(422).json({ message: errors.array() })
        throw error;
    }

    bcrypt.hash(password, 12)
        .then(hashedPassword => {
            const Newuser = new User(
                {
                    email: email,
                    password: hashedPassword,
                    isverified: false,
                    name: name,
                    resetVerified: false,
                });
            Newuser.save();
            console.log("Detalles guardados en la base de datos")
            otp = Math.floor(100000 + Math.random() * 900000);
            const OTP = new Otp({
                otp: otp,
                email: email
            })
            OTP.save();
            console.log(otp)
            res.status(201).json({ message: "OTP enviado a tu correo" });
        }).then(res => {
            transporter.sendMail({
                to: email,
                from: "notlui69@outlook.es",
                subject: "Verificación OTP",
                html: 
                        `   '
                            <img src="https://i.imgur.com/uXsAFnF.png"  />
                            <p style="font-size:50px">Verificación</p>
                            <p style="font-size:25px ">El equipo de batutorias te da la bienvenida a la plataforma</p>
                            <p style="font-size:25px">Este es tu código de verificación: ${otp}</p>
                            '
                        `
            })
            console.log("Correo enviado")
        })
}

exports.otpVerification = (req, res, next) => {
    const receivedOtp = req.body.otp;
    const email = req.body.email;

    // validation
    console.log(receivedOtp, email);

    Otp.findOne({ email: email })
        .then(user => {
            if (!user) {
                const error = new Error("Validación fallida, este usuario no existe."); // when user not found
                error.statusCode = 403;
                error.data = {
                    value: receivedOtp,
                    message: "Invalid email",
                    param: "otp",
                    location: "otpVerification",
                };
                res.status(422).json({ message: error.data })
                throw error;
            }
            if (user.otp != receivedOtp) {
                const error = new Error("El OTP es erróneo");
                error.statusCode = 401;
                res.status(401).json({ message: "El OTP es erróneo " });
                error.data = {
                    value: receivedOtp,
                    message: "Otp incorrect",
                    param: "otp",
                    location: "otp",
                };
                throw error;
            }
            else {
                //  correct OTP
                User.findOne({ email: email })
                    .then(user => {
                        user.isverified = true;
                        const access_token = jwt.sign({ email: email, userId: user._id }, api_key.accessToken, {
                            algorithm: "HS256",
                            expiresIn: api_key.accessTokenLife
                        });
                        const referesh_token = jwt.sign({ email: email }, api_key.refereshToken, {
                            algorithm: "HS256",
                            expiresIn: api_key.refereshTokenLife
                        })
                        user.save(result => {
                            return res.status(200).json({
                                message: "El OTP es correcto, usuario añadido",
                                access_token: access_token,
                                referesh_token: referesh_token,
                                userId: user._id.toString(),
                                username: user.name,
                            });
                        })
                    })
            }
        })
        .catch((err) => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
}
// to re send the otp to user
exports.resendOtp = (req, res, next) => {
    const email = req.body.email;
    const received_otp = req.body.otp;
    let otp = null;

    Otp.findOne({ email: email })
        .then(user => {
            if (!user) {
                const error = new Error("El correo no existe");
                error.statusCode = 401;
                error.data = {
                    value: received_otp,
                    message: "Invalid email",
                    param: "otp",
                    location: "otpVerification",
                };
                res.status(401).json({ message: "El correo no existe" });
                throw error;
            }
            otp = Math.floor(100000 + Math.random() * 900000);

            user.otp = otp;
            user.save();
            console.log(otp);
            res.status(201).json({ message: "OTP enviado a tu correo" });
        })
        .then(() => {
            transporter.sendMail({
                to: email,
                from: "notlui69@outlook.es",
                subject: "Verificación OTP",
                html: 
                    `   '
                        <img src="https://i.imgur.com/uXsAFnF.png"  />
                        <p style="font-size:50px">Verificación</p>
                        <p style="font-size:25px ">El equipo de batutorias te da la bienvenida a la plataforma</p>
                        <p style="font-size:25px">Este es tu código de verificación: ${otp}</p></p>
                        '
                    `
            })
            console.log("Correo enviado")
        })
        .catch(err => {
            err => {
                if (!err.statusCode) {
                    err.statusCode = 500;
                }
                next(err);
            }
        })
}
exports.login = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validación fallida')
        error.statusCode = 422;
        error.data = errors.array();
        console.log(error, error[0])
        res.status(422).json({ message: " No existe un usuario con este correo." })
        throw error;
    }
    User.findOne({ email: email })
        .then(user => {
            if (user.isverified == false) {
                console.log("El usuario no está verificado")
                otp = Math.floor(100000 + Math.random() * 900000);
                console.log("otp =", otp)
                Otp.findOne({ email: email })
                    .then(user => {
                        // if the otp record is deleted
                        if (!user) {
                            const OTP = new Otp({
                                otp: otp,
                                email: email
                            })
                            OTP.save()
                                .then(() => {
                                    transporter.sendMail({
                                        to: email,
                                        from: "notlui69@outlook.es",
                                        subject: "Verificación OTP",
                                        html: 
                                            `   '
                                                <img src="https://i.imgur.com/uXsAFnF.png"  />
                                                <p style="font-size:50px">Verificación</p>
                                                <p style="font-size:25px ">El equipo de batutorias te da la bienvenida a la plataforma</p>
                                                <p style="font-size:25px">Este es tu código de verificación: ${otp}</p>
                                                '
                                            `
                                    })

                                    console.log("Correo enviado ", otp)
                                    return res.status(422).json({
                                        message: " No te has verificado con un OTP, se ha reenviado un correo con un nuevo OTP.",
                                        redirect: true,
                                    });
                                })
                        }
                        else {
                            user.otp = otp;
                            user.save()
                                .then(() => {
                                    transporter.sendMail({
                                        to: email,
                                        from: "notlui69@outlook.es",
                                        subject: "Verificación OTP",
                                        html: 
                                            `   '
                                                <img src="https://i.imgur.com/uXsAFnF.png"  />
                                                <p style="font-size:50px">Verificación</p>
                                                <p style="font-size:25px ">El equipo de batutorias te da la bienvenida a la plataforma</p>
                                                <p style="font-size:25px">Este es tu código de verificación: ${otp}</p>
                                                '
                                            `
                                    })
                                    return res.status(422).json({
                                        message: " No te has verificado con un OTP, se ha reenviado un correo con un nuevo OTP.",
                                        redirect: true,
                                    });
                                })
                        }
                    })
            }
            else {
                bcrypt
                    .compare(password, user.password)
                    .then(matchPass => {
                        if (matchPass) {
                            const access_token = jwt.sign({ email: email }, api_key.accessToken, {
                                algorithm: "HS256",
                                expiresIn: api_key.accessTokenLife
                            })
                            const referesh_token = jwt.sign({ email: email }, api_key.refereshToken, {
                                algorithm: "HS256",
                                expiresIn: api_key.refereshTokenLife
                            })
                            return res.status(201).json({ message: "Usuario loggeado", access_token: access_token, referesh_token: referesh_token, username: user.name, userId: user._id })
                        }
                        else {
                            return res.status(401).json({ message: "Las contraseñas no coinciden" })
                        }
                    })
                    .catch(err => {
                        err => {
                            if (!err.statusCode) {
                                err.statusCode = 500;
                            }
                            next(err);
                        }
                    })
            }
        })
}
exports.resetPassword = (req, res, next) => {
    const email = req.body.email;
    console.log(email);
    let otp = Math.Math.floor(100000 + Math.random() * 900000);
    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                const error = new Error("Validación fallida");
                error.statusCode = 401;
                res.status(401).json({ message: "El usuario no existe" });
                error.data = {
                    value: email,
                    message: " El OTP es incorrecto"
                }
                res.status(422).json({ message: " El usuario no existe" });
                throw error;
            }
            else {
                const new_otp = new Otp({
                    otp: otp,
                    email: email
                })
                new_otp.save()
            }
        })
        .then(result => {
            transporter.sendMail({
                to: email,
                from: "notlui69@outlook.es",
                subject: "Cambia tu contraseña en Batutorías",
                html: 
                    `   '
                        <img src="https://i.imgur.com/uXsAFnF.png"  />
                        <p style="font-size:50px">Recuperación de contraseña</p>
                        <p style="font-size:25px">Restablece tu contraseña con el siguiente códig: ${otp}</p>
                        '
                    `
            })
            console.log("Correo enviado  ", otp)
            res.status(201).json({ message: "OTP para cambiar contraseña" })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })
}
exports.resetOtpVerification = (req, res, next) => {
    const email = req.body.email;
    const otp = req.body.otp;
    console.log("Cambiar:", otp);
    Otp.findOne({ email: email })
        .then(user => {
            if (!user) {
                const error = new Error("Validación fallida");
                error.statusCode = 401;
                res.status(401).json({ message: "El OTP es incorrecto" });
                error.data = {
                    value: email,
                    message: " OTP incorrecto"
                }
                res.status(422).json({ message: " El OTP es incorrecto o ha expirado" });
                throw error;
            }
            if (user.otp == otp) {
                User.findOne({ email: email })
                    .then(matched => {
                        matched.resetVerified = true;
                        matched.save();
                    })
                res.status(201).json({ message: "Correo verificado", email: email })
            }
            else res.status(402).json({ message: "OTP incorrecto", email: email })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })
}
exports.newPassword = (req, res, next) => {
    const email = req.body.email;
    const newPassword = req.body.newPassword;
    const confirmPassword = req.body.confirmPassword;
    let resetUser;
    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                const error = new Error("El usuario con este correo no existe.");
                error.statusCode = 401;
                res.status(401).json({ message: "El usuario con este correo no existe." });
                error.data = {
                    value: email,
                    message: "El usuario con este correo no existe."
                }
                res.status(422).json({
                    message: " El usuario no exixte"
                });
                throw error;
            }
            if (user.resetVerified) {
                resetUser = user;
                resetUser.resetVerified = false;
                return bcrypt.hash(newPassword, 12)
                    .then(hashedPassword => {
                        resetUser.password = hashedPassword;
                        return resetUser.save();
                    })
                    .then(result => {
                        console.log("result", result)
                        res.status(201).json({ message: "La contraseña se cambió exitosamente" });
                    })
            }  // end of if condition
            else {
                console.log("Por favor, verifica tu correo primero.")
                res.status(401).json({ message: "Por favor, verifica tu correo primero. " })
            }

        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })

}