// backend/controllers/paymentController.js
import Payment from "../models/Payment.js";
import Appointment from "../models/Appointment.js";
import LabTest from "../models/LabTest.js";
import RadiologyReport from "../models/RadiologyReport.js";
import Patient from "../models/Patient.js";
import User from "../models/User.js";
import Hospital from "../models/Hospital.js"; // For notifications, etc.
import khaltiService from "../services/khaltiService.js";
import emailService from "../services/emailService.js";
import notificationService from "../services/notificationService.js";
import mongoose from "mongoose";
import { formatDateTime, getDisplayStatus } from "../utils/helpers.js";

/**
 * Initiate payment
 * @route POST /api/payments/initiate
 * @access Private (Patient)
 */
export const initiatePayment = async (req, res) => {
  try {
    const { paymentFor, itemId, paymentMethod } = req.body;
    const user = req.user;

    const patient = await Patient.findOne({ userId: user._id });
    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient profile not found" });
    }

    let relatedTo,
      relatedId,
      amount,
      hospitalId,
      itemDetails,
      itemForNotification;

    switch (paymentFor) {
      case "appointment":
        const appointment = await Appointment.findOne({
          _id: itemId,
          patientId: patient._id,
        }).populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        });
        if (!appointment)
          return res
            .status(404)
            .json({ success: false, message: "Appointment not found" });
        if (appointment.payment.status === "completed")
          return res
            .status(400)
            .json({ success: false, message: "Payment already completed" });

        hospitalId = appointment.hospitalId;
        itemDetails = `Appointment with Dr. ${
          appointment.doctorId.userId.name
        } on ${new Date(appointment.dateTime).toLocaleString()}`;
        amount = appointment.payment.amount;
        relatedTo = "appointment";
        relatedId = appointment._id;
        itemForNotification = { name: itemDetails, type: "Appointment" };
        break;
      case "labTest":
        const labTest = await LabTest.findOne({
          _id: itemId,
          patientId: patient._id,
        });
        if (!labTest)
          return res
            .status(404)
            .json({ success: false, message: "Lab test not found" });
        if (labTest.payment.status === "completed")
          return res
            .status(400)
            .json({ success: false, message: "Payment already completed" });

        hospitalId = labTest.hospitalId;
        itemDetails = `Lab Test: ${labTest.testName}`;
        amount = labTest.payment.amount;
        relatedTo = "labTest";
        relatedId = labTest._id;
        itemForNotification = { name: labTest.testName, type: "Lab Test" };
        break;
      case "radiologyTest": // Frontend uses 'radiologyTest'
        const radiologyTest = await RadiologyReport.findOne({
          _id: itemId,
          patientId: patient._id,
        });
        if (!radiologyTest)
          return res
            .status(404)
            .json({ success: false, message: "Radiology test not found" });
        if (radiologyTest.payment.status === "completed")
          return res
            .status(400)
            .json({ success: false, message: "Payment already completed" });

        hospitalId = radiologyTest.hospitalId;
        itemDetails = `Radiology Test: ${radiologyTest.procedureType} for ${radiologyTest.bodyPart}`;
        amount = radiologyTest.payment.amount;
        relatedTo = "radiologyReport"; // Model name is RadiologyReport
        relatedId = radiologyTest._id;
        itemForNotification = {
          name: `${radiologyTest.procedureType} - ${radiologyTest.bodyPart}`,
          type: "Radiology Test",
        };
        break;
      default:
        return res
          .status(400)
          .json({ success: false, message: "Invalid payment type" });
    }

    // Create or find existing pending payment record
    let payment = await Payment.findOne({
      patientId: patient._id,
      relatedTo,
      relatedId,
      status: "pending",
      paymentMethod, // Ensure method matches if retrying
    });

    if (!payment) {
      payment = await Payment.create({
        hospitalId,
        patientId: patient._id,
        relatedTo,
        relatedId,
        amount,
        currency: "NPR",
        paymentMethod,
        status: "pending",
        createdAt: new Date(),
      });
    } else {
      // If retrying and amount changed (e.g., admin updated test cost), update payment record
      if (payment.amount !== amount) {
        payment.amount = amount;
        // payment.khaltiPidx = null; // Reset pidx if amount changes for Khalti
      }
    }

    if (paymentMethod === "khalti") {
      const customerInfo = {
        name: user.name,
        email: user.email,
        phone: user.phone || "",
      };
      const returnUrl = `${process.env.FRONTEND_URL}/payment/verify`;
      const websiteUrl = process.env.FRONTEND_URL;
      const khaltiResponse = await khaltiService.initiatePayment({
        amount: amount * 100,
        purchase_order_id: payment._id.toString(),
        purchase_order_name: itemDetails,
        customer_info: customerInfo,
        return_url: returnUrl,
        website_url: websiteUrl,
        amount_breakdown: [{ label: itemDetails, amount: amount * 100 }],
        product_details: [
          {
            identity: relatedId.toString(),
            name: itemDetails,
            total_price: amount * 100,
            quantity: 1,
            unit_price: amount * 100,
          },
        ],
      });
      if (!khaltiResponse.success) {
        // Don't delete payment record here, user might retry or it might be a temporary Khalti issue
        return res.status(500).json({
          success: false,
          message: "Failed to initiate Khalti payment",
          error: khaltiResponse.error,
        });
      }
      payment.khaltiPidx = khaltiResponse.data.pidx;
      await payment.save();
      res.status(200).json({
        success: true,
        payment: {
          id: payment._id,
          amount,
          method: "khalti",
          paymentUrl: khaltiResponse.data.payment_url,
          pidx: khaltiResponse.data.pidx,
        },
      });
    } else if (paymentMethod === "cash") {
      // No changes to payment record here, just return info
      res.status(200).json({
        success: true,
        message: "Cash payment request recorded. Please pay at reception.",
        payment: { id: payment._id, amount, method: "cash" },
      });
    } else {
      // If method is unsupported but a payment record was created, it should be handled
      return res
        .status(400)
        .json({ success: false, message: "Unsupported payment method" });
    }
  } catch (error) {
    console.error("Initiate payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate payment",
      error: error.message,
    });
  }
};

