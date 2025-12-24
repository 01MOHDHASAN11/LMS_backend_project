export const isInstructorVerified = (req,res,next) => {
    try {
        if(!req.user.instructorVerified){
        return res.status(400).json({message:"Instructor not verified by admin"})
    }
    next()
    } catch (error) {
        res.status(500).json({message:"Server error"})
    }
}