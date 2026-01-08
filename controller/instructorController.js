import authCourse from "../model/course.model.js";
import redisClient from "../config/redis.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import { verificationRequestModel } from "../model/verificationRequest.model.js";
import { draftCourseValidation } from "../validation/draftCourse.js";
import mongoose from "mongoose";
import courseReviewRequestModel from "../model/submitCourseReviewRequest.model.js";
import { uploadQueue } from "../queues/upload.queue.js";
import * as crypto from 'crypto';



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

export const getCloudinarySignature = async (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);

  const params = {
    folder: "resumes",
    resource_type: "raw",
    allowed_formats: "pdf",
    max_file_size: 5 * 1024 * 1024,
    timestamp,
  };

  const signature = crypto
    .createHash("sha1")
    .update(
      Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&") + process.env.CLOUDINARY_SECRET_KEY
    )
    .digest("hex");

  res.status(200).json({
    timestamp,
    signature,
    cloudName: process.env.CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder: "resumes",
    resource_type: "raw",
    allowed_formats: "pdf",
    max_file_size: 5 * 1024 * 1024,
  });
};

export const instructorVerification = async (req, res) => {
  try {
    const { highestQualification, experienceYears, portfolioLink, resumeUrl, resumePublicId } = req.body;
    if(!resumeUrl || !resumePublicId){
      return res.status(400).json({message:"Resume upload required"})
    }
    const user = req.user._id;
    if (!highestQualification)
      return res
        .status(400)
        .json({ message: "Highest qualification field is required" });

    // const result = await cloudinary.uploader.upload(req.file.path, {
    //   resource_type: "auto",
    //   folder: "resumes"
    // });
    // fs.unlinkSync(req.file.path);
    const existing = await verificationRequestModel.findOne({user,status:"pending"})
    if(existing){
      return res.status(400).json({success:false,message:"Your verification request is already pending"})
    }
    await uploadQueue.add("instructor-data",{
      user,
      highestQualification,
      experienceYears,
      portfolioLink,
      status:"pending",
      resumeUrl,
      resumePublicId
    },{
      attempts:3,
      backoff:{type:"exponential",delay:5000},
      removeOnComplete:true
    })
    res.status(202).json({ message: "Verification request created" });
  } catch (error) {
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
export const createCourseDraft = async (req, res) => {
  const session = await mongoose.startSession();
  let uploadResult = null;
  try {
    let parsedTags;
    try {
      parsedTags = JSON.parse(req.body.tags);
    } catch (error) {
      return res.status(400).json({ message: "Invalid tags format" });
    }
    const instructorId = req.user._id;
    const { price, description, title, category } = req.body;
    const thumbnailUrl = req.file;
    if (!thumbnailUrl) {
      return res.status(400).json({ message: "Thumbnail is required" });
    }
    const { error } = draftCourseValidation.validate({
      ...req.body,
      tags: parsedTags,
    });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "thumbnail",
      resource_type: "auto",
      access_mode: "public",
    });
    await session.withTransaction(async () => {
      const limitDraft = await authCourse
        .findOne({
          instructor: instructorId,
          status: { $in: ["draft", "review", "archived"] },
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
            thumbnailUrl: uploadResult.secure_url,
            tags: parsedTags,
            thumbnailUrlPublicId: uploadResult.public_id,
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
        message:
          "Too many draft or review courses. Please publish existing courses first.",
      });
    }
    if (uploadResult?.public_id) {
      await cloudinary.uploader.destroy(uploadResult.public_id);
    }
    res.status(500).json({ message: "Internal server error", error });
  } finally {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    session.endSession();
  }
};

export const addCourseModule = async (req, res) => {
  const instructor = req.user._id;
  const { draftCourseId } = req.params;
  const { title, videoTitles } = req.body;
  const files = req.files;
  let uploadedVideos;

  if (!mongoose.Types.ObjectId.isValid(draftCourseId)) {
    return res.status(400).json({ message: "Invalid course id" });
  }
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return res
      .status(400)
      .json({ message: "Title is required and its type must be string" });
  }
  if (!videoTitles) {
    return res.status(400).json({ message: "videoTitles are required" });
  }
  const parsedVideoTitles = JSON.parse(videoTitles);
  const normalizedVideoTitles = Array.isArray(parsedVideoTitles)
    ? parsedVideoTitles
    : [parsedVideoTitles];
  if (normalizedVideoTitles.length !== files.length) {
    return res.status(400).json({
      message: "Number of video titles must match number of uploaded videos",
    });
  }

  const course = await authCourse.findOne({
    instructor,
    status: "draft",
    _id: draftCourseId,
  });
  if (!files || files.length === 0) {
    return res.status(400).json({ message: "At least one video is required" });
  }
  const moduleTitle = title.trim();
  if (!moduleTitle) {
    return res.status(400).json({ message: "Module title is required" });
  }
  if (!course) {
    return res.status(404).json({ message: "Draft course not found" });
  }
  const moduleOrder = course.modules.length + 1;

  try {
    uploadedVideos = await Promise.all(
      files.map((file, index) =>
        cloudinary.uploader
          .upload(file.path, {
            folder: "videos",
            resource_type: "video",
          })
          .then((result) => ({
            title: normalizedVideoTitles[index].trim(),
            videoUrl: result.secure_url,
            videoPublicId: result.public_id,
            videoSizeInBytes: result.bytes,
            order: index + 1,
            duration: result.duration,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }))
      )
    );
    const newModule = {
      title: moduleTitle,
      videos: uploadedVideos,
      moduleDuration: uploadedVideos.reduce(
        (seconds, video) => seconds + (video.duration || 0),
        0
      ),
      order: moduleOrder,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    course.modules.push(newModule);
    course.courseDuration = course.modules.reduce(
      (total, module) => total + (module.moduleDuration || 0),
      0
    );
    await course.save();
    res.status(201).json({ message: "Module created successfully" });
  } catch (error) {
    if (uploadedVideos?.length) {
      await Promise.all(
        uploadedVideos.map((videos) => {
          return cloudinary.uploader.destroy(videos.videoPublicId, {
            resource_type: "video",
          });
        })
      );
    }
    res.status(500).json({ message: "Internal server error", error });
  } finally {
    files.forEach((file) => {
      fs.unlink(file.path, () => {});
    });
  }
};

export const reorderModules = async (req, res) => {
  let { moduleOrder } = req.body;
  const instructorId = req.user._id;
  const { courseId } = req.params;
  const validCourseId = mongoose.Types.ObjectId.isValid(courseId);
  if (!validCourseId){
      return res
      .status(400)
      .json({ success: false, message: "Invalid course id" });
  }
    if(typeof moduleOrder === "string"){
        try {
            moduleOrder = JSON.parse(moduleOrder)
        } catch (error) {
            return res.status(400).json({
                success:false,
                message:"moduleOrder must be a valid json array"
            })
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
    if(moduleOrder.length!==existingCourse.modules.length){
      return res.status(400).json({
        success:false,
        message:"ModuleOrder length must be equal to existing course modules length"
      })
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

export const reorderVideos = async (req,res) => {
    const instructorId = req.user._id
    let {videoOrder} = req.body
    const {courseId,moduleId} = req.params
    if(!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(moduleId) || !mongoose.Types.ObjectId.isValid(instructorId)){
      return res.status(400).json({status:false,message:"Invalid id format"})
    }
    if(!Array.isArray(videoOrder) || videoOrder.length===0){
        return res.status(400).json({message:"videoOrder must be an array"})
    }
    if(!courseId || !moduleId){
        return res.status(400).json({success:false,message:"courseId and moduleId are required"})
    }

    try {
        const existingCourse = await authCourse.findOne({
            _id:courseId,
            status:"draft",
            instructor:instructorId
        })
        if(!existingCourse){
            return res.status(400).json({success:false,message:"Course not found"})
        }
        const existingModule = existingCourse.modules.find((item)=>item._id.toString()===moduleId.toString())
        if(!existingModule){
            return res.status(400).json({
                success:false,
                message:"Module not found"
            })
        }

        if(existingModule.videos.length !== videoOrder.length || existingModule.videos.length !== new Set(videoOrder).size){
            return res.status(400).json({
                success:false,
                message:"videoOrder must contain all videos exactly once (no duplicates)"
            })
        }
        const videoIds = existingModule.videos.map(v=>v._id.toString())
        const existingModuleMap = new Map(existingModule.videos.map(video=>[video._id.toString(),video]))
        const validVideoIds = videoOrder.every((id)=>videoIds.includes(id))
        if(!validVideoIds){
            return res.status(400).json({
                success:false,
                message:"Invalid video ids"
            })
        }

        existingModule.videos = videoOrder.map((module,index)=>{
            const video = existingModuleMap.get(module)
            if(!video){
              throw new Error("Invalid video ids in videoOrder")
            }
            video.order=index+1,
            video.updatedAt=Date.now()
            return video
        })
        existingModule.updatedAt = Date.now()
        await existingCourse.save()
        return res.status(200).json({
            success:true,
            message:"Video reordered successfully"
        })
    } catch (error) {
      console.error(error)
      if(error.message==="Invalid video ids in videoOrder"){
        return res.status(409).json({
          success:false,
          message:error.message
        })
      }
        res.status(500).json({
            success:false,
            message:"Internal server error"
        })
    }

}

export const deleteModule = async (req,res) => {
  const session = await mongoose.startSession()
  let updatedCourse
  session.startTransaction()
  let {courseId,moduleId} = req.params
  let instructorId = req.user._id
  if(!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(moduleId)){
    await session.abortTransaction()
    return res.status(400).json({success:false,message:"Invalid courseId or moduleId"})
  }
  try {
    const existingCourse = await authCourse.findOne({
      instructor:instructorId,
      status:"draft",
      _id:courseId
    }).session(session)
    if(!existingCourse){
      await session.abortTransaction()
      return res.status(400).json({success:false,message:"Course not found"})
    }
    const existingModule = existingCourse.modules.find((modId)=>modId._id.toString()===moduleId.toString())
    if(!existingModule){
      await session.abortTransaction()
      return res.status(400).json({success:false,message:"Module not found"})
    }

    const result = await authCourse.updateOne(
      {
      _id:courseId,
      instructor:instructorId,
      status:"draft"
      },
      {
        $pull:{modules:{_id:moduleId}}
      }, 
      {session}
  )
    if(result.modifiedCount===0){
      await session.abortTransaction()
      return res.status(409).json(
        {success:false,message:"Video already deleted"}
      )
    }
    updatedCourse = await authCourse.findOne({_id:courseId,instructor:instructorId,status:"draft"}).session(session)
    updatedCourse.modules = updatedCourse.modules.map((mod,index)=>{
      mod.order=index+1,
      mod.updatedAt=Date.now()
      return mod
    })
    updatedCourse.courseDuration = updatedCourse.modules.reduce((currTime,time)=>currTime+(time.moduleDuration || 0),0)
    updatedCourse.updatedAt = Date.now()
    await updatedCourse.save({session})
    await session.commitTransaction()

    if(existingModule.videos.length>0){
      try {
        await Promise.allSettled(
      existingModule.videos.map((video)=>{
        if(video.videoPublicId){
          return cloudinary.uploader.destroy(video.videoPublicId,{
            resource_type:"video"
          })
        }
      })
    )
      } catch (error) {
        console.log("cloudinary video cleanup error: ",error)
      }
    }

    res.status(200).json(
      {
        success:true,
        message:"Module deleted successfully",
        modules:updatedCourse.modules,
        courseDuration:updatedCourse.courseDuration
      })
  } catch (error) {
    console.error("Error: ",error)
    await session.abortTransaction()
    res.status(500).json({success:false,message:"Internal server error"})
  }
  finally{
    session.endSession()
  }
}

export const deleteVideo = async (req,res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  const {courseId,moduleId,videoId} = req.params
  const instructorId = req.user._id
  if(!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(moduleId) || !mongoose.Types.ObjectId.isValid(videoId)){
    await session.abortTransaction()
    return res.status(400).json({success:false,message:"Invalid courseId, moduleId or videoId"})
  }
  try {
    const existingCourse = await authCourse.findOne({
      _id:courseId,
      instructor:instructorId,
      status:"draft"
    }).session(session)
    if(!existingCourse){
      await session.abortTransaction()
      return res.status(400).json({
        message:"Course not found",
        success:false
      })
    }
    const existingModule = existingCourse.modules.find((module)=>module._id.toString()===moduleId.toString())
    if(!existingModule){
      await session.abortTransaction()
      return res.status(400).json({success:false,message:"Module not found"})
    }
    const existingVideo = existingModule.videos.find((video)=>video._id.toString()===videoId.toString())
    if(!existingVideo){
      await session.abortTransaction()
      return res.status(400).json({success:false,message:"Video not found"})
    }

    const result = await authCourse.updateOne(
      {
      _id:courseId,
      instructor:instructorId,
      status:"draft"
    },
    {
      $pull:{"modules.$[module].videos":{_id:existingVideo._id}}
    },
    {
      arrayFilters:[{"module._id": mongoose.Types.ObjectId.createFromHexString(moduleId)}],
      session
    }
  )

  if(result.modifiedCount===0){
    await session.abortTransaction()
    return res.status(409).json({
      success:false,
      message:"Video already deleted"
    })
  }

  const updatedVideo = await authCourse.findOne({
    _id:courseId,
    instructor:instructorId,
    status:"draft"
  }).session(session)

  const module = updatedVideo.modules.find((module)=>module._id.toString()===moduleId.toString())
  module.videos = module.videos.map((video,index)=>{
    video.order=index+1
    video.updatedAt=Date.now()
    return video
  })

  const moduleDuration = module.videos.reduce((currDuration,video)=>currDuration+(video.duration || 0),0)
  module.moduleDuration = moduleDuration
  module.updatedAt = Date.now()
  const courseDuration = updatedVideo.modules.reduce((courseDuration,course)=>courseDuration+course.moduleDuration,0)
  updatedVideo.courseDuration = courseDuration
  updatedVideo.updatedAt = Date.now()
  await updatedVideo.save({session})
  await session.commitTransaction()
  res.status(200).json({
    success:true,
    message:"Video deleted successfully",
    video:module.videos
  })
  try {
    await cloudinary.uploader.destroy(existingVideo.videoPublicId,{resource_type:"video"})
  } catch (error) {
    console.error("Error cloudinary video cleanup: ",error)
  }
  } catch (error) {
    console.error("Error: ",error)
    if(session.inTransaction()){
      await session.abortTransaction()
    }
    res.status(500).json({success:false,message:"Internal server error"})
  }
  finally{
    session.endSession()
  }
}

export const addVideo = async (req,res) => {

  const instructorId = req.user._id
  const {courseId,moduleId} = req.params
  let {title} = req.body
  const videoFile = req.file

  if(!title || typeof title!=="string" || title.trim().length===0){
    return res.status(400).json({success:false,
      message:"Title is required"
    })
  }

  if(!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(moduleId)){
    return res.status(400).json({
      success:false,
      message:"Invalid courseId or moduleId"
    })
  }
  if(!videoFile){
    return res.status(400).json({
      success:false,
      message:"Video file is required"
    })
  }

    let uploadedVideo
    try {
      // Video upload to cloudinary
      uploadedVideo = await cloudinary.uploader.upload(videoFile.path,{resource_type:"video",folder:"videos"})

    } catch (error) {
      console.error("Cloudinary upload error: ",error);
      return res.status(409).json({success:false,message:"Unable to upload video"})
    }
  // console.log(uploadedVideo)
  const session = await mongoose.startSession();
  try {
    session.startTransaction()
    const existingCourse = await authCourse.findOne({
      _id:courseId,
      instructor:instructorId,
      status:"draft"
    }).session(session)
    if(!existingCourse){
      await session.abortTransaction()
      return res.status(400).json({success:false,
        message:"Course not found"
      })
    }

    const existingModule = existingCourse.modules.find((module)=>module._id.toString()===moduleId.toString())
    if(!existingModule){
      await session.abortTransaction()
      return res.status(400).json({success:false,message:"Module not found"})
    }
    let order = existingModule.videos.length+1
    const videoDetails = {
      title,
      videoUrl:uploadedVideo.secure_url,
      videoPublicId:uploadedVideo.public_id,
      duration:uploadedVideo.duration,
      videoSizeInBytes:uploadedVideo.bytes,
      createdAt:new Date(),
      updatedAt:new Date(),
      order
    }
    await authCourse.updateOne(
      {
        _id:courseId,
        status:"draft",
        instructor:instructorId,
        "modules._id":moduleId
      },
      {
        $push:{"modules.$.videos":videoDetails},
        $inc:{"modules.$.moduleDuration":(uploadedVideo.duration || 0),
          courseDuration:( uploadedVideo.duration || 0)
        }
      },
      {session}
  )
    await session.commitTransaction()
    res.status(201).json({success:true,
      message:"Video uploaded successfully",
      updatedVideo:videoDetails
    })

  } catch (error) {
    console.error("Error: ",error)
    if(session.inTransaction()){
      await session.abortTransaction()
    }
    res.status(500).json({
      success:false,
      message:"Internal server error"
    })
  }
  finally{
    session.endSession()
  }
}

export const submitCourseReview = async (req,res) => {
  const instructorId = req.user._id
  let {courseId} = req.params
  if(!mongoose.Types.ObjectId.isValid(courseId)){
    return res.status(400).json({success:false,message:"Invalid courseId"})
  }
  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    const existingCourse = await authCourse.findOne({
      _id:courseId,
      instructor:instructorId,
    }).session(session)

    if(existingCourse.status!=="draft"){
      await session.abortTransaction()
      return res.status(404).json({
        success:false,
        message:"Course not found or not in draft state"
      })
    }

    if(existingCourse.modules.length===0){
      await session.abortTransaction()
      return res.status(400).json({
        success:false,
        message:"Course modules can't be empty"
      })
    }

    if(existingCourse.modules.some((items)=>items.videos.length===0)){
      await session.abortTransaction()
        return res.status(400).json({
          success:false,
          message:"Modules must have at least one video"
        })
    }
    const pendingCourseRequest = await courseReviewRequestModel.findOne({course:courseId,instructor:instructorId,status:"pending"}).session(session)
    if(pendingCourseRequest){
      await session.commitTransaction()
      return res.status(200).json({success:false,message:"review request already pending"})
    }
    const lastRequest = await courseReviewRequestModel.findOne({course:courseId,instructor:instructorId}).sort({version:-1}).session(session)
    const nextRequest = lastRequest?lastRequest.version+1:1


    await courseReviewRequestModel.create([{
      instructor:instructorId,
      course:existingCourse._id,
      submittedAt:new Date(),
      version:nextRequest,
      status:"pending",
      instructorName:req.user.name,
      instructorEmail:req.user.email,
      courseTitle:existingCourse.title
    }],{session})
    
    existingCourse.status="review"
    existingCourse.submittedForReviewAt = new Date()
    await existingCourse.save({session})

    await session.commitTransaction()
    res.status(201).json({success:true,message:"course review request has been submitted"})
  } catch (error) {
    console.error("Error: ",error)
    await session.abortTransaction()
    res.status(500).json({success:false,message:"Internal server error"})
  }
  finally{
     session.endSession()
  }
}