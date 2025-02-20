const navBar = document.getElementById('nav-bar_');
const uploadMethodRadios = document.querySelectorAll('input[name="uploadMethod"]');
const videoUploadField = document.getElementById("videoUploadField");
const videoUrlField = document.getElementById("videoUrlField");
const successModal = new bootstrap.Modal(document.getElementById('successModal'));
const thumbnailInput = document.getElementById("thumbnail_");
const imageInput = document.getElementById("image");
const thumbnailPreview = document.getElementById("thumbnailPreview");
const videoFileInput = document.getElementById("video_");
const videoUrlInput = document.getElementById("video-url_");

// const baseUrl = 'https://digital-vle.onrender.com';
const baseUrl = 'http://localhost:3001';
let token_;

// Sample data for the chart
const labels = [
    "User123",
    "User456",
    "User789",
    "User101",
    "User202",
    "User303",
    "User404",
];
const data = {
    labels: labels,
    datasets: [
        {
            label: "Revenue Amount ($)",
            data: [100, 200, 150, 250, 300, 180, 400],
            backgroundColor: "#3f37c9",
            borderColor: "#6162dc", // Darker blue
            borderWidth: 1,
        },
        {
            label: "Projected Revenue ($)",
            data: [120, 180, 220, 300, 250, 320, 380],
            backgroundColor: "#e9c46a",
            borderColor: "#e9c46a",
            borderWidth: 1,
        },
        {
            label: "Potential Revenue ($)",
            data: [150, 250, 300, 400, 350, 420, 450],
            backgroundColor: "#db3545",
            borderColor: "#db3545",
            borderWidth: 1,
        },
    ],
};
const config = {
    type: "bar",
    data: data,
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: "rgba(255, 255, 255, 0.1)",
                },
                title: {
                    display: true,
                    text: "Revenue ($)",
                    color: "#ffffff",
                },
            },
            x: {
                grid: {
                    color: "rgba(255, 255, 255, 0.1)",
                },
                title: {
                    display: true,
                    text: "Users",
                    color: "#ffffff",
                },
            },
        },
        plugins: {
            legend: {
                labels: {
                    color: "#ffffff",
                },
            },
        },
    },
};

// Render the chart
if (doesElementExist('#dashboard')) {
    new Chart(document.getElementById("revenueChart"), config);
};

// toggle button
document.querySelector('.toggle-btn').addEventListener('click', () => {
    const sideBar = document.querySelector('.sidebar');
    sideBar.classList.toggle('d-none');
});

// Add click event to all sidebar links
document.querySelectorAll('.sidebar-link').forEach(function (link) {
    link.addEventListener('click', function () {
        // Remove active class and styles from all links
        document.querySelectorAll('.sidebar-link').forEach(function (item) {
            item.classList.remove('active');
        });

        // Add active class and styles to the clicked link
        this.classList.add('active');

        // Save the active link index in localStorage
        localStorage.setItem('activeSidebarLink', this.dataset.index);
    });
});