export const handleKhaltiCallback = async (req, res) => {
  try {
    const { pidx, purchase_order_id } = req.query;
    if (
      !pidx ||
      !purchase_order_id ||
      !mongoose.isValidObjectId(purchase_order_id)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid callback parameters" });
    }

    const payment = await Payment.findById(purchase_order_id);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment record not found" });
    }
    if (payment.status === "completed") {
      return res
        .status(200)
        .json({ success: true, message: "Payment already verified.", payment });
    }

    const lookupResponse = await khaltiService.verifyPayment(pidx);
    if (!lookupResponse.success) {
      payment.status = "failed";
      payment.notes = `Khalti lookup failed: ${
        lookupResponse.error || "Unknown"
      }`;
      await payment.save();
      return res.status(400).json({
        success: false,
        message: "Khalti lookup failed.",
        error: lookupResponse.error,
      });
    }

    const khaltiLookupData = lookupResponse.data;
    if (khaltiLookupData.status === "Completed") {
      if (khaltiLookupData.total_amount !== payment.amount * 100) {
        payment.status = "failed";
        payment.notes = `Amount mismatch. Expected ${
          payment.amount * 100
        }, Khalti paid ${khaltiLookupData.total_amount}.`;
        await payment.save();
        return res
          .status(400)
          .json({ success: false, message: "Payment amount mismatch." });
      }

      payment.status = "completed";
      payment.transactionId = khaltiLookupData.transaction_id;
      payment.paymentDate = new Date();
      payment.paymentDetails = khaltiLookupData; // Store full Khalti response
      payment.khaltiPidx = pidx; // Ensure pidx is stored/updated
      await payment.save();

      // Update related item status
      let relatedItemModel;
      let itemTypeForNotification;
      let itemStatusUpdate = {
        "payment.status": "completed",
        status: "confirmed",
      }; // Default for tests
      let itemForNotification;

      if (payment.relatedTo === "appointment") {
        relatedItemModel = Appointment;
        itemTypeForNotification = "Appointment";
        // For appointments, only update payment subdocument and confirm if it was 'scheduled'
        itemStatusUpdate = {
          "payment.status": "completed",
          "payment.method": "khalti",
          "payment.transactionId": khaltiLookupData.transaction_id,
          "payment.khalti_pidx": pidx,
          "payment.date": new Date(),
        };
        const appointment = await Appointment.findById(
          payment.relatedId
        ).populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        });
        if (appointment && appointment.status === "scheduled") {
          appointment.status = "confirmed";
          await appointment.save();
        }
        itemForNotification = appointment
          ? {
              name: `Appointment with Dr. ${
                appointment.doctorId?.userId?.name || "N/A"
              } on ${formatDateTime(appointment.dateTime)}`,
              type: itemTypeForNotification,
            }
          : { name: "Appointment", type: itemTypeForNotification };
      } else if (payment.relatedTo === "labTest") {
        relatedItemModel = LabTest;
        itemTypeForNotification = "Lab Test";
        const labTest = await LabTest.findById(payment.relatedId);
        itemForNotification = labTest
          ? { name: labTest.testName, type: itemTypeForNotification }
          : { name: "Lab Test", type: itemTypeForNotification };
      } else if (payment.relatedTo === "radiologyReport") {
        // Corrected from "radiologyTest"
        relatedItemModel = RadiologyReport;
        itemTypeForNotification = "Radiology Test";
        const radiologyTest = await RadiologyReport.findById(payment.relatedId);
        itemForNotification = radiologyTest
          ? {
              name: `${radiologyTest.procedureType} for ${radiologyTest.bodyPart}`,
              type: itemTypeForNotification,
            }
          : { name: "Radiology Test", type: itemTypeForNotification };
      }

      if (relatedItemModel) {
        await relatedItemModel.findByIdAndUpdate(
          payment.relatedId,
          itemStatusUpdate
        );
      }

      const patientUser = await User.findById(
        (
          await Patient.findById(payment.patientId)
        ).userId
      );
      if (patientUser) {
        await emailService.sendPaymentConfirmationEmail(patientUser, payment, {
          type: `${itemForNotification.type} Payment`,
        });
        await notificationService.createNotification({
          recipientId: patientUser._id,
          type: "payment", // General payment type for notification
          title: `${itemForNotification.type} Payment Confirmed`,
          message: `Your payment for ${itemForNotification.name} (Rs ${
            payment.amount
          }) was successful. The ${itemTypeForNotification.toLowerCase()} is now confirmed.`,
          relatedTo: {
            model:
              payment.relatedTo === "radiologyReport"
                ? "RadiologyReport"
                : relatedItemModel.modelName,
            id: payment.relatedId,
          },
          isEmail: true, // Email was already sent by sendPaymentConfirmationEmail
        });
      }
      return res.status(200).json({
        success: true,
        message: "Payment verified and confirmed.",
        payment,
      });
    } else {
      payment.status = khaltiLookupData.status?.toLowerCase() || "failed"; // Handle if status is null
      payment.notes = `Khalti payment status: ${
        khaltiLookupData.status
      }. Txn ID: ${khaltiLookupData.transaction_id || "N/A"}`;
      await payment.save();
      return res.status(400).json({
        success: false,
        message: `Payment not completed by Khalti: ${khaltiLookupData.status}`,
        payment,
      });
    }
  } catch (error) {
    console.error("Handle Khalti callback error:", error);
    if (
      req.query.purchase_order_id &&
      mongoose.isValidObjectId(req.query.purchase_order_id)
    ) {
      try {
        const payment = await Payment.findById(req.query.purchase_order_id);
        if (payment && payment.status === "pending") {
          payment.status = "failed";
          payment.notes = `Callback processing error: ${error.message}`;
          await payment.save();
        }
      } catch (updateError) {
        console.error(
          "Failed to mark payment as failed during error handling:",
          updateError
        );
      }
    }
    res.status(500).json({
      success: false,
      message: "Failed to verify Khalti callback",
      error: error.message,
    });
  }
};

