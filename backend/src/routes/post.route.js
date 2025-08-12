import express from "express";
import {
  createPost,
  getPost,
  getPosts,
  getUserPosts,
} from "../controllers/post.controller";
import { protectRoute } from "../middleware/auth.middleware";
import upload from "../middleware/upload.middleware";

const router = express.Router();

router.get("/", getPosts);
router.get("/:postId", getPost);
router.get("/user/:username", getUserPosts);

router.post("/", protectRoute, upload.single("image"), createPost);

export default router;
