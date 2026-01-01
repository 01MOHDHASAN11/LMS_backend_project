import authCourse from "../model/course.model"


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
          from: "userauth", // collection name
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

    // ---------------------------
    // Response
    // ---------------------------
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


