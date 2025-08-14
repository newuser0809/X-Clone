import express from "express";

import {
  createCommnet,
  deleteComment,
  getComments,
} from "../controllers/comment.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/post/:postId", getComments);

router.post("/post/:postId", protectRoute, createCommnet);
router.delete("/:commentId", protectRoute, deleteComment);
export default router;
