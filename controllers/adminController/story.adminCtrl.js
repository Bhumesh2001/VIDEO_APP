const Story = require('../../models/adminModel/story.adminModel');
const { checkUrl } = require('../../utils/uploadImage');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

exports.createStoryByAdmin = async (req, res) => {
    
    const { video, ...data } = req.body;
    const videoFile = req.files?.video;

    let storyData = {
        userId: req.admin._id,
        public_id: '',
        video: '',
        ...data,
    };

    try {

        // Validate video URL if no video file is provided
        if (!videoFile && !checkUrl(video)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid URL format',
            });
        };

        // Check if a story with the same title exists
        const existingStory = await Story.findOne({ title: data.title });
        if (existingStory) {
            return res.status(409).json({
                success: false,
                message: 'Story already exists!',
            });
        };

        // Handle video upload
        if (videoFile) {
            try {
                // Upload large video files efficiently
                let videoResult = await cloudinary.uploader.upload_large(videoFile.tempFilePath, {
                    resource_type: 'video',
                    chunk_size: 6000000,
                });

                console.log('Cloudinary Upload Response:', videoResult);

                if (videoResult && videoResult.public_id && videoResult.secure_url) {
                    console.log(videoResult.secure_url, videoResult.public_id, '==============');

                    storyData.public_id = videoResult.public_id;
                    storyData.video = videoResult.secure_url;

                    // Remove temp file after uploading
                    fs.unlinkSync(videoFile.tempFilePath);
                } else {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to get public_id or secure_url from Cloudinary response',
                    });
                }

            } catch (error) {
                console.error('Error uploading video file:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading video file',
                    error: error.message,
                });
            }
        } else {
            storyData.video = video;
        };

        // Create and save the story
        const story = new Story(storyData);
        await story.save();

        return res.status(200).json({
            success: true,
            message: 'Story created successfully...',
            story,
        });

    } catch (error) {
        console.error('Server error:', error);

        // Cleanup if the video has been uploaded but story creation fails
        if (storyData.public_id) {
            try {
                await cloudinary.uploader.destroy(storyData.public_id, { resource_type: 'video' });
            } catch (cleanupError) {
                console.error('Error deleting video from Cloudinary:', cleanupError);
            }
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: validationErrors,
            });
        }

        // General server error
        return res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    }
};

exports.getAllStoriesByAdmin = async (req, res) => {
    try {
        const stories = await Story.find({});
        if (!stories) {
            return res.status(404).json({
                success: false,
                message: 'Stories not found!',
            });
        };
        res.status(200).json({
            success: true,
            message: 'Stories fetched successfully...',
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

exports.getSingleStoryByAdmin = async (req, res) => {
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

exports.updateStoryByAdmin = async (req, res) => {
    const { storyId } = req.query;
    const { video, ...data } = req.body;

    const videoFile = req.files.video;

    let storyData = {
        public_id: '',
        video: '',
        ...data
    };
    try {

        const story_ = await Story.findOne({ _id: storyId, userId: req.admin._id });
        if (!story_) {
            return res.status(404).json({
                success: false,
                message: "Story not found!",
            });
        };

        if (videoFile || video) {
            try {
                await cloudinary.uploader.destroy(story_.public_id, {
                    resource_type: 'video',
                });
            } catch (cleanupError) {
                console.error('Error deleting video from Cloudinary:', cleanupError);
            };

            if (videoFile) {
                try {
                    const videoResult = await cloudinary.uploader.upload(videoFile.tempFilePath, {
                        resource_type: 'video',
                        chunk_size: 6000000,
                    });

                    storyData.public_id = videoResult.public_id;
                    storyData.video = videoResult.secure_url;

                    fs.unlinkSync(videoFile.tempFilePath);

                } catch (error) {
                    console.error('Error uploading video file:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Error uploading video file',
                        error: error.message,
                    });
                }
            }
            else if (video) {
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
                };
            };
        };

        const story = await Story.findOneAndUpdate(
            { _id: storyId, userId: req.admin._id },
            storyData,
            { new: true, runValidators: true, }
        );
        if (!story) {
            return res.status(404).json({
                success: true,
                message: 'story not found!',
            });
        };

        res.status(200).json({
            success: false,
            message: 'Story updated successfully...',
            story,
        });

    } catch (error) {
        console.log(error);
        try {
            await cloudinary.uploader.destroy(storyData.public_id, {
                resource_type: 'video',
            });
        } catch (cleanupError) {
            console.error('Error deleting video from Cloudinary:', cleanupError);
        };

        res.status(500).json({
            success: false,
            message: 'Error occured during updating the story',
            error: error.message,
        });
    };
};

exports.deleteStoryByAdmin = async (req, res) => {
    try {
        const { storyId } = req.query;

        const story = await Story.findByIdAndDelete(storyId);
        if (!story) {
            return res.status(404).json({
                success: true,
                message: 'story not found!',
            });
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