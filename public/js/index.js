const navBar = document.getElementById('nav-bar_');

document.querySelector('.toggle-btn').addEventListener('click', () => {
    const sideBar = document.querySelector('.sidebar');
    sideBar.classList.toggle('d-none');
});

document.querySelectorAll(".nav-link").forEach(function (navLink) {
    navLink.addEventListener("click", function (event) {
        event.preventDefault();

        const clickedText = navLink.textContent.trim();
        navBar.textContent = clickedText;

        document.querySelectorAll(".content > section").forEach(function (page) {
            page.classList.add("d-none");
        });
        const target = event.target.getAttribute("data-target");
        document.querySelector(target).classList.remove("d-none");
    });
});

document.querySelectorAll('.sidebar-link').forEach(function (link) {
    link.addEventListener('click', function () {

        document.querySelectorAll('.sidebar-link').forEach(function (item) {
            item.classList.remove('active');
            item.style.backgroundColor = '';
            item.style.color = '';
        });

        this.classList.add('active');
        this.style.backgroundColor = 'red';
        this.style.color = 'white';
    });
});

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

document.querySelector('.nav-link[data-target="#dashboard"]').click();

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

        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        };

        return await response.json();
    } catch (error) {
        console.error('Fetch error: ', error);
    };
};

// function to handle admin logout
async function adminLogout() {
    try {
        const response = await fetch('/admin/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            window.location.href = '/login';
        } else {
            console.error('Failed to log out:', response.statusText);
        };
    } catch (error) {
        console.error('Error logging out:', error);
    };
};

// Function to load user data and display it in the table
async function loadUserData() {
    const data = await fetchData('/admin/users');

    if (!data) return;

    const tbody = document.getElementById('t-body');

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
            button.setAttribute('class', `btn btn-sm btn-${action === 'Edit' ? 'primary' : 'danger'}`);
            div.appendChild(button);
        });

        tdActions.appendChild(div);
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    });
};

