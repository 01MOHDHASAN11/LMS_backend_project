import authCourse from "../model/course.model.js";
import redisClient from "../config/redis.js";
import cloudinary from "../config/cloudinary.js";
import { verificationRequestModel } from "../model/verificationRequest.model.js";
import { draftCourseValidation } from "../validation/draftCourse.js";
import mongoose from "mongoose";
import courseReviewRequestModel from "../model/submitCourseReviewRequest.model.js";
import * as crypto from "crypto";

export const getAllCourses = async (req, res) => {
  try {
    let cacheKey = `instructor:${req.user._id}`;
    let cacheData = await redisClient.get(cacheKey);
    if (cacheData) {
      return res.status(200).json({
        source: "cache",
        data: JSON.parse(cacheData),
      });
    }
    const instructorId = req.user._id;
    const instructorCourses = await authCourse
      .find({ instructor: instructorId })
      .populate("instructor", "name email");
    await redisClient.set(cacheKey, JSON.stringify(instructorCourses), {
      EX: 120,
    });
    res.status(200).json(instructorCourses);
  } catch (error) {
    res.status(500).json(error);
  }
};

export const updateCourse = async (req, res) => {
  try {
    const instructorId = req.user._id;
    redisClient.del(`instructor:${instructorId}`);
    const { title, description } = req.body;
    const { courseId } = req.params;
    const course = await authCourse.findById(courseId);
    if (!course)
      return res.status(404).json({ message: "NO course found by this ID" });
    if (course.instructor.toString() !== instructorId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not allowed to update this course" });
    }
    course.title = title ?? course.title;
    course.description = description ?? course.description;

    await course.save();
    res.status(200).json({ message: "Course updated", course });
  } catch (error) {
    res.status(500).json(error);
  }
};