// On page load, set the active link from localStorage or default to Dashboard
document.addEventListener('DOMContentLoaded', function () {
    const activeIndex = localStorage.getItem('activeSidebarLink');
    const defaultIndex = "1"; // Set the default index for Dashboard
    const indexToUse = activeIndex || defaultIndex;

    // Set the active link
    const activeLink = document.querySelector(`.sidebar-link[data-index="${indexToUse}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        activeLink.style.backgroundColor = '#ff002b';
        activeLink.style.borderLeft = '4px solid white';
        activeLink.style.color = 'white';
    }
});

// load body data
document.querySelectorAll('.card-body').forEach((card) => {
    card.addEventListener('click', (event) => {
        const target = card.getAttribute('data-target');
        if (target) {
            const sidebarLink = document.querySelector(target);
            if (sidebarLink) {
                sidebarLink.click();
            };
        };
    });
});

document.addEventListener("DOMContentLoaded", () => {
    // ✅ Handle Edit Button Clicks
    document.body.addEventListener("click", async (event) => {
        if (!event.target.classList.contains("edit-class")) return;

        const editId = event.target.getAttribute("data-id");
        const sectionId = event.target.getAttribute("data-section-id");
        const formId = event.target.getAttribute("data-form-id");
        const backBtnId = event.target.getAttribute("data-back-btn-id");
        const editBtnId = event.target.getAttribute('data-edit-btn-id');

        const section = document.getElementById(sectionId);
        const form = document.getElementById(formId);

        toggleVisibility(section, form);
        document.getElementById(backBtnId).addEventListener("click", () => goBack(section, form));

        document.getElementById(editBtnId).setAttribute('data-edit-id', editId);

        // ✅ Dynamically Call the Right Function
        const loadFunctions = {
            video: loadEditVideoData,
            article: loadEditArticleData,
            users: loadEditUserData,
            categories: loadEditCategoryData,
            stories: loadEditStoryData,
            subscriptions: loadEditSubscriptionData,
            coupons: loadEditCouponData,
            banners: loadEditBannerData
        };

        if (loadFunctions[sectionId]) {
            await loadFunctions[sectionId](editId);
        }
    });

    // ✅ Handle File Previews (Image & Video)
    document.body.addEventListener("change", (event) => {
        const fileInput = event.target;
        if (!fileInput || !fileInput.files.length) return;

        const previewIdMap = {
            "thumbnail_": "thumbnailPreview",
            "image": "thumbnailPreview",
            "image_": "thumbnailPreview",
            "_image": "thumbnailPreview",
            "bannerLink_": "thumbnailPreview"
        };

        if (previewIdMap[fileInput.id]) {
            const preview = document.getElementById(previewIdMap[fileInput.id]);
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = "block";
            };
            reader.readAsDataURL(fileInput.files[0]);
        }
    });

    // ✅ Handle Video Preview
    document.body.addEventListener("change", (event) => {
        if (event.target.id !== "video_") return;
        const file = event.target.files[0];
        if (!file) return;

        const allowedFormats = ["video/mp4", "video/webm", "video/ogg"];
        if (!allowedFormats.includes(file.type)) {
            alert("Unsupported video format! Use MP4, WebM, or Ogg.");
            return;
        }

        const blobUrl = URL.createObjectURL(file);
        const videoPreview = document.getElementById("videoPreview");
        updateVideoPreview(blobUrl);

        videoPreview.onloadeddata = () => setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    });

    // ✅ Handle Video URL Input
    document.body.addEventListener("input", (event) => {
        if (event.target.id === "video-url_") {
            let url = event.target.value.trim();
            if (url && isYouTubeUrl(url)) updateVideoPreview(url);
        }
    });
});

// ✅ Function to Convert ISO Date to YYYY-MM-DD Format (Day, Month, Year)
function formatDate(isoDate) {
    const date = new Date(isoDate);

    const day = date.getUTCDate().toString().padStart(2, "0"); // Day (01-31)
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0"); // Month (01-12)
    const year = date.getUTCFullYear(); // Year (YYYY)

    return { day, month, year };
};

// ✅ Function to Fetch & Populate Form Data
async function fetchAndPopulate(url, mapping) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch data");

        const data = await res.json();
        if (!data || !data[mapping.key]) throw new Error("Data not found");

        const entity = data[mapping.key];

        Object.keys(mapping.fields).forEach((fieldId) => {
            const field = document.getElementById(fieldId);
            if (field) {
                const value = entity[mapping.fields[fieldId]];

                // ✅ Check if the field is a Date field and format it
                if (field.type === "date" && value) {
                    const { year, month, day } = formatDate(value);
                    field.value = `${year}-${month}-${day}`; // Set formatted YYYY-MM-DD
                } else {
                    field.value = value || "";
                }
            }
        });

        if (mapping.imageField && entity[mapping.imageField]) {
            const preview = document.getElementById("thumbnailPreview");
            preview.src = entity[mapping.imageField];
            preview.style.display = "block";
        }

        if (mapping.selectField && entity[mapping.selectField]) {
            const select = document.getElementById(mapping.selectField);
            select.value = entity[mapping.selectField] || "Active";
        }
    } catch (error) {
        console.error(`Error loading ${mapping.key} data:`, error.message);
    }
};

const loadEditArticleData = (articleId) =>
    fetchAndPopulate(`/admin/article?articleId=${articleId}`, {
        key: "article",
        fields: {
            "title": "title",
            "content": "description"
        },
        imageField: "image"
    });

const loadEditUserData = (userId) =>
    fetchAndPopulate(`/admin/user?userId=${userId}`, {
        key: "user",
        fields: {
            "name": "name",
            "email": "email",
            "mobileNumber": "mobileNumber",
            "status": "status"
        }
    });

const loadEditCategoryData = (categoryId) =>
    fetchAndPopulate(`/admin/category?categoryId=${categoryId}`, {
        key: "category",
        fields: {
            "name_": "name",
            "status_": "status"
        },
        imageField: "image_url"
    });

const loadEditSubscriptionData = (subscriptionId) =>
    fetchAndPopulate(`/admin/subscription?subscriptionId=${subscriptionId}`, {
        key: "subscription",
        fields: {
            "planName_": "planName",
            "planType_": "planType",
            "planPrice_": "price",
            "discount_": "discount",
            "planFeatures_": "features"
        },
        selectField: "status"
    });

const loadEditCouponData = (couponId) =>
    fetchAndPopulate(`/admin/coupon?couponId=${couponId}`, {
        key: "coupon",
        fields: {
            "couponCode_": "couponCode",
            "expirationDate_": "expirationDate",
            "maxUsage_": "maxUsage"
        },
        selectField: "status"
    });

// ✅ Function to Load Video Data
const loadEditVideoData = async (videoId) => {
    try {
        const res = await fetchData(`/admin/video/${videoId}`);
        if (!res) return;

        const video = res.data;

        // ✅ Populate Title & Description
        document.getElementById("title_").value = video.title || "";
        document.getElementById("_description").value = video.description || "";

        // ✅ Populate Category (Ensuring it exists in select options)
        const categorySelect = document.getElementById("category_");
        if ([...categorySelect.options].some(opt => opt.value === video.category)) {
            categorySelect.value = video.category;
        } else {
            // ✅ If category does not exist, add it dynamically
            categorySelect.innerHTML += `<option value="${video.category}" selected>${video.category}</option>`;
        }

        // ✅ Show Existing Thumbnail (If Available)
        const thumbnailPreview = document.getElementById("thumbnailPreview");
        if (video.thumbnail?.url) {
            thumbnailPreview.src = video.thumbnail.url;
            thumbnailPreview.style.display = "block";
        } else {
            thumbnailPreview.style.display = "none";
        }

        // ✅ Handle Video Preview (File or URL)
        const videoPreview = document.getElementById("videoPreview");
        if (video.video?.url) {
            videoPreview.src = video.video.url;
            videoPreview.style.display = "block";
        } else {
            videoPreview.src = "";
            videoPreview.style.display = "none";
        }
    } catch (error) {
        console.error("Error loading video data:", error.message);
    }
};

// ✅ Function to Load Story Data
const loadEditStoryData = async (storyId) => {
    try {
        const res = await fetchData(`/admin/story?storyId=${storyId}`);
        if (!res) return;

        const story = res.story;

        // ✅ Populate Title & Caption
        document.getElementById("_story-title").value = story.title || "";
        document.getElementById("_caption").value = story.caption || "";

        // ✅ Show Existing Story Image
        const thumbnailPreview = document.getElementById("thumbnailPreview");
        if (story.image?.url) {
            thumbnailPreview.src = story.image.url;
            thumbnailPreview.style.display = "block";
        } else {
            thumbnailPreview.style.display = "none";
        }
    } catch (error) {
        console.error("Error loading story data:", error.message);
    }
};

// ✅ Function to Load Banner Data
const loadEditBannerData = async (bannerId) => {
    try {
        const res = await fetchData(`/admin/banner?bannerId=${bannerId}`);
        if (!res) return;

        const banner = res.banner;

        // ✅ Show Existing Banner Image
        const bannerPreview = document.getElementById("thumbnailPreview");
        if (banner.image) {
            bannerPreview.src = banner.image;
            bannerPreview.style.display = "block";
        } else {
            bannerPreview.style.display = "none";
        }

        // ✅ Set Status
        const statusSelect = document.getElementById("bannerStatus_");
        statusSelect.value = banner.status || "Active";
    } catch (error) {
        console.error("Error loading banner data:", error.message);
    }
};

// ✅ Function to Update Video Preview
function updateVideoPreview(videoUrl) {
    if (videoUrl) {
        const videoPreview = document.getElementById("videoPreview");
        videoPreview.src = videoUrl;
    }
};

// ✅ Function to Check if URL is a YouTube Link
function isYouTubeUrl(url) {
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
    return youtubeRegex.test(url);
};

// generate unique id
function generateUniqueId(prefix = 'btn') {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 10000);
    return `${prefix}_${timestamp}_${randomNum}`;
};

// function to handle admin logout
async function adminLogout() {
    try {
        const response = await fetch(`${baseUrl}/admin/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: "include",
        });

        if (response.ok) {
            window.location.href = `${baseUrl}/admin`;
        } else {
            console.error('Failed to log out:', response.statusText);
        };
    } catch (error) {
        console.error('Error logging out:', error);
    };
};