export const processCashPayment = async (req, res) => {
  try {
    const { paymentId, receiptNumber, notes } = req.body;
    const payment = await Payment.findById(paymentId);

    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    if (payment.paymentMethod !== "cash")
      return res
        .status(400)
        .json({ success: false, message: "Not a cash payment" });
    if (payment.status === "completed")
      return res
        .status(400)
        .json({ success: false, message: "Payment already completed" });
    if (payment.hospitalId.toString() !== req.user.hospital.toString()) {
      return res.status(403).json({
        success: false,
        message: "Permission denied for this payment",
      });
    }

    payment.status = "completed";
    payment.paymentDate = new Date();
    payment.processedBy = req.user._id;
    payment.receiptNumber =
      receiptNumber || `RCP-${Date.now().toString().slice(-6)}`;
    if (notes) payment.notes = notes;
    await payment.save();

    let relatedItemModel;
    let itemTypeForNotification;
    let itemForNotification;

    if (payment.relatedTo === "appointment") {
      relatedItemModel = Appointment;
      itemTypeForNotification = "Appointment";
      const appointment = await Appointment.findById(
        payment.relatedId
      ).populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      });
      if (appointment && appointment.status === "scheduled") {
        appointment.status = "confirmed";
        appointment.payment.status = "completed";
        appointment.payment.method = "cash";
        appointment.payment.date = new Date();
        await appointment.save();
      }
      itemForNotification = appointment
        ? {
            name: `Appointment with Dr. ${
              appointment.doctorId?.userId?.name || "N/A"
            } on ${formatDateTime(appointment.dateTime)}`,
            type: itemTypeForNotification,
          }
        : { name: "Appointment", type: itemTypeForNotification };
    } else if (payment.relatedTo === "labTest") {
      relatedItemModel = LabTest;
      itemTypeForNotification = "Lab Test";
      await LabTest.findByIdAndUpdate(payment.relatedId, {
        status: "confirmed",
        "payment.status": "completed",
      });
      const labTest = await LabTest.findById(payment.relatedId);
      itemForNotification = labTest
        ? { name: labTest.testName, type: itemTypeForNotification }
        : { name: "Lab Test", type: itemTypeForNotification };
    } else if (payment.relatedTo === "radiologyReport") {
      // Corrected
      relatedItemModel = RadiologyReport;
      itemTypeForNotification = "Radiology Test";
      await RadiologyReport.findByIdAndUpdate(payment.relatedId, {
        status: "confirmed",
        "payment.status": "completed",
      });
      const radiologyTest = await RadiologyReport.findById(payment.relatedId);
      itemForNotification = radiologyTest
        ? {
            name: `${radiologyTest.procedureType} for ${radiologyTest.bodyPart}`,
            type: itemTypeForNotification,
          }
        : { name: "Radiology Test", type: itemTypeForNotification };
    }

    const patientUser = await User.findById(
      (
        await Patient.findById(payment.patientId)
      ).userId
    );
    if (patientUser) {
      await emailService.sendPaymentConfirmationEmail(patientUser, payment, {
        type: `${itemForNotification.type} Payment`,
      });
      await notificationService.createNotification({
        recipientId: patientUser._id,
        type: "payment",
        title: `${itemForNotification.type} Payment Confirmed`,
        message: `Your cash payment for ${itemForNotification.name} (Rs ${
          payment.amount
        }) was successful. The ${itemTypeForNotification.toLowerCase()} is now confirmed.`,
        relatedTo: {
          model:
            payment.relatedTo === "radiologyReport"
              ? "RadiologyReport"
              : relatedItemModel.modelName,
          id: payment.relatedId,
        },
        isEmail: true,
      });
    }

    res
      .status(200)
      .json({ success: true, message: "Cash payment processed.", payment });
  } catch (error) {
    console.error("Process cash payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process cash payment",
      error: error.message,
    });
  }
};

