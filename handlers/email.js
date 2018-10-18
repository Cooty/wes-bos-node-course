const nodemailer = require('nodemailer');
const juice = require('juice');
const pug = require('pug');
const htmlToText = require('html-to-text');
const promisify = require('es6-promisify');

const transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

// Quick test
// transport.sendMail({
//     from: 'Tamás Kuti <tamas.kuti@oetkerdigital.com>',
//     to: 'cooty13@gmail.com',
//     html: '<strong>PONTY!!!</strong> Árvíztűrő tükörfúrógép <img src="https://www.agrarszektor.hu/images/cimlap/P/ponty768-20170421.jpg" width="280" />',
//     text: '**PONTY!!!** Árvíztűrő tükörfúrógép',
// });

const generateHTML = (filename, options = {}) => {
    const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`, options);
    const htmlWithInlinedStyles = juice(html);
    return htmlWithInlinedStyles;
};

exports.send = async (options) => {
    const html = generateHTML(
        options.filename,
        options,
    );
    const text = htmlToText.fromString(html);

    const sendMailOptions = {
        from: process.env.MAIL_FROM,
        to: options.user.email,
        subject: options.subject,
        html,
        text,
    };

    // by default is callback based and we don't want that...
    const sendMail = promisify(transport.sendMail, transport);

    return sendMail(sendMailOptions);
};