// Function to load user data and display it in the table
async function loadUserData(page = 1, limit = 10) {
    const data = await fetchData(`${baseUrl}/admin/users?page=${page}$limit=${limit}`);
    if (!data) return;

    const tbody = document.getElementById('t-body');
    tbody.innerHTML = '';

    data.users.forEach(user => {
        const tr = document.createElement('tr');
        tr.setAttribute('class', 'user_row');

        const capitalizeFirstLetter = (string) => {
            if (typeof string !== 'string' || string.length === 0) return '';
            return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
        };
        const capitalizedStatus = capitalizeFirstLetter(user.status || 'active');
        const userStatus = [
            'Active', 'Inactive'
        ].includes(capitalizedStatus) ? capitalizedStatus : 'Active';

        const userArr = [
            user.name,
            user.email,
            user.mobileNumber,
            userStatus,
        ];

        userArr.forEach(info => {
            const td = document.createElement('td');
            td.innerText = info;
            tr.appendChild(td);
        });

        const tdActions = document.createElement('td');
        const div = document.createElement('div');
        div.setAttribute('class', 'btn-group');

        ['Edit', 'Delete'].forEach(action => {
            const button = document.createElement('button');
            button.innerText = action;
            button.setAttribute('data-id', user._id);

            if (action === 'Edit') {
                button.setAttribute('data-section-id', 'users');
                button.setAttribute('data-form-id', 'edit_user');
                button.setAttribute('data-back-btn-id', 'back-btn-user_');
                button.setAttribute('data-edit-btn-id', 'edit-user__');
            } else {
                button.addEventListener("click", () => showDeletePopup(user._id, 'user'));
            }

            // ✅ Fix: Use classList.add() instead of setAttribute()
            button.classList.add('btn', 'btn-sm', action === 'Edit' ? 'btn-success' : 'btn-danger', 'edit-class');

            div.appendChild(button);
        });


        tdActions.appendChild(div);
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    });
};

// funtion to load video data and display it on video section
async function loadVideoData(page = 1, limit = 12) {
    const data = await fetchData(`${baseUrl}/admin/videos?page=${page}&limit=${limit}`);
    if (!data) return;

    const videoRow = document.getElementById('video-row');
    const fragment = document.createDocumentFragment();
    videoRow.innerHTML = '';

    data.videos.forEach(video => {
        // Create elements
        const colDiv = document.createElement('div');
        const cardDiv = document.createElement('div');
        const img = document.createElement('img');
        const cardBody = document.createElement('div');
        const h5 = document.createElement('h5');
        const btnDiv = document.createElement('div');
        const editBtn = document.createElement('button');
        const deleteBtn = document.createElement('button');

        // Set classes and attributes
        colDiv.classList.add('col-12', 'col-sm-4', 'col-md-4', 'col-lg-3', 'mb-4');
        cardDiv.classList.add('card');
        img.classList.add('img-fluid', 'rounded-top');
        img.setAttribute('alt', 'Video Thumbnail');
        img.src = video.thumbnail.url;
        cardBody.classList.add('card-body');
        h5.classList.add('card-title', 'mb-3');
        h5.innerText = video.title;
        btnDiv.classList.add('btn-group');
        editBtn.classList.add('btn', 'btn-sm', 'btn-success', 'edit-class');
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');

        editBtn.setAttribute('data-id', video._id);
        editBtn.setAttribute('data-section-id', 'video');
        editBtn.setAttribute('data-form-id', 'edit_video');
        editBtn.setAttribute('data-back-btn-id', 'back-btn_');
        editBtn.setAttribute('data-edit-btn-id', 'video-form_');

        deleteBtn.setAttribute('data-id', video._id);
        deleteBtn.addEventListener("click", () => showDeletePopup(video._id, 'video'));
        editBtn.innerText = 'Edit';
        deleteBtn.innerText = 'Delete';

        // Append children
        btnDiv.append(editBtn, deleteBtn);
        cardBody.append(h5, btnDiv);
        cardDiv.append(img, cardBody);
        colDiv.append(cardDiv);
        fragment.append(colDiv);
    });

    // Append all at once
    videoRow.appendChild(fragment);

};

// function to load article data and display it on article section
async function loadArticleData(page = 1, limit = 12) {
    const data = await fetchData(`${baseUrl}/admin/articls?page=${page}&limit=${limit}`);
    if (!data) return;

    const articleRow = document.getElementById('article-row');
    const fragment = document.createDocumentFragment();
    articleRow.innerHTML = '';

    data.articles.forEach(article => {
        // Create elements
        const colDiv = document.createElement('div');
        const articleCard = document.createElement('div');
        const articleImg = document.createElement('img');
        const cardHeader = document.createElement('div');
        const h5 = document.createElement('h5');
        const cardBodyDiv = document.createElement('div');
        const btnDiv = document.createElement('div');
        const editBtn = document.createElement('button');
        const deleteBtn = document.createElement('button');

        // Set classes and attributes
        colDiv.classList.add('col-12', 'col-sm-4', 'col-md-4', 'col-lg-3', 'mb-4');
        articleCard.classList.add('card', 'article-card');
        articleImg.classList.add('img-fluid', 'rounded-top');
        articleImg.src = article.image;
        articleImg.setAttribute('alt', 'Article Image');
        cardHeader.classList.add('card-header');
        h5.classList.add('card-title');
        h5.innerText = article.title;
        cardBodyDiv.classList.add('card-body');
        btnDiv.classList.add('d-flex');
        editBtn.classList.add('btn', 'btn-sm', 'btn-success', 'me-2', 'article-edit-btn', "edit-class");
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');

        editBtn.setAttribute('data-id', article._id);
        editBtn.setAttribute('data-section-id', 'article');
        editBtn.setAttribute('data-form-id', 'update-article');
        editBtn.setAttribute('data-back-btn-id', 'back-article_btn_');
        editBtn.setAttribute('data-edit-btn-id', 'article-form_');

        deleteBtn.setAttribute('data-id', article._id);
        deleteBtn.addEventListener("click", () => showDeletePopup(article._id, 'article'));
        editBtn.setAttribute('id', generateUniqueId());
        deleteBtn.setAttribute('id', generateUniqueId());
        editBtn.innerText = 'Edit';
        deleteBtn.innerText = 'Delete';

        // Append children
        btnDiv.append(editBtn, deleteBtn);
        cardBodyDiv.append(btnDiv);
        cardHeader.append(h5);
        articleCard.append(articleImg, cardHeader, cardBodyDiv);
        colDiv.append(articleCard);
        fragment.append(colDiv);
    });

    // Append all at once
    articleRow.appendChild(fragment);
};