export const getPaymentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("processedBy", "name")
      .populate("hospitalId", "name"); // Populate hospitalId as well

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    let hasAccess = false;
    const userRole = req.user.role;
    const userId = req.user._id.toString();
    const userHospitalId = req.user.hospital?.toString();

    if (userRole === "superAdmin") {
      hasAccess = true;
    } else if (["admin", "receptionist"].includes(userRole)) {
      hasAccess = payment.hospitalId?._id.toString() === userHospitalId;
    } else if (userRole === "patient") {
      const patientProfile = await Patient.findOne({ userId }).lean();
      hasAccess =
        patientProfile &&
        payment.patientId?._id.toString() === patientProfile._id.toString();
    }

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    let itemDetails = {};
    if (payment.relatedTo && payment.relatedId) {
      let relatedItem;
      switch (payment.relatedTo) {
        case "appointment":
          relatedItem = await Appointment.findById(payment.relatedId)
            .populate({
              path: "doctorId",
              populate: { path: "userId", select: "name" },
            })
            .lean();
          if (relatedItem)
            itemDetails = {
              type: "Appointment",
              details: {
                doctor: relatedItem.doctorId?.userId?.name || "N/A",
                date: relatedItem.dateTime,
                status: relatedItem.status,
              },
            };
          break;
        case "labTest":
          relatedItem = await LabTest.findById(payment.relatedId).lean();
          if (relatedItem)
            itemDetails = {
              type: "Lab Test",
              details: {
                name: relatedItem.testName,
                date: relatedItem.requestDate,
                status: relatedItem.status,
              },
            };
          break;
        case "radiologyReport":
          relatedItem = await RadiologyReport.findById(
            payment.relatedId
          ).lean();
          if (relatedItem)
            itemDetails = {
              type: "Radiology Test",
              details: {
                name: `${relatedItem.procedureType} for ${relatedItem.bodyPart}`,
                date: relatedItem.requestDate,
                status: relatedItem.status,
              },
            };
          break;
      }
    }

    res
      .status(200)
      .json({ success: true, payment: { ...payment.toObject(), itemDetails } });
  } catch (error) {
    console.error("Get payment details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get payment details",
      error: error.message,
    });
  }
};

export const getPayments = async (req, res) => {
  try {
    const {
      status,
      paymentMethod,
      relatedTo,
      page = 1,
      limit = 15,
      search,
      hospitalId: queryHospitalId,
    } = req.query;
    const query = {};

    if (req.user.role === "patient") {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient)
        return res
          .status(404)
          .json({ success: false, message: "Patient profile not found" });
      query.patientId = patient._id;
      if (queryHospitalId) query.hospitalId = queryHospitalId; // Patient can filter by hospital too
    } else if (
      ["admin", "receptionist", "labTechnician", "radiologist"].includes(
        req.user.role
      )
    ) {
      query.hospitalId = req.user.hospital;
    } // SuperAdmin sees all if no hospitalId filter

    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (relatedTo) query.relatedTo = relatedTo;

    if (search) {
      const searchRegex = new RegExp(search, "i");
      // Find patients whose user name matches
      const matchingPatients = await Patient.find({
        hospitalId: query.hospitalId || req.user.hospital,
      }) // Limit search to current context if possible
        .populate({
          path: "userId",
          match: { name: searchRegex },
          select: "_id name",
        })
        .lean();

      const patientUserIds = matchingPatients
        .filter((p) => p.userId)
        .map((p) => p._id);

      const orConditions = [
        { transactionId: searchRegex },
        { receiptNumber: searchRegex },
        { notes: searchRegex },
      ];
      if (patientUserIds.length > 0) {
        orConditions.push({ patientId: { $in: patientUserIds } });
      }
      query.$or = orConditions;
    }

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("processedBy", "name")
      .populate("hospitalId", "name") // Populate hospital name for all roles
      .lean();

    const detailedPayments = await Promise.all(
      payments.map(async (payment) => {
        let itemDetails = {};
        if (payment.relatedTo && payment.relatedId) {
          let relatedItem;
          switch (payment.relatedTo) {
            case "appointment":
              relatedItem = await Appointment.findById(payment.relatedId)
                .populate({
                  path: "doctorId",
                  populate: { path: "userId", select: "name" },
                })
                .lean();
              if (relatedItem)
                itemDetails = {
                  type: getDisplayStatus(payment.relatedTo),
                  details: {
                    doctor: relatedItem.doctorId?.userId?.name || "N/A",
                    date: relatedItem.dateTime,
                    status: getDisplayStatus(relatedItem.status),
                  },
                };
              break;
            case "labTest":
              relatedItem = await LabTest.findById(payment.relatedId).lean();
              if (relatedItem)
                itemDetails = {
                  type: getDisplayStatus(payment.relatedTo),
                  details: {
                    name: relatedItem.testName,
                    date: relatedItem.requestDate,
                    status: getDisplayStatus(relatedItem.status),
                  },
                };
              break;
            case "radiologyReport": // Note: relatedTo is 'radiologyReport' in Payment model
              relatedItem = await RadiologyReport.findById(
                payment.relatedId
              ).lean();
              if (relatedItem)
                itemDetails = {
                  type: getDisplayStatus(payment.relatedTo),
                  details: {
                    name: `${relatedItem.procedureType} for ${relatedItem.bodyPart}`,
                    date: relatedItem.requestDate,
                    status: getDisplayStatus(relatedItem.status),
                  },
                };
              break;
          }
        }
        return { ...payment, itemDetails };
      })
    );

    res.status(200).json({
      success: true,
      payments: detailedPayments,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get payments",
      error: error.message,
    });
  }
};

export default {
  initiatePayment,
  handleKhaltiCallback,
  processCashPayment,
  getPaymentDetails,
  getPayments,
};

// import Payment from "../models/Payment.js";
// import Appointment from "../models/Appointment.js";
// import LabTest from "../models/LabTest.js";
// import RadiologyReport from "../models/RadiologyReport.js";
// import Patient from "../models/Patient.js";
// import User from "../models/User.js";
// import khaltiService from "../services/khaltiService.js";
// import emailService from "../services/emailService.js";
// import notificationService from "../services/notificationService.js";

// import mongoose from "mongoose";
// import Hospital from "../models/Hospital.js"; // Make sure Hospital is imported if needed for notifications

// /**
//  * Initiate payment
//  * @route POST /api/payments/initiate
//  * @access Private (Patient)
//  */
// export const initiatePayment = async (req, res) => {
//   try {
//     const { paymentFor, itemId, paymentMethod } = req.body;

//     const user = req.user;

