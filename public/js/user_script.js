
// global Notyf instance
const notyf = new Notyf({
    duration: 2000,
    position: { x: 'right', y: 'top' }
});

// Add custom styles for Notyf
const style = document.createElement('style');
style.innerHTML = `
.notyf__toast {
    border-radius: 8px; 
    margin-bottom: 10px; 
    box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
}
`;
document.head.appendChild(style);

async function addToCart(button) {

    const productId = button.getAttribute('data-product_id');
    try {
        const response = await fetch(`/user/cart/add/${productId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
        });

        if (response.ok) {
            notyf.success('Moved to cart!');
        } else if (response.status === 400) {
            const error = await response.json();
            notyf.error(error.message || "Limit Exceed");
        } else {
            const error = await response.json();
            notyf.error("Failed to Move cart!!");
        }


    } catch (error) {
        console.error("Error adding to cart:", error);
        notyf.error('Something went wrong!');

    }
}

function redirectToLogin() {
    notyf.error("Login First!!");
    setTimeout(() => {
        window.location.href = '/user/login';
    }, 1000);


}

document.addEventListener("DOMContentLoaded", () => {

    // script for login page

    if (document.body.id === 'login-page') {


        const form = document.querySelector('form');
        const emailInput = document.querySelector("#email");
        const passwordInput = document.querySelector("#password");
        const mssg = document.querySelector("#mssg");
        const urlParams = new URLSearchParams(window.location.search);
        const sccsmsg = urlParams.get('mssg');



        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        const passwordRegex = /^.{6,}$/;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (email === "" || password === "") {
                mssg.textContent = "Fields cannot be blank!";
                mssg.style.color = "red";
                emailInput.focus();
                return;

            } else if (!emailRegex.test(email)) {
                mssg.textContent = "Enter a valid email!";
                mssg.style.color = "red";
                emailInput.focus();
                return;
            } else if (!passwordRegex.test(password)) {
                mssg.textContent = "Password must include at least 6 characters.";
                mssg.style.color = "red";
                passwordInput.focus();
                return;


            } else {
                mssg.textContent = "";
                form.submit();
            }
        });

        if (sccsmsg) {
            const messageElement = document.getElementById('mssg');
            messageElement.textContent = sccsmsg;
            messageElement.style.color = 'green';
        }
    }

    // signup page

    if (document.body.id === 'signup_page') {



        const form = document.querySelector('form');
        const usernameInput = document.querySelector("#username");
        const emailInput = document.querySelector("#email");
        const passwordInput = document.querySelector("#password");
        const confirmPasswordInput = document.querySelector("#confirmPassword");  // Add this line for the confirm password input
        const checkbox = document.querySelector('#agree');
        const mssg = document.querySelector("#mssg");
        const urlParams = new URLSearchParams(window.location.search);
        const sccsmsg = urlParams.get('mssg');

        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        const passwordRegex = /^.{6,}$/;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            const confirmPassword = confirmPasswordInput.value.trim();


            if (username === "" || email === "" || password === "" || confirmPassword === "") {
                mssg.textContent = "Fields cannot be blank!";
                mssg.style.color = "red";
                usernameInput.focus();
                return;

            } else if (!/^[a-zA-Z _]+$/.test(username)) {
                mssg.textContent = "Enter a valid name";
                mssg.style.color = "red";
                usernameInput.focus();
                return;


            } else if (!emailRegex.test(email)) {
                mssg.textContent = "Enter a valid email address!!";
                mssg.style.color = "red";
                emailInput.focus();
                return;


            } else if (password !== confirmPassword) {
                mssg.textContent = "Passwords do not match!";
                mssg.style.color = "red";
                confirmPasswordInput.focus();
                return;


            } else if (!passwordRegex.test(password)) {
                mssg.textContent = "Password must include at least 6 characters.";
                mssg.style.color = "red";
                passwordInput.focus();
                return;


            } else if (!checkbox.checked) {
                mssg.textContent = "You must agree with the terms and conditions!";
                mssg.style.color = "red";
                checkbox.focus();
                return;


            } else {
                mssg.textContent = "";
                form.submit();
            }
        });


        if (sccsmsg) {
            mssg.textContent = sccsmsg;
            mssg.style.color = 'green';
        }
    }



    // ....................


    // otp Page
    if (document.body.id === 'otp_verification') {
        const form = document.getElementById('otp-form');
        const inputs = [...form.querySelectorAll('input[type=text]')];
        const submit = form.querySelector('button[type=submit]');
        const otpCombined = document.createElement('input');
        otpCombined.type = 'hidden';
        otpCombined.name = 'otp';
        form.appendChild(otpCombined);

        const updateCombinedOTP = () => {
            const otp = inputs.map(input => input.value || '0').join('');
            otpCombined.value = otp.slice(0, 4); // Combine OTP and keep only the first 4 characters
            console.log('Combined OTP:', otpCombined.value);
            validateOTP(); // Call validation function
        };

        const validateOTP = () => {
            // Check if all OTP fields are filled
            const isOTPComplete = inputs.every(input => input.value.length === 1);

            if (isOTPComplete) {
                submit.disabled = false; // Enable the submit button if OTP is complete
            } else {
                submit.disabled = true; // Disable the submit button if OTP is not complete
            }
        };

        const handleKeyDown = (e) => {
            // Only allow numeric input, backspace, and navigation keys
            const isNumeric = /^[0-9]$/.test(e.key);
            const isControlKey = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(e.key);

            if (!isNumeric && !isControlKey) {
                e.preventDefault();
            }

            // Handle backspace and delete
            if ((e.key === 'Backspace' || e.key === 'Delete') && e.target.value === '') {
                const index = inputs.indexOf(e.target);
                if (index > 0) {
                    inputs[index - 1].value = '';
                    inputs[index - 1].focus();
                }
            }

            if (e.key === 'ArrowLeft' && e.target !== inputs[0]) {
                const index = inputs.indexOf(e.target);
                inputs[index - 1].focus();
            }

            if (e.key === 'ArrowRight' && e.target !== inputs[inputs.length - 1]) {
                const index = inputs.indexOf(e.target);
                inputs[index + 1].focus();
            }
        };

        const handleInput = (e) => {
            const { target } = e;
            const index = inputs.indexOf(target);

            // Move to next input if current is filled
            if (target.value.length === 1) {
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    submit.focus();
                }
            }

            updateCombinedOTP();
        };

        const handlePaste = (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text');

            // Validate pasted text
            if (/^\d{4}$/.test(text)) {
                text.split('').forEach((digit, index) => {
                    if (inputs[index]) inputs[index].value = digit;
                });
                submit.focus();
                updateCombinedOTP();
            }
        };

        // Add event listeners
        inputs.forEach(input => {
            input.addEventListener('input', handleInput);
            input.addEventListener('keydown', handleKeyDown);
            input.addEventListener('paste', handlePaste);
        });


        validateOTP();

        // Resend otp timer

        const resendForm = document.getElementById('resendForm');
        const resendLink = document.getElementById('resendLink');
        let countdown = 15;

        function startTimer() {
            resendLink.style.pointerEvents = "none";
            resendLink.style.opacity = "0.6";

            const timerSpan = document.getElementById('timer');
            countdown = 15;
            timerSpan.textContent = countdown;

            const timerInterval = setInterval(() => {
                countdown--;
                timerSpan.textContent = countdown;
                if (countdown === 0) {
                    clearInterval(timerInterval);
                    resendLink.style.pointerEvents = "auto";
                    resendLink.style.opacity = "1";
                    resendLink.textContent = "Resend OTP";
                }
            }, 1000);
        }

        function resendOTP(event) {
            event.preventDefault();
            fetch('/resend-otp', { method: 'POST' })
                .then(response => {
                    if (response.ok) {
                        console.log("OTP resent");
                        startTimer();
                    } else {
                        console.log("Failed to resend OTP. Please try again.");
                    }
                })
                .catch(error => {
                    console.error('Resend OTP error:', error);
                });
        }

        resendForm.addEventListener("submit", resendOTP);


        startTimer();
    }
});