// function to load story data and display it on story section
async function loadStoryData(page = 1, limit = 12) {
    const data = await fetchData(`${baseUrl}/admin/stories?page${page}&limit${limit}`);
    if (!data) return;

    const storyRow = document.getElementById('story-row');
    const fragment = document.createDocumentFragment();
    storyRow.innerHTML = '';

    if (data.stories.length !== 0) {
        data.stories.forEach(story => {
            // Create elements
            const colDiv = document.createElement('div');
            const storyCard = document.createElement('div');
            const storyImg = document.createElement('img');
            const storyCardBody = document.createElement('div');
            const h5 = document.createElement('h5');
            const storyBtnDiv = document.createElement('div');
            const storyEditBtn = document.createElement('button');
            const storyDeleteBtn = document.createElement('button');

            // Set classes and attributes
            colDiv.classList.add('col-12', 'col-sm-4', 'col-md-4', 'col-lg-3', 'mb-4');
            storyCard.classList.add('card', 'story_card');
            storyImg.classList.add('img-fluid', 'rounded-top');
            storyImg.setAttribute('alt', 'story-image');
            storyImg.src = story.image.url;
            storyCardBody.classList.add('card-body');
            h5.classList.add('card-title', 'mb-3');
            h5.innerText = story.title;
            storyBtnDiv.classList.add('d-flex', 'gap-2');
            storyEditBtn.classList.add('btn', 'btn-success', 'btn-sm', 'edit-class');
            storyDeleteBtn.classList.add('btn', 'btn-danger', 'btn-sm');
            storyEditBtn.setAttribute('data-id', story._id);

            storyEditBtn.setAttribute('data-section-id', 'stories');
            storyEditBtn.setAttribute('data-form-id', 'edit_story');
            storyEditBtn.setAttribute('data-back-btn-id', 'back-story-btn_');
            storyEditBtn.setAttribute('data-edit-btn-id', '_edit_story');

            storyDeleteBtn.setAttribute('data-id', story._id);
            storyDeleteBtn.addEventListener("click", () => showDeletePopup(story._id, 'story'));
            storyEditBtn.innerText = 'Edit';
            storyDeleteBtn.innerText = 'Delete';

            // Append children
            storyBtnDiv.append(storyEditBtn, storyDeleteBtn);
            storyCardBody.append(h5, storyBtnDiv);
            storyCard.append(storyImg, storyCardBody);
            colDiv.append(storyCard);
            fragment.append(colDiv);
        });

        // Append all at once
        storyRow.appendChild(fragment);
    };
};

// function to load category data and display it on category section
async function loadCategoryData(page = 1, limit = 12) {
    const data = await fetchData(`${baseUrl}/admin/categories?page=${page}&limit=${limit}`);
    if (!data) return;

    const categoryRow = document.getElementById('category-row');
    const fragment = document.createDocumentFragment();
    categoryRow.innerHTML = '';

    data.categories.forEach(category => {
        // Create elements
        const categoryColDiv = document.createElement('div');
        const categoryCard = document.createElement('div');
        const categoryImg = document.createElement('img');
        const categoryCardBody = document.createElement('div');
        const h5 = document.createElement('h5');
        const categoryBtnDiv = document.createElement('div');
        const categoryEditBtn = document.createElement('button');
        const categoryDeleteBtn = document.createElement('button');

        // Set classes and attributes
        categoryColDiv.classList.add('col-12', 'col-sm-4', 'col-md-4', 'col-lg-3', 'mb-4');
        categoryCard.classList.add('card', 'category-card');
        categoryImg.classList.add('img-fluid', 'rounded-top');
        categoryImg.setAttribute('alt', 'category_img');
        categoryImg.src = category.image_url;
        categoryCardBody.classList.add('card-body');
        h5.classList.add('card-title', 'mb-3');
        h5.innerText = category.name;
        categoryBtnDiv.classList.add('d-flex', 'gap-2');
        categoryEditBtn.classList.add('btn', 'btn-success', 'btn-sm', 'edit-class');
        categoryDeleteBtn.classList.add('btn', 'btn-danger', 'btn-sm');

        categoryEditBtn.setAttribute('data-id', category._id);
        categoryEditBtn.setAttribute('data-section-id', 'categories');
        categoryEditBtn.setAttribute('data-form-id', 'edit_category');
        categoryEditBtn.setAttribute('data-back-btn-id', 'category-back-btn_');
        categoryEditBtn.setAttribute('data-edit-btn-id', 'categoryForm_');

        categoryDeleteBtn.setAttribute('data-id', category._id);
        categoryDeleteBtn.addEventListener("click", () => showDeletePopup(category._id, 'category'));
        categoryEditBtn.innerText = 'Edit';
        categoryDeleteBtn.innerText = 'Delete';

        // Append children
        categoryBtnDiv.append(categoryEditBtn, categoryDeleteBtn);
        categoryCardBody.append(h5, categoryBtnDiv);
        categoryCard.append(categoryImg, categoryCardBody);
        categoryColDiv.append(categoryCard);
        fragment.append(categoryColDiv);

    });

    // Append all at once
    categoryRow.appendChild(fragment);
};

// function to laod subscription data and display it on subscription section
async function loadSubscriptionData() {
    const data = await fetchData(`${baseUrl}/admin/subscriptions`);
    if (!data) return;

    const tableBody = document.getElementById('planTableBody');
    // Clear existing content
    tableBody.innerHTML = '';

    // Iterate over the plans array and create table rows
    data.subscriptions.forEach((plan) => {
        const row = document.createElement('tr');

        // Create cells for each field in the plan
        const planNameCell = document.createElement('td');
        planNameCell.textContent = plan.planName;

        const planTypeCell = document.createElement('td');
        planTypeCell.textContent = plan.planType;

        const priceCell = document.createElement('td');
        priceCell.textContent = plan.price;

        const featuresCell = document.createElement('td');
        const featuresList = document.createElement('ul');
        featuresList.className = "list-unstyled";
        plan.features.forEach(feature => {
            const featureItem = document.createElement('li');
            featureItem.textContent = `✔ ${feature}`;
            featuresList.appendChild(featureItem);
        });
        featuresCell.appendChild(featuresList);

        const statusCell = document.createElement('td');
        const statusBadge = document.createElement('span');
        const statusText = plan.status.charAt(0).toUpperCase() + plan.status.slice(1);
        statusBadge.className = statusText === 'Active' ? 'badge bg-success' : 'badge bg-danger';
        statusBadge.textContent = statusText;
        statusCell.appendChild(statusBadge);

        const actionCell = document.createElement('td');
        const actionDiv = document.createElement('div');
        actionDiv.className = "d-flex justify-content-start";
        const editButton = document.createElement('button');
        editButton.className = 'btn btn-secondary btn-sm me-2 edit-class';
        editButton.textContent = 'Edit';
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger btn-sm';
        deleteButton.textContent = 'Delete';
        editButton.setAttribute('data-id', plan._id);

        editButton.setAttribute('data-section-id', 'subscriptions');
        editButton.setAttribute('data-form-id', 'edit_subscription');
        editButton.setAttribute('data-back-btn-id', 'back-subscription-btn_');
        editButton.setAttribute('data-edit-btn-id', 'edit_subscription_');

        deleteButton.setAttribute('data-id', plan._id);
        deleteButton.addEventListener("click", () => showDeletePopup(plan._id, 'subscription'));
        actionDiv.appendChild(editButton);
        actionDiv.appendChild(deleteButton);
        actionCell.appendChild(actionDiv);

        // Append all cells to the row
        row.appendChild(planNameCell);
        row.appendChild(planTypeCell);
        row.appendChild(priceCell);
        row.appendChild(featuresCell);
        row.appendChild(statusCell);
        row.appendChild(actionCell);

        // Append the row to the table body
        tableBody.appendChild(row);
    });
};

