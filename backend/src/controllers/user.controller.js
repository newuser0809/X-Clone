import User from "../models/user.model.js";
import asyncHandler from "express-async-handler";
import { clerkClient, getAuth } from "@clerk/express";
import Notification from "../models/notification.model.js";

export const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized access" });
  }

  const user = await User.findOneAndUpdate({ clerkId: userId }, req.body, {
    new: true,
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json(user);
});

export const syncUser = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const existingUser = await User.findOne({ clerkId: userId });

  if (existingUser) {
    return res
      .status(200)
      .json({ user: existingUser, message: "User already exists" });
  }
  const clerkUser = await clerkClient.users.getUser(userId);
  const userData = {
    clerkId: clerkUser.id,
    email: clerkUser.emailAddresses[0].emailAddress,
    firstName: clerkUser.firstName || "",
    lastName: clerkUser.lastName || "",
    username: clerkUser.emailAddresses[0].emailAddress.split("@")[0],
    profilePicture: clerkUser.imageURL || "",
  };

  const newUser = await User.create(userData);
  res.status(201).json({ user: newUser, message: "User synced successfully" });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const user = await User.findOne({ clerkId: userId });

  if (!user) return res.status(404).json({ error: "User not found" });
  res.status(200).json({ user });
});

export const followUser = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { targetUserId } = req.params;

  if (userId === targetUserId) {
    return res.status(400).json({ message: "You cannot follow yourself" });
  }
  if (!userId || !targetUserId) {
    return res.status(400).json({ message: "Invalid request" });
  }

  const currentUser = await User.findOne({ clerkId: userId });
  const targetUser = await User.findById(targetUserId);

  if (!targetUser || !currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const isFollowing = currentUser.following.includes(targetUserId);

  if (isFollowing) {
    await User.findByIdAndUpdate(currentUser._id, {
      $pull: { following: targetUserId },
    });
    await User.findByIdAndUpdate(targetUser._id, {
      $pull: { followers: currentUser._id },
    });
  } else {
    await User.findByIdAndUpdate(currentUser._id, {
      $push: {
        following: targetUserId,
      },
    });
    await User.findByIdAndUpdate(targetUser._id, {
      $push: {
        followers: currentUser._id,
      },
    });
  }

  await Notification.create({
    from: currentUser._id,
    to: targetUser._id,
    type: "follow",
  });

  res.status(200).json({
    message: isFollowing ? "Unfollowed successfully" : "Followed successfully",
  });
});
