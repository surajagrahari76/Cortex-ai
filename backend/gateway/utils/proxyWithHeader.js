import proxy from "express-http-proxy"

export const proxyWithHeader = (serviceUrl) => {
    const jsonProxy = proxy(serviceUrl, {
        parseReqBody: true,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers["x-user-id"] = srcReq.user.userId
                if (srcReq.user.credits !== undefined) {
                    proxyReqOpts.headers["x-user-credits"] = String(srcReq.user.credits)
                }
            }
            proxyReqOpts.headers["x-internal-key"] = process.env.INTERNAL_API_KEY || ""
            return proxyReqOpts
        }
    });

    const multipartProxy = proxy(serviceUrl, {
        parseReqBody: false,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers["x-user-id"] = srcReq.user.userId
                if (srcReq.user.credits !== undefined) {
                    proxyReqOpts.headers["x-user-credits"] = String(srcReq.user.credits)
                }
            }
            proxyReqOpts.headers["x-internal-key"] = process.env.INTERNAL_API_KEY || ""
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