// functionn to load coupon data and display it on coupon section
async function laodCouponData() {
    const data = await fetchData(`${baseUrl}/admin/coupons`);
    if (!data) return;

    const tableBody = document.getElementById('couponTableBody');
    tableBody.innerHTML = '';

    data.coupons.forEach(coupon => {
        const date = new Date(coupon.expirationDate);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        const row = `
          <tr>
            <td>${coupon.couponCode}</td>
            <td>${day}/${month}/${year}</td>
            <td>${coupon.maxUsage}</td>
            <td><span class="badge bg-${coupon.status === 'Active' ? 'success' : 'danger'}">${coupon.status}</span></td>
            <td>
              <div class="d-flex justify-content-start">
                <button class="btn btn-secondary btn-sm me-2 edit-class" 
                    data-id="${coupon._id}"
                    data-section-id="coupons" 
                    data-form-id="edit-coupon"
                    data-back-btn-id="back-coupon-btn_"
                    data-edit-btn-id="couponForm_">Edit
                </button>

                <button class="btn btn-danger btn-sm" 
                    onclick="showDeletePopup('${coupon._id}', 'coupon')" 
                    data-id="${coupon._id}">Delete
                </button>
              </div>
            </td>
          </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
};

// function to load the banner data and display it on banner section
async function laodBannerData(page = 1, limit = 12) {
    const data = await fetchData(`${baseUrl}/admin/banners?page=${page}&limit=${limit}`);
    if (!data) return;

    function createBannerHtml(banner) {
        return `
            <div class="col-md-4 mb-3">
                <div class="card">
                    <img src="${banner.image}" class="img-fluid rounded" alt="${banner.title}" />
                    <div class="card-body">
                        <button class="btn btn-success btn-sm me-1 edit-class" 
                            data-id="${banner._id}"
                            data-section-id="banners" 
                            data-form-id="edit_banner"
                            data-back-btn-id="back-bnner-btn_"
                            data-edit-btn-id="bannerForm_">Edit
                        </button>
                        <button class="btn btn-danger btn-sm" 
                            onclick="showDeletePopup('${banner._id}', 'banner')" 
                            data-id="${banner._id}">Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    };

    const container = document.getElementById('banners-container');
    container.innerHTML = '';

    let rowHtml = '';
    data.banners.forEach((banner, index) => {
        rowHtml += createBannerHtml(banner);

        // Every 2 banners, create a new row
        if ((index + 1) % 3 === 0) {
            container.innerHTML += `<div class="row">${rowHtml}</div>`;
            rowHtml = '';
        };
    });

    // Add any remaining banners
    if (rowHtml) {
        container.innerHTML += `<div class="row">${rowHtml}</div>`;
    };
};

// function to load the category option and display it on video cateogory option
async function loadCategoryOption() {
    const data = await fetchData(`${baseUrl}/admin/category/options`);
    if (!data) return;

    const selectElement = document.querySelector('.category_option');

    data.categoryOptions.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.innerHTML = `${category.name}`;
        option.setAttribute('class', 'category-option');
        selectElement.appendChild(option);
    });
};

// function to load the setting data and display it on setting sections
function populateFormFields(settings) {
    Object.entries(settings).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
            const element = document.getElementById(key);
            if (element) {
                element.value = value ? 'ON' : 'OFF';
            };
        };

        // If value is an object, handle nested fields (e.g., socialMediaLinks, appDownloadLinks)
        if (typeof value === 'object' && value !== null) {
            Object.entries(value).forEach(([subKey, subValue]) => {
                const element = document.getElementById(`${subKey}-link`) || document.getElementById(subKey);
                if (element) element.value = subValue;
            });

            // Handle specific cases for preview images
            if (value.url && key === 'siteLogo') {
                const previewElement = document.getElementById(`logo-preview`);
                if (previewElement) previewElement.src = value.url;
            }
            if (value.url && key === 'siteFavicon') {
                const previewElement = document.getElementById(`favicon-preview`);
                if (previewElement) previewElement.src = value.url;
            };
        }
        else if (document.getElementById(key)) {
            document.getElementById(key).value = value;
        }
    });
};

// Function to update DOM elements with fetched data
async function updateDashboardElement(url, Data) {
    const data = await fetchData(url);
    if (!data) return;

    for ([key, value] of Object.entries(Data)) {
        const element = document.getElementById(key);
        element.innerText = data[value];
    };
};

// function to laod the admin profile data and display it on admin profile section
async function laodAdminProfileData() {
    const data = await fetchData(`${baseUrl}/admin/profile`);
    if (!data) return;
    document.getElementById('username').value = data.adminProfile.username;
    document.getElementById('admin_email').value = data.adminProfile.email;
    document.getElementById('password').value = data.adminProfile.password;
    document.getElementById('phone').value = data.adminProfile.phone;
    document.getElementById('profileImage').src = data.adminProfile.profilePicture.url;
    document.getElementById('admin-profile-icon').src = data.adminProfile.profilePicture.url;
};

// **** API calling ****

// Function to make a fetch request
async function fetchData(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (response.status === 401) {
            window.location.href = `${baseUrl}/admin`;
        }

        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        };

        return await response.json();
    } catch (error) {
        console.error('Fetch error: ', error);
    };
};

// Function to handle form submission
async function handleFormSubmission(
    form, url, processBtnId, submitBtnId, dataLoadCallback, method = 'POST', isJson = false
) {
    try {
        toggleProcessBtn(submitBtnId, processBtnId, true);

        let body;
        let headers = {};

        if (isJson) {
            const formDataObj = {};
            new FormData(form).forEach((value, key) => {
                formDataObj[key] = value;
            });
            body = JSON.stringify(formDataObj);
            headers["Content-Type"] = "application/json";
        } else {
            body = new FormData(form);
        };

        const response = await fetch(`${baseUrl}${url}`, {
            method,
            body: body,
            headers: headers,
            credentials: "include",
        });
        const data = await response.json();

        if (response.status === 401) {
            window.location.href = `${baseUrl}/admin`;
        }

        if (response.ok) {
            showModalWithMessage(data.message);
            form.reset();
            dataLoadCallback();
        } else {
            handleApiError(data);
        }
    } catch (error) {
        console.error("Error:", error);
        showModalWithMessage('An unexpected error occurred.');
    } finally {
        toggleProcessBtn(submitBtnId, processBtnId, false);
    };
};