export const instructorVerification = async (req, res) => {
  try {
    const {
      highestQualification,
      experienceYears,
      portfolioLink,
      resumeUrl,
      resumePublicId,
      bytes,
      resource_type,
    } = req.body;
    if (!resumeUrl || !resumePublicId) {
      return res.status(400).json({ message: "Resume upload required" });
    }
    const user = req.user._id;
    if (!highestQualification)
      return res
        .status(400)
        .json({ message: "Highest qualification field is required" });

    if (resource_type !== "raw") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid resource type" });
    }
    if (!resumePublicId || !resumeUrl) {
      return res.status(400).json({
        success: false,
        message: "Resume url and public id is required",
      });
    }
    if (resumeUrl.split(".").pop().toLowerCase() !== "pdf") {
      return res
        .status(400)
        .json({ success: false, message: "Only pdf file is allowed" });
    }
    if (parseInt(bytes) > 5 * 1024 * 1024) {
      return res
        .status(400)
        .json({ success: false, message: "File is too large" });
    }
    if (!resumePublicId.startsWith(`resumes/${user}`)) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized user" });
    }

    const request = await verificationRequestModel.findOne({ user });
    if (request?.status === "approved") {
      return res
        .status(200)
        .json({ success: true, message: "Already verified instructor" });
    }
    if (request?.status === "pending") {
      return res.status(400).json({
        success: false,
        message: "Request is already in pending request",
      });
    }

    await verificationRequestModel.create({
      user,
      highestQualification,
      portfolioLink,
      experienceYears,
      resumePublicId,
      resumeUrl,
    });
    res.status(202).json({ message: "Verification request created" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const viewInstructorVerificationRequests = async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const page = req.query.page || 1;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    let filter = { user: req.user._id };
    if (status) {
      filter.status = status;
    }
    const existingUser = await verificationRequestModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .populate("user", "name email status");
    const totalDocuments = await verificationRequestModel
      .find(filter)
      .countDocuments();
    // if(existingUser.length) return res.status(404).json({message:"No request"})
    res.json({
      page,
      totalPages: Math.ceil(totalDocuments / limit),
      limit,
      existingUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const MAX_DRAFT_COURSES = 20;

const SIGNATURE_CONFIG = {
  video: {
    folder: (userId) => `videos/${userId}`,
    resource_type: "video",
  },

  thumbnail: {
    folder: (userId) => `thumbnail/${userId}`,
    resource_type: "image",
  },

  resume: {
    folder: (userId) => `resumes/${userId}`,
    resource_type: "raw",
  },
};

export const getSignature = async (req, res) => {
  const { type } = req.query;
  const instructorId = req.user._id;
  const timestamp = Math.round(Date.now() / 1000);
  if (!SIGNATURE_CONFIG[type]) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid upload type" });
  }
  const params = {
    folder: SIGNATURE_CONFIG[type].folder(instructorId),
    timestamp,
  };

  try {
    const signature = crypto
      .createHash("sha1")
      .update(
        Object.keys(params)
          .sort()
          .map((key) => `${key}=${params[key]}`)
          .join("&") + process.env.CLOUDINARY_SECRET_KEY
      )
      .digest("hex");
    res.json({
      signature,
      timestamp,
      folder: params.folder,
      resourceType: SIGNATURE_CONFIG[type].resource_type,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUD_NAME,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const createCourseDraft = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const instructorId = req.user._id;
    const {
      price,
      description,
      title,
      category,
      tags,
      thumbnailUrl,
      thumbnailUrlPublicId,
      bytes,
      resourceType,
    } = req.body;

    let parsedTags = tags;
    if (typeof parsedTags === "string") {
      parsedTags = JSON.parse(tags);
    }

    const { error } = draftCourseValidation.validate({
      price,
      description,
      title,
      category,
      tags: parsedTags,
      thumbnailUrl,
      thumbnailUrlPublicId,
    });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    if (!thumbnailUrlPublicId.startsWith(`thumbnail/${instructorId}`)) {
      await cloudinary.uploader.destroy(thumbnailUrlPublicId);
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized thumbnail upload" });
    }
    const thumbnailExtension = thumbnailUrl.split(".").pop().toLowerCase();
    if (!["jpg", "jpeg", "png", "webp", "avif"].includes(thumbnailExtension)) {
      await cloudinary.uploader.destroy(thumbnailUrlPublicId);
      return res.status(400).json({
        success: false,
        message: "Only jpg jpeg png webp avif formats are allowed",
      });
    }
    if (bytes > 5 * 1024 * 1024) {
      await cloudinary.uploader.destroy(thumbnailUrlPublicId);
      return res.status(400).json({
        success: false,
        message: "Max 5 MB thumbnail size is allowed",
      });
    }
    if (resourceType != "image") {
      await cloudinary.uploader.destroy(thumbnailUrlPublicId);
      return res
        .status(400)
        .json({ success: false, message: "Only image is allowed" });
    }
    await session.withTransaction(async () => {
      const limitDraft = await authCourse
        .findOne({
          instructor: instructorId,
          status: { $in: ["draft", "review"] },
        })
        .skip(MAX_DRAFT_COURSES)
        .select({ _id: 1 })
        .session(session);

      if (limitDraft) {
        throw new Error("DRAFT_LIMIT_EXCEEDED");
      }

      await authCourse.create(
        [
          {
            instructor: instructorId,
            thumbnailUrl,
            tags: parsedTags,
            thumbnailUrlPublicId,
            price,
            description,
            title,
            category,
            modules: [],
            courseDuration: 0,
            status: "draft",
            publishedAt: null,
            createdAt: Date.now(),
          },
        ],
        { session }
      );
    });
    res.status(201).json({ message: "Course draft created successfully" });
  } catch (error) {
    if (error.message === "DRAFT_LIMIT_EXCEEDED") {
      res.status(409).json({
        message: "Too many draft or review courses.",
      });
    }
    res.status(500).json({ message: "Internal server error", error });
  } finally {
    await session.endSession();
  }
};

export const addCourseModule = async (req, res) => {
  const instructor = req.user._id;
  const { draftCourseId } = req.params;
  const { moduleTitle } = req.body;
  if (!moduleTitle || moduleTitle.trim().length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "module title is required" });
  }
  if (!mongoose.Types.ObjectId.isValid(draftCourseId)) {
    return res.status(400).json({ message: "Invalid course id" });
  }

  try {
    const result = await authCourse.updateOne(
      {
        _id: draftCourseId,
        status: "draft",
        instructor,
      },
      {
        $push: {
          modules: {
            title: moduleTitle.trim(),
            videos: [],
            moduleDuration: 0,
            order: Date.now(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Draft course not found or unauthorized",
      });
    }
    res
      .status(201)
      .json({ success: true, message: "New module created successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

export const reorderModules = async (req, res) => {
  let { moduleOrder } = req.body;
  const instructorId = req.user._id;
  const { courseId } = req.params;
  const validCourseId = mongoose.Types.ObjectId.isValid(courseId);
  if (!validCourseId) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid course id" });
  }
  if (typeof moduleOrder === "string") {
    try {
      moduleOrder = JSON.parse(moduleOrder);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "moduleOrder must be a valid json array",
      });
    }
  }
  try {
    const existingCourse = await authCourse.findOne({
      _id: courseId,
      status: "draft",
      instructor: instructorId,
    });
    if (!existingCourse)
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    if (!Array.isArray(moduleOrder) || moduleOrder.length === 0) {
      return res.status(400).json({
        success: false,
        message: "moduleOrder must be non empty array",
      });
    }
    if (moduleOrder.length !== existingCourse.modules.length) {
      return res.status(400).json({
        success: false,
        message:
          "ModuleOrder length must be equal to existing course modules length",
      });
    }
    if (new Set(moduleOrder).size !== existingCourse.modules.length) {
      return res
        .status(400)
        .json({ success: false, message: "Duplicate module ids in order" });
    }
    const existingCourseModuleIDs = existingCourse.modules.map((m) =>
      m._id.toString()
    );
    const isValidOrder =
      moduleOrder.length === existingCourse.modules.length &&
      moduleOrder.every((id) => existingCourseModuleIDs.includes(id));
    if (!isValidOrder)
      return res
        .status(400)
        .json({ success: false, message: "Invalid module order" });
    const moduleMap = new Map(
      existingCourse.modules.map((m) => [m._id.toString(), m])
    );
    existingCourse.modules = moduleOrder.map((ids, index) => {
      const module = moduleMap.get(ids);
      module.order = index + 1;
      return module;
    });

    existingCourse.updatedAt = Date.now();
    existingCourse.modules.forEach((m) => (m.updatedAt = Date.now()));
    await existingCourse.save();
    return res.status(200).json({
      success: true,
      message: "Module reorder successfully",
      modules: existingCourse.modules,
    });
  } catch (error) {
    if (error.message === "Invalid module id in order") {
      return res
        .status(400)
        .json({ success: false, message: "Module id not found in course" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

export const reorderVideos = async (req, res) => {
  const instructorId = req.user._id;
  let { videoOrder } = req.body;
  const { courseId, moduleId } = req.params;
  if (
    !mongoose.Types.ObjectId.isValid(courseId) ||
    !mongoose.Types.ObjectId.isValid(moduleId) ||
    !mongoose.Types.ObjectId.isValid(instructorId)
  ) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid id format" });
  }
  if (!Array.isArray(videoOrder) || videoOrder.length === 0) {
    return res.status(400).json({ message: "videoOrder must be an array" });
  }
  if (!courseId || !moduleId) {
    return res
      .status(400)
      .json({ success: false, message: "courseId and moduleId are required" });
  }

  try {
    const existingCourse = await authCourse.findOne({
      _id: courseId,
      status: "draft",
      instructor: instructorId,
    });
    if (!existingCourse) {
      return res
        .status(400)
        .json({ success: false, message: "Course not found" });
    }
    const existingModule = existingCourse.modules.find(
      (item) => item._id.toString() === moduleId.toString()
    );
    if (!existingModule) {
      return res.status(400).json({
        success: false,
        message: "Module not found",
      });
    }

    if (
      existingModule.videos.length !== videoOrder.length ||
      existingModule.videos.length !== new Set(videoOrder).size
    ) {
      return res.status(400).json({
        success: false,
        message:
          "videoOrder must contain all videos exactly once (no duplicates)",
      });
    }
    const videoIds = existingModule.videos.map((v) => v._id.toString());
    const existingModuleMap = new Map(
      existingModule.videos.map((video) => [video._id.toString(), video])
    );
    const validVideoIds = videoOrder.every((id) => videoIds.includes(id));
    if (!validVideoIds) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ids",
      });
    }

    existingModule.videos = videoOrder.map((module, index) => {
      const video = existingModuleMap.get(module);
      if (!video) {
        throw new Error("Invalid video ids in videoOrder");
      }
      (video.order = index + 1), (video.updatedAt = Date.now());
      return video;
    });
    existingModule.updatedAt = Date.now();
    await existingCourse.save();
    return res.status(200).json({
      success: true,
      message: "Video reordered successfully",
    });
  } catch (error) {
    console.error(error);
    if (error.message === "Invalid video ids in videoOrder") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteModule = async (req, res) => {
  const session = await mongoose.startSession();
  let updatedCourse;
  session.startTransaction();
  let { courseId, moduleId } = req.params;
  let instructorId = req.user._id;
  if (
    !mongoose.Types.ObjectId.isValid(courseId) ||
    !mongoose.Types.ObjectId.isValid(moduleId)
  ) {
    await session.abortTransaction();
    return res
      .status(400)
      .json({ success: false, message: "Invalid courseId or moduleId" });
  }
  try {
    const existingCourse = await authCourse
      .findOne({
        instructor: instructorId,
        status: "draft",
        _id: courseId,
      })
      .session(session);
    if (!existingCourse) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Course not found" });
    }
    const existingModule = existingCourse.modules.find(
      (modId) => modId._id.toString() === moduleId.toString()
    );
    if (!existingModule) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Module not found" });
    }

    const result = await authCourse.updateOne(
      {
        _id: courseId,
        instructor: instructorId,
        status: "draft",
      },
      {
        $pull: { modules: { _id: moduleId } },
      },
      { session }
    );
    if (result.modifiedCount === 0) {
      await session.abortTransaction();
      return res
        .status(409)
        .json({ success: false, message: "Video already deleted" });
    }
    updatedCourse = await authCourse
      .findOne({ _id: courseId, instructor: instructorId, status: "draft" })
      .session(session);
    updatedCourse.modules = updatedCourse.modules.map((mod, index) => {
      (mod.order = index + 1), (mod.updatedAt = Date.now());
      return mod;
    });
    updatedCourse.courseDuration = updatedCourse.modules.reduce(
      (currTime, time) => currTime + (time.moduleDuration || 0),
      0
    );
    updatedCourse.updatedAt = Date.now();
    await updatedCourse.save({ session });
    await session.commitTransaction();

    if (existingModule.videos.length > 0) {
      try {
        await Promise.allSettled(
          existingModule.videos.map((video) => {
            if (video.videoPublicId) {
              return cloudinary.uploader.destroy(video.videoPublicId, {
                resource_type: "video",
              });
            }
          })
        );
      } catch (error) {
        console.log("cloudinary video cleanup error: ", error);
      }
    }

    res.status(200).json({
      success: true,
      message: "Module deleted successfully",
      modules: updatedCourse.modules,
      courseDuration: updatedCourse.courseDuration,
    });
  } catch (error) {
    console.error("Error: ", error);
    await session.abortTransaction();
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    session.endSession();
  }
};

export const deleteVideo = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const { courseId, moduleId, videoId } = req.params;
  const instructorId = req.user._id;
  if (
    !mongoose.Types.ObjectId.isValid(courseId) ||
    !mongoose.Types.ObjectId.isValid(moduleId) ||
    !mongoose.Types.ObjectId.isValid(videoId)
  ) {
    await session.abortTransaction();
    return res.status(400).json({
      success: false,
      message: "Invalid courseId, moduleId or videoId",
    });
  }
  try {
    const existingCourse = await authCourse
      .findOne({
        _id: courseId,
        instructor: instructorId,
        status: "draft",
      })
      .session(session);
    if (!existingCourse) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Course not found",
        success: false,
      });
    }
    const existingModule = existingCourse.modules.find(
      (module) => module._id.toString() === moduleId.toString()
    );
    if (!existingModule) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Module not found" });
    }
    const existingVideo = existingModule.videos.find(
      (video) => video._id.toString() === videoId.toString()
    );
    if (!existingVideo) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Video not found" });
    }

    const result = await authCourse.updateOne(
      {
        _id: courseId,
        instructor: instructorId,
        status: "draft",
      },
      {
        $pull: { "modules.$[module].videos": { _id: existingVideo._id } },
      },
      {
        arrayFilters: [
          {
            "module._id": mongoose.Types.ObjectId.createFromHexString(moduleId),
          },
        ],
        session,
      }
    );

    if (result.modifiedCount === 0) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: "Video already deleted",
      });
    }

    const updatedVideo = await authCourse
      .findOne({
        _id: courseId,
        instructor: instructorId,
        status: "draft",
      })
      .session(session);

    const module = updatedVideo.modules.find(
      (module) => module._id.toString() === moduleId.toString()
    );
    module.videos = module.videos.map((video, index) => {
      video.order = index + 1;
      video.updatedAt = Date.now();
      return video;
    });

    const moduleDuration = module.videos.reduce(
      (currDuration, video) => currDuration + (video.duration || 0),
      0
    );
    module.moduleDuration = moduleDuration;
    module.updatedAt = Date.now();
    const courseDuration = updatedVideo.modules.reduce(
      (courseDuration, course) => courseDuration + course.moduleDuration,
      0
    );
    updatedVideo.courseDuration = courseDuration;
    updatedVideo.updatedAt = Date.now();
    await updatedVideo.save({ session });
    await session.commitTransaction();
    res.status(200).json({
      success: true,
      message: "Video deleted successfully",
      video: module.videos,
    });
    try {
      await cloudinary.uploader.destroy(existingVideo.videoPublicId, {
        resource_type: "video",
      });
    } catch (error) {
      console.error("Error cloudinary video cleanup: ", error);
    }
  } catch (error) {
    console.error("Error: ", error);
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    session.endSession();
  }
};