//     // Find patient
//     const patient = await Patient.findOne({ userId: user._id });
//     if (!patient) {
//       return res.status(404).json({
//         success: false,
//         message: "Patient profile not found",
//       });
//     }

//     // Variables to store item details
//     let relatedTo,
//       relatedId,
//       amount,
//       hospitalId,
//       itemDetails,
//       relatedItemModelName;

//     // Get item details based on payment type
//     switch (paymentFor) {
//       case "appointment":
//         const appointment = await Appointment.findOne({
//           _id: itemId,
//           patientId: patient._id,
//         }).populate({
//           path: "doctorId",
//           populate: { path: "userId", select: "name" },
//         });

//         if (!appointment) {
//           return res.status(404).json({
//             success: false,
//             message: "Appointment not found",
//           });
//         }

//         if (appointment.payment.status === "completed") {
//           return res.status(400).json({
//             success: false,
//             message: "Payment already completed",
//           });
//         }

//         hospitalId = appointment.hospitalId;
//         itemDetails = `Appointment with Dr. ${
//           appointment.doctorId.userId.name
//         } on ${new Date(appointment.dateTime).toLocaleString()}`;
//         amount = appointment.payment.amount;
//         relatedTo = "appointment";
//         relatedId = appointment._id;
//         break;

//       case "labTest":
//         const labTest = await LabTest.findOne({
//           _id: itemId,
//           patientId: patient._id,
//         });

//         if (!labTest) {
//           return res.status(404).json({
//             success: false,
//             message: "Lab test not found",
//           });
//         }

//         if (labTest.payment.status === "completed") {
//           return res.status(400).json({
//             success: false,
//             message: "Payment already completed",
//           });
//         }

//         hospitalId = labTest.hospitalId;
//         itemDetails = `Lab Test: ${labTest.testName}`;
//         amount = labTest.payment.amount;
//         relatedTo = "labTest";
//         relatedId = labTest._id;
//         break;

//       case "radiologyTest":
//         const radiologyTest = await RadiologyReport.findOne({
//           _id: itemId,
//           patientId: patient._id,
//         });

//         if (!radiologyTest) {
//           return res.status(404).json({
//             success: false,
//             message: "Radiology test not found",
//           });
//         }

//         if (radiologyTest.payment.status === "completed") {
//           return res.status(400).json({
//             success: false,
//             message: "Payment already completed",
//           });
//         }

//         hospitalId = radiologyTest.hospitalId;
//         itemDetails = `Radiology Test: ${radiologyTest.procedureType} for ${radiologyTest.bodyPart}`;
//         amount = radiologyTest.payment.amount;
//         relatedTo = "radiologyReport";
//         relatedId = radiologyTest._id;
//         break;

//       default:
//         return res.status(400).json({
//           success: false,
//           message: "Invalid payment type",
//         });
//     }

//     // Handle based on payment method
//     if (paymentMethod === "khalti") {
//       // Create payment record with pending status
//       const payment = await Payment.create({
//         hospitalId,
//         patientId: patient._id,
//         relatedTo,
//         relatedId,
//         amount,
//         currency: "NPR",
//         paymentMethod: "khalti",
//         status: "pending",
//         createdAt: new Date(),
//       });

//       // Prepare customer info
//       const customerInfo = {
//         name: user.name,
//         email: user.email,
//         phone: user.phone || "",
//       };

//       // Set up return URL for Khalti
//       const returnUrl = `${process.env.FRONTEND_URL}/payment/verify`;
//       const websiteUrl = process.env.FRONTEND_URL;

//       // Initiate Khalti payment - amount is in paisa (NPR * 100)
//       const khaltiResponse = await khaltiService.initiatePayment({
//         amount: amount * 100,
//         purchase_order_id: payment._id.toString(),
//         purchase_order_name: itemDetails,
//         customer_info: customerInfo,
//         amount_breakdown: [
//           {
//             label: itemDetails,
//             amount: amount * 100,
//           },
//         ],
//         product_details: [
//           {
//             identity: relatedId.toString(),
//             name: itemDetails,
//             total_price: amount * 100,
//             quantity: 1,
//             unit_price: amount * 100,
//           },
//         ],
//         return_url: returnUrl,
//         website_url: websiteUrl,
//       });

//       if (!khaltiResponse.success) {
//         return res.status(500).json({
//           success: false,
//           message: "Failed to initiate payment with Khalti",
//           error: khaltiResponse.error,
//         });
//       }

//       // Update payment with Khalti pidx
//       payment.khaltiPidx = khaltiResponse.data.pidx;
//       await payment.save();

//       res.status(200).json({
//         success: true,
//         payment: {
//           id: payment._id,
//           amount,
//           method: "khalti",
//           paymentUrl: khaltiResponse.data.payment_url,
//           pidx: khaltiResponse.data.pidx,
//         },
//       });
//     } else if (paymentMethod === "cash") {
//       // Create cash payment (to be processed by receptionist)
//       const payment = await Payment.create({
//         hospitalId,
//         patientId: patient._id,
//         relatedTo,
//         relatedId,
//         amount,
//         currency: "NPR",
//         paymentMethod: "cash",
//         status: "pending",
//         notes: "To be paid at hospital",
//         createdAt: new Date(),
//       });

//       res.status(200).json({
//         success: true,
//         message:
//           "Cash payment request recorded. Please pay at the hospital reception.",
//         payment: {
//           id: payment._id,
//           amount,
//           method: "cash",
//         },
//       });
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: "Unsupported payment method",
//       });
//     }
//   } catch (error) {
//     console.error("Initiate payment error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to initiate payment",
//       error: error.message,
//     });
//   }
// };

