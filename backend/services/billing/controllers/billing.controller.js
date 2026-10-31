import axios from "axios"
import { PLANS } from "../config/Plans.js"
import razorpay from "../config/razorpay.js"
import Payment from "../models/payment.model.js"
import crypto from "crypto"

export const createOrder = async (req, res) => {
    try {
        const { plan } = req.body
        const userId = req.headers["x-user-id"]
        const selectedPlan = PLANS[plan]

        if (!selectedPlan) {
            return res.status(404).json({ message: "plan not found" })
        }

        if (!selectedPlan.amount || selectedPlan.amount <= 0) {
            return res.status(400).json({ message: "Cannot create order for free plan" })
        }

        const order = await razorpay.orders.create({
            amount: selectedPlan.amount * 100,
            currency: "INR",
            receipt: `receipt-${Date.now()}`
        })

        await Payment.create({
            userId,
            orderId: order.id,
            amount: selectedPlan.amount,
            credits: selectedPlan.credits,
            plan: selectedPlan.id,
            currency: order.currency,
            status: "created"
        })

        return res.status(200).json({ order, plan: selectedPlan })

    } catch (error) {
        console.error("create order error:", error)
        return res.status(500).json({ message: `create order error ${error}` })
    }
}


export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
        const userId = req.headers["x-user-id"]

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Missing payment details" })
        }

        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex")

        const genBuffer = Buffer.from(generatedSignature, "utf-8")
        const sigBuffer = Buffer.from(razorpay_signature, "utf-8")

        if (genBuffer.length !== sigBuffer.length || !crypto.timingSafeEqual(genBuffer, sigBuffer)) {
            return res.status(400).json({ message: "Payment Verification Failed" })
        }

        const payment = await Payment.findOne({ orderId: razorpay_order_id })

        if (!payment) {
            return res.status(404).json({ message: "Payment Not Found" })
        }

        if (payment.userId !== userId) {
            return res.status(403).json({ message: "Payment does not belong to user" })
        }

        if (payment.status === "paid") {
            return res.status(200).json({ message: "Payment Verified" })
        }

        payment.status = "paid"
        payment.paymentId = razorpay_payment_id
        await payment.save()

        const INTERNAL_KEY = (process.env.INTERNAL_API_KEY || "").replace(/[^\x21-\x7E]/g, "").trim();
        await axios.post(
            `${process.env.AUTH_SERVICE}/update-plan`,
            { userId: payment.userId, plan: payment.plan, credits: payment.credits },
            {
                headers: {
                    "x-internal-key": INTERNAL_KEY
                }
            }
        )

        return res.status(200).json({ message: "Payment Verified" })

    } catch (error) {
        console.error("verify payment error:", error)
        return res.status(500).json({ message: `verify payment error ${error}` })
    }
}