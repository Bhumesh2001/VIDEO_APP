######################## VIDIO APP #########################

************************ USER ROUTES ***********************

# Login/Signup routes

1. Register

   Method => POST
   Endpoint => user/register
   Body => raw => { name, email, password, mobileNumber }

2. Login

   Method => POST
   Endpoint => user/login
   Body => raw => { email, password }

3. Verify

   Method => POST
   Endpoint => user/verify
   Body => raw => { email, code }

4. Login with Googel

   Method => GET
   Endpint => user/auth/google

5. Login with Facebook

   Method => GET
   Endpoint => user/auth/facebook

# Video routes

1. Videos

   Method => GET
   Endpoint => user/videos

2. videos by category

   Method => GET
   Endpoint => user/videos/by-category
   Query Params => category=value

3. Like/Dislike video

   Method => POST
   Endpoint => user/video-like
   Body => raw => { videoId }

# Video comments routes

1. Comment video

   Method => POST
   Endpoint => user/video-comment
   Body => raw => { videoId, content }

2. Comments by video

   Method => GET
   Endpoint => user/video-comments
   Query params => videoId=value

3. Edit video comment

   Method => PUT
   Endpoint => user/video-comment-edit
   Body => raw => { videoId, commentId, content }

4. Delete video comment

   Method => DELETE
   Endpoint => user/video-comment-delete
   Body => raw => { videoId, commentId }

# Subscription routes

1. Create subscription

    Method => POST
    Endpoint => user/subscribe
    Body => raw => { categoryId, plan, price, couponCode }
    couponCode is optional, if yes then enter couponCode