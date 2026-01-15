import authCourse from "../model/course.model";

async function calculateCourseProgress(enrollment) {
  if (enrollment.videoProgress.length === 0) return 0;
  const completedVideos = enrollment.videoProgress.filter(
    (v) => v.completed
  ).length;
  const course = await authCourse.findById(enrollment.course);
  const totalVideos = course.modules.reduce((video, module) => {
    video += module.videos.length;
    return video;
  }, 0);
  return Math.round((completedVideos / totalVideos) * 100);
}
