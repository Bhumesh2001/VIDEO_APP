const Story = require('../../models/adminModel/story.adminModel');
const { checkUrl } = require('../../utils/uploadImage');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

exports.createStory = async (req, res) => {
    const { video, ...data } = req.body;

    let storyData = {
        userId: req.user._id,
        public_id: '',
        video: '',
        ...data,
    };

    try {
        const videoFile = req.files?.video;  // Check if video file exists

        if (!videoFile && !video) {
            return res.status(400).json({
                success: false,
                message: 'A video file or valid video URL must be provided',
            });
        }

        // If video URL is provided, validate it
        if (!videoFile && !checkUrl(video)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid URL format',
            });
        }

        // Check if the story title already exists
        const existingStory = await Story.findOne({ title: data.title });
        if (existingStory) {
            return res.status(409).json({
                success: false,
                message: 'Story with this title already exists!',
            });
        }

        // If video file exists, upload it to Cloudinary
        if (videoFile) {
            try {
                const videoResult = await cloudinary.uploader.upload(videoFile.tempFilePath, {
                    resource_type: 'video',
                    chunk_size: 6000000,
                });

                storyData.public_id = videoResult.public_id;
                storyData.video = videoResult.secure_url;

                fs.unlinkSync(videoFile.tempFilePath);  // Remove temp file
            } catch (error) {
                console.error('Error uploading video file:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading video file',
                    error: error.message,
                });
            }
        }
        // If video URL is provided, use the URL directly (no need to re-upload to Cloudinary)
        else if (video) {
            storyData.video = video;
        };

        // Create and save the story in the database
        const story = new Story(storyData);
        await story.save();

        return res.status(200).json({
            success: true,
            message: 'Story created successfully',
            story,
        });

    } catch (error) {
        console.error(error);

        // If a video was uploaded to Cloudinary but there's an error, delete the video from Cloudinary
        if (storyData.public_id) {
            try {
                await cloudinary.uploader.destroy(storyData.public_id, { resource_type: 'video' });
            } catch (cleanupError) {
                console.error('Error deleting video from Cloudinary:', cleanupError);
            }
        }

        // Validation error handling
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: validationErrors,
            });
        };

        // Server error handling
        return res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    };
};

exports.getAllStories = async (req, res) => {
    try {
        const stories = await Story.aggregate([
            {
                $project: {
                    userId: 1,
                    title: 1,
                    vide: 1,
                    caption: 1,
                    views: 1,
                    likes: 1,
                    TotalViews: { $size: "$views" },
                    TotalViews: { $size: "$likes" },
                    duration: 1,
                    expirationTime: 1,
                }
            }
        ]);
        const totalStories = await Story.countDocuments();
        if (stories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Stories not found!',
            });
        };
        res.status(200).json({
            success: true,
            message: 'Stories fetched successfully...',
            totalStories,
            stories,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    };
};

exports.getSingleStory = async (req, res) => {
    try {
        const { storyId } = req.query;

        const story = await Story.findById(storyId);
        if (!story) {
            return res.status(404).json({
                success: false,
                message: 'story not found',
            });
        };

        res.status(200).json({
            success: true,
            message: 'Story fetched successfully...',
            story,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error occured during fetching the story',
            error: error.message,
        });
    };
};

exports.updateStory = async (req, res) => {
    const { storyId } = req.query;
    const { video, ...data } = req.body;

    try {
        // Fetch the story with the given ID and user ID
        const story_ = await Story.findOne({ _id: storyId, userId: req.user._id });
        if (!story_) {
            return res.status(404).json({
                success: false,
                message: 'Story not found!',
            });
        }

        // Prepare the story data with existing values
        let storyData = {
            public_id: story_.public_id,
            video: story_.video,
            ...data
        };

        const videoFile = req.files?.video;

        // Only attempt to destroy the old video if a new one (file or URL) is provided
        if (videoFile || video) {
            try {
                await cloudinary.uploader.destroy(story_.public_id, {
                    resource_type: 'video',
                });
            } catch (cleanupError) {
                console.error('Error deleting video from Cloudinary:', cleanupError);
            }

            if (videoFile) {
                try {
                    const videoResult = await cloudinary.uploader.upload(videoFile.tempFilePath, {
                        resource_type: 'video',
                        chunk_size: 6000000,
                    });

                    storyData.public_id = videoResult.public_id;
                    storyData.video = videoResult.secure_url;

                    // Remove temp file
                    fs.unlinkSync(videoFile.tempFilePath);

                } catch (error) {
                    console.error('Error uploading video file:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Error uploading video file',
                        error: error.message,
                    });
                }
            } else if (video) {
                try {
                    const videoResult = await cloudinary.uploader.upload(video, {
                        resource_type: 'video',
                    });

                    storyData.public_id = videoResult.public_id;
                    storyData.video = videoResult.secure_url;

                } catch (error) {
                    console.error('Error uploading video URL:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Error uploading video URL',
                        error: error.message,
                    });
                }
            }
        }

        // Update the story with new data
        const updatedStory = await Story.findOneAndUpdate(
            { _id: storyId, userId: req.user._id },
            storyData,
            { new: true, runValidators: true }
        );

        if (!updatedStory) {
            return res.status(404).json({
                success: false,
                message: 'Story not found!',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Story updated successfully...',
            story: updatedStory,
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Error occurred during updating the story',
            error: error.message,
        });
    }
};

exports.deleteStory = async (req, res) => {
    try {
        const { storyId } = req.query || req.body;

        const story = await Story.findOneAndDelete({ userId: req.user._id, _id: storyId });
        if (!story) {
            return res.status(404).json({
                success: true,
                message: 'story not found!',
            });
        };

        try {
            await cloudinary.uploader.destroy(story.public_id, {
                resource_type: 'video',
            });
        } catch (cleanupError) {
            console.error('Error deleting video from Cloudinary:', cleanupError);
        };

        res.status(200).json({
            success: false,
            message: 'Story deleted successfully...',
            story,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error occured during deletng the story',
            error: error.message,
        });
    };
};