// /**
//  * Handle Khalti Callback Verification (Server-Side Lookup)
//  * This endpoint is called by the frontend /payment/verify page
//  * @route GET /api/payments/verify-callback
//  * @access Private (Patient)
//  */
// export const handleKhaltiCallback = async (req, res) => {
//   try {
//     // Parameters from Khalti redirect, passed via query from frontend
//     const {
//       pidx,
//       purchase_order_id,
//       transaction_id,
//       status: khaltiStatusParam,
//       amount: khaltiAmountParam,
//     } = req.query;

//     // 1. Basic Validation
//     if (!pidx || !purchase_order_id) {
//       console.warn(
//         "Khalti callback missing pidx or purchase_order_id",
//         req.query
//       );
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid callback parameters" });
//     }

//     // Validate purchase_order_id format (Mongoose ObjectId)
//     if (!mongoose.isValidObjectId(purchase_order_id)) {
//       console.warn(
//         "Invalid purchase_order_id format in callback",
//         purchase_order_id
//       );
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid order ID format" });
//     }

//     // 2. Find Internal Payment Record
//     const payment = await Payment.findById(purchase_order_id);
//     if (!payment) {
//       console.error(
//         `Internal payment record not found for ID: ${purchase_order_id}`
//       );
//       return res
//         .status(404)
//         .json({ success: false, message: "Payment record not found" });
//     }

//     // 3. Avoid Re-processing Completed Payments
//     if (payment.status === "completed") {
//       console.log(
//         `Payment ${purchase_order_id} already completed. Skipping lookup.`
//       );
//       return res.status(200).json({
//         success: true,
//         message: "Payment already verified.",
//         payment: {
//           status: "completed",
//           transactionId: payment.transactionId,
//           amount: payment.amount,
//           date: payment.paymentDate,
//         },
//       });
//     }

//     // 4. **Crucial Step: Khalti Lookup API Call**
//     console.log(`Performing Khalti lookup for pidx: ${pidx}`);
//     const lookupResponse = await khaltiService.verifyPayment(pidx); // Use the lookup function

//     if (!lookupResponse.success) {
//       console.error(
//         `Khalti lookup failed for pidx: ${pidx}`,
//         lookupResponse.error
//       );
//       // Update internal status to failed based on lookup failure
//       payment.status = "failed";
//       payment.notes = `Khalti lookup failed: ${
//         lookupResponse.error || "Unknown reason"
//       }`;
//       await payment.save();
//       return res.status(400).json({
//         success: false,
//         message: "Payment verification failed with Khalti lookup.",
//         error: lookupResponse.error,
//       });
//     }

//     const khaltiLookupData = lookupResponse.data;
//     console.log(`Khalti lookup successful. Status: ${khaltiLookupData.status}`);

//     // 5. Process Based on *Lookup* Status
//     if (khaltiLookupData.status === "Completed") {
//       // Verify amount matches (in paisa)
//       if (khaltiLookupData.total_amount !== payment.amount * 100) {
//         console.error(
//           `Amount mismatch! Internal: ${payment.amount * 100}, Khalti: ${
//             khaltiLookupData.total_amount
//           }`
//         );
//         payment.status = "failed";
//         payment.notes = `Amount mismatch during verification. Expected ${
//           payment.amount * 100
//         }, received ${khaltiLookupData.total_amount}.`;
//         await payment.save();
//         return res.status(400).json({
//           success: false,
//           message: "Payment amount mismatch during verification.",
//         });
//       }

//       // Update internal payment record to completed
//       payment.status = "completed";
//       payment.transactionId = khaltiLookupData.transaction_id; // Use ID from lookup
//       payment.paymentDate = new Date();
//       payment.paymentDetails = khaltiLookupData; // Store full lookup response
//       await payment.save();

//       // Update related item status (Appointment, LabTest, RadiologyReport)
//       let relatedItemModel = null;
//       let updatePayload = {
//         "payment.status": "completed",
//         "payment.transactionId": khaltiLookupData.transaction_id,
//         status: "confirmed", // Set status to confirmed for tests
//       };
//       if (payment.relatedTo === "appointment") {
//         relatedItemModel = Appointment;
//         // Don't necessarily change appointment status here, just payment subdoc
//         updatePayload = {
//           "payment.status": "completed",
//           "payment.method": "khalti",
//           "payment.transactionId": khaltiLookupData.transaction_id,
//           "payment.khalti_pidx": pidx,
//           "payment.date": new Date(),
//         };
//         delete updatePayload.status; // Don't change main appointment status here
//       } else if (payment.relatedTo === "labTest") {
//         relatedItemModel = LabTest;
//       } else if (payment.relatedTo === "radiologyReport") {
//         relatedItemModel = RadiologyReport;
//       }

//       if (relatedItemModel) {
//         await relatedItemModel.findByIdAndUpdate(
//           payment.relatedId,
//           updatePayload
//         );
//       }

//       // Send Notifications/Emails
//       const patientUser = await User.findById(
//         await Patient.findById(payment.patientId).userId
//       );
//       if (patientUser) {
//         // Send specific confirmation based on type
//         const itemType =
//           payment.relatedTo === "labTest"
//             ? "Lab Test"
//             : payment.relatedTo === "radiologyReport"
//             ? "Radiology Test"
//             : "Appointment";
//         const item = await (relatedItemModel || Appointment).findById(
//           payment.relatedId
//         ); // Fetch item details for notification
//         const itemName =
//           item?.testName ||
//           `${item?.procedureType} for ${item?.bodyPart}` ||
//           `${itemType} on ${formatDateTime(item?.dateTime)}`;

