document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('https://video-app-0i3v.onrender.com/admin/login-admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        await response.json();
        console.log(response);

        if (response.ok) {
            console.log('logged in successful');
            document.getElementById('loginForm').reset();
            window.location.href = '/';
        } else {
            const inputs = document.querySelectorAll('input[type="password"], input[type="text"].form-control');
            inputs.forEach(input => {
                input.style.borderColor = 'red';
            });
        };

    } catch (error) {
        console.error('Error:', error);
    };
});

const togglePassword = document.getElementById("togglePassword");
const passwordField = document.getElementById("password");

togglePassword.addEventListener("click", function () {
    const type = passwordField.type === "password" ? "text" : "password";
    passwordField.type = type;

    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
});