const Course = require('../model/courses');
const User = require('../model/user');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path')

exports.CoursePage = (req, res, next) => {
    const courseId = req.params.courseId;
    Course.findOne({ _id: courseId })
        .then(course => {
            res.status(200).json({ course: course })
        })
        .catch(err => {
            console.log(err)
            next()
        })
}
exports.Bookmark = (req, res, next) => {
    const courseId = req.params.courseId;
    const userId = req.body._userID;
    User.findById({ _id: userId })
        .then(user => {
            if (!user.Bookmark.includes(courseId)) {
                user.Bookmark.push(courseId);
                console.log("Añadido a favoritos")
            }
            else {
                user.Bookmark.splice(user.Bookmark.indexOf(courseId), 1);
                console.log('Eliminado de favoritos')
            }
            user.save()
                .then(() => {
                    Course.findById({ _id: courseId })
                        .then(course => {
                            if (!course.bookmark.includes(userId)) {
                                course.bookmark.push(userId);
                                console.log("")
                            }
                            else {
                                course.bookmark.splice(course.bookmark.indexOf(userId), 1);
                                console.log("El curso se ha añadido ya a favoritos")
                            }
                            course.save()
                                .then(() => {
                                    console.log("")
                                    res.status(202).json({ message: "" })
                                })
                            console.log(user)
                        })
                        .catch(err => {
                            console.log(err);
                            console.log("")
                        })
                })
        })
        .catch(err => {
            throw err;
        })
}
exports.ShowBookmark = (req, res, next) => {
    const userId = req.params.userId;
    console.log(userId)
    User.findById({ _id: userId })
        .populate('Bookmark')
        .exec()
        .then(course => {
            console.log(course)
            res.json({ course: course })
        })
        .catch(err => {
            console.log(err)
            next()
        })
}
exports.unbookmark = (req, res, next) => {
    const userId = req.body.userId;
    const courseId = req.body.id;

    User.findById({ _id: userId })
        .then(user => {
            user.Bookmark.splice(user.Bookmark.indexOf(courseId), 1);
            user.save()
                .then(() => {
                    Course.findById({ _id: courseId })
                        .then(course => {
                            course.bookmark.splice(course.bookmark.indexOf(userId), 1);
                            course.save()
                                .then(() => {
                                    res.status(200).json({ message: "Eliminado de favoritos" })
                                })
                        })
                        .catch(err => {
                            console.log(err)
                            next()
                        })
                })
        })
        .catch(err => {
            console.log(err)
        })
}

exports.rating = (req, res, next) => {
    const courseId = req.body.courseId;
    const new_Rating = req.body.rating;
    Course.findById({ _id: courseId })
        .then(course => {
            const total_rating = course.rating.ratingSum + new_Rating;
            const times_updated = course.rating.timesUpdated + 1;
            course.rating.timesUpdated += 1;
            course.rating.ratingSum += new_Rating;
            course.rating.ratingFinal = (total_rating / times_updated);
            course.save();
            console.log(course)
            res.status(200).json({ course: course })
        })
        .catch(err => {
            console.log(err);
            next();
        })
}

exports.pdf = (req, res, next) => {
    const courseId = req.params.courseId;
    Course.findById({ _id: courseId })
        .then(course => {
            if (!course) {
                res.status(400).json({ message: "La tutoría no existe" })
            }
            const pdfName = "invoice-" + courseId + '.pdf';
            const pdfPath = path.join('Files', pdfName);
            const pdfdoc = new PDFDocument();

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                'inline; filename="' + pdfName + '"'
            );
            pdfdoc.pipe(fs.createWriteStream(pdfPath));

            pdfdoc.pipe(res);
            pdfdoc.fontSize(16).text('Batutorias. Aprender de más nunca está demás. ');
            pdfdoc.moveDown();
            pdfdoc.fontSize(18).text('-Tutoría creada por: ');
            pdfdoc.moveDown();
            pdfdoc.text(course.name);
            pdfdoc.moveDown();
            pdfdoc.fontSize(18).text('-Descripción de la tutoría: ');
            pdfdoc.moveDown();
            pdfdoc.text(course.discription);
            pdfdoc.moveDown();
            pdfdoc.text('-¿Qué aprendiste durante esta tutoría?');
            pdfdoc.text(course.willLearn);
            pdfdoc.moveDown();
            pdfdoc.fontSize(18).text('TIPS');
            pdfdoc.text('--------------------------------------------');
            pdfdoc.text('1. Esta tutoría es importante, trátala como a una de tus clases.');
            pdfdoc.text('--------------------------------------------');
            pdfdoc.text('2. Se responsable con esta tutoría.');
            pdfdoc.text('--------------------------------------------');
            pdfdoc.text(' Practicar mucho, te ayuda a recordar.');
            pdfdoc.text('--------------------------------------------');
            pdfdoc.text('4. Crea un buen ambiente de estudio.');
            pdfdoc.text('--------------------------------------------');
            pdfdoc.moveDown();
            pdfdoc.text('--------------------------------------------');
            pdfdoc.text('Final del documento.');
            pdfdoc.end();
        })
        .catch(err => {
            console.log(err)
        })
}