//         await emailService.sendPaymentConfirmationEmail(patientUser, payment, {
//           type: `${itemType} Payment`,
//         });
//         await notificationService.createNotification({
//           recipientId: patientUser._id,
//           type:
//             payment.relatedTo === "appointment"
//               ? "payment"
//               : payment.relatedTo === "labTest"
//               ? "lab-result"
//               : "radiology-result",
//           title: `${itemType} Payment Confirmed`,
//           message: `Your payment for ${itemName} (Rs ${
//             payment.amount
//           }) was successful. The ${itemType.toLowerCase()} is now confirmed.`,
//           relatedTo: {
//             model: relatedItemModel
//               ? relatedItemModel.modelName
//               : "Appointment",
//             id: payment.relatedId,
//           },
//           isEmail: true,
//         });
//       }

//       return res.status(200).json({
//         success: true,
//         message: "Payment verified and confirmed successfully.",
//         payment: {
//           status: "completed",
//           transactionId: payment.transactionId,
//           amount: payment.amount,
//           date: payment.paymentDate,
//         },
//       });
//     } else {
//       // Handle other Khalti statuses (Pending, User canceled, Expired, Refunded, etc.)
//       console.log(
//         `Payment ${purchase_order_id} has status: ${khaltiLookupData.status}`
//       );
//       let internalStatus = "failed"; // Default to failed for non-completed
//       if (khaltiLookupData.status === "Pending") internalStatus = "pending";
//       if (khaltiLookupData.status === "User canceled")
//         internalStatus = "cancelled"; // Map to our 'cancelled' if needed, or 'failed'

//       payment.status = internalStatus;
//       payment.notes = `Khalti lookup status: ${
//         khaltiLookupData.status
//       }. Txn ID: ${khaltiLookupData.transaction_id || "N/A"}`;
//       await payment.save();

//       return res.status(400).json({
//         success: false,
//         message: `Payment not completed. Khalti status: ${khaltiLookupData.status}`,
//         payment: { status: internalStatus },
//       });
//     }
//   } catch (error) {
//     console.error("Handle Khalti callback error:", error);
//     // Attempt to mark payment as failed if an unknown error occurs
//     if (
//       req.query.purchase_order_id &&
//       mongoose.isValidObjectId(req.query.purchase_order_id)
//     ) {
//       try {
//         const payment = await Payment.findById(req.query.purchase_order_id);
//         if (payment && payment.status === "pending") {
//           payment.status = "failed";
//           payment.notes = `Callback processing error: ${error.message}`;
//           await payment.save();
//         }
//       } catch (updateError) {
//         console.error(
//           "Failed to mark payment as failed during error handling:",
//           updateError
//         );
//       }
//     }
//     res.status(500).json({
//       success: false,
//       message: "Failed to verify payment callback",
//       error: error.message,
//     });
//   }
// };

// /**
//  * Process cash payment (for receptionist)
//  * @route POST /api/payments/process-cash
//  * @access Private (Receptionist)
//  */
// export const processCashPayment = async (req, res) => {
//   try {
//     const { paymentId, receiptNumber, notes } = req.body;

//     // Find payment
//     const payment = await Payment.findById(paymentId);

//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         message: "Payment not found",
//       });
//     }

//     // Verify payment is cash and pending
//     if (payment.paymentMethod !== "cash") {
//       return res.status(400).json({
//         success: false,
//         message: "This is not a cash payment",
//       });
//     }

//     if (payment.status === "completed") {
//       return res.status(400).json({
//         success: false,
//         message: "Payment is already completed",
//       });
//     }

//     // Check if receptionist belongs to the same hospital
//     if (payment.hospitalId.toString() !== req.user.hospital.toString()) {
//       return res.status(403).json({
//         success: false,
//         message: "You do not have permission to process this payment",
//       });
//     }

//     // Update payment
//     payment.status = "completed";
//     payment.paymentDate = new Date();
//     payment.processedBy = req.user._id;
//     payment.receiptNumber =
//       receiptNumber || `REC-${Date.now().toString().slice(-6)}`;

//     if (notes) {
//       payment.notes = notes;
//     }

//     await payment.save();

//     // --- ADD THIS SECTION ---
//     // Update related item status AFTER payment confirmation
//     if (payment.status === "completed") {
//       if (payment.relatedTo === "appointment") {
//         await Appointment.findByIdAndUpdate(payment.relatedId, {
//           "payment.status": "completed",
//           "payment.method": "cash",
//           "payment.date": new Date(),
//           // status: 'confirmed' // Optionally confirm status here
//         });
//       } else if (payment.relatedTo === "labTest") {
//         await LabTest.findByIdAndUpdate(payment.relatedId, {
//           "payment.status": "completed",
//           status: "confirmed", // <-- Change status to confirmed
//         });
//         // TODO: Add notification for Lab Test Confirmed
//       } else if (payment.relatedTo === "radiologyReport") {
//         await RadiologyReport.findByIdAndUpdate(payment.relatedId, {
//           "payment.status": "completed",
//           status: "confirmed", // <-- Change status to confirmed
//         });
//         // TODO: Add notification for Radiology Test Confirmed
//       }
//     }
//     // --- END ADDED SECTION ---

//     // Notify patient
//     const patient = await Patient.findById(payment.patientId);
//     const patientUser = await User.findById(patient.userId);

//     // Modify notification content for test confirmations
//     if (
//       payment.status === "completed" &&
//       (payment.relatedTo === "labTest" ||
//         payment.relatedTo === "radiologyReport")
//     ) {
//       const itemType =
//         payment.relatedTo === "labTest" ? "Lab Test" : "Radiology Test";
//       const item =
//         payment.relatedTo === "labTest"
//           ? await LabTest.findById(payment.relatedId)
//           : await RadiologyReport.findById(payment.relatedId);
//       const itemName =
//         item?.testName ||
//         `${item?.procedureType} for ${item?.bodyPart}` ||
//         itemType;