// funtion to load video data and display it on video section
async function loadVideoData() {
    const data = await fetchData('/admin/videos');
    if (!data) return;

    const videoRow = document.getElementById('video-row');
    const fragment = document.createDocumentFragment();

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
        img.classList.add('card-img-top', 'rounded-top');
        img.setAttribute('alt', 'Video Thumbnail');
        img.src = video.thumbnail.url;
        cardBody.classList.add('card-body');
        h5.classList.add('card-title', 'mb-3');
        h5.innerText = video.title;
        btnDiv.classList.add('btn-group');
        editBtn.classList.add('btn', 'btn-sm', 'btn-success');
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
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
async function loadArticleData() {
    const data = await fetchData('/admin/articls');

    if (!data) return;

    const articleRow = document.getElementById('article-row');
    const fragment = document.createDocumentFragment();

    data.articls.forEach(article => {
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
        articleImg.classList.add('article-card-img-top');
        articleImg.src = article.image;
        articleImg.setAttribute('alt', 'Article Image');
        cardHeader.classList.add('card-header');
        h5.classList.add('card-title');
        h5.innerText = article.title;
        cardBodyDiv.classList.add('card-body');
        btnDiv.classList.add('d-flex', 'justify-content-end');
        editBtn.classList.add('btn', 'btn-sm', 'btn-primary', 'me-2');
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
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
async function loadStoryData() {
    const data = await fetchData('/admin/stories');

    if (!data) return;

    const storyRow = document.getElementById('story-row');
    const fragment = document.createDocumentFragment();

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
        storyImg.classList.add('story-card-img-top');
        storyImg.setAttribute('alt', 'story-image');
        storyImg.src = story.image;
        storyCardBody.classList.add('card-body');
        h5.classList.add('card-title', 'mb-3');
        h5.innerText = story.title;
        storyBtnDiv.classList.add('d-flex', 'justify-content-between');
        storyEditBtn.classList.add('btn', 'btn-primary', 'btn-sm', 'me-1');
        storyDeleteBtn.classList.add('btn', 'btn-danger', 'btn-sm');
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

// function to load category data and display it on category section
async function loadCategoryData() {
    const data = await fetchData('/admin/categories');

    if (!data) return;

    const categoryRow = document.getElementById('category-row');
    const fragment = document.createDocumentFragment();

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
        categoryImg.classList.add('category-card-img-top');
        categoryImg.setAttribute('alt', 'category_img');
        categoryImg.src = category.image_url;
        categoryCardBody.classList.add('card-body');
        h5.classList.add('card-title', 'mb-3');
        h5.innerText = category.name;
        categoryBtnDiv.classList.add('d-flex', 'justify-content-between');
        categoryEditBtn.classList.add('btn', 'btn-primary');
        categoryDeleteBtn.classList.add('btn', 'btn-danger');
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
    const data = await fetchData('/admin/subscriptions');

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
        editButton.className = 'btn btn-secondary btn-sm me-2';
        editButton.textContent = 'Edit';
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger btn-sm';
        deleteButton.textContent = 'Delete';
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
    const data = await fetchData('/admin/coupons');

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
            <td>${coupon.discountPercentage}</td>
            <td>${day}/${month}/${year}</td>
            <td>${coupon.maxUsage}</td>
            <td><span class="badge bg-${coupon.status === 'Active' ? 'success' : 'danger'}">${coupon.status}</span></td>
            <td>
              <div class="d-flex justify-content-end">
                <button class="btn btn-secondary btn-sm me-2">Edit</button>
                <button class="btn btn-danger btn-sm">Delete</button>
              </div>
            </td>
          </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
};

// function to load the banner data and display it on banner section
async function laodBannerData() {
    const data = await fetchData('/admin/banners');

    if (!data) return;

    function createBannerHtml(banner) {
        return `
            <div class="col-md-4 mb-3">
                <div class="card">
                    <img src="${banner.image}" class="card-img-top rounded" alt="${banner.title}" />
                    <div class="card-body">
                        <h5 class="card-title mb-3">${banner.title}</h5>
                        <button class="btn btn-success">Edit</button>
                        <button class="btn btn-danger">Delete</button>
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

// Function to update DOM elements with fetched data
async function updateDashboardElement(url, Data) {
    const data = await fetchData(url);

    if (!data) return;

    for ([key, value] of Object.entries(Data)) {
        const element = document.getElementById(key);
        element.innerText = data[value];
    };
};

// Initialize data loading
loadUserData();
loadVideoData();
loadArticleData();
loadStoryData();
loadCategoryData();
loadSubscriptionData();
laodCouponData();
laodBannerData();

const url = "/admin/dashboard-count";
const Data = {
    "total_user": "totalUser",
    "total_video": "totalVideo",
    "total_category": "totalCategory",
    "total_like": "totalArticleAndVideoLikes",
    "total_comment": "totalArticleAndVideoComments",
    "total_articles": "totalArticle",
};

updateDashboardElement(url, Data);

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

// Video Section
const videoSection = document.getElementById('video');
const addNewVideoPage = document.getElementById('new_video');
document.getElementById('add-new-video').addEventListener('click', () => toggleVisibility(videoSection, addNewVideoPage));
document.getElementById('back-btn').addEventListener('click', () => goBack(videoSection, addNewVideoPage));

// Article Section
const article = document.getElementById('article');
const addNewArticle = document.getElementById('new_article');
document.getElementById('add-new-article').addEventListener('click', () => toggleVisibility(article, addNewArticle));
document.getElementById('back-article_btn').addEventListener('click', () => goBack(article, addNewArticle));

// User Section
const users = document.getElementById('users');
const newUser = document.getElementById('new_user');
document.getElementById('add-new-user').addEventListener('click', () => toggleVisibility(users, newUser));
document.getElementById('back-btn-user').addEventListener('click', () => goBack(users, newUser));

// Story Section
const story = document.getElementById('stories');
const newStory = document.getElementById('new_story');
document.getElementById('story-btn').addEventListener('click', () => toggleVisibility(story, newStory));
document.getElementById('back-story-btn').addEventListener('click', () => goBack(story, newStory));

// Category Section
const category = document.getElementById('categories');
const newCategory = document.getElementById('new_category');
document.getElementById('category-btn').addEventListener('click', () => toggleVisibility(category, newCategory));
document.getElementById('category-back-btn').addEventListener('click', () => goBack(category, newCategory));

// subscription plan section 
const subscription = document.getElementById('subscriptions');
const newSubscription = document.getElementById('new_subscription');
document.getElementById('subscription-btn').addEventListener('click', () => toggleVisibility(subscription, newSubscription));
document.getElementById('back-subscription-btn').addEventListener('click', () => goBack(subscription, newSubscription));

// coupon plan section 
const coupon = document.getElementById('coupons');
const newCoupon = document.getElementById('new-coupon');
document.getElementById('coupon-btn').addEventListener('click', () => toggleVisibility(coupon, newCoupon));
document.getElementById('back-coupon-btn').addEventListener('click', () => goBack(coupon, newCoupon));

// banner section 
const banner = document.getElementById('banners');
const newBanner = document.getElementById('add-new_banner');
document.getElementById('banner-btn').addEventListener('click', () => toggleVisibility(banner, newBanner));
document.getElementById('back-bnner-btn').addEventListener('click', () => goBack(banner, newBanner));

const successModal = new bootstrap.Modal(document.getElementById('successModal'));

function showModalWithMessage(message) {
    document.getElementById('modalMessage').textContent = message;

    let successModal = new bootstrap.Modal(document.getElementById('successModal'));
    successModal.show();
};

// Function to handle form submission
async function handleFormSubmission(
    form, url, successCallback,processBtnId, submitBtnId, dataLoadCallback, isJson = false,
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

        const response = await fetch(url, {
            method: "POST",
            body: body,
            headers: headers,
            credentials: "include",
        });

        const data = await response.json();

        if (response.ok) {
            successCallback(data);
            showModalWithMessage(data.message);
            form.reset();
            dataLoadCallback();
        } else {
            console.error("Error:", data);
            showModalWithMessage(data.message || 'Something went wrong!', 'error');
        }
    } catch (error) {
        console.error("Error:", error);
        showModalWithMessage('An unexpected error occurred.', 'error');
    } finally {
        toggleProcessBtn(submitBtnId, processBtnId, false);
    };
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
document.querySelector("#video-form").addEventListener("submit", function (e) {
    e.preventDefault();
    handleFormSubmission(
        e.target,
        "/admin/upload-video",
        (data) => console.log("Video uploaded successfully:", data),
        'video-process-btn',
        'add-video-btn',
        loadVideoData
    );
});

document.querySelector("#article-form").addEventListener("submit", function (e) {
    e.preventDefault();
    handleFormSubmission(
        e.target,
        "/admin/create-article",
        (data) => console.log("Article created successfully:", data),
        'process-btn',
        'article__btn',
        loadArticleData
    );
});

document.querySelector("#adduser__").addEventListener("submit", function (e) {
    e.preventDefault();
    handleFormSubmission(
        e.target,
        "/admin/create-user",
        (data) => console.log("User added successfully:", data),
        'user-process-btn',
        'add_user_btn',
        loadUserData
    );
});

document.querySelector("#categoryForm").addEventListener("submit", function (e) {
    e.preventDefault();
    handleFormSubmission(
        e.target,
        "/admin/create-category",
        (data) => console.log("Cateogy created successfully:", data),
        'category-process-btn',
        'add-category-btn',
        loadCategoryData
    );
});

document.querySelector("#addNew_story").addEventListener("submit", function (e) {
    e.preventDefault();
    handleFormSubmission(
        e.target,
        "/admin/create-story",
        (data) => console.log("Story created successfully:", data),
        'story-process-btn',
        'addNew_story-btn',
        loadStoryData
    );
});

document.querySelector("#add-new_subscription").addEventListener("submit", function (e) {
    e.preventDefault();
    handleFormSubmission(
        e.target,
        "/admin/create-subscription",
        (data) => console.log("Subscription plan created successfully:", data),
        'subscription-process-btn',
        'addNew_subscription-btn',
        loadSubscriptionData
    );
});

document.querySelector("#couponForm").addEventListener("submit", function (e) {
    e.preventDefault();
    handleFormSubmission(
        e.target,
        "/admin/create-coupon",
        (data) => console.log("Coupon created successfully:", data),
        'coupon-process-btn',
        'add-new-coupon-btn',
        laodCouponData,
        true,
    );
});

document.querySelector("#bannerForm").addEventListener("submit", function (e) {
    e.preventDefault();
    handleFormSubmission(
        e.target,
        "/admin/create-banner",
        (data) => console.log("Banner created successfully:", data),
        'banner-process-btn',
        'add_new-banner-btn',
        laodBannerData,
    );
});

// banner priview
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

// generate coupon
document.getElementById('generateCouponBtn').addEventListener('click', function () {
    const randomCouponCode = Math.random().toString(36).substr(2, 8).toUpperCase();
    document.getElementById('couponCode').value = randomCouponCode;
});

// costom file input url of image select option viva js
document.querySelector(".custom-file-input").addEventListener("change", function () {
    const fileName = this.value.split("\\").pop();
    this.nextElementSibling.classList.add("selected");
    this.nextElementSibling.innerHTML = fileName;
});

const uploadMethodRadios = document.querySelectorAll('input[name="uploadMethod"]');
const videoUploadField = document.getElementById("videoUploadField");
const videoUrlField = document.getElementById("videoUrlField");

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

// admin logout
document.getElementById('logout-btn').addEventListener('click', function (e) {
    e.preventDefault();
    adminLogout();
});
