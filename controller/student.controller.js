import mongoose, { model } from "mongoose";
import authCourse from "../model/course.model"
import { courseEnrollmentModel } from "../model/enrollment.model";
import cloudinary from "../config/cloudinary.js";


export const getAllCourses = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50); // max 50
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    let sortOrder = -1; // default: latest
    if (req.query.sortBy === "oldest") sortOrder = 1;

    const filter = {
      status: "published"
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
          as: "instructor"
        }
      },
      { $unwind: "$instructor" }
    ];

    if (req.query.instructor) {
      pipeline.push({
        $match: {
          "instructor.name": {
            $regex: req.query.instructor,
            $options: "i"
          }
        }
      });
    }

    pipeline.push({
      $facet: {
        data: [
          {
            $sort: {
              updatedAt: sortOrder,
              publishedAt: -1
            }
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
              "instructor.name": 1
            }
          }
        ],
        totalCount: [
          { $count: "count" }
        ]
      }
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
      courses
    });

  } catch (error) {
    console.error("Get All Courses Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const getCourseDetails = async (req,res) => {
  const user = req.user._id
  const {courseId} = req.params
  if(!mongoose.Types.ObjectId.isValid(courseId)){
    return res.status(400).json({success:false,message:"Invalid courseId"})
  }
  try {
    const isEnrolledUser = await courseEnrollmentModel.findOne({student:user,course:courseId}).populate({
      path:"course",
      select:"title description price thumbnailUrl category tags modules instructor",
      populate:{
        path:"instructor",
        select:"name"
      }
    })
    if(!isEnrolledUser){
      const course = await authCourse.findById(courseId).select("title description price thumbnailUrl category tags modules instructor").populate("instructor","name")
      if(!course){
        return res.status(404).json({success:false,message:"Course not found"})
      }
      return res.status(200).json({
        success:true,
        message:"User not enrolled",
        courseTitle:course.title,
        description:course.description,
        price:course.price,
        thumbnail:course.thumbnailUrl,
        category:course.category,
        tags:course.tags,
        modules:course.modules.map((module)=>({_id:module._id,title:module.title,order:module.order})),
        instructor:course.instructor.name,
        isEnrolled:false,
      })
    }
    else{
      return res.status(200).json({
        success:true,
        message:"User is enrolled",
        courseTitle:isEnrolledUser.course.title,
        description:isEnrolledUser.course.description,
        thumbnail:isEnrolledUser.course.thumbnailUrl,
        category:isEnrolledUser.course.category,
        tags:isEnrolledUser.course.tags,
        modules:isEnrolledUser.course.modules.map((module)=>({
          title:module.title,
          _id:module._id,
          order:module.order,
          videos:module.videos.map((video)=>({
            _id:video._id,
            videoSizeInBytes:video.videoSizeInBytes,
            order:video.order,
            duration:video.duration,
            title:video.title
          }))
        })),
        instructor:isEnrolledUser.course.instructor.name,
        isEnrolled:true,
        progress:isEnrolledUser.progress,
        isCompleted:isEnrolledUser.isCompleted,
        enrolledAt:isEnrolledUser.enrolledAt
      })
    }
  } catch (error) {
    console.error("Error: ",error)
    res.status(500).json({success:false,message:"Internal server error"})
  }
}

export const playVideo = async(req,res) => {
  const studentId = req.user._id
  const {courseId,moduleId,videoId} = req.params
  if(!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(moduleId) || !mongoose.Types.ObjectId.isValid(videoId)){
    return res.status(400).json({success:false,message:"Invalid courseId, moduleId or videoId"})
  }
  try {
    const isEnrolled = await courseEnrollmentModel.exists({student:studentId,course:courseId})
    if(!isEnrolled){
      return res.status(403).json({success:false,message:"User is not enrolled"})
    }
    const course = await authCourse.findById(courseId)
    if(!course || course.status!=="published"){
      return res.status(404).json({success:false,message:"Course not available"})
    }
    
    const module = course.modules.id(moduleId)
    if(!module){
      return res.status(404).json({success:false,message:"Module not found"})
    }

    const video = module.videos.id(videoId)
    if(!video){
      return res.status(404).json({success:false,message:"Video not found"})
    }

    const expiresIn = 600
    const expiresAt = Math.floor(Date.now()/1000)+expiresIn

    const signedUrl = cloudinary.url(video.videoPublicId,{
      resource_type:"video",
      sign_url:true,
      secure:true,
      expires_at:expiresAt
    })


    res.status(200).json(
      {
        success:true,
        videoUrl:signedUrl,
        expiresIn,
        expiresAt
      }
    )

  } catch (error) {
    console.error("Error: ",error)
    res.status(500).json({success:false,message:"Internal server error"})
  }
}

export const saveVideoProgress = async(req,res) => {
  const studentId = req.user._id
  const {duration,moduleId,videoId,courseId,watchedSeconds} = req.body
  if(!mongoose.Types.ObjectId.isValid(moduleId) || !mongoose.Types.ObjectId.isValid(videoId) || !mongoose.Types.ObjectId.isValid(courseId)){
    return res.status(400).json({success:false,message:"Invalid ids"})
  }

  try {
    const enrollment = await courseEnrollmentModel.findOne({course:courseId,student:studentId})
    if(!enrollment){
      return res.status(403).json({success:false,message:"User not enrolled"})
    }

    const index = enrollment.videoProgress.findIndex(v=>v.videoId.toString()===videoId.toString())
    const safeWatchedSeconds = Math.min(Math.max(watchedSeconds,0),duration)
    const completed = (safeWatchedSeconds/duration)>=0.9

    if(index>=0){
      enrollment.videoProgress[index].watchedSeconds = Math.max(enrollment.videoProgress[index].watchedSeconds,safeWatchedSeconds)
      enrollment.videoProgress[index].completed = enrollment.videoProgress[index].completed || completed
      enrollment.videoProgress[index].lastWatchedAt = new Date()
    }
    else{
      enrollment.videoProgress.push({
        moduleId,
        videoId,
        completed,
        watchedSeconds:safeWatchedSeconds,
        duration,
        lastWatchedAt:new Date()
      })

    }

    enrollment.progress = await calculateCourseProgress(enrollment)
    enrollment.isCompleted = enrollment.progress===100
    await enrollment.save()
    return res.status(200).json({success:true,message:"Video progress is saved into DB"})
  } catch (error) {
    console.error(error)
    res.status(500).json({success:false,message:"Internal server error"})
  }
}