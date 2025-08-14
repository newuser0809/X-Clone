import asyncHandler from "express-async-handler";
import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { getAuth } from "@clerk/express";

export const getComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!postId) {
    return res.status(400).json({ message: "Post ID is required" });
  }

  const comments = await Comment.find({ post: postId })
    .populate("user", "username firstName lastName profilePicture")
    .sort({ createdAt: -1 });

  res.status(200).json({ comments });
});

export const createCommnet = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { userId } = getAuth(req);
  const { content } = req.body;

  if (!content || content.trim() === "") {
    return res.status(400).json({ message: "Comment content is required" });
  }

  const post = await Post.findById(postId);
  const user = await User.findOne({ clerkId: userId });

  if (!post || !user) {
    return res.status(404).json({ message: "Post or User not found" });
  }

  const comment = await Comment.create({
    post: postId,
    user: user._id,
    content,
  });

  await Post.findByIdAndUpdate(postId, { $push: { comments: comment._id } });

  if (post.user.toString() !== user._id.toString()) {
    await Notification.create({
      from: user._id,
      to: post.user,
      type: "comment",
      post: postId,
      comment: comment._id,
    });
  }

  res.status(201).json({ comment });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { userId } = getAuth(req);

  const comment = await Comment.findById(commentId);
  const user = await User.findOne({ clerkId: userId });
  if (!comment || !user) {
    return res.status(404).json({ message: "Comment or User not found" });
  }

  if (comment.user.toString() !== user._id.toString()) {
    return res
      .status(403)
      .json({ message: "You can only delete your own comments" });
  }

  await Post.findByIdAndUpdate(comment.post, {
    $pull: { comments: comment._id },
  });

  await Comment.findByIdAndDelete(commentId);

  res.status(200).json({ message: "Comment deleted successfully" });
});
