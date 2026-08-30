import proxy from "express-http-proxy"

export const proxyWithHeader = (serviceUrl) => {
    const jsonProxy = proxy(serviceUrl, {
        parseReqBody: true,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers["x-user-id"] = srcReq.user.userId
            }
            return proxyReqOpts
        }
    });

    const multipartProxy = proxy(serviceUrl, {
        parseReqBody: false,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers["x-user-id"] = srcReq.user.userId
            }
            return proxyReqOpts
        }
    });

    return (req, res, next) => {
        const isMultipart = req.headers['content-type'] && req.headers['content-type'].startsWith('multipart/form-data');
        if (isMultipart) {
            return multipartProxy(req, res, next);
        }
        return jsonProxy(req, res, next);
    }
}