export const addVideo = async (req, res) => {
  const instructorId = req.user._id;
  const { courseId, moduleId } = req.params;
  let {
    title,
    videoSecureUrl,
    videoPublicId,
    videoDuration,
    videoSizeInBytes,
    format,
    resourceType,
  } = req.body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Title is required" });
  }

  if (
    !mongoose.Types.ObjectId.isValid(courseId) ||
    !mongoose.Types.ObjectId.isValid(moduleId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid courseId or moduleId",
    });
  }
  if (
    resourceType !== "video" ||
    !["mp4", "webm", "mov", "avi", "mkv", "ogv"].includes(format)
  ) {
    await cloudinary.uploader.destroy(videoPublicId, {
      resource_type: resourceType,
    });
  }
  const newVideo = {
    title: title.trim(),
    videoUrl: videoSecureUrl,
    videoPublicId,
    duration: videoDuration,
    videoSizeInBytes,
    order: Date.now(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  try {
    const result = await authCourse.findOneAndUpdate(
      {
        _id: courseId,
        status: "draft",
        instructor: instructorId,
      },
      {
        $push: {
          "modules.$[mod].videos": newVideo,
        },
        $inc: {
          "modules.$[mod].moduleDuration": videoDuration,
        },
        $set: {
          "modules.$[mod].updatedAt": new Date(),
        },
      },
      {
        arrayFilters: [{ "mod._id": moduleId }],
        new: true,
      }
    );

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Course or module not found" });
    }
    res
      .status(201)
      .json({ success: true, message: "Video uploaded successfully" });
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteDraftedCourse = async (req, res) => {
  const instructorId = req.user._id;
  const { courseId } = req.params;
  try {
    const course = await authCourse.findOneAndDelete({
      _id: courseId,
      status: "draft",
      instructor: instructorId,
    });
    if (course) {
      const deletePromises = [];
      if (course.thumbnailPublicId) {
        deletePromises.push(
          cloudinary.uploader.destroy(course.thumbnailPublicId, {
            resource_type: "image",
          })
        );
      }

      const videoDelete = course.modules.flatMap((module) => {
        module.videos.map((video) => {
          cloudinary.uploader.destroy(video.videoPublicId, {
            resource_type: "video",
          });
        });
      });

      const allPromises = [...deletePromises, ...videoDelete];
      await Promise.all(allPromises);
      res
        .status(200)
        .json({ success: true, message: "Course deleted successfully" });
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Either course not found or not in draft state",
      });
    }
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const submitCourseReview = async (req, res) => {
  const instructorId = req.user._id;
  let { courseId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid courseId" });
  }
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const existingCourse = await authCourse
      .findOne({
        _id: courseId,
        instructor: instructorId,
      })
      .session(session);

    if (existingCourse.status !== "draft") {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Course not found or not in draft state",
      });
    }

    if (existingCourse.modules.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Course modules can't be empty",
      });
    }

    if (existingCourse.modules.some((items) => items.videos.length === 0)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Modules must have at least one video",
      });
    }
    const pendingCourseRequest = await courseReviewRequestModel
      .findOne({
        course: courseId,
        instructor: instructorId,
        status: "pending",
      })
      .session(session);
    if (pendingCourseRequest) {
      await session.commitTransaction();
      return res
        .status(200)
        .json({ success: false, message: "review request already pending" });
    }
    const lastRequest = await courseReviewRequestModel
      .findOne({ course: courseId, instructor: instructorId })
      .sort({ version: -1 })
      .session(session);
    const nextRequest = lastRequest ? lastRequest.version + 1 : 1;

    await courseReviewRequestModel.create(
      [
        {
          instructor: instructorId,
          course: existingCourse._id,
          submittedAt: new Date(),
          version: nextRequest,
          status: "pending",
          instructorName: req.user.name,
          instructorEmail: req.user.email,
          courseTitle: existingCourse.title,
        },
      ],
      { session }
    );

    existingCourse.status = "review";
    existingCourse.submittedForReviewAt = new Date();
    await existingCourse.save({ session });

    await session.commitTransaction();
    res.status(201).json({
      success: true,
      message: "course review request has been submitted",
    });
  } catch (error) {
    console.error("Error: ", error);
    await session.abortTransaction();
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    session.endSession();
  }
};