// setting submission 
async function submitSettingForm(form, url, isJson = false) {
    let options = {
        method: 'POST',
        credentials: 'include'
    };

    if (isJson) {
        // ✅ Convert FormData to JSON
        const formData = new FormData(form);
        const jsonData = Object.fromEntries(formData.entries());

        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(jsonData);
    } else {
        // ✅ Send FormData as it is (for file uploads)
        options.body = new FormData(form);
    }

    try {
        const response = await fetch(`${baseUrl}${url}`, options);

        if (response.status === 401) {
            window.location.href = `${baseUrl}/admin`;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await response.json();
        saveSettings();

    } catch (error) {
        console.error('Error submitting form:', error);
        showModalWithMessage(error.message);
    }
};

// function to fetch the setting data frome db
async function fetchSettingData() {
    try {
        const endpoints = [
            `${baseUrl}/admin/setting/general`,
            `${baseUrl}/admin/setting/smtp`,
            `${baseUrl}/admin/setting/social-media`,
            `${baseUrl}/admin/setting/menu`,
            `${baseUrl}/admin/setting/re-captcha`,
            `${baseUrl}/admin/setting/banner-ads`,
            `${baseUrl}/admin/setting/maintenance-mode`
        ];

        const responses = await Promise.all(endpoints.map(url => fetch(url, { credentials: 'include' })));
        if (responses.some(response => response.status === 401)) {
            window.location.href = `${baseUrl}/admin`;
        };
        const settingsData = await Promise.all(responses.map(res => res.json()));

        function cleanSettingsData(data) {
            const { createdAt, updatedAt, __v, ...cleanedData } = data;
            return cleanedData;
        };

        // Clean the settings data and populate form fields
        settingsData.forEach(data => {
            const cleanedData = cleanSettingsData(data.settings);
            populateFormFields(cleanedData);
        });
    } catch (error) {
        console.error('Error loading settings:', error);
    }
};

// ✅ Dynamic API Call Function
async function apiCall({ url, method = "GET", data = null, headers = {} }) {
    try {
        const options = {
            method,
            headers: { "Content-Type": "application/json", ...headers }
        };

        if (data) options.body = JSON.stringify(data);

        const response = await fetch(url, options);
        const result = await response.json();

        if (response.status === 401) {
            window.location.href = `${baseUrl}/admin`;
        }

        return result;
    } catch (error) {
        return error.message;
    }
};

// 📌 Function to Handle API Errors
function handleApiError(data) {
    console.error("Error:", data); // Log full error details

    let errorMessage = "Something went wrong!";

    if (data.errors && data.errors.length > 0) {
        errorMessage = `⚠️ ${data.errors[0].msg}`; // Show only first error message
    } else if (data.message) {
        errorMessage = data.message;
    }

    showModalWithMessage(errorMessage, "error");
};

// Initialize data loading
const functionMappings = {
    '#t-body': loadUserData,
    '#video-row': loadVideoData,
    '#article-row': loadArticleData,
    '#story-row': loadStoryData,
    '#category-row': loadCategoryData,
    '#planTableBody': loadSubscriptionData,
    '#couponTableBody': laodCouponData,
    '#banners-container': laodBannerData,
    '#settings': fetchSettingData,
    '#video-form': loadCategoryOption,
    '#admin_profile': laodAdminProfileData
};

// Function to execute only for existing elements
const executeIfElementExists = () => {
    Object.keys(functionMappings).forEach(id => {
        if (document.querySelector(id)) {
            functionMappings[id](); // Call the function
        }
    });
};

// get data
const url = `${baseUrl}/admin/dashboard-count`;
const Data = {
    "total_user": "totalUser",
    "total_video": "totalVideo",
    "total_category": "totalCategory",
    "total_like": "totalLikes",
    "total_comment": "totalComments",
    "total_articles": "totalArticle",
};

// update dashboard element
if (document.getElementById('dashboard')) {
    updateDashboardElement(url, Data);
};

// call function and load the data
executeIfElementExists();

// Reusable function to toggle visibility
function toggleVisibility(hideElement, showElement) {
    hideElement.classList.add('d-none');
    hideElement.classList.remove('d-block');

    showElement.classList.remove('d-none');
    showElement.classList.add('d-block');
};

// Reusable function to go back to the previous section
function goBack(showElement, hideElement) {
    hideElement.classList.remove('d-block');
    hideElement.classList.add('d-none');

    showElement.classList.remove('d-none');
    showElement.classList.add('d-block');
};

// back and toggle event listeners
function doesElementExist(selector) {
    const element = document.querySelector(selector);
    return element !== null;
};

// Video Section
if (doesElementExist('#video')) {
    const videoSection = document.getElementById('video');
    const addNewVideoPage = document.getElementById('new_video');
    document.getElementById('add-new-video').addEventListener('click', () => toggleVisibility(videoSection, addNewVideoPage));
    document.getElementById('back-btn').addEventListener('click', () => goBack(videoSection, addNewVideoPage));
};

// Article Section
if (doesElementExist('#article')) {
    const article = document.getElementById('article');
    const addNewArticle = document.getElementById('new_article');
    if (doesElementExist('#add-new-article') || doesElementExist('#back-article_btn')) {
        document.getElementById('add-new-article').addEventListener('click', () => toggleVisibility(article, addNewArticle));
        document.getElementById('back-article_btn').addEventListener('click', () => goBack(article, addNewArticle));
    }
};

// User Section
if (doesElementExist('#users')) {
    const users = document.getElementById('users');
    const newUser = document.getElementById('new_user');
    document.getElementById('add-new-user').addEventListener('click', () => toggleVisibility(users, newUser));
    document.getElementById('back-btn-user').addEventListener('click', () => goBack(users, newUser));
};

// Story Section
if (doesElementExist('#stories')) {
    const story = document.getElementById('stories');
    const newStory = document.getElementById('new_story');
    document.getElementById('story-btn').addEventListener('click', () => toggleVisibility(story, newStory));
    document.getElementById('back-story-btn').addEventListener('click', () => goBack(story, newStory));
};

// Category Section
if (doesElementExist('#categories')) {
    const category = document.getElementById('categories');
    const newCategory = document.getElementById('new_category');
    document.getElementById('category-btn').addEventListener('click', () => toggleVisibility(category, newCategory));
    document.getElementById('category-back-btn').addEventListener('click', () => goBack(category, newCategory));
};

// subscription plan section 
if (doesElementExist('#subscriptions')) {
    const subscription = document.getElementById('subscriptions');
    const newSubscription = document.getElementById('new_subscription');
    document.getElementById('subscription-btn').addEventListener('click', () => toggleVisibility(subscription, newSubscription));
    document.getElementById('back-subscription-btn').addEventListener('click', () => goBack(subscription, newSubscription));
};

// coupon plan section 
if (doesElementExist('#coupons')) {
    const coupon = document.getElementById('coupons');
    const newCoupon = document.getElementById('new-coupon');
    document.getElementById('coupon-btn').addEventListener('click', () => toggleVisibility(coupon, newCoupon));
    document.getElementById('back-coupon-btn').addEventListener('click', () => goBack(coupon, newCoupon));
};

// banner section 
if (doesElementExist('#banners')) {
    const banner = document.getElementById('banners');
    const newBanner = document.getElementById('add-new_banner');
    document.getElementById('banner-btn').addEventListener('click', () => toggleVisibility(banner, newBanner));
    document.getElementById('back-bnner-btn').addEventListener('click', () => goBack(banner, newBanner));
};

// profile section
if (doesElementExist('#admin_profile')) {
    const adminProfile = document.getElementById('admin_profile');
    const dashboard = document.getElementById('dashboard');
    document.getElementById('back-profile-btn').addEventListener('click', () => toggleVisibility(adminProfile, dashboard));
    document.getElementById('back-profile-btn').addEventListener('click', () => {
        document.getElementById('nav-bar_').innerText = 'Dashboard';
    });
};

function showModalWithMessage(message) {
    document.getElementById('modalMessage').textContent = message;
    successModal.show();
};

// Function to toggle between loading and submit button
function toggleProcessBtn(submitBtnId, processBtnId, isLoading) {
    const submitBtn = document.getElementById(submitBtnId);
    const processBtn = document.getElementById(processBtnId);

    if (isLoading) {
        submitBtn.classList.add('d-none');
        processBtn.classList.remove('d-none');
    } else {
        submitBtn.classList.remove('d-none');
        processBtn.classList.add('d-none');
    };
};

// Event listeners for form submissions

if (doesElementExist('#video-form')) {
    document.querySelector("#video-form").addEventListener("submit", function (e) {
        e.preventDefault();
        handleFormSubmission(
            e.target,
            "/admin/upload-video",
            'video-process-btn',
            'add-video-btn',
            loadVideoData
        );
    });
};

if (doesElementExist('#article-form')) {
    document.querySelector("#article-form").addEventListener("submit", function (e) {
        e.preventDefault();
        handleFormSubmission(
            e.target,
            "/admin/create-article",
            'process-btn',
            'article__btn',
            loadArticleData
        );
    });
};

if (doesElementExist('#adduser__')) {
    document.querySelector("#adduser__").addEventListener("submit", function (e) {
        e.preventDefault();
        handleFormSubmission(
            e.target,
            "/admin/create-user",
            'user-process-btn',
            'add_user_btn',
            loadUserData,
            "POST",
            true,
        );
    });
};

if (doesElementExist('#categoryForm')) {
    document.querySelector("#categoryForm").addEventListener("submit", function (e) {
        e.preventDefault();
        handleFormSubmission(
            e.target,
            "/admin/create-category",
            'category-process-btn',
            'add-category-btn',
            loadCategoryData
        );
    });
};

if (doesElementExist('#addNew_story')) {
    document.querySelector("#addNew_story").addEventListener("submit", function (e) {
        e.preventDefault();
        handleFormSubmission(
            e.target,
            "/admin/create-story",
            'story-process-btn',
            'addNew_story-btn',
            loadStoryData
        );
    });
};

if (doesElementExist('#add-new_subscription')) {
    document.querySelector("#add-new_subscription").addEventListener("submit", function (e) {
        e.preventDefault();
        handleFormSubmission(
            e.target,
            "/admin/create-subscription",
            'subscription-process-btn',
            'addNew_subscription-btn',
            loadSubscriptionData,
            "POST",
            true,
        );
    });
}

if (doesElementExist('#couponForm')) {
    document.querySelector("#couponForm").addEventListener("submit", function (e) {
        e.preventDefault();
        handleFormSubmission(
            e.target,
            "/admin/create-coupon",
            'coupon-process-btn',
            'add-new-coupon-btn',
            laodCouponData,
            "POST",
            true,
        );
    });
};

if (doesElementExist('#bannerForm')) {
    document.querySelector("#bannerForm").addEventListener("submit", function (e) {
        e.preventDefault();
        handleFormSubmission(
            e.target,
            "/admin/create-banner",
            'banner-process-btn',
            'add_new-banner-btn',
            laodBannerData,
        );
    });
}

if (doesElementExist('#admin_profile_form')) {
    document.querySelector("#admin_profile_form").addEventListener("submit", function (e) {
        e.preventDefault();
        handleFormSubmission(
            e.target,
            "/admin/update-profile",
            'profile-process-btn',
            'save-profile',
            laodAdminProfileData,
            'PUT',
        );
    });
};

// banner priview
if (doesElementExist('#bannerLink')) {
    document.getElementById('bannerLink').addEventListener('change', function () {
        const file = this.files[0];
        const bannerPreview = document.getElementById('bannerPreview');

        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                bannerPreview.style.backgroundImage = `url(${e.target.result})`;
                bannerPreview.style.backgroundSize = 'cover';
                bannerPreview.style.backgroundPosition = 'center';
                bannerPreview.textContent = '';
            }
            reader.readAsDataURL(file);
        } else {
            bannerPreview.style.backgroundImage = 'none';
            bannerPreview.textContent = 'Banner Preview';
        };
    });
};

