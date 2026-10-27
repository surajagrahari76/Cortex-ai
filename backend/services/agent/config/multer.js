import fs from "fs"
import path from "path"
import multer from "multer"

const uploadDir = path.resolve("./temp")

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir)
    },
    filename(req, file, cb) {
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")
        cb(null, `${Date.now()}-${sanitized}`)
    },
})

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === "application/pdf" ||
        file.mimetype.startsWith("image/") ||
        file.mimetype.includes("presentation") ||
        file.mimetype.includes("powerpoint")
    ) {
        cb(null, true)
    } else {
        cb(new Error("Only PDF and Images are allowed."))
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024
    }
})

export const cleanupTemp = (req, res, next) => {
    const clean = () => {
        if (req.file?.path && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path)
            } catch (err) {}
        }
    }
    res.on("finish", clean)
    res.on("close", clean)
    if (next) next()
}

const originalSingle = upload.single.bind(upload)
upload.single = (fieldName) => {
    const middleware = originalSingle(fieldName)
    return (req, res, next) => {
        middleware(req, res, (err) => {
            cleanupTemp(req, res)
            if (err) return next(err)
            next()
        })
    }
}

export default upload