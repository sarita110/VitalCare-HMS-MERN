// routes/devRoutes.js
import express from "express";
import User from "../models/User.js";
import SuperAdmin from "../models/SuperAdmin.js";

const router = express.Router();

router.post("/create-super-admin", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Create user with superAdmin role
    const user = await User.create({
      name,
      email,
      password,
      role: "superAdmin",
      isVerified: true, // assuming we want to skip verification here
    });

    // Create associated SuperAdmin record
    await SuperAdmin.create({
      userId: user._id,
      role: "master", // or 'limited' based on what you need
    });

    res.status(201).json({
      success: true,
      message: "Super admin created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Super admin creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create super admin",
      error: error.message,
    });
  }
});

export default router;