// generate coupon
if (doesElementExist('#generateCouponBtn')) {
    document.getElementById('generateCouponBtn').addEventListener('click', function () {
        const randomCouponCode = Math.random().toString(36).substr(2, 8).toUpperCase();
        document.getElementById('couponCode').value = randomCouponCode;
    });
};

if (doesElementExist('#generateCouponBtn_')) {
    document.getElementById('generateCouponBtn_').addEventListener('click', function () {
        const randomCouponCode = Math.random().toString(36).substr(2, 8).toUpperCase();
        document.getElementById('couponCode_').value = randomCouponCode;
    });
};

// costom file input url of image select option viva js
if (doesElementExist('.custom-file-input')) {
    document.querySelector(".custom-file-input").addEventListener("change", function () {
        const fileName = this.value.split("\\").pop();
        this.nextElementSibling.classList.add("selected");
        this.nextElementSibling.innerHTML = fileName;
    });
};

uploadMethodRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
        if (document.getElementById("uploadVideo").checked) {
            videoUploadField.style.display = "block";
            videoUrlField.style.display = "none";
        } else {
            videoUploadField.style.display = "none";
            videoUrlField.style.display = "block";
        };
    });
});

// profile image upload of admin
if (doesElementExist('#imageUpload')) {
    document.getElementById("imageUpload").addEventListener("change", function () {
        const file = this.files[0];
        const profileImage = document.getElementById("profileImage");

        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                profileImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        };
    });
};

// admin logout
if (doesElementExist('#logout-btn')) {
    document.getElementById('logout-btn').addEventListener('click', function (e) {
        e.preventDefault();
        adminLogout();
    });
};

// event listener for setting form submission

if (doesElementExist('#siteConfigForm')) {
    document.getElementById('siteConfigForm').addEventListener('submit', (e) => {
        e.preventDefault();
        submitSettingForm(
            e.target,
            '/admin/setting/general',
        );
    });
};

if (doesElementExist('#smtp-form')) {
    document.getElementById('smtp-form').addEventListener('submit', (e) => {
        e.preventDefault();
        submitSettingForm(
            e.target,
            '/admin/setting/smtp',
            true,
        );
    });
};

if (doesElementExist('#settingsForm_social')) {
    document.getElementById('settingsForm_social').addEventListener('submit', (e) => {
        e.preventDefault();
        submitSettingForm(
            e.target,
            '/admin/setting/social-media',
            true,
        );
    });
};

