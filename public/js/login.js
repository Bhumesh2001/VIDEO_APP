const loginBtn = document.getElementById('loginBtn');
const loginText = document.getElementById('loginText');
const loginSpinner = document.getElementById('loginSpinner');

document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    loginText.classList.add('d-none');
    loginSpinner.classList.remove('d-none');
    loginBtn.disabled = true;
    loginBtn.style.backgroundColor = '#ff0000';

    try {
        const response = await fetch('https://video-app-0i3v.onrender.com/admin/login-admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        await response.json();        

        if (response.ok) {
            console.log('logged in successful');

            window.location.href = '/';
            document.getElementById('loginForm').reset();
            removedisabledButton();

        } else {
            const inputs = document.querySelectorAll('input[type="password"], input[type="text"].form-control');
            inputs.forEach(input => {
                input.style.borderColor = 'red';
            });
            removedisabledButton();
        };

    } catch (error) {
        console.error('Error:', error);
        removedisabledButton();
    };
});

function removedisabledButton() {
    loginText.classList.remove('d-none');
    loginSpinner.classList.add('d-none');
    loginBtn.disabled = false;
    loginBtn.style.backgroundColor = '';
};

const togglePassword = document.getElementById("togglePassword");
const passwordField = document.getElementById("password");

togglePassword.addEventListener("click", function () {
    const type = passwordField.type === "password" ? "text" : "password";
    passwordField.type = type;

    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
});