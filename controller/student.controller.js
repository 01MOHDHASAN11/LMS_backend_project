import mongoose, { model } from "mongoose";
import authCourse from "../model/course.model";
import { courseEnrollmentModel } from "../model/enrollment.model";
import cloudinary from "../config/cloudinary.js";
import { courseReviewModel } from "../model/review.model.js";

export const getAllCourses = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50); // max 50
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    let sortOrder = -1; // default: latest
    if (req.query.sortBy === "oldest") sortOrder = 1;

    const filter = {
      status: "published",
    };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.tags) {
      filter.tags = { $in: req.query.tags.split(",") };
    }

    if (req.query.title) {
      filter.title = { $regex: req.query.title, $options: "i" };
    }

    const pipeline = [
      { $match: filter },

      {
        $lookup: {
          from: "userauths", // collection name
          localField: "instructor",
          foreignField: "_id",
          as: "instructor",
        },
      },
      { $unwind: "$instructor" },
    ];

    if (req.query.instructor) {
      pipeline.push({
        $match: {
          "instructor.name": {
            $regex: req.query.instructor,
            $options: "i",
          },
        },
      });
    }

    pipeline.push({
      $facet: {
        data: [
          {
            $sort: {
              updatedAt: sortOrder,
              publishedAt: -1,
            },
          },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              title: 1,
              description: 1,
              price: 1,
              thumbnailUrl: 1,
              category: 1,
              tags: 1,
              courseDuration: 1,
              publishedAt: 1,
              "instructor.name": 1,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    const result = await authCourse.aggregate(pipeline);

    const courses = result[0].data;
    const totalCourses = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalCourses / limit);

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalPages,
      totalCourses,
      courses,
    });
  } catch (error) {
    console.error("Get All Courses Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getCourseDetails = async (req, res) => {
  const user = req.user._id;
  const { courseId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid courseId" });
  }
  try {
    const isEnrolledUser = await courseEnrollmentModel
      .findOne({ student: user, course: courseId })
      .populate({
        path: "course",
        select:
          "title description price thumbnailUrl category tags modules instructor",
        populate: {
          path: "instructor",
          select: "name",
        },
      });
    if (!isEnrolledUser) {
      const course = await authCourse
        .findById(courseId)
        .select(
          "title description price thumbnailUrl category tags modules instructor"
        )
        .populate("instructor", "name");
      if (!course) {
        return res
          .status(404)
          .json({ success: false, message: "Course not found" });
      }
      return res.status(200).json({
        success: true,
        message: "User not enrolled",
        courseTitle: course.title,
        description: course.description,
        price: course.price,
        thumbnail: course.thumbnailUrl,
        category: course.category,
        tags: course.tags,
        modules: course.modules.map((module) => ({
          _id: module._id,
          title: module.title,
          order: module.order,
        })),
        instructor: course.instructor.name,
        isEnrolled: false,
      });
    } else {
      return res.status(200).json({
        success: true,
        message: "User is enrolled",
        courseTitle: isEnrolledUser.course.title,
        description: isEnrolledUser.course.description,
        thumbnail: isEnrolledUser.course.thumbnailUrl,
        category: isEnrolledUser.course.category,
        tags: isEnrolledUser.course.tags,
        modules: isEnrolledUser.course.modules.map((module) => ({
          title: module.title,
          _id: module._id,
          order: module.order,
          videos: module.videos.map((video) => ({
            _id: video._id,
            videoSizeInBytes: video.videoSizeInBytes,
            order: video.order,
            duration: video.duration,
            title: video.title,
          })),
        })),
        instructor: isEnrolledUser.course.instructor.name,
        isEnrolled: true,
        progress: isEnrolledUser.progress,
        isCompleted: isEnrolledUser.isCompleted,
        enrolledAt: isEnrolledUser.enrolledAt,
      });
    }
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const playVideo = async (req, res) => {
  const studentId = req.user._id;
  const { courseId, moduleId, videoId } = req.params;
  if (
    !mongoose.Types.ObjectId.isValid(courseId) ||
    !mongoose.Types.ObjectId.isValid(moduleId) ||
    !mongoose.Types.ObjectId.isValid(videoId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid courseId, moduleId or videoId",
    });
  }
  try {
    const isEnrolled = await courseEnrollmentModel.exists({
      student: studentId,
      course: courseId,
    });
    if (!isEnrolled) {
      return res
        .status(403)
        .json({ success: false, message: "User is not enrolled" });
    }
    const course = await authCourse.findById(courseId);
    if (!course || course.status !== "published") {
      return res
        .status(404)
        .json({ success: false, message: "Course not available" });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      return res
        .status(404)
        .json({ success: false, message: "Module not found" });
    }

    const video = module.videos.id(videoId);
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    const expiresIn = 600;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    const signedUrl = cloudinary.url(video.videoPublicId, {
      resource_type: "video",
      sign_url: true,
      secure: true,
      expires_at: expiresAt,
    });

    res.status(200).json({
      success: true,
      videoUrl: signedUrl,
      expiresIn,
      expiresAt,
    });
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const saveVideoProgress = async (req, res) => {
  const studentId = req.user._id;
  const { duration, moduleId, videoId, courseId, watchedSeconds } = req.body;
  if (
    !mongoose.Types.ObjectId.isValid(moduleId) ||
    !mongoose.Types.ObjectId.isValid(videoId) ||
    !mongoose.Types.ObjectId.isValid(courseId)
  ) {
    return res.status(400).json({ success: false, message: "Invalid ids" });
  }

  try {
    const enrollment = await courseEnrollmentModel.findOne({
      course: courseId,
      student: studentId,
    });
    if (!enrollment) {
      return res
        .status(403)
        .json({ success: false, message: "User not enrolled" });
    }

    const index = enrollment.videoProgress.findIndex(
      (v) => v.videoId.toString() === videoId.toString()
    );
    const safeWatchedSeconds = Math.min(Math.max(watchedSeconds, 0), duration);
    const completed = safeWatchedSeconds / duration >= 0.9;

    if (index >= 0) {
      enrollment.videoProgress[index].watchedSeconds = Math.max(
        enrollment.videoProgress[index].watchedSeconds,
        safeWatchedSeconds
      );
      enrollment.videoProgress[index].completed =
        enrollment.videoProgress[index].completed || completed;
      enrollment.videoProgress[index].lastWatchedAt = new Date();
    } else {
      enrollment.videoProgress.push({
        moduleId,
        videoId,
        completed,
        watchedSeconds: safeWatchedSeconds,
        duration,
        lastWatchedAt: new Date(),
      });
    }

    enrollment.progress = await calculateCourseProgress(enrollment);
    enrollment.isCompleted = enrollment.progress === 100;
    await enrollment.save();
    return res
      .status(200)
      .json({ success: true, message: "Video progress is saved into DB" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const enrollInCourse = async (req, res) => {
  const studentId = req.user._id;
  const { courseId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid course id" });
  }
  try {
    const course = await authCourse.findOne({
      _id: courseId,
      status: "published",
    });
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    const alreadyEnrolled = await courseEnrollmentModel.exists({
      course: courseId,
      student: studentId,
    });
    if (alreadyEnrolled) {
      return res
        .status(409)
        .json({ success: false, message: "Already enrolled" });
    }

    await courseEnrollmentModel.create({
      course: courseId,
      student: studentId,
    });

    res.status(201).json({ success: true, message: "Successfully enrolled" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const getMyEnrolledCourses = async (req, res) => {
  const studentId = req.user._id;
  try {
    const enrollment = await courseEnrollmentModel
      .find({ student: studentId })
      .populate({
        path: "course",
        select: "title thumbnailUrl category courseDuration status",
        populate: {
          path: "instructor",
          select: "name",
        },
      })
      .sort({ enrolledAt: -1 });
    if (!enrollment || enrollment.length === 0) {
      return res.status(200).json({
        success: true,
        message: "User is not enrolled in any course",
        count: 0,
        courses: [],
      });
    }
    const courses = enrollment
      .filter((e) => e.course && e.course.status === "published")
      .map((e) => ({
        courseId: e.course._id,
        title: e.course.title,
        category: e.course.category,
        thumbnailUrl: e.course.thumbnailUrl,
        instructor: e.course.instructor.name,
        courseDuration: e.course.courseDuration,
        progress: e.progress,
        isCompleted: e.isCompleted,
        enrolledAt: e.enrolledAt,
      }));
    return res
      .status(200)
      .json({ success: true, count: courses.length, courses });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const addCourseReview = async (req, res) => {
  const studentId = req.user._id;
  const { courseId } = req.params;
  const { rating, review } = req.body;
  if (rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ success: false, message: "Rating must be between 1 to 5" });
  }
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid course id" });
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const enrolled = await courseEnrollmentModel
      .findOne({
        course: courseId,
        student: studentId,
      })
      .session(session);
    if (!enrolled) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Only enrolled students are allowed to review",
      });
    }
    const course = await authCourse.findById(courseId).session(session);
    if (!course) {
      throw new Error("Course not found");
    }
    const userReview = await courseReviewModel
      .findOne({
        course: courseId,
        student: studentId,
      })
      .session(session);
    if (userReview) {
      const newAverageRating =
        (course.averageRating * course.ratingCount -
          userReview.rating +
          rating) /
        course.ratingCount;
      (userReview.rating = rating), (userReview.comment = review);
      userReview.updatedAt = new Date();
      await userReview.save({ session });
      course.averageRating = newAverageRating;
      await course.save({ session });
      await session.commitTransaction();
      return res
        .status(200)
        .json({ success: true, message: "Review updated successfully" });
    } else {
      const newAverageRating =
        (course.averageRating * course.ratingCount + rating) /
        (course.ratingCount + 1);
      await courseReviewModel.create(
        [
          {
            student: studentId,
            course: courseId,
            rating,
            comment: review,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        { session }
      );

      course.averageRating = newAverageRating;
      course.ratingCount += 1;
      await course.save({ session });
      await session.commitTransaction();
      return res
        .status(201)
        .json({ success: true, message: "Review submitted successfully" });
    }
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    session.endSession();
  }
};

export const getCourseReview = async (req, res) => {
  const { courseId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid course id" });
  }
  const limit = Math.min(parseInt(req.query.limit) || 15, 30);
  const page = Math.max(parseInt(req.query.page || 1), 1);
  const skip = (page - 1) * limit;
  let sortOrder;
  req.query.sortOrder === "oldest" ? 1 : -1;
  try {
    const courseExists = await authCourse.findById({ _id: courseId });
    if (!courseExists) {
      return res
        .status(404)
        .json({ success: false, message: "COurse not found" });
    }
    const avgRating = courseExists.averageRating
    const reviews = await courseReviewModel
      .find({ course: courseId })
      .populate({
        path: "student",
        select: "name",
      })
      .limit(limit)
      .skip(skip)
      .sort({ updatedAt: sortOrder });
    const totalReviews = await courseReviewModel.countDocuments({
      course: courseId,
    });

    return res
      .status(200)
      .json({
        success: true,
        totalReviews,
        totalPages: Math.ceil(totalReviews / limit),
        page,
        reviews,
        limit,
        avgRating
      });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