//       if (patientUser) {
//         await notificationService.createNotification({
//           recipientId: patientUser._id,
//           type:
//             payment.relatedTo === "labTest" ? "lab-result" : "radiology-result",
//           title: `${itemType} Confirmed`,
//           message: `Your payment for ${itemName} is confirmed. The test is now scheduled for processing.`,
//           relatedTo: {
//             model:
//               payment.relatedTo === "labTest" ? "LabTest" : "RadiologyReport",
//             id: payment.relatedId,
//           },
//           isEmail: true,
//         });
//       }
//     } else if (
//       payment.status === "completed" &&
//       payment.relatedTo === "appointment"
//     ) {
//       if (patientUser) {
//         await notificationService.createPaymentNotification({
//           payment,
//           recipient: patientUser,
//           status: "completed",
//         });
//         await emailService.sendPaymentConfirmationEmail(patientUser, payment, {
//           type: "Appointment Payment",
//         });
//       }
//     }

//     res.status(200).json({
//       success: true,
//       message: "Payment processed successfully",
//       payment,
//     });
//   } catch (error) {
//     console.error("Process cash payment error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to process payment",
//       error: error.message,
//     });
//   }
// };

// /**
//  * Get payment details
//  * @route GET /api/payments/:id
//  * @access Private
//  */
// export const getPaymentDetails = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Find payment
//     const payment = await Payment.findById(id)
//       .populate("patientId", "userId")
//       .populate({
//         path: "patientId",
//         populate: { path: "userId", select: "name email" },
//       })
//       .populate("processedBy", "name");

//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         message: "Payment not found",
//       });
//     }

//     // Check access permission
//     let hasAccess = false;

//     if (req.user.role === "superAdmin") {
//       hasAccess = true;
//     } else if (req.user.role === "admin" || req.user.role === "receptionist") {
//       hasAccess =
//         payment.hospitalId.toString() === req.user.hospital.toString();
//     } else if (req.user.role === "patient") {
//       const patient = await Patient.findOne({ userId: req.user._id });
//       hasAccess =
//         patient && payment.patientId.toString() === patient._id.toString();
//     }

//     if (!hasAccess) {
//       return res.status(403).json({
//         success: false,
//         message: "You do not have permission to access this payment",
//       });
//     }

//     // Get related item details
//     let relatedItem = null;
//     switch (payment.relatedTo) {
//       case "appointment":
//         relatedItem = await Appointment.findById(payment.relatedId).populate({
//           path: "doctorId",
//           populate: { path: "userId", select: "name" },
//         });

//         if (relatedItem) {
//           relatedItem = {
//             type: "Appointment",
//             details: {
//               doctor: relatedItem.doctorId.userId.name,
//               date: relatedItem.dateTime,
//               status: relatedItem.status,
//             },
//           };
//         }
//         break;

//       case "labTest":
//         relatedItem = await LabTest.findById(payment.relatedId);
//         if (relatedItem) {
//           relatedItem = {
//             type: "Lab Test",
//             details: {
//               name: relatedItem.testName,
//               testType: relatedItem.testType,
//               status: relatedItem.status,
//             },
//           };
//         }
//         break;

//       case "radiologyReport":
//         relatedItem = await RadiologyReport.findById(payment.relatedId);
//         if (relatedItem) {
//           relatedItem = {
//             type: "Radiology Test",
//             details: {
//               procedureType: relatedItem.procedureType,
//               bodyPart: relatedItem.bodyPart,
//               status: relatedItem.status,
//             },
//           };
//         }
//         break;
//     }

//     res.status(200).json({
//       success: true,
//       payment: {
//         ...payment.toObject(),
//         relatedItem,
//       },
//     });
//   } catch (error) {
//     console.error("Get payment details error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to get payment details",
//       error: error.message,
//     });
//   }
// };

// /**
//  * Get user payments
//  * @route GET /api/payments
//  * @access Private
//  */
// export const getPayments = async (req, res) => {
//   try {
//     const {
//       status,
//       paymentMethod,
//       relatedTo,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     // Build query based on user role
//     const query = {};

//     if (req.user.role === "patient") {
//       const patient = await Patient.findOne({ userId: req.user._id });
//       if (!patient) {
//         return res.status(404).json({
//           success: false,
//           message: "Patient profile not found",
//         });
//       }
//       query.patientId = patient._id;
//     } else if (req.user.role === "admin" || req.user.role === "receptionist") {
//       query.hospitalId = req.user.hospital;
//     }

//     // Add filters
//     if (status) query.status = status;
//     if (paymentMethod) query.paymentMethod = paymentMethod;
//     if (relatedTo) query.relatedTo = relatedTo;

//     // Count total
//     const total = await Payment.countDocuments(query);

//     // Get paginated payments
//     const payments = await Payment.find(query)
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit))
//       .populate("patientId", "userId")
//       .populate({
//         path: "patientId",
//         populate: { path: "userId", select: "name email" },
//       })
//       .populate("processedBy", "name");

//     res.status(200).json({
//       success: true,
//       payments,
//       pagination: {
//         total,
//         page: Number(page),
//         pages: Math.ceil(total / limit),
//         limit: Number(limit),
//       },
//     });
//   } catch (error) {
//     console.error("Get payments error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to get payments",
//       error: error.message,
//     });
//   }
// };

// export default {
//   initiatePayment,
//   handleKhaltiCallback,
//   processCashPayment,
//   getPaymentDetails,
//   getPayments,
// };