if (doesElementExist('#settingsForm_menu')) {
    document.getElementById('settingsForm_menu').addEventListener('submit', (e) => {
        e.preventDefault();
        submitSettingForm(
            e.target,
            '/admin/setting/menu',
            true,
        );
    });
};

if (doesElementExist('#recaptchaSettingsForm')) {
    document.getElementById('recaptchaSettingsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        submitSettingForm(
            e.target,
            '/admin/setting/re-captcha',
            true,
        );
    });
};

if (doesElementExist('#bannerAdsForm')) {
    document.getElementById('bannerAdsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        submitSettingForm(
            e.target,
            '/admin/setting/banner-ads',
            true,
        );
    });
};

if (doesElementExist('#mentenence_settings_form')) {
    document.getElementById('mentenence_settings_form').addEventListener('submit', (e) => {
        e.preventDefault();
        submitSettingForm(
            e.target,
            '/admin/setting/maintenance-mode',
            true,
        );
    });
};

// event listener for update form submission

if (doesElementExist('#video-form_')) {
    document.querySelector("#video-form_").addEventListener("submit", function (e) {
        e.preventDefault();
        const editId = e.target.getAttribute('data-edit-id');
        handleFormSubmission(
            e.target,
            `/admin/update-video/${editId}`,
            'video-process-btn_',
            'edit-video-btn',
            loadVideoData,
            "PUT"
        );
    });
};

if (doesElementExist('#article-form_')) {
    document.querySelector("#article-form_").addEventListener("submit", function (e) {
        e.preventDefault();
        const editId = e.target.getAttribute('data-edit-id');
        handleFormSubmission(
            e.target,
            `/admin/update-article?articleId=${editId}`,
            'process-btn_',
            'edit-article__btn',
            loadArticleData,
            "PUT"
        );
    });
};

if (doesElementExist('#edit-user__')) {
    document.querySelector("#edit-user__").addEventListener("submit", function (e) {
        e.preventDefault();
        const editId = e.target.getAttribute('data-edit-id');
        handleFormSubmission(
            e.target,
            `/admin/update-user?userId=${editId}`,
            'user-process-btn_',
            'edit_user_btn',
            loadUserData,
            "PUT",
            true,
        );
    });
};

if (doesElementExist('#categoryForm_')) {
    document.querySelector("#categoryForm_").addEventListener("submit", function (e) {
        e.preventDefault();
        const editId = e.target.getAttribute('data-edit-id');
        handleFormSubmission(
            e.target,
            `/admin/update-category?categoryId=${editId}`,
            'category-process-btn_',
            'edit-category-btn',
            loadCategoryData,
            "PUT"
        );
    });
};

if (doesElementExist('#_edit_story')) {
    document.querySelector("#_edit_story").addEventListener("submit", function (e) {
        e.preventDefault();
        const editId = e.target.getAttribute('data-edit-id');
        handleFormSubmission(
            e.target,
            `/admin/update-story?storyId=${editId}`,
            'story-process-btn_',
            'edit_story-btn',
            loadStoryData,
            "PUT"
        );
    });
};

if (doesElementExist('#edit_subscription_')) {
    document.querySelector("#edit_subscription_").addEventListener("submit", function (e) {
        e.preventDefault();
        const editId = e.target.getAttribute('data-edit-id');
        handleFormSubmission(
            e.target,
            `/admin/update-subscription?subscriptionId=${editId}`,
            'subscription-process-btn_',
            'edit_subscription-btn',
            loadSubscriptionData,
            "PUT",
            true,
        );
    });
};

if (doesElementExist('#couponForm_')) {
    document.querySelector("#couponForm_").addEventListener("submit", function (e) {
        e.preventDefault();
        const editId = e.target.getAttribute('data-edit-id');
        handleFormSubmission(
            e.target,
            `/admin/update-coupon?couponId=${editId}`,
            'coupon-process-btn_',
            'edit-coupon-btn',
            laodCouponData,
            "PUT",
            true,
        );
    });
};

if (doesElementExist('#bannerForm_')) {
    document.querySelector("#bannerForm_").addEventListener("submit", function (e) {
        e.preventDefault();
        const editId = e.target.getAttribute('data-edit-id');
        handleFormSubmission(
            e.target,
            `/admin/update-banner?bannerId=${editId}`,
            'banner-process-btn_',
            'edit-banner-btn',
            laodBannerData,
            "PUT"
        );
    });
};

// setting notification 

function triggerNotification() {
    const notification = document.getElementById("notification");
    notification.style.display = "block";
    setTimeout(closeNotification, 3000);
};

function closeNotification() {
    const notification = document.getElementById("notification");
    notification.style.display = "none";
};

// Simulating settings save functionality
function saveSettings() {
    triggerNotification();
};

if (doesElementExist('#close-notify-btn')) {
    document.getElementById('close-notify-btn').addEventListener('click', () => {
        closeNotification();
    });
};

function previewThumbnail(event) {
    const input = event.target;
    const previewId =
        input.id === "siteLogo" ? "logo-preview" : "favicon-preview";
    const previewImage = document.getElementById(previewId);

    if (input.files && input.files[0]) {
        const reader = new FileReader();

        reader.onload = function (e) {
            previewImage.src = e.target.result;
            previewImage.style.display = "block";
        };

        reader.readAsDataURL(input.files[0]);
    } else {
        previewImage.src = "#";
        previewImage.style.display = "none";
    }
};

async function showDeletePopup(itemId, sectionId) {
    const modal = new bootstrap.Modal(document.getElementById("deleteModal"));
    modal.show();

    const deleteText = document.getElementById('delete-text');
    const spinner = document.getElementById('spinner_');
    const confirmBtn = document.getElementById("confirmDeleteBtn");

    confirmBtn.onclick = async () => {
        deleteText.classList.add('d-none');
        spinner.classList.remove('d-none');

        const apiEndpoints = {
            video: `/admin/delete-video/${itemId}`,
            article: `/admin/delete-article?articleId=${itemId}`,
            user: `/admin/delete-user?userId=${itemId}`,
            category: `/admin/delete-category?categoryId=${itemId}`,
            story: `/admin/delete-story?storyId=${itemId}`,
            subscription: `/admin/delete-subscription?subscriptionId=${itemId}`,
            coupon: `/admin/delete-coupon?couponId=${itemId}`,
            banner: `/admin/delete-banner?bannerId=${itemId}`,
        };

        if (!apiEndpoints[sectionId]) return;

        const data = await apiCall({ url: apiEndpoints[sectionId], method: 'DELETE' });

        if (data?.success) {
            modal.hide();
            const refreshFunctions = {
                video: loadVideoData,
                article: loadArticleData,
                user: loadUserData,
                category: loadCategoryData,
                story: loadStoryData,
                subscription: loadSubscriptionData,
                coupon: laodCouponData,
                banner: laodBannerData
            };
            refreshFunctions[sectionId]?.();
        } else {
            handleApiError(data);
            modal.hide();
        }

        deleteText.classList.remove('d-none');
        spinner.classList.add('d-none');
    };
};
