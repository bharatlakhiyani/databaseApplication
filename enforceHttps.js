var middleware = module.exports,
    url = require("url");

var HTTP = "http:",
    HTTPS = "https:";

middleware.transportSecurity = function () {

    var applicationURL = process.env.URL_BM
        scheme = url.parse(applicationURL).protocol;

    function securityEnabled () {
        if (scheme !== HTTP && scheme !== HTTPS) {
            throw new Error(
                "The application URL scheme must be 'http' or 'https'."
            );
        }
        return scheme === HTTPS;
    }

    function redirectURL (request) {
        return url.resolve(applicationURL, request.originalUrl);
    }

    return function (request, response, next) {
        if (securityEnabled() && !request.secure) {
            response.redirect(301, redirectURL(request));
        }
        else {
            next();
        }
    };

};