export const getCourseAnalytics = async (req, res) => {
  const instructorId = req.user._id;
  // console.log(req.user);
  const { courseId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid courseId" });
  }
  try {
    const analytics = await authCourse.aggregate([
      {
        $match: {
          instructor: instructorId,
          _id: new mongoose.Types.ObjectId(courseId),
        },
      },
      {
        $lookup: {
          from: "enrollments",
          localField: "_id",
          foreignField: "course",
          as: "enrollments",
        },
      },
      {
        $project: {
          title: 1,
          status: 1,
          averageRating: 1,
          ratingCount: 1,
          totalEnrollment: { $size: "$enrollments" },
        },
      },
    ]);

    if (!analytics.length) {
      return res
        .status(400)
        .json({ success: false, message: "Course not found or unauthorized" });
    }

    res.status(200).json({ success: true, analytics: analytics[0] });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getInstructorCourseReview = async (req, res) => {
  const instructor = req.user._id;
  const { courseId } = req.params;
  const page = Math.max(1,parseInt(req.query.page) || 1)
  const limit = Math.min(50,Math.max(parseInt(req.query.limit) || 1))
  const skip = (page-1)*limit
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid course id" });
  }
  try {
    const result = await authCourse.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(courseId),
          instructor,
        },
      },
      {
        $lookup: {
          from: "coursereviews",
          localField: "_id",
          foreignField: "course",
          as: "reviews",
        },
      },
      { $unwind: "$reviews" },
      {
        $lookup: {
          from: "userauths",
          localField: "$reviews.student",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $project: {
          _id: 0,
          student: "$student.name",
          rating: "$reviews.rating",
          comment: "$reviews.comment",
          reviewedAt: "$reviews.updatedAt",
        },
      },
      {
        $facet: {
          data:[
            {
              $sort:{reviewedAt:-1},
            },
            {
              $skip:skip
            },
            {
              $limit:limit
            }
          ],
          totalCount:[
            {
              $count:"totalReviews"
            }
          ]
        }
      },
    ]);

    if (!result.length) {
      return res
        .status(400)
        .json({ success: false, message: "Course not found or unauthorized" });
    }
    const reviews = result[0].data
    const totalReviews = result[0].totalCount[0].totalReviews || 0
    res.status(200).json({
      success:true,
      page,
      limit,
      totalReviews,
      reviews,
      totalPages:Math.ceil(totalReviews/